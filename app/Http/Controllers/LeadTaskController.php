<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadTask;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LeadTaskController extends Controller
{
    /**
     * Check if current user is an admin.
     */
    private function isAdmin(): bool
    {
        return in_array(auth()->user()->type, ['company', 'superadmin']);
    }

    /**
     * Display a listing of the resource and stats dashboard.
     */
    public function index(Request $request)
    {
        $isAdmin = $this->isAdmin();
        $companyId = createdBy();
        $userId = auth()->id();
        $today = Carbon::today()->toDateString();
        $startOfWeek = Carbon::now()->startOfWeek()->toDateString();
        $endOfWeek = Carbon::now()->endOfWeek()->toDateString();

        // Base query for visibility scoping
        $baseQuery = LeadTask::query()->where('created_by', $companyId);

        if (!$isAdmin) {
            $baseQuery->where('assigned_to', $userId);
        }

        // Calculate KPI stats
        $stats = [
            'all' => (clone $baseQuery)->count(),
            'today' => (clone $baseQuery)->whereDate('due_date', $today)->whereNotIn('status', ['completed', 'cancelled'])->count(),
            'overdue' => (clone $baseQuery)->whereDate('due_date', '<', $today)->whereNotIn('status', ['completed', 'cancelled'])->count(),
            'upcoming' => (clone $baseQuery)->whereDate('due_date', '>', $today)->whereNotIn('status', ['completed', 'cancelled'])->count(),
            'this_week' => (clone $baseQuery)->whereBetween('due_date', [$startOfWeek, $endOfWeek])->count(),
            'completed' => (clone $baseQuery)->where('status', 'completed')->count(),
        ];

        // Filtered tasks query
        $query = (clone $baseQuery)->with(['lead:id,name,email,phone,company', 'assignedUser:id,name,email,avatar', 'creator:id,name']);

        // Quick Tab filter
        $tab = $request->input('tab', 'all');
        if ($tab === 'today') {
            $query->whereDate('due_date', $today);
        } elseif ($tab === 'overdue') {
            $query->whereDate('due_date', '<', $today)->whereNotIn('status', ['completed', 'cancelled']);
        } elseif ($tab === 'upcoming') {
            $query->whereDate('due_date', '>', $today)->whereNotIn('status', ['completed', 'cancelled']);
        } elseif ($tab === 'this_week') {
            $query->whereBetween('due_date', [$startOfWeek, $endOfWeek]);
        } elseif ($tab === 'completed') {
            $query->where('status', 'completed');
        }

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('lead', function ($lq) use ($search) {
                        $lq->where('name', 'like', "%{$search}%")
                            ->orWhere('company', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Dropdown filters
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority') && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('lead_id') && $request->lead_id !== 'all') {
            $query->where('lead_id', $request->lead_id);
        }

        if ($isAdmin && $request->filled('assigned_to') && $request->assigned_to !== 'all') {
            $query->where('assigned_to', $request->assigned_to);
        }

        // Sorting
        $sortField = $request->input('sort_field', 'due_date');
        $sortDirection = $request->input('sort_direction', 'asc');
        $allowedSorts = ['title', 'due_date', 'priority', 'status', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'asc');
        } else {
            $query->orderBy('due_date', 'asc');
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 15)));
        $tasks = $query->paginate($perPage)->withQueryString();

        // Dropdowns
        $leads = Lead::where('created_by', $companyId)
            ->where('status', 'active')
            ->select('id', 'name', 'company', 'email')
            ->orderBy('name')
            ->get();

        $users = User::where('created_by', $companyId)
            ->where('status', 'active')
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return Inertia::render('lead-tasks/index', [
            'tasks' => $tasks,
            'stats' => $stats,
            'leads' => $leads,
            'users' => $users,
            'isAdmin' => $isAdmin,
            'filters' => $request->all(['tab', 'search', 'status', 'priority', 'type', 'lead_id', 'assigned_to', 'sort_field', 'sort_direction', 'per_page']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'lead_id' => 'required|exists:leads,id',
            'assigned_to' => 'nullable|exists:users,id',
            'type' => 'required|in:task,call,meeting,email,followup,demo',
            'priority' => 'required|in:low,medium,high,urgent',
            'status' => 'nullable|in:pending,in_progress,completed,cancelled',
            'due_date' => 'required|date',
            'due_time' => 'nullable|string|max:10',
            'description' => 'nullable|string',
        ]);

        $validated['created_by'] = createdBy();
        $validated['assigned_to'] = $validated['assigned_to'] ?? auth()->id();
        $validated['status'] = $validated['status'] ?? 'pending';

        if ($validated['status'] === 'completed') {
            $validated['completed_at'] = Carbon::now();
        }

        $task = LeadTask::create($validated);

        // Record Lead Activity
        try {
            LeadActivity::create([
                'lead_id' => $task->lead_id,
                'user_id' => auth()->id(),
                'activity_type' => 'Task Created',
                'title' => auth()->user()->name . ' scheduled a ' . ucfirst($task->type) . ': ' . $task->title,
                'description' => 'Due date: ' . Carbon::parse($task->due_date)->format('M d, Y') . ($task->due_time ? ' at ' . $task->due_time : '') . ($task->description ? ' - ' . $task->description : ''),
                'created_by' => createdBy(),
            ]);
        } catch (\Exception $e) {
            // Activity log failure should not break task creation
        }

        return redirect()->back()->with('success', __('Task created successfully.'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $isAdmin = $this->isAdmin();
        $query = LeadTask::where('id', $id)->where('created_by', createdBy());

        if (!$isAdmin) {
            $query->where('assigned_to', auth()->id());
        }

        $task = $query->first();
        if (!$task) {
            return redirect()->back()->with('error', __('Task not found or access denied.'));
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'lead_id' => 'required|exists:leads,id',
            'assigned_to' => 'nullable|exists:users,id',
            'type' => 'required|in:task,call,meeting,email,followup,demo',
            'priority' => 'required|in:low,medium,high,urgent',
            'status' => 'required|in:pending,in_progress,completed,cancelled',
            'due_date' => 'required|date',
            'due_time' => 'nullable|string|max:10',
            'description' => 'nullable|string',
        ]);

        if ($validated['status'] === 'completed' && $task->status !== 'completed') {
            $validated['completed_at'] = Carbon::now();
        } elseif ($validated['status'] !== 'completed') {
            $validated['completed_at'] = null;
        }

        $task->update($validated);

        return redirect()->back()->with('success', __('Task updated successfully.'));
    }

    /**
     * Fast toggle status for quick completion.
     */
    public function updateStatus(Request $request, $id)
    {
        $isAdmin = $this->isAdmin();
        $query = LeadTask::where('id', $id)->where('created_by', createdBy());

        if (!$isAdmin) {
            $query->where('assigned_to', auth()->id());
        }

        $task = $query->first();
        if (!$task) {
            return redirect()->back()->with('error', __('Task not found or access denied.'));
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,in_progress,completed,cancelled',
        ]);

        $task->status = $validated['status'];
        $task->completed_at = ($validated['status'] === 'completed') ? Carbon::now() : null;
        $task->save();

        return redirect()->back()->with('success', __('Task status updated.'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $isAdmin = $this->isAdmin();
        $query = LeadTask::where('id', $id)->where('created_by', createdBy());

        if (!$isAdmin) {
            $query->where('assigned_to', auth()->id());
        }

        $task = $query->first();
        if (!$task) {
            return redirect()->back()->with('error', __('Task not found or access denied.'));
        }

        $task->delete();

        return redirect()->back()->with('success', __('Task deleted successfully.'));
    }
}
