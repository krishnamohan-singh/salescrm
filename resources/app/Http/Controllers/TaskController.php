<?php

namespace App\Http\Controllers;

use App\Models\Task;
use App\Models\TaskStatus;
use App\Models\TaskType;
use App\Models\TaskPriority;
use App\Models\Lead;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Opportunity;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $tenantId = createdBy();
        $canViewAll = hasFullModuleAccess('tasks', $user);
        $isAdmin = $canViewAll;

        // Seed default masters if tenant has none
        TaskStatus::seedDefaultsForTenant($tenantId);
        TaskType::seedDefaultsForTenant($tenantId);
        TaskPriority::seedDefaultsForTenant($tenantId);

        // Base query scoped to tenant and role
        $baseQuery = Task::query()
            ->with([
                'lead:id,name,company,email,phone',
                'account:id,name,email,phone',
                'contact:id,name,email,phone',
                'opportunity:id,name,amount',
                'assignedUser:id,name,email,avatar',
                'creator:id,name',
                'taskStatus:id,name,color',
                'taskType:id,name,icon,color',
                'taskPriority:id,name,color,level',
            ])
            ->where('created_by', $tenantId);

        // Staff visibility scoping: only assigned tasks
        if (!$canViewAll) {
            $baseQuery->where('assigned_to', $user->id);
        }

        $today = Carbon::today()->format('Y-m-d');
        $weekStart = Carbon::now()->startOfWeek()->format('Y-m-d');
        $weekEnd = Carbon::now()->endOfWeek()->format('Y-m-d');

        // Calculate KPI stats
        $stats = [
            'all' => (clone $baseQuery)->count(),
            'today' => (clone $baseQuery)->whereDate('due_date', $today)->whereNotIn('status', ['cancelled'])->count(),
            'overdue' => (clone $baseQuery)->whereDate('due_date', '<', $today)->whereNotIn('status', ['completed', 'cancelled'])->count(),
            'upcoming' => (clone $baseQuery)->whereDate('due_date', '>', $today)->whereNotIn('status', ['completed', 'cancelled'])->count(),
            'this_week' => (clone $baseQuery)->whereBetween('due_date', [$weekStart, $weekEnd])->count(),
            'completed' => (clone $baseQuery)->where('status', 'completed')->count(),
        ];

        // Apply Entity Type Filter (All, Leads, Accounts, Contacts, Opportunities)
        $entityType = $request->get('entity_type', 'all');
        if ($entityType && $entityType !== 'all') {
            switch ($entityType) {
                case 'lead':
                    $baseQuery->whereNotNull('lead_id');
                    break;
                case 'account':
                    $baseQuery->whereNotNull('account_id');
                    break;
                case 'contact':
                    $baseQuery->whereNotNull('contact_id');
                    break;
                case 'opportunity':
                    $baseQuery->whereNotNull('opportunity_id');
                    break;
            }
        }

        // Apply Tab Quick Filter (Today, Overdue, Upcoming, This Week, Completed)
        $tab = $request->get('tab', 'all');
        if ($tab === 'today') {
            $baseQuery->whereDate('due_date', $today);
        } elseif ($tab === 'overdue') {
            $baseQuery->whereDate('due_date', '<', $today)->whereNotIn('status', ['completed', 'cancelled']);
        } elseif ($tab === 'upcoming') {
            $baseQuery->whereDate('due_date', '>', $today)->whereNotIn('status', ['completed', 'cancelled']);
        } elseif ($tab === 'this_week') {
            $baseQuery->whereBetween('due_date', [$weekStart, $weekEnd]);
        } elseif ($tab === 'completed') {
            $baseQuery->where('status', 'completed');
        }

        // Search Filter
        if ($request->filled('search')) {
            $search = $request->search;
            $baseQuery->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('lead', fn($sub) => $sub->where('name', 'like', "%{$search}%")->orWhere('company', 'like', "%{$search}%"))
                    ->orWhereHas('account', fn($sub) => $sub->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('contact', fn($sub) => $sub->where('name', 'like', "%{$search}%"))
                    ->orWhereHas('opportunity', fn($sub) => $sub->where('name', 'like', "%{$search}%"));
            });
        }

        // Dropdown Filters
        if ($request->filled('status') && $request->status !== 'all') {
            $status = $request->status;
            if (is_numeric($status)) {
                $baseQuery->where('task_status_id', $status);
            } else {
                $baseQuery->where(function ($q) use ($status) {
                    $q->where('status', $status)
                        ->orWhereHas('taskStatus', fn($sub) => $sub->where('name', 'like', "%{$status}%"));
                });
            }
        }
        if ($request->filled('task_status_id') && $request->task_status_id !== 'all') {
            $baseQuery->where('task_status_id', $request->task_status_id);
        }
        if ($request->filled('type') && $request->type !== 'all') {
            $type = $request->type;
            if (is_numeric($type)) {
                $baseQuery->where('task_type_id', $type);
            } else {
                $cleanType = str_replace(['_', '-'], ' ', $type);
                $baseQuery->where(function ($q) use ($type, $cleanType) {
                    $q->where('type', $type)
                        ->orWhereHas('taskType', fn($sub) => $sub->where('name', 'like', "%{$cleanType}%")->orWhere('name', 'like', "%{$type}%"));
                });
            }
        }
        if ($request->filled('task_type_id') && $request->task_type_id !== 'all') {
            $baseQuery->where('task_type_id', $request->task_type_id);
        }
        if ($request->filled('priority') && $request->priority !== 'all') {
            $priority = $request->priority;
            if (is_numeric($priority)) {
                $baseQuery->where('task_priority_id', $priority);
            } else {
                $cleanPrio = str_replace(['_', '-'], ' ', $priority);
                $baseQuery->where(function ($q) use ($priority, $cleanPrio) {
                    $q->where('priority', $priority)
                        ->orWhereHas('taskPriority', fn($sub) => $sub->where('name', 'like', "%{$cleanPrio}%"));
                });
            }
        }
        if ($request->filled('task_priority_id') && $request->task_priority_id !== 'all') {
            $baseQuery->where('task_priority_id', $request->task_priority_id);
        }
        if ($request->filled('assigned_to') && $request->assigned_to !== 'all' && $isAdmin) {
            $baseQuery->where('assigned_to', $request->assigned_to);
        }

        // Entity ID direct filters
        if ($request->filled('lead_id') && $request->lead_id !== 'all') {
            $baseQuery->where('lead_id', $request->lead_id);
        }
        if ($request->filled('account_id') && $request->account_id !== 'all') {
            $baseQuery->where('account_id', $request->account_id);
        }
        if ($request->filled('contact_id') && $request->contact_id !== 'all') {
            $baseQuery->where('contact_id', $request->contact_id);
        }
        if ($request->filled('opportunity_id') && $request->opportunity_id !== 'all') {
            $baseQuery->where('opportunity_id', $request->opportunity_id);
        }

        // Sorting
        $sortField = $request->get('sort_field', 'due_date');
        $sortDirection = $request->get('sort_direction', 'asc');
        $allowedSorts = ['id', 'title', 'due_date', 'status', 'priority', 'type', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $baseQuery->orderBy($sortField, $sortDirection === 'desc' ? 'desc' : 'asc');
        } else {
            $baseQuery->orderBy('due_date', 'asc');
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 15)));
        $tasks = $baseQuery->paginate($perPage)->withQueryString();

        // Datasets for forms & filters
        $leads = Lead::where('created_by', $tenantId)->select('id', 'name', 'company')->orderBy('name')->get();
        $accounts = Account::where('created_by', $tenantId)->select('id', 'name')->orderBy('name')->get();
        $contacts = Contact::where('created_by', $tenantId)->select('id', 'name', 'email')->orderBy('name')->get();
        $opportunities = Opportunity::where('created_by', $tenantId)->select('id', 'name')->orderBy('name')->get();
        $users = User::where('created_by', $tenantId)->where('status', 'active')->select('id', 'name', 'email', 'avatar')->orderBy('name')->get();

        $taskStatuses = TaskStatus::where('created_by', $tenantId)->where('status', 'active')->orderBy('id')->get();
        $taskTypes = TaskType::where('created_by', $tenantId)->where('status', 'active')->orderBy('id')->get();
        $taskPriorities = TaskPriority::where('created_by', $tenantId)->where('status', 'active')->orderBy('level')->get();

        return Inertia::render('tasks/index', [
            'tasks' => $tasks,
            'stats' => $stats,
            'leads' => $leads,
            'accounts' => $accounts,
            'contacts' => $contacts,
            'opportunities' => $opportunities,
            'users' => $users,
            'taskStatuses' => $taskStatuses,
            'taskTypes' => $taskTypes,
            'taskPriorities' => $taskPriorities,
            'isAdmin' => $isAdmin,
            'canViewAll' => $canViewAll,
            'filters' => $request->all([
                'search', 'tab', 'entity_type', 'status', 'task_status_id',
                'type', 'task_type_id', 'priority', 'task_priority_id',
                'assigned_to', 'lead_id', 'account_id', 'contact_id', 'opportunity_id',
                'sort_field', 'sort_direction', 'per_page', 'page'
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:65535',
            'parent_type' => 'required|in:lead,account,contact,opportunity,none',
            'parent_id' => 'nullable|integer',
            'lead_id' => 'nullable|exists:leads,id',
            'account_id' => 'nullable|exists:accounts,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'opportunity_id' => 'nullable|exists:opportunities,id',
            'assigned_to' => 'nullable|exists:users,id',
            'task_status_id' => 'nullable|exists:task_statuses,id',
            'task_type_id' => 'nullable|exists:task_types,id',
            'task_priority_id' => 'nullable|exists:task_priorities,id',
            'type' => 'nullable|string|max:50',
            'priority' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'due_date' => 'required|date',
            'due_time' => 'nullable|string|max:10',
        ]);

        $tenantId = createdBy();
        $validated['created_by'] = $tenantId;

        // Synchronize Task Type
        if (!empty($validated['task_type_id'])) {
            $taskType = TaskType::where('created_by', $tenantId)->find($validated['task_type_id']);
            if ($taskType) {
                $validated['type'] = strtolower(str_replace([' ', '/', '-'], '_', $taskType->name));
            }
        } elseif (!empty($validated['type'])) {
            $typeVal = $validated['type'];
            if (is_numeric($typeVal)) {
                $taskType = TaskType::where('created_by', $tenantId)->find($typeVal);
                if ($taskType) {
                    $validated['task_type_id'] = $taskType->id;
                    $validated['type'] = strtolower(str_replace([' ', '/', '-'], '_', $taskType->name));
                }
            } else {
                $cleanType = str_replace(['_', '-'], ' ', $typeVal);
                $taskType = TaskType::where('created_by', $tenantId)
                    ->where(function ($q) use ($cleanType, $typeVal) {
                        $q->where('name', 'like', "%{$cleanType}%")
                          ->orWhere('name', 'like', "%{$typeVal}%");
                    })->first();
                if ($taskType) {
                    $validated['task_type_id'] = $taskType->id;
                }
            }
        }
        $validated['type'] = $validated['type'] ?? 'followup';

        // Synchronize Task Status
        if (!empty($validated['task_status_id'])) {
            $taskStatus = TaskStatus::where('created_by', $tenantId)->find($validated['task_status_id']);
            if ($taskStatus) {
                $validated['status'] = strtolower(str_replace([' ', '/', '-'], '_', $taskStatus->name));
            }
        } elseif (!empty($validated['status'])) {
            $statusVal = $validated['status'];
            if (is_numeric($statusVal)) {
                $taskStatus = TaskStatus::where('created_by', $tenantId)->find($statusVal);
                if ($taskStatus) {
                    $validated['task_status_id'] = $taskStatus->id;
                    $validated['status'] = strtolower(str_replace([' ', '/', '-'], '_', $taskStatus->name));
                }
            } else {
                $cleanStatus = str_replace(['_', '-'], ' ', $statusVal);
                $taskStatus = TaskStatus::where('created_by', $tenantId)
                    ->where('name', 'like', "%{$cleanStatus}%")->first();
                if ($taskStatus) {
                    $validated['task_status_id'] = $taskStatus->id;
                }
            }
        }
        $validated['status'] = $validated['status'] ?? 'pending';

        // Synchronize Task Priority
        if (!empty($validated['task_priority_id'])) {
            $taskPriority = TaskPriority::where('created_by', $tenantId)->find($validated['task_priority_id']);
            if ($taskPriority) {
                $validated['priority'] = strtolower(str_replace([' ', '/', '-'], '_', $taskPriority->name));
            }
        } elseif (!empty($validated['priority'])) {
            $prioVal = $validated['priority'];
            if (is_numeric($prioVal)) {
                $taskPriority = TaskPriority::where('created_by', $tenantId)->find($prioVal);
                if ($taskPriority) {
                    $validated['task_priority_id'] = $taskPriority->id;
                    $validated['priority'] = strtolower(str_replace([' ', '/', '-'], '_', $taskPriority->name));
                }
            } else {
                $cleanPrio = str_replace(['_', '-'], ' ', $prioVal);
                $taskPriority = TaskPriority::where('created_by', $tenantId)
                    ->where('name', 'like', "%{$cleanPrio}%")->first();
                if ($taskPriority) {
                    $validated['task_priority_id'] = $taskPriority->id;
                }
            }
        }
        $validated['priority'] = $validated['priority'] ?? 'medium';

        // Auto-assign specific foreign key based on parent_type and parent_id
        if (!empty($validated['parent_type']) && !empty($validated['parent_id'])) {
            switch ($validated['parent_type']) {
                case 'lead':
                    $validated['lead_id'] = $validated['parent_id'];
                    break;
                case 'account':
                    $validated['account_id'] = $validated['parent_id'];
                    break;
                case 'contact':
                    $validated['contact_id'] = $validated['parent_id'];
                    break;
                case 'opportunity':
                    $validated['opportunity_id'] = $validated['parent_id'];
                    break;
            }
        } elseif (!empty($validated['lead_id'])) {
            $validated['parent_type'] = 'lead';
            $validated['parent_id'] = $validated['lead_id'];
        } elseif (!empty($validated['account_id'])) {
            $validated['parent_type'] = 'account';
            $validated['parent_id'] = $validated['account_id'];
        } elseif (!empty($validated['contact_id'])) {
            $validated['parent_type'] = 'contact';
            $validated['parent_id'] = $validated['contact_id'];
        } elseif (!empty($validated['opportunity_id'])) {
            $validated['parent_type'] = 'opportunity';
            $validated['parent_id'] = $validated['opportunity_id'];
        }

        if ($validated['status'] === 'completed') {
            $validated['completed_at'] = now();
        }

        Task::create($validated);

        return redirect()->back()->with('success', __('Task / Follow-up scheduled successfully.'));
    }

    public function update(Request $request, Task $task)
    {
        if ($task->created_by !== createdBy()) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:65535',
            'parent_type' => 'nullable|in:lead,account,contact,opportunity,none',
            'parent_id' => 'nullable|integer',
            'lead_id' => 'nullable|exists:leads,id',
            'account_id' => 'nullable|exists:accounts,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'opportunity_id' => 'nullable|exists:opportunities,id',
            'assigned_to' => 'nullable|exists:users,id',
            'task_status_id' => 'nullable|exists:task_statuses,id',
            'task_type_id' => 'nullable|exists:task_types,id',
            'task_priority_id' => 'nullable|exists:task_priorities,id',
            'type' => 'nullable|string|max:50',
            'priority' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'due_date' => 'required|date',
            'due_time' => 'nullable|string|max:10',
        ]);

        $tenantId = createdBy();

        // Synchronize Task Type
        if (array_key_exists('task_type_id', $validated) && !empty($validated['task_type_id'])) {
            $taskType = TaskType::where('created_by', $tenantId)->find($validated['task_type_id']);
            if ($taskType) {
                $validated['type'] = strtolower(str_replace([' ', '/', '-'], '_', $taskType->name));
            }
        } elseif (!empty($validated['type'])) {
            $typeVal = $validated['type'];
            if (is_numeric($typeVal)) {
                $taskType = TaskType::where('created_by', $tenantId)->find($typeVal);
                if ($taskType) {
                    $validated['task_type_id'] = $taskType->id;
                    $validated['type'] = strtolower(str_replace([' ', '/', '-'], '_', $taskType->name));
                }
            } else {
                $cleanType = str_replace(['_', '-'], ' ', $typeVal);
                $taskType = TaskType::where('created_by', $tenantId)
                    ->where(function ($q) use ($cleanType, $typeVal) {
                        $q->where('name', 'like', "%{$cleanType}%")
                          ->orWhere('name', 'like', "%{$typeVal}%");
                    })->first();
                if ($taskType) {
                    $validated['task_type_id'] = $taskType->id;
                }
            }
        }

        // Synchronize Task Status
        if (array_key_exists('task_status_id', $validated) && !empty($validated['task_status_id'])) {
            $taskStatus = TaskStatus::where('created_by', $tenantId)->find($validated['task_status_id']);
            if ($taskStatus) {
                $validated['status'] = strtolower(str_replace([' ', '/', '-'], '_', $taskStatus->name));
            }
        } elseif (!empty($validated['status'])) {
            $statusVal = $validated['status'];
            if (is_numeric($statusVal)) {
                $taskStatus = TaskStatus::where('created_by', $tenantId)->find($statusVal);
                if ($taskStatus) {
                    $validated['task_status_id'] = $taskStatus->id;
                    $validated['status'] = strtolower(str_replace([' ', '/', '-'], '_', $taskStatus->name));
                }
            } else {
                $cleanStatus = str_replace(['_', '-'], ' ', $statusVal);
                $taskStatus = TaskStatus::where('created_by', $tenantId)
                    ->where('name', 'like', "%{$cleanStatus}%")->first();
                if ($taskStatus) {
                    $validated['task_status_id'] = $taskStatus->id;
                }
            }
        }

        // Synchronize Task Priority
        if (array_key_exists('task_priority_id', $validated) && !empty($validated['task_priority_id'])) {
            $taskPriority = TaskPriority::where('created_by', $tenantId)->find($validated['task_priority_id']);
            if ($taskPriority) {
                $validated['priority'] = strtolower(str_replace([' ', '/', '-'], '_', $taskPriority->name));
            }
        } elseif (!empty($validated['priority'])) {
            $prioVal = $validated['priority'];
            if (is_numeric($prioVal)) {
                $taskPriority = TaskPriority::where('created_by', $tenantId)->find($prioVal);
                if ($taskPriority) {
                    $validated['task_priority_id'] = $taskPriority->id;
                    $validated['priority'] = strtolower(str_replace([' ', '/', '-'], '_', $taskPriority->name));
                }
            } else {
                $cleanPrio = str_replace(['_', '-'], ' ', $prioVal);
                $taskPriority = TaskPriority::where('created_by', $tenantId)
                    ->where('name', 'like', "%{$cleanPrio}%")->first();
                if ($taskPriority) {
                    $validated['task_priority_id'] = $taskPriority->id;
                }
            }
        }

        if (!empty($validated['parent_type']) && !empty($validated['parent_id'])) {
            $validated['lead_id'] = null;
            $validated['account_id'] = null;
            $validated['contact_id'] = null;
            $validated['opportunity_id'] = null;

            switch ($validated['parent_type']) {
                case 'lead':
                    $validated['lead_id'] = $validated['parent_id'];
                    break;
                case 'account':
                    $validated['account_id'] = $validated['parent_id'];
                    break;
                case 'contact':
                    $validated['contact_id'] = $validated['parent_id'];
                    break;
                case 'opportunity':
                    $validated['opportunity_id'] = $validated['parent_id'];
                    break;
            }
        }

        if (isset($validated['status'])) {
            if ($validated['status'] === 'completed' && $task->status !== 'completed') {
                $validated['completed_at'] = now();
            } elseif ($validated['status'] !== 'completed') {
                $validated['completed_at'] = null;
            }
        }

        $task->update($validated);

        return redirect()->back()->with('success', __('Task updated successfully.'));
    }

    public function destroy(Task $task)
    {
        if ($task->created_by !== createdBy()) {
            abort(403);
        }

        $task->delete();

        return redirect()->back()->with('success', __('Task deleted successfully.'));
    }

    public function updateStatus(Request $request, $id)
    {
        $task = Task::where('created_by', createdBy())->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|max:50',
        ]);

        $statusVal = $validated['status'];
        $cleanStatus = str_replace(['_', '-'], ' ', $statusVal);
        $taskStatus = TaskStatus::where('created_by', createdBy())
            ->where('name', 'like', "%{$cleanStatus}%")->first();

        $task->status = $statusVal;
        if ($taskStatus) {
            $task->task_status_id = $taskStatus->id;
        }
        $task->completed_at = $statusVal === 'completed' ? now() : null;
        $task->save();

        return redirect()->back()->with('success', __('Task status updated.'));
    }
}
