<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Account;
use App\Exports\ProjectExport;
use App\Models\User;
use Maatwebsite\Excel\Facades\Excel;


use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $query = Project::query()
            ->with(['account', 'assignedUser', 'creator'])
            ->where('created_by', createdBy());

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('code', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Handle filters
        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('priority') && !empty($request->priority) && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        if ($request->has('account_id') && !empty($request->account_id) && $request->account_id !== 'all') {
            $query->where('account_id', $request->account_id);
        }

        // Visibility scoping
        $user = auth()->user();
        $canViewAll = hasFullModuleAccess('projects', $user) || hasFullModuleAccess('project-tasks', $user);
        if (!$canViewAll) {
            $query->where('assigned_to', $user->id);
        } else {
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
        $allowedSorts = ['id', 'name', 'code'];
        $allowedDirection = ['asc', 'desc'];
        if (!in_array($sortDirection, $allowedDirection)) {
            $sortDirection = 'desc';
        }
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 12)));
        $projects = $query->paginate($perPage)->withQueryString();

        // Eager-load task counts per project
        $projectIds = $projects->pluck('id');
        $taskData = \App\Models\ProjectTask::whereIn('project_id', $projectIds)
            ->where('created_by', createdBy())
            ->selectRaw('project_id, count(*) as total, SUM(CASE WHEN progress = 100 THEN 1 ELSE 0 END) as done_count')
            ->groupBy('project_id')
            ->get()
            ->keyBy('project_id');

        // Attach task stats to each project
        $projects->getCollection()->transform(function ($project) use ($taskData) {
            $row = $taskData[$project->id] ?? null;
            $total = $row ? (int) $row->total : 0;
            $done  = $row ? (int) $row->done_count : 0;
            $project->task_total    = $total;
            $project->task_done     = $done;
            $project->task_progress = $total > 0 ? (int) round(($done / $total) * 100) : 0;
            return $project;
        });

        $accountQuery = Account::where('created_by', createdBy());
        $allAccounts = (clone $accountQuery)->get(['id', 'name']);
        $accounts = (clone $accountQuery)->where('status', 'active')->get(['id', 'name']);

        $userQuery = \App\Models\User::where('created_by', createdBy());
        $allUsers = (clone $userQuery)->select('id', 'name', 'email', 'avatar')->get();
        $users = (clone $userQuery)->where('status', 'active')->select('id', 'name', 'email', 'avatar')->get();

        // Summary stats — apply search/priority/account/assignee filters but NOT status
        $statsQuery = Project::where('created_by', createdBy());
        if ($request->has('search') && !empty($request->search)) {
            $statsQuery->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('code', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }
        if ($request->has('priority') && !empty($request->priority) && $request->priority !== 'all') {
            $statsQuery->where('priority', $request->priority);
        }
        if ($request->has('account_id') && !empty($request->account_id) && $request->account_id !== 'all') {
            $statsQuery->where('account_id', $request->account_id);
        }
        if ($request->has('assigned_to') && !empty($request->assigned_to) && $request->assigned_to !== 'all') {
            if ($request->assigned_to === 'unassigned') {
                $statsQuery->whereNull('assigned_to');
            } else {
                $statsQuery->where('assigned_to', $request->assigned_to);
            }
        }
        $stats = [
            'total'    => (clone $statsQuery)->count(),
            'ongoing'  => (clone $statsQuery)->where('status', 'active')->count(),
            'on_hold'  => (clone $statsQuery)->where('status', 'on_hold')->count(),
            'completed'=> (clone $statsQuery)->where('status', 'completed')->count(),
            'inactive' => (clone $statsQuery)->where('status', 'inactive')->count(),
            'overdue'  => (clone $statsQuery)->whereNotIn('status', ['completed'])->whereNotNull('end_date')->whereDate('end_date', '<', now())->count(),
        ];

        // Get plan limits
        $planLimits = null;
        $user = User::find(createdBy());
        $plan = $user->getCurrentPlan();
        $currentProjectCount = Project::where('created_by', $user->id)->count();
        $planLimits = [
            'current_projects' => $currentProjectCount,
            'max_projects' => $plan->max_projects,
            'can_create' => $currentProjectCount < $plan->max_projects
        ];

        return Inertia::render('projects/index', [
            'projects' => $projects,
            'accounts' => $accounts,
            'allAccounts' => $allAccounts,
            'users' => $users,
            'allUsers' => $allUsers,
            'planLimits' => $planLimits,
            'stats' => $stats,
            'canViewAll' => $canViewAll,
            'filters' => $request->all(['search', 'status', 'priority', 'account_id', 'assigned_to', 'sort_field', 'sort_direction', 'per_page', 'view', 'page']),
        ]);
    }

    public function show($id)
    {
        $tenantId = createdBy();
        \App\Models\TaskStatus::seedDefaultsForTenant($tenantId);

        $project = Project::with(['account', 'assignedUser', 'creator'])
            ->where('created_by', $tenantId)
            ->findOrFail($id);

        // Get task statistics
        $taskStats = \App\Models\ProjectTask::with('taskStatus')
            ->where('project_id', $id)
            ->where('created_by', $tenantId)
            ->get()
            ->groupBy(function ($task) {
                return $task->taskStatus ? $task->taskStatus->name : 'To Do';
            })
            ->map(function ($tasks) {
                return $tasks->count();
            })
            ->toArray();

        $totalTasks = array_sum($taskStats);
        $completedTasks = ($taskStats['Done'] ?? 0) + ($taskStats['Completed'] ?? 0);
        $progressPercentage = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 1) : 0;

        $parentMeetings = \App\Models\Meeting::with(['assignedUser'])
            ->where('parent_module', 'project')
            ->where('parent_id', $id)
            ->where('created_by', $tenantId)
            ->get();

        // Get related calls
        $parentCalls = \App\Models\Call::with(['assignedUser'])
            ->where('parent_module', 'project')
            ->where('parent_id', $id)
            ->where('created_by', $tenantId)
            ->get()
            ->map(function ($call) {
                $call->type = 'call';
                return $call;
            });

        $meetings = $parentMeetings->merge($parentCalls)->sortByDesc('start_date')->values();

        // Get all task statuses for dynamic display
        $taskStatuses = \App\Models\TaskStatus::where('created_by', $tenantId)
            ->where('status', 'active')
            ->orderBy('id')
            ->get(['id', 'name', 'color']);

        if ($taskStatuses->isEmpty()) {
            $taskStatuses = \App\Models\TaskStatus::where('created_by', $tenantId)->orderBy('id')->get(['id', 'name', 'color']);
        }

        return Inertia::render('projects/show', [
            'project' => $project,
            'taskStats' => $taskStats,
            'totalTasks' => $totalTasks,
            'completedTasks' => $completedTasks,
            'progressPercentage' => $progressPercentage,
            'meetings' => $meetings,
            'taskStatuses' => $taskStatuses,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) {
                if ($value && Project::where('code', $value)->where('created_by', createdBy())->exists()) {
                    $fail('The code has already been taken.');
                }
            }],
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'budget' => 'nullable|numeric|min:0',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'status' => 'nullable|in:active,inactive,completed,on_hold',
            'account_id' => 'required|exists:accounts,id',
            'assigned_to' => 'required|exists:users,id',
        ]);

        // Check project limit for company users
        if (auth()->user()->type === 'company') {
            $user = auth()->user();
            $plan = $user->getCurrentPlan();

            if ($plan && $plan->max_projects > 0) {
                $currentProjectCount = Project::where('created_by', $user->id)->count();

                if ($currentProjectCount >= $plan->max_projects) {
                    return redirect()->back()->with('error', __('Project limit exceeded. Your plan allows maximum :limit projects.', ['limit' => $plan->max_projects]));
                }
            }
        }

        $validated['created_by'] = createdBy();

        Project::create($validated);

        return redirect()->back()->with('success', __('Project created successfully.'));
    }

    public function update(Request $request, $projectId)
    {
        $project = Project::where('id', $projectId)
            ->where('created_by', createdBy())
            ->first();

        if ($project) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'code' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) use ($projectId) {
                        if ($value && Project::where('code', $value)->where('created_by', createdBy())->where('id', '!=', $projectId)->exists()) {
                            $fail('The code has already been taken.');
                        }
                    }],
                    'description' => 'nullable|string',
                    'start_date' => 'nullable|date',
                    'end_date' => 'nullable|date|after_or_equal:start_date',
                    'budget' => 'nullable|numeric|min:0',
                    'priority' => 'nullable|in:low,medium,high,urgent',
                    'status' => 'nullable|in:active,inactive,completed,on_hold',
                    'account_id' => 'required|exists:accounts,id',
                    'assigned_to' => 'required|exists:users,id',
                ]);

                $project->update($validated);

                return redirect()->back()->with('success', __('Project updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update project.'));
            }
        } else {
            return redirect()->back()->with('error', __('Project not found.'));
        }
    }

    public function destroy($projectId)
    {
        $project = Project::where('id', $projectId)
            ->where('created_by', createdBy())
            ->first();

        if ($project) {
            try {
                $project->delete();
                return redirect()->back()->with('success', __('Project deleted successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete project.'));
            }
        } else {
            return redirect()->back()->with('error', __('Project not found.'));
        }
    }

    public function toggleStatus(Request $request, $projectId)
    {
        $project = Project::where('id', $projectId)
            ->where('created_by', createdBy())
            ->first();

        if ($project) {
            try {
                $validated = $request->validate([
                    'status' => 'required|in:active,inactive,completed,on_hold'
                ]);

                $project->update(['status' => $validated['status']]);

                return redirect()->back()->with('success', __('Project status updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update project status.'));
            }
        } else {
            return redirect()->back()->with('error', __('Project not found.'));
        }
    }

    public function fileExport()
    {
        if (!auth()->user()->can('export-projects')) {
            return redirect()->back()->with('error', __('Permission denied.'));
        }

        $name = 'project_' . date('Y-m-d_H-i-s');
        return Excel::download(new ProjectExport(), $name . '.xlsx');
    }
}
