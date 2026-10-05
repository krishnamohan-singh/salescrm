<?php

namespace App\Http\Controllers;

use App\Models\TaskType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskTypeController extends Controller
{
    public function index(Request $request)
    {
        TaskType::seedDefaultsForTenant(createdBy());

        $query = TaskType::query()->where('created_by', createdBy());

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $sortField = $request->input('sort_field', 'id');
        $sortDirection = $request->input('sort_direction', 'asc');
        $allowedSorts = ['id', 'name', 'status', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection === 'desc' ? 'desc' : 'asc');
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 15)));
        $taskTypes = $query->paginate($perPage)->withQueryString();

        return Inertia::render('task-types/index', [
            'taskTypes' => $taskTypes,
            'filters' => $request->all(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:50',
            'color' => 'required|string|max:20',
            'description' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
        ]);

        $validated['created_by'] = createdBy();
        $validated['status'] = $validated['status'] ?? 'active';
        $validated['icon'] = $validated['icon'] ?? 'CheckSquare';

        TaskType::create($validated);

        return redirect()->back()->with('success', __('Task type created successfully.'));
    }

    public function update(Request $request, TaskType $taskType)
    {
        if ($taskType->created_by !== createdBy()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:50',
            'color' => 'required|string|max:20',
            'description' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
        ]);

        $taskType->update($validated);

        return redirect()->back()->with('success', __('Task type updated successfully.'));
    }

    public function destroy(TaskType $taskType)
    {
        if ($taskType->created_by !== createdBy()) {
            abort(403);
        }

        $taskType->delete();

        return redirect()->back()->with('success', __('Task type deleted successfully.'));
    }

    public function toggleStatus(TaskType $taskType)
    {
        if ($taskType->created_by !== createdBy()) {
            abort(403);
        }

        $taskType->status = $taskType->status === 'active' ? 'inactive' : 'active';
        $taskType->save();

        return redirect()->back()->with('success', __('Status updated successfully.'));
    }
}
