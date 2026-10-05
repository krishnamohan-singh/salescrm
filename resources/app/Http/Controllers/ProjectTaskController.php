<?php

namespace App\Http\Controllers;

use App\Models\ProjectTask;
use App\Models\Project;
use App\Models\User;
use App\Models\TaskStatus;
use App\Exports\ProjectTaskExport;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ProjectTaskController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = createdBy();
        $user = auth()->user();
        $canViewAll = hasFullModuleAccess('project-tasks', $user);
        TaskStatus::seedDefaultsForTenant($tenantId);

        $query = ProjectTask::query()
            ->with(['project', 'assignedUser', 'creator', 'parent', 'taskStatus'])
            ->where('created_by', $tenantId);

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('task_status_id', $request->status);
        }

        if ($request->has('priority') && !empty($request->priority) && $request->priority !== 'all') {
            $query->where('priority', $request->priority);
        }

        if ($request->has('project_id') && !empty($request->project_id) && $request->project_id !== 'all') {
            $query->where('project_id', $request->project_id);
        }

        // Visibility scoping
        if (!$canViewAll) {
            $query->where('assigned_to', $user->id);
        } else {
            if ($request->has('assigned_to') && !empty($request->assigned_to) && $request->assigned_to !== 'all') {
                $query->where('assigned_to', $request->assigned_to);
            }
        }

        $sortField = $request->input('sort_field', 'id');
        $sortDirection = $request->input('sort_direction', 'desc');
        $allowedSorts=['id', 'title'];
        $allowedDirection = ['asc', 'desc'];
        if (!in_array($sortDirection, $allowedDirection)) {
            $sortDirection = 'desc';
        }
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        $allTasks = $query->get();

        $projectQuery = Project::where('created_by', $tenantId);
        $allProjects = (clone $projectQuery)->get(['id', 'name']);
        $projects = (clone $projectQuery)->where('status', 'active')->get(['id', 'name']);

        $userQuery = User::where('created_by', $tenantId);
        $allUsers = (clone $userQuery)->select('id', 'name', 'email')->get();
        $users = (clone $userQuery)->where('status', 'active')->select('id', 'name', 'email')->get();

        $parentTasks = [];

        $taskStatusQuery = TaskStatus::where('created_by', $tenantId);
        $allTaskStatuses = (clone $taskStatusQuery)->select('id', 'name', 'color')->get();
        $taskStatuses = (clone $taskStatusQuery)->where('status', 'active')->select('id', 'name', 'color')->get();

        if ($taskStatuses->isEmpty()) {
            $taskStatuses = $allTaskStatuses->isNotEmpty() ? $allTaskStatuses : TaskStatus::where('created_by', $tenantId)->get();
        }

        $defaultStatusId = $taskStatuses->first()?->id;

        $groupedTasks = $allTasks->map(function ($task) use ($defaultStatusId, $taskStatuses) {
            $statusId = $task->task_status_id;
            if (!$taskStatuses->contains('id', $statusId)) {
                $statusId = $defaultStatusId ?: $task->task_status_id;
            }

            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'priority' => $task->priority,
                'progress' => $task->progress,
                'start_date' => $task->start_date,
                'due_date' => $task->due_date,
                'task_status_id' => $statusId,
                'project' => $task->project,
                'assigned_user' => $task->assignedUser,
                'parent' => $task->parent,
                'parent_id' => $task->parent_id,
                'estimated_hours' => $task->estimated_hours,
                'actual_hours' => $task->actual_hours,
                'created_at' => $task->created_at,
            ];
        })->groupBy('task_status_id');

        $kanbanData = [];
        foreach ($taskStatuses as $status) {
            $kanbanData[$status->id] = [
                'status' => $status,
                'tasks' => $groupedTasks->get($status->id, collect())->values()->toArray(),
            ];
        }

        return Inertia::render('project-tasks/index', [
            'kanbanData' => $kanbanData,
            'statuses' => $taskStatuses,
            'projects' => $projects,
            'allProjects' => $allProjects,
            'users' => $users,
            'allUsers' => $allUsers,
            'canViewAll' => $canViewAll,
            'parentTasks' => $parentTasks,
            'taskStatuses' => $taskStatuses,
            'allTaskStatuses' => $allTaskStatuses,
            'filters' => $request->all(['search', 'status', 'priority', 'project_id', 'assigned_to']),
        ]);
    }

    public function show($id)
    {
        $tenantId = createdBy();
        TaskStatus::seedDefaultsForTenant($tenantId);

        $task = ProjectTask::with(['project', 'assignedUser', 'creator', 'parent', 'subtasks.assignedUser', 'taskStatus'])
            ->where('created_by', $tenantId)
            ->findOrFail($id);

        $taskStatuses = TaskStatus::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'color')
            ->get();

        if ($taskStatuses->isEmpty()) {
            $taskStatuses = TaskStatus::where('created_by', $tenantId)->select('id', 'name', 'color')->get();
        }

        return Inertia::render('project-tasks/show', [
            'task' => $task,
            'taskStatuses' => $taskStatuses,
        ]);
    }

    public function store(Request $request)
    {
        $tenantId = createdBy();
        TaskStatus::seedDefaultsForTenant($tenantId);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'project_id' => 'required|exists:projects,id',
            'parent_id' => 'nullable|exists:project_tasks,id',
            'assigned_to' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'task_status_id' => 'nullable|integer|exists:task_statuses,id',
            'estimated_hours' => 'nullable|numeric|min:0',
            'actual_hours' => 'nullable|numeric|min:0',
            'progress' => 'nullable|integer|min:0|max:100',
        ]);

        $validated['created_by'] = $tenantId;

        // Convert empty string or 'unassigned' to null
        if (empty($validated['assigned_to']) || $validated['assigned_to'] === 'unassigned') {
            $validated['assigned_to'] = null;
        }

        // Set default task status if not provided
        if (empty($validated['task_status_id'])) {
            $defaultStatus = TaskStatus::where('created_by', $tenantId)
                ->where('status', 'active')
                ->where(function ($q) {
                    $q->where('is_default', true)
                      ->orWhere('name', 'To Do')
                      ->orWhere('name', 'Pending');
                })
                ->first() ?: TaskStatus::where('created_by', $tenantId)->first();

            if ($defaultStatus) {
                $validated['task_status_id'] = $defaultStatus->id;
            }
        }

        $task = ProjectTask::create($validated);
        if (isEmailTemplateEnabled('Task Assigned', $tenantId) && $task && $task->assigned_to && !IsDemo()) {
            event(new \App\Events\TaskAssigned($task));
        }

        return redirect()->back()->with('success', __('Task created successfully.'));
    }

    public function update(Request $request, $taskId)
    {
        $tenantId = createdBy();
        TaskStatus::seedDefaultsForTenant($tenantId);

        $task = ProjectTask::where('id', $taskId)
            ->where('created_by', $tenantId)
            ->first();

        if ($task) {
            try {
                $validated = $request->validate([
                    'title' => 'required|string|max:255',
                    'description' => 'nullable|string',
                    'project_id' => 'required|exists:projects,id',
                    'parent_id' => 'nullable|exists:project_tasks,id',
                    'assigned_to' => 'nullable|exists:users,id',
                    'start_date' => 'nullable|date',
                    'due_date' => 'nullable|date|after_or_equal:start_date',
                    'priority' => 'nullable|in:low,medium,high,urgent',
                    'task_status_id' => 'nullable|integer',
                    'estimated_hours' => 'nullable|numeric|min:0',
                    'actual_hours' => 'nullable|numeric|min:0',
                    'progress' => 'nullable|integer|min:0|max:100',
                ]);

                // Convert empty string or 'unassigned' to null
                if (empty($validated['assigned_to']) || $validated['assigned_to'] === 'unassigned') {
                    $validated['assigned_to'] = null;
                }

                // Validate task_status_id belongs to current user
                if (!empty($validated['task_status_id'])) {
                    $statusExists = TaskStatus::where('id', $validated['task_status_id'])
                        ->where('created_by', $tenantId)
                        ->exists();

                    if (!$statusExists) {
                        return redirect()->back()->with('error', __('Invalid task status.'));
                    }
                }

                $task->update($validated);

                return redirect()->back()->with('success', __('Task updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update task.'));
            }
        } else {
            return redirect()->back()->with('error', __('Task not found.'));
        }
    }

    public function destroy($taskId)
    {
        $tenantId = createdBy();
        $task = ProjectTask::with('taskStatus')
            ->where('id', $taskId)
            ->where('created_by', $tenantId)
            ->first();

        if ($task) {
            // Prevent deletion if task is in specific status
            if ($task->taskStatus && in_array($task->taskStatus->name, ['In Progress', 'Review'])) {
                return redirect()->back()->with('error', __('Cannot delete task in ' . $task->taskStatus->name . ' status.'));
            }

            try {
                $task->delete();
                return redirect()->back()->with('success', __('Task deleted successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete task.'));
            }
        } else {
            return redirect()->back()->with('error', __('Task not found.'));
        }
    }

    public function toggleStatus(Request $request, $taskId)
    {
        $tenantId = createdBy();
        TaskStatus::seedDefaultsForTenant($tenantId);

        $task = ProjectTask::where('id', $taskId)
            ->where('created_by', $tenantId)
            ->first();

        if ($task) {
            try {
                $validated = $request->validate([
                    'task_status_id' => 'required|integer|exists:task_statuses,id'
                ]);

                // Validate task_status_id belongs to current user
                $statusExists = TaskStatus::where('id', $validated['task_status_id'])
                    ->where('created_by', $tenantId)
                    ->exists();

                if (!$statusExists) {
                    return redirect()->back()->with('error', __('Invalid task status.'));
                }

                $task->update(['task_status_id' => $validated['task_status_id']]);

                return redirect()->back()->with('success', __('Task status updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update task status.'));
            }
        } else {
            return redirect()->back()->with('error', __('Task not found.'));
        }
    }

    public function kanban(Request $request, $projectId)
    {
        $tenantId = createdBy();
        TaskStatus::seedDefaultsForTenant($tenantId);

        $project = Project::where('id', $projectId)
            ->where('created_by', $tenantId)
            ->firstOrFail();

        $statusesCollection = TaskStatus::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'color')
            ->get();

        if ($statusesCollection->isEmpty()) {
            $statusesCollection = TaskStatus::where('created_by', $tenantId)->select('id', 'name', 'color')->get();
        }

        $statuses = $statusesCollection
            ->map(fn($s) => ['id' => $s->id, 'name' => $s->name, 'color' => $s->color])
            ->toArray();

        $defaultStatusId = $statusesCollection->first()?->id;

        $taskQuery = ProjectTask::with(['assignedUser', 'taskStatus'])
            ->where('project_id', $projectId)
            ->where('created_by', $tenantId);

        if (!empty($request->search)) {
            $taskQuery->where(fn($q) => $q->where('title', 'like', '%' . $request->search . '%')
                ->orWhere('description', 'like', '%' . $request->search . '%'));
        }

        if (!empty($request->status) && $request->status !== 'all') {
            $taskQuery->where('task_status_id', $request->status);
        }

        if (!empty($request->priority) && $request->priority !== 'all') {
            $taskQuery->where('priority', $request->priority);
        }

        $user = auth()->user();
        $canViewAll = hasFullModuleAccess('project-tasks', $user);
        if (!$canViewAll) {
            $taskQuery->where('assigned_to', $user->id);
        } else {
            if (!empty($request->assigned_to) && $request->assigned_to !== 'all') {
                $taskQuery->where('assigned_to', $request->assigned_to);
            }
        }

        $tasks = $taskQuery->get()
            ->map(function ($task) use ($defaultStatusId, $statusesCollection) {
                $statusId = $task->task_status_id;
                if (!$statusesCollection->contains('id', $statusId)) {
                    $statusId = $defaultStatusId ?: $task->task_status_id;
                }
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'priority' => $task->priority,
                    'progress' => $task->progress,
                    'start_date' => $task->start_date,
                    'due_date' => $task->due_date,
                    'task_status_id' => $statusId,
                    'assigned_user' => $task->assignedUser,
                    'created_at' => $task->created_at,
                ];
            })
            ->groupBy('task_status_id');

        $kanbanData = [];
        foreach ($statuses as $status) {
            $kanbanData[$status['id']] = [
                'status' => $status,
                'tasks' => $tasks->get($status['id'], collect())->values()->toArray()
            ];
        }

        $users = User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('projects/kanban', [
            'project' => $project,
            'kanbanData' => $kanbanData,
            'statuses' => $statuses,
            'users' => $users,
            'filters' => $request->only(['search', 'status', 'priority']),
        ]);
    }

    public function gantt(Request $request, $projectId)
    {
        $tenantId = createdBy();
        TaskStatus::seedDefaultsForTenant($tenantId);

        $project = Project::where('id', $projectId)
            ->where('created_by', $tenantId)
            ->firstOrFail();

        if (IsDemo()) {
            $tasks = [
                [
                    'id' => 1,
                    'title' => 'Project Planning',
                    'description' => 'Initial project planning and requirements gathering',
                    'start_date' => now()->subDays(10)->format('Y-m-d'),
                    'due_date' => now()->subDays(5)->format('Y-m-d'),
                    'priority' => 'high',
                    'progress' => 100,
                    'task_status' => ['id' => 1, 'name' => 'Done', 'color' => '#10b981'],
                    'assigned_user' => ['id' => 1, 'name' => 'John Doe', 'email' => 'john@example.com']
                ],
                [
                    'id' => 2,
                    'title' => 'Design Phase',
                    'description' => 'UI/UX design and mockups',
                    'start_date' => now()->subDays(5)->format('Y-m-d'),
                    'due_date' => now()->addDays(2)->format('Y-m-d'),
                    'priority' => 'high',
                    'progress' => 75,
                    'task_status' => ['id' => 2, 'name' => 'In Progress', 'color' => '#3b82f6'],
                    'assigned_user' => ['id' => 2, 'name' => 'Jane Smith', 'email' => 'jane@example.com']
                ],
                [
                    'id' => 3,
                    'title' => 'Backend Development',
                    'description' => 'API development and database setup',
                    'start_date' => now()->format('Y-m-d'),
                    'due_date' => now()->addDays(15)->format('Y-m-d'),
                    'priority' => 'urgent',
                    'progress' => 30,
                    'task_status' => ['id' => 2, 'name' => 'In Progress', 'color' => '#3b82f6'],
                    'assigned_user' => ['id' => 3, 'name' => 'Mike Johnson', 'email' => 'mike@example.com']
                ],
                [
                    'id' => 4,
                    'title' => 'Frontend Development',
                    'description' => 'React components and pages',
                    'start_date' => now()->addDays(3)->format('Y-m-d'),
                    'due_date' => now()->addDays(20)->format('Y-m-d'),
                    'priority' => 'high',
                    'progress' => 0,
                    'task_status' => ['id' => 3, 'name' => 'To Do', 'color' => '#6b7280'],
                    'assigned_user' => ['id' => 4, 'name' => 'Sarah Williams', 'email' => 'sarah@example.com']
                ],
                [
                    'id' => 5,
                    'title' => 'Testing & QA',
                    'description' => 'Quality assurance and bug fixes',
                    'start_date' => now()->addDays(18)->format('Y-m-d'),
                    'due_date' => now()->addDays(25)->format('Y-m-d'),
                    'priority' => 'medium',
                    'progress' => 0,
                    'task_status' => ['id' => 3, 'name' => 'To Do', 'color' => '#6b7280'],
                    'assigned_user' => ['id' => 5, 'name' => 'Tom Brown', 'email' => 'tom@example.com']
                ],
                [
                    'id' => 6,
                    'title' => 'Deployment',
                    'description' => 'Production deployment and monitoring',
                    'start_date' => now()->addDays(25)->format('Y-m-d'),
                    'due_date' => now()->addDays(30)->format('Y-m-d'),
                    'priority' => 'high',
                    'progress' => 0,
                    'task_status' => ['id' => 3, 'name' => 'To Do', 'color' => '#6b7280'],
                    'assigned_user' => ['id' => 1, 'name' => 'John Doe', 'email' => 'john@example.com']
                ]
            ];
        } else {
            $taskQuery = ProjectTask::with(['assignedUser', 'taskStatus'])
                ->where('project_id', $projectId)
                ->where('created_by', $tenantId);

            if (!empty($request->search)) {
                $taskQuery->where(fn($q) => $q->where('title', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%'));
            }

            if (!empty($request->status) && $request->status !== 'all') {
                $taskQuery->where('task_status_id', $request->status);
            }

            if (!empty($request->priority) && $request->priority !== 'all') {
                $taskQuery->where('priority', $request->priority);
            }

            $tasks = $taskQuery->orderBy('start_date')->get();
        }

        $users = User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email')
            ->get();

        $taskStatuses = TaskStatus::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'color')
            ->get();

        if ($taskStatuses->isEmpty()) {
            $taskStatuses = TaskStatus::where('created_by', $tenantId)->select('id', 'name', 'color')->get();
        }

        return Inertia::render('projects/gantt', [
            'project' => $project,
            'tasks' => $tasks,
            'users' => $users,
            'taskStatuses' => $taskStatuses,
            'filters' => $request->only(['search', 'status', 'priority']),
        ]);
    }

    public function updateStatus($taskId)
    {
        $tenantId = createdBy();
        $task = ProjectTask::where('id', $taskId)
            ->where('created_by', $tenantId)
            ->first();

        if (!$task) {
            return back()->with('error', __('Task not found.'));
        }

        $validated = request()->validate([
            'task_status_id' => 'required|exists:task_statuses,id'
        ]);

        $task->update(['task_status_id' => $validated['task_status_id']]);

        return back()->with('success', __('Task status updated successfully.'));
    }

    public function getParentTasks($projectId)
    {
        $tenantId = createdBy();
        $parentTasks = ProjectTask::where('created_by', $tenantId)
            ->where('project_id', $projectId)
            ->whereNull('parent_id')
            ->select('id', 'title')
            ->get();

        return response()->json($parentTasks);
    }

    public function fileExport()
    {
        if (!auth()->user()->can('export-project-tasks')) {
            return redirect()->back()->with('error', __('Permission denied.'));
        }

        $name = 'project_tasks_' . date('Y-m-d_H-i-s');
        return Excel::download(new ProjectTaskExport(), $name . '.xlsx');
    }

    public function getProjectDetails($projectId)
    {
        $tenantId = createdBy();
        $parentTasks = ProjectTask::where('created_by', $tenantId)
            ->where('project_id', $projectId)
            ->whereNull('parent_id')
            ->select('id', 'title')
            ->get();

        return response()->json([
            'parent_tasks' => $parentTasks
        ]);
    }
}
