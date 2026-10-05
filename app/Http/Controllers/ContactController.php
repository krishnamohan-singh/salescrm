<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Account;
use App\Exports\ContactExport;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ContactController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $canViewAll = hasFullModuleAccess('contacts', $user);

        $query = Contact::query()
            ->with(['account', 'assignedUser'])
            ->where('created_by', createdBy());

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%')
                    ->orWhere('phone', 'like', '%' . $request->search . '%')
                    ->orWhere('position', 'like', '%' . $request->search . '%');
            });
        }

        // Handle account filter
        if ($request->has('account_id') && !empty($request->account_id) && $request->account_id !== 'all') {
            $query->where('account_id', $request->account_id);
        }

        // Handle status filter
        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Visibility scoping
        if (!$canViewAll) {
            $query->where('assigned_to', $user->id);
        } else {
            // Handle assigned to filter
            if ($request->has('assigned_to') && !empty($request->assigned_to) && $request->assigned_to !== 'all') {
                if ($request->assigned_to === 'unassigned') {
                    $query->whereNull('assigned_to');
                } else {
                    $query->where('assigned_to', $request->assigned_to);
                }
            }
        }

        // Handle sorting
        $sortField = $request->input('sort_field', 'id');
        $sortDirection = $request->input('sort_direction', 'desc');
        $allowedSorts = ['id', 'name', 'created_at'];
        $allowedDirection = ['asc', 'desc'];
        if (!in_array($sortDirection, $allowedDirection)) {
            $sortDirection = 'desc';
        }
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        $defaultPerPage = $request->view === 'grid' ? 12 : 10;
        $perPage = max(1, min(200, (int) $request->get('per_page', $defaultPerPage)));
        $contacts = $query->paginate($perPage)->withQueryString();

        $accountQuery = Account::where('created_by', createdBy());
        $allAccounts = (clone $accountQuery)->get(['id', 'name']);
        $accounts = (clone $accountQuery)->where('status', 'active')->get(['id', 'name']);

        $userQuery = \App\Models\User::where('created_by', createdBy());
        $allUsers = (clone $userQuery)->select('id', 'name', 'email')->get();
        $users = (clone $userQuery)->where('status', 'active')->select('id', 'name', 'email')->get();

        // Get plan limits for company users
        $planLimits = null;
        $companyUser = User::find(createdBy());
        $plan = $companyUser ? $companyUser->getCurrentPlan() : null;

        if ($plan && $plan->max_contacts > 0) {
            $currentContactCount = Contact::where('created_by', $companyUser->id)->count();
            $planLimits = [
                'current_contacts' => $currentContactCount,
                'max_contacts' => $plan->max_contacts,
                'can_create' => $currentContactCount < $plan->max_contacts
            ];
        }

        return Inertia::render('contacts/index', [
            'contacts' => $contacts,
            'accounts' => $accounts,
            'allAccounts' => $allAccounts,
            'users' => $users,
            'allUsers' => $allUsers,
            'canViewAll' => $canViewAll,
            'planLimits' => $planLimits,
            'filters' => $request->all(['search', 'account_id', 'status', 'assigned_to', 'sort_field', 'sort_direction', 'per_page', 'view', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:contacts,email,NULL,id,created_by,' . createdBy(),
            'phone' => 'nullable|string|max:255',
            'position' => 'nullable|string|max:255',
            'address' => 'required|string',
            'account_id' => 'required|exists:accounts,id',
            'status' => 'nullable|in:active,inactive',
            'assigned_to' => 'required|exists:users,id',
        ]);

        // Check contact limit for company users
        if (auth()->user()->type === 'company') {
            $user = auth()->user();
            $plan = $user->getCurrentPlan();

            if ($plan && $plan->max_contacts > 0) {
                $currentContactCount = Contact::where('created_by', $user->id)->count();

                if ($currentContactCount >= $plan->max_contacts) {
                    return redirect()->back()->with('error', __('Contact limit exceeded. Your plan allows maximum :limit contacts.', ['limit' => $plan->max_contacts]));
                }
            }
        }

        $validated['created_by'] = createdBy();
        $validated['status'] = $validated['status'] ?? 'active';

        Contact::create($validated);

        return redirect()->back()->with('success', __('Contact created successfully.'));
    }

    public function update(Request $request, $contactId)
    {
        $contact = Contact::where('id', $contactId)
            ->where('created_by', createdBy())
            ->first();

        if ($contact) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'email' => 'required|email|max:255|unique:contacts,email,' . $contactId . ',id,created_by,' . createdBy(),
                    'phone' => 'nullable|string|max:255',
                    'position' => 'nullable|string|max:255',
                    'address' => 'required|string',
                    'account_id' => 'required|exists:accounts,id',
                    'status' => 'nullable|in:active,inactive',
                    'assigned_to' => 'required|exists:users,id',
                ]);

                $contact->update($validated);

                return redirect()->back()->with('success', __('Contact updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update contact.'));
            }
        } else {
            return redirect()->back()->with('error', __('Contact not found.'));
        }
    }

    public function destroy($contactId)
    {
        $contact = Contact::where('id', $contactId)
            ->where('created_by', createdBy())
            ->first();

        if ($contact) {
            try {
                $contact->delete();
                return redirect()->back()->with('success', __('Contact deleted successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete contact.'));
            }
        } else {
            return redirect()->back()->with('error', __('Contact not found.'));
        }
    }

    public function show($contactId)
    {
        $contact = Contact::where('id', $contactId)
            ->where('created_by', createdBy())
            ->with(['account', 'assignedUser', 'quotes', 'cases'])
            ->first();

        if (!$contact) {
            return redirect()->route('contacts.index')->with('error', __('Contact not found.'));
        }

        // Get related meetings (both as parent and as attendee)
        $parentMeetings = \App\Models\Meeting::where('created_by', createdBy())
            ->where('parent_module', 'contact')
            ->where('parent_id', $contactId)
            ->with(['creator', 'assignedUser'])
            ->get();

        $attendeeMeetings = \App\Models\Meeting::where('created_by', createdBy())
            ->whereHas('attendees', function ($q) use ($contactId) {
                $q->where('attendee_type', 'contact')
                    ->where('attendee_id', $contactId);
            })
            ->with(['creator', 'assignedUser'])
            ->get();

        // Get related calls (both as parent and as attendee)
        $parentCalls = \App\Models\Call::where('created_by', createdBy())
            ->where('parent_module', 'contact')
            ->where('parent_id', $contactId)
            ->with(['creator', 'assignedUser'])
            ->get()
            ->map(function ($call) {
                $call->type = 'call';
                return $call;
            });

        $attendeeCalls = \App\Models\Call::where('created_by', createdBy())
            ->whereHas('attendees', function ($q) use ($contactId) {
                $q->where('attendee_type', 'contact')
                    ->where('attendee_id', $contactId);
            })
            ->with(['creator', 'assignedUser'])
            ->get()
            ->map(function ($call) {
                $call->type = 'call';
                return $call;
            });

        $meetings = $parentMeetings->merge($attendeeMeetings)->merge($parentCalls)->merge($attendeeCalls)->unique('id')->sortByDesc('start_date')->values();

        $tenantId = createdBy();
        \App\Models\TaskStatus::seedDefaultsForTenant($tenantId);
        \App\Models\TaskType::seedDefaultsForTenant($tenantId);
        \App\Models\TaskPriority::seedDefaultsForTenant($tenantId);

        $tasksQuery = \App\Models\Task::where('contact_id', $contactId)
            ->with(['assignedUser:id,name,email,avatar', 'creator:id,name', 'taskStatus:id,name,color', 'taskType:id,name,icon,color', 'taskPriority:id,name,color,level']);
        if (!in_array(auth()->user()->type, ['company', 'superadmin'])) {
            $tasksQuery->where('assigned_to', auth()->id());
        }
        $tasks = $tasksQuery->orderBy('due_date', 'asc')->get();

        $users = \App\Models\User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email')
            ->get();

        $taskStatuses = \App\Models\TaskStatus::where('created_by', $tenantId)->where('status', 'active')->orderBy('id')->get();
        $taskTypes = \App\Models\TaskType::where('created_by', $tenantId)->where('status', 'active')->orderBy('id')->get();
        $taskPriorities = \App\Models\TaskPriority::where('created_by', $tenantId)->where('status', 'active')->orderBy('level')->get();

        return Inertia::render('contacts/show', [
            'contact'        => $contact,
            'meetings'       => $meetings,
            'tasks'          => $tasks,
            'users'          => $users,
            'taskStatuses'   => $taskStatuses,
            'taskTypes'      => $taskTypes,
            'taskPriorities' => $taskPriorities,
        ]);
    }

    public function toggleStatus($contactId)
    {
        $contact = Contact::where('id', $contactId)
            ->where('created_by', createdBy())
            ->first();

        if ($contact) {
            try {
                $contact->status = $contact->status === 'active' ? 'inactive' : 'active';
                $contact->save();

                return redirect()->back()->with('success', __('Contact status updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update contact status.'));
            }
        } else {
            return redirect()->back()->with('error', __('Contact not found.'));
        }
    }

    public function fileExport()
    {
        if (!auth()->user()->can('export-contacts')) {
            return redirect()->back()->with('error', __('Permission denied.'));
        }

        $name = 'contact_' . date('Y-m-d i:h:s');
        return Excel::download(new ContactExport(), $name . '.xlsx');
    }
}
