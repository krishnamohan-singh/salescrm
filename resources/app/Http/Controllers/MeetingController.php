<?php

namespace App\Http\Controllers;

use App\Models\Meeting;
use App\Models\Lead;
use App\Models\Contact;
use App\Models\MeetingAttendee;
use App\Services\GoogleCalendarService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MeetingController extends Controller
{
    public function index(Request $request)
    {
        // Resolve selected date (default today) and selected month/year
        $selectedDate = $request->filled('date')
            ? \Carbon\Carbon::parse($request->date)->format('Y-m-d')
            : \Carbon\Carbon::today()->format('Y-m-d');

        $selectedYear  = $request->filled('year')  ? (int) $request->year  : (int) \Carbon\Carbon::parse($selectedDate)->format('Y');
        $selectedMonth = $request->filled('month') ? (int) $request->month : (int) \Carbon\Carbon::parse($selectedDate)->format('n');

        // Base query scoped to tenant
        $baseQuery = Meeting::query()
            ->with(['creator', 'assignedUser', 'attendees'])
            ->where('created_by', createdBy());

        $monthStart = \Carbon\Carbon::create($selectedYear, $selectedMonth, 1)->startOfMonth();
        $monthEnd   = $monthStart->copy()->endOfMonth();

        if (IsDemo()) {
            // Pick 10 record to show a spread of demo data
            $meetings  = (clone $baseQuery)->take(10)->get();
            // Every day of the visible month gets a dot
            $meetingDates = collect();
            $cursor = $monthStart->copy();
            while ($cursor->lte($monthEnd)) {
                $meetingDates->push($cursor->format('Y-m-d'));
                $cursor->addDay();
            }
            $meetingDates = $meetingDates->toArray();
        } else {
            // --- Date filter: filter meetings where selected date falls within start_date and end_date ---
            $meetings = (clone $baseQuery)
                ->whereDate('start_date', '<=', $selectedDate)
                ->whereDate('end_date', '>=', $selectedDate)
                ->get();

            // --- Meeting dates for the selected month (for calendar dots, including multi-day) ---
            $meetingRanges = Meeting::where('created_by', createdBy())
                ->where('start_date', '<=', $monthEnd->format('Y-m-d'))
                ->where('end_date', '>=', $monthStart->format('Y-m-d'))
                ->get(['start_date', 'end_date']);

            $meetingDates = collect();
            foreach ($meetingRanges as $m) {
                $cursor = \Carbon\Carbon::parse($m->start_date)->max($monthStart->copy());
                $end    = \Carbon\Carbon::parse($m->end_date)->min($monthEnd->copy());
                while ($cursor->lte($end)) {
                    $meetingDates->push($cursor->format('Y-m-d'));
                    $cursor->addDay();
                }
            }
            $meetingDates = $meetingDates->unique()->values()->toArray();
        }

        // Build summary from the already-fetched collection (same as reference)
        $summary = [
            'planned'  => $meetings->where('status', 'planned')->count(),
            'held'     => $meetings->where('status', 'held')->count(),
            'not_held' => $meetings->where('status', 'not_held')->count(),
        ];

        $userQuery   = \App\Models\User::where('created_by', createdBy());
        $allUsers    = (clone $userQuery)->select('id', 'name', 'email', 'avatar')->get();
        $users       = (clone $userQuery)->where('status', 'active')->select('id', 'name', 'email')->get();
        $allContacts = \App\Models\Contact::where('created_by', createdBy())->select('id', 'name')->get();
        $allLeads    = \App\Models\Lead::where('created_by', createdBy())->select('id', 'name')->get();

        return Inertia::render('meetings/index', [
            'meetings'      => $meetings,
            'users'         => $users,
            'allUsers'      => $allUsers,
            'allContacts'   => $allContacts,
            'allLeads'      => $allLeads,
            'summary'       => $summary,
            'meetingDates'  => $meetingDates,
            'selectedDate'  => $selectedDate,
            'selectedMonth' => $selectedMonth,
            'selectedYear'  => $selectedYear,
            'filters'       => $request->all(['search', 'status', 'assigned_to', 'sort_field', 'sort_direction', 'date', 'month', 'year']),
            'settings'      => settings(createdBy()),
        ]);
    }

    public function show($id)
    {
        $meeting = Meeting::with(['creator', 'assignedUser'])
            ->where('created_by', createdBy())
            ->findOrFail($id);

        $meeting->load(['attendees' => function ($query) {
            $query->with(['meeting']);
        }]);

        foreach ($meeting->attendees as $attendee) {
            switch ($attendee->attendee_type) {
                case 'user':
                    $attendee->attendee = \App\Models\User::find($attendee->attendee_id);
                    break;
                case 'contact':
                    $attendee->attendee = \App\Models\Contact::find($attendee->attendee_id);
                    break;
                case 'lead':
                    $attendee->attendee = \App\Models\Lead::find($attendee->attendee_id);
                    break;
            }
        }

        if ($meeting->parent_module && $meeting->parent_id) {
            switch ($meeting->parent_module) {
                case 'lead':
                    $meeting->parent_record = \App\Models\Lead::find($meeting->parent_id);
                    break;
                case 'account':
                    $meeting->parent_record = \App\Models\Account::find($meeting->parent_id);
                    break;
                case 'contact':
                    $meeting->parent_record = \App\Models\Contact::find($meeting->parent_id);
                    break;
                case 'opportunity':
                    $meeting->parent_record = \App\Models\Opportunity::find($meeting->parent_id);
                    break;
                case 'case':
                    $meeting->parent_record = \App\Models\CaseModel::find($meeting->parent_id);
                    break;
                case 'project':
                    $meeting->parent_record = \App\Models\Project::find($meeting->parent_id);
                    break;
            }
        }

        return Inertia::render('meetings/show', [
            'meeting' => $meeting,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:65535',
            'location' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'parent_module' => 'required|in:none,lead,account,contact,opportunity,case,project',
            'parent_id' => 'required|integer|min:1',
            'status' => 'nullable|in:planned,held,not_held',
            'assigned_to' => 'required|exists:users,id',
            'attendees' => 'required|array|min:1',
            'attendees.*.type' => 'required_with:attendees|in:user,contact,lead',
            'attendees.*.id' => 'required_with:attendees|integer|min:1',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        $validated['created_by'] = createdBy();
        $validated['status'] = $validated['status'] ?? 'planned';

        $startDate = \Carbon\Carbon::parse($validated['start_date'])->format('Y-m-d');
        $endDate = \Carbon\Carbon::parse($validated['end_date'])->format('Y-m-d');
        $startDateTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i', $startDate . ' ' . $validated['start_time']);
        $endDateTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i', $endDate . ' ' . $validated['end_time']);
        if ($endDateTime->lte($startDateTime)) {
            return redirect()->back()->withErrors(['end_time' => __('End date and time must be after start date and time.')])->withInput();
        }

        if (isset($validated['attendees'])) {
            foreach ($validated['attendees'] as $attendee) {
                $meetingConflict = MeetingAttendee::where('attendee_type', $attendee['type'])
                    ->where('attendee_id', $attendee['id'])
                    ->whereHas('meeting', function ($q) use ($startDateTime, $endDateTime) {
                        $q->where('created_by', createdBy())
                            ->where(function ($query) use ($startDateTime, $endDateTime) {
                                $query->whereRaw("CONCAT(start_date, ' ', start_time) < ?", [$endDateTime->format('Y-m-d H:i')])
                                    ->whereRaw("CONCAT(end_date, ' ', end_time) > ?", [$startDateTime->format('Y-m-d H:i')]);
                            });
                    })->first();

                $callConflict = \App\Models\CallAttendee::where('attendee_type', $attendee['type'])
                    ->where('attendee_id', $attendee['id'])
                    ->whereHas('call', function ($q) use ($startDateTime, $endDateTime) {
                        $q->where('created_by', createdBy())
                            ->where(function ($query) use ($startDateTime, $endDateTime) {
                                $query->whereRaw("CONCAT(start_date, ' ', start_time) < ?", [$endDateTime->format('Y-m-d H:i')])
                                    ->whereRaw("CONCAT(end_date, ' ', end_time) > ?", [$startDateTime->format('Y-m-d H:i')]);
                            });
                    })->first();

                if ($meetingConflict || $callConflict) {
                    $attendeeName = $this->getAttendeeName($attendee['type'], $attendee['id']);
                    return redirect()->back()->withErrors(['attendees' => __(':name is already scheduled for another meeting or call during this time.', ['name' => $attendeeName])])->withInput();
                }
            }
        }

        $validated['parent_module'] = ($validated['parent_module'] ?? null) === 'none' ? null : ($validated['parent_module'] ?? null);
        $validated['parent_id'] = empty($validated['parent_id']) || $validated['parent_id'] === 'select' ? null : (int)$validated['parent_id'];
        $validated['assigned_to'] = empty($validated['assigned_to']) || $validated['assigned_to'] === 'unassigned' ? null : (int)$validated['assigned_to'];

        if ($validated['parent_module'] && $validated['parent_id']) {
            $this->validateParentRecord($validated['parent_module'], $validated['parent_id']);
        }

        $meeting = Meeting::create($validated);

        if ($meeting && $request->sync_with_google_calendar) {
            $calendarService = new GoogleCalendarService();
            $eventId = $calendarService->createEvent($meeting, createdBy(), 'meeting');
            if ($eventId) {
                $meeting->update(['google_calendar_event_id' => $eventId]);
            }
        }

        if (isset($validated['attendees'])) {
            foreach ($validated['attendees'] as $attendee) {
                MeetingAttendee::create([
                    'meeting_id' => $meeting->id,
                    'attendee_type' => $attendee['type'],
                    'attendee_id' => $attendee['id'],
                ]);
            }
        }

        // Create activity for parent modules
        if ($meeting->parent_module && $meeting->parent_id) {
            switch ($meeting->parent_module) {
                case 'account':
                    \App\Models\AccountActivity::create([
                        'account_id' => $meeting->parent_id,
                        'user_id' => auth()->id(),
                        'activity_type' => 'Meeting Created',
                        'title' => auth()->user()->name . ' created a meeting: ' . $meeting->title,
                        'description' => 'Meeting scheduled for ' . date('M j, Y', strtotime($meeting->start_date)) . ' at ' . date('g:i A', strtotime($meeting->start_time)),
                        'created_by' => createdBy()
                    ]);
                    break;
                case 'lead':
                    \App\Models\LeadActivity::create([
                        'lead_id' => $meeting->parent_id,
                        'user_id' => auth()->id(),
                        'activity_type' => 'Meeting Created',
                        'title' => auth()->user()->name . ' created a meeting: ' . $meeting->title,
                        'description' => 'Meeting scheduled for ' . date('M j, Y', strtotime($meeting->start_date)) . ' at ' . date('g:i A', strtotime($meeting->start_time)),
                        'created_by' => createdBy()
                    ]);
                    break;
                case 'opportunity':
                    \App\Models\OpportunityActivity::create([
                        'opportunity_id' => $meeting->parent_id,
                        'user_id' => auth()->id(),
                        'activity_type' => 'Meeting Created',
                        'title' => auth()->user()->name . ' created a meeting: ' . $meeting->title,
                        'description' => 'Meeting scheduled for ' . date('M j, Y', strtotime($meeting->start_date)) . ' at ' . date('g:i A', strtotime($meeting->start_time)),
                        'created_by' => createdBy()
                    ]);
                    break;
            }
        }

        // Create activity for attendees
        if (isset($validated['attendees'])) {
            foreach ($validated['attendees'] as $attendee) {
                switch ($attendee['type']) {
                    case 'contact':
                        $contact = \App\Models\Contact::find($attendee['id']);
                        if ($contact && $contact->account_id) {
                            \App\Models\AccountActivity::create([
                                'account_id' => $contact->account_id,
                                'user_id' => auth()->id(),
                                'activity_type' => 'Meeting Attendee',
                                'title' => auth()->user()->name . ' added ' . $contact->name . ' to meeting: ' . $meeting->title,
                                'description' => 'Contact added as attendee to meeting scheduled for ' . date('M j, Y', strtotime($meeting->start_date)),
                                'created_by' => createdBy()
                            ]);
                        }
                        break;
                    case 'lead':
                        $lead = \App\Models\Lead::find($attendee['id']);
                        if ($lead) {
                            \App\Models\LeadActivity::create([
                                'lead_id' => $lead->id,
                                'user_id' => auth()->id(),
                                'activity_type' => 'Meeting Attendee',
                                'title' => auth()->user()->name . ' added ' . $lead->name . ' to meeting: ' . $meeting->title,
                                'description' => 'Lead added as attendee to meeting scheduled for ' . date('M j, Y', strtotime($meeting->start_date)),
                                'created_by' => createdBy()
                            ]);
                        }
                        break;
                }
            }
        }

        // Fire meeting invitation event if email notification is enabled
        if (isset($validated['attendees']) && !IsDemo()) {
            event(new \App\Events\MeetingInvitation($meeting));
        }

        // Check for errors and combine them
        $emailError = session()->pull('email_error');
        $twilioError = session()->pull('twilio_error');

        $errors = [];
        if ($emailError) {
            $errors[] = __('Email send failed: ') . $emailError;
        }
        if ($twilioError) {
            $errors[] = __('SMS send failed: ') . $twilioError;
        }

        if (!empty($errors)) {
            $message = __('Meeting created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->back()->with('success', __('Meeting created successfully.'));
    }

    public function update(Request $request, $meetingId)
    {
        $meeting = Meeting::where('id', $meetingId)
            ->where('created_by', createdBy())
            ->firstOrFail();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:65535',
            'location' => 'required|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'parent_module' => 'required|in:none,lead,account,contact,opportunity,case,project',
            'parent_id' => 'required|integer|min:1',
            'status' => 'nullable|in:planned,held,not_held',
            'assigned_to' => 'required|exists:users,id',
            'attendees' => 'required|array|min:1',
            'attendees.*.type' => 'required_with:attendees|in:user,contact,lead',
            'attendees.*.id' => 'required_with:attendees|integer|min:1',
            'sync_with_google_calendar' => 'nullable|boolean',
        ]);

        $startDate = \Carbon\Carbon::parse($validated['start_date'])->format('Y-m-d');
        $endDate = \Carbon\Carbon::parse($validated['end_date'])->format('Y-m-d');
        $startDateTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i', $startDate . ' ' . $validated['start_time']);
        $endDateTime = \Carbon\Carbon::createFromFormat('Y-m-d H:i', $endDate . ' ' . $validated['end_time']);
        if ($endDateTime->lte($startDateTime)) {
            return redirect()->back()->withErrors(['end_time' => __('End date and time must be after start date and time.')])->withInput();
        }

        if (isset($validated['attendees'])) {
            foreach ($validated['attendees'] as $attendee) {
                $meetingConflict = MeetingAttendee::where('attendee_type', $attendee['type'])
                    ->where('attendee_id', $attendee['id'])
                    ->whereHas('meeting', function ($q) use ($startDateTime, $endDateTime, $meetingId) {
                        $q->where('created_by', createdBy())
                            ->where('id', '!=', $meetingId)
                            ->where(function ($query) use ($startDateTime, $endDateTime) {
                                $query->whereRaw("CONCAT(start_date, ' ', start_time) < ?", [$endDateTime->format('Y-m-d H:i')])
                                    ->whereRaw("CONCAT(end_date, ' ', end_time) > ?", [$startDateTime->format('Y-m-d H:i')]);
                            });
                    })->first();

                $callConflict = \App\Models\CallAttendee::where('attendee_type', $attendee['type'])
                    ->where('attendee_id', $attendee['id'])
                    ->whereHas('call', function ($q) use ($startDateTime, $endDateTime) {
                        $q->where('created_by', createdBy())
                            ->where(function ($query) use ($startDateTime, $endDateTime) {
                                $query->whereRaw("CONCAT(start_date, ' ', start_time) < ?", [$endDateTime->format('Y-m-d H:i')])
                                    ->whereRaw("CONCAT(end_date, ' ', end_time) > ?", [$startDateTime->format('Y-m-d H:i')]);
                            });
                    })->first();

                if ($meetingConflict || $callConflict) {
                    $attendeeName = $this->getAttendeeName($attendee['type'], $attendee['id']);
                    return redirect()->back()->withErrors(['attendees' => __(':name is already scheduled for another meeting or call during this time.', ['name' => $attendeeName])])->withInput();
                }
            }
        }

        $validated['parent_module'] = ($validated['parent_module'] ?? null) === 'none' ? null : ($validated['parent_module'] ?? null);
        $validated['parent_id'] = empty($validated['parent_id']) || $validated['parent_id'] === 'select' ? null : (int)$validated['parent_id'];
        $validated['assigned_to'] = empty($validated['assigned_to']) || $validated['assigned_to'] === 'unassigned' ? null : (int)$validated['assigned_to'];

        if ($validated['parent_module'] && $validated['parent_id']) {
            $this->validateParentRecord($validated['parent_module'], $validated['parent_id']);
        }

        $meeting->update($validated);

        if ($meeting->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->updateEvent($meeting->google_calendar_event_id, $meeting, createdBy(), 'meeting');
        }

        $meeting->attendees()->delete();
        if (isset($validated['attendees'])) {
            foreach ($validated['attendees'] as $attendee) {
                MeetingAttendee::create([
                    'meeting_id' => $meeting->id,
                    'attendee_type' => $attendee['type'],
                    'attendee_id' => $attendee['id'],
                ]);
            }
        }

        return redirect()->back()->with('success', __('Meeting updated successfully.'));
    }

    public function destroy($meetingId)
    {
        $meeting = Meeting::where('id', $meetingId)
            ->where('created_by', createdBy())
            ->firstOrFail();

        // Delete from Google Calendar if synced
        if ($meeting->google_calendar_event_id) {
            $calendarService = new GoogleCalendarService();
            $calendarService->deleteEvent($meeting->google_calendar_event_id, createdBy());
        }

        $meeting->delete();
        return redirect()->back()->with('success', __('Meeting deleted successfully.'));
    }

    public function toggleStatus(Request $request, $meetingId)
    {
        $meeting = Meeting::where('id', $meetingId)
            ->where('created_by', createdBy())
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:planned,held,not_held'
        ]);

        $meeting->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', __('Meeting status updated successfully.'));
    }

    public function create()
    {
        $users = \App\Models\User::where('created_by', createdBy())->select('id', 'name', 'email')->get();

        return Inertia::render('meetings/create', [
            'users' => $users,
        ]);
    }

    public function edit($id)
    {
        $meeting = Meeting::where('id', $id)
            ->where('created_by', createdBy())
            ->with(['creator', 'assignedUser', 'attendees'])
            ->firstOrFail();

        $users = \App\Models\User::where('created_by', createdBy())->select('id', 'name', 'email')->get();

        return Inertia::render('meetings/edit', [
            'meeting' => $meeting,
            'users' => $users,
        ]);
    }

    public function getParentModuleRecords($module)
    {
        $records = [];

        switch ($module) {
            case 'lead':
                $records = \App\Models\Lead::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get();
                break;
            case 'account':
                $records = \App\Models\Account::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get();
                break;
            case 'contact':
                $records = \App\Models\Contact::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get();
                break;
            case 'opportunity':
                $records = \App\Models\Opportunity::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get();
                break;
            case 'case':
                $records = \App\Models\CaseModel::where('created_by', createdBy())->whereNotIn('status', ['closed'])->select('id', 'subject as name')->get();
                break;
            case 'project':
                $records = \App\Models\Project::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get();
                break;
        }

        return response()->json($records);
    }

    public function getAttendeeRecords($type)
    {
        $records = [];

        switch ($type) {
            case 'user':
                $records = \App\Models\User::where('created_by', createdBy())
                    ->select('id', 'name', 'email')
                    ->get()
                    ->map(function ($user) {
                        return [
                            'id' => $user->id,
                            'name' => $user->name,
                        ];
                    });
                break;
            case 'contact':
                $records = \App\Models\Contact::where('created_by', createdBy())->where('status', 'active')->select('id', 'name', 'email')->get()
                    ->map(function ($contact) { return ['id' => $contact->id, 'name' => $contact->name]; });
                break;
            case 'lead':
                $records = \App\Models\Lead::where('created_by', createdBy())->where('status', 'active')->select('id', 'name', 'email')->get()
                    ->map(function ($lead) { return ['id' => $lead->id, 'name' => $lead->name]; });
                break;
        }

        return response()->json($records);
    }

    /**
     * Validate that parent record exists
     */
    private function validateParentRecord($module, $id)
    {
        $exists = false;

        switch ($module) {
            case 'lead':
                $exists = \App\Models\Lead::where('id', $id)->where('created_by', createdBy())->exists();
                break;
            case 'account':
                $exists = \App\Models\Account::where('id', $id)->where('created_by', createdBy())->exists();
                break;
            case 'contact':
                $exists = \App\Models\Contact::where('id', $id)->where('created_by', createdBy())->exists();
                break;
            case 'opportunity':
                $exists = \App\Models\Opportunity::where('id', $id)->where('created_by', createdBy())->exists();
                break;
            case 'case':
                $exists = \App\Models\CaseModel::where('id', $id)->where('created_by', createdBy())->exists();
                break;
            case 'project':
                $exists = \App\Models\Project::where('id', $id)->where('created_by', createdBy())->exists();
                break;
        }

        if (!$exists) {
            throw new \Illuminate\Validation\ValidationException(
                \Illuminate\Validation\Validator::make([], [])
                    ->errors()
                    ->add('parent_id', 'The selected parent record does not exist.')
            );
        }
    }

    private function getAttendeeName($type, $id)
    {
        switch ($type) {
            case 'user':
                $user = \App\Models\User::find($id);
                return $user ? $user->name : 'Unknown';
            case 'contact':
                $contact = \App\Models\Contact::find($id);
                return $contact ? $contact->name : 'Unknown';
            case 'lead':
                $lead = \App\Models\Lead::find($id);
                return $lead ? $lead->name : 'Unknown';
            default:
                return 'Unknown';
        }
    }
}
