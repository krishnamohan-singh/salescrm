<?php

namespace App\Http\Controllers;

use App\Models\TaskStatus;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskStatusController extends Controller
{
    public function index(Request $request)
    {
        // Seed default statuses if none exist for this company
        TaskStatus::seedDefaultsForTenant(createdBy());

        $query = TaskStatus::query()->where('created_by', createdBy());

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
        $taskStatuses = $query->paginate($perPage)->withQueryString();

        return Inertia::render('task-statuses/index', [
            'taskStatuses' => $taskStatuses,
            'filters' => $request->all(['search', 'status', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'required|string|max:20',
            'description' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
            'is_default' => 'nullable|boolean',
        ]);

        $validated['created_by'] = createdBy();
        $validated['status'] = $validated['status'] ?? 'active';

        $hasIsDefault = \Illuminate\Support\Facades\Schema::hasColumn('task_statuses', 'is_default');
        if ($hasIsDefault) {
            $validated['is_default'] = $request->boolean('is_default');
            if ($validated['is_default']) {
                TaskStatus::where('created_by', createdBy())->update(['is_default' => false]);
            }
        } else {
            unset($validated['is_default']);
        }

        TaskStatus::create($validated);

        return redirect()->back()->with('success', __('Task status created successfully.'));
    }

    public function update(Request $request, TaskStatus $taskStatus)
    {
        if ($taskStatus->created_by !== createdBy()) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'required|string|max:20',
            'description' => 'nullable|string|max:1000',
            'status' => 'nullable|in:active,inactive',
            'is_default' => 'nullable|boolean',
        ]);

        $hasIsDefault = \Illuminate\Support\Facades\Schema::hasColumn('task_statuses', 'is_default');
        if ($hasIsDefault) {
            $validated['is_default'] = $request->boolean('is_default');
            if ($validated['is_default']) {
                TaskStatus::where('created_by', createdBy())->where('id', '!=', $taskStatus->id)->update(['is_default' => false]);
            }
        } else {
            unset($validated['is_default']);
        }

        $taskStatus->update($validated);

        return redirect()->back()->with('success', __('Task status updated successfully.'));
    }

    public function destroy(TaskStatus $taskStatus)
    {
        if ($taskStatus->created_by !== createdBy()) {
            abort(403);
        }

        $taskStatus->delete();

        return redirect()->back()->with('success', __('Task status deleted successfully.'));
    }

    public function toggleStatus(TaskStatus $taskStatus)
    {
        if ($taskStatus->created_by !== createdBy()) {
            abort(403);
        }

        $taskStatus->status = $taskStatus->status === 'active' ? 'inactive' : 'active';
        $taskStatus->save();

        return redirect()->back()->with('success', __('Status updated successfully.'));
    }
}
