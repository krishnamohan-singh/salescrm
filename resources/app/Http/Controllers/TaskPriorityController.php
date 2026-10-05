<?php

namespace App\Http\Controllers;

use App\Models\TaskPriority;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskPriorityController extends Controller
{
    public function index(Request $request)
    {
        TaskPriority::seedDefaultsForTenant(createdBy());

        $query = TaskPriority::query()->where('created_by', createdBy());

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $sortField = $request->input('sort_field', 'level');
        $sortDirection = $request->input('sort_direction', 'asc');
        $allowedSorts = ['id', 'name', 'level', 'status', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection === 'desc' ? 'desc' : 'asc');
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 15)));
        $taskPriorities = $query->paginate($perPage)->withQueryString();

        return Inertia::render('task-priorities/index', [
            'taskPriorities' => $taskPriorities,
            'filters' => $request->all(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'required|string|max:20',
            'level' => 'nullable|integer|min:1|max:10',
            'description' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = createdBy();
        $validated['status'] = $validated['status'] ?? 'active';
        $validated['level'] = $validated['level'] ?? 1;

        TaskPriority::create($validated);

        return redirect()->back()->with('success', __('Task priority created successfully.'));
    }

    public function update(Request $request, TaskPriority $taskPriority)
    {
        if ($taskPriority->created_by !== createdBy()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'required|string|max:20',
            'level' => 'nullable|integer|min:1|max:10',
            'description' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
        ]);

        $taskPriority->update($validated);

        return redirect()->back()->with('success', __('Task priority updated successfully.'));
    }

    public function destroy(TaskPriority $taskPriority)
    {
        if ($taskPriority->created_by !== createdBy()) {
            abort(403);
        }

        $taskPriority->delete();

        return redirect()->back()->with('success', __('Task priority deleted successfully.'));
    }

    public function toggleStatus(TaskPriority $taskPriority)
    {
        if ($taskPriority->created_by !== createdBy()) {
            abort(403);
        }

        $taskPriority->status = $taskPriority->status === 'active' ? 'inactive' : 'active';
        $taskPriority->save();

        return redirect()->back()->with('success', __('Status updated successfully.'));
    }
}
