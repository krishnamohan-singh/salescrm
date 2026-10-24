<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\Category;
use App\Models\Tax;
use App\Models\User;
use App\Models\Lead;
use App\Models\Account;
use App\Models\Opportunity;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = createdBy();

        // Seed default IT & business services for tenant if none exist
        Service::seedDefaultsForTenant($tenantId);

        $query = Service::query()
            ->with(['category', 'tax', 'assignedUser'])
            ->withCount(['leads', 'accounts', 'opportunities'])
            ->where('created_by', $tenantId);

        // Search
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Billing Cycle filter
        if ($request->filled('billing_cycle') && $request->billing_cycle !== 'all') {
            $query->where('billing_cycle', $request->billing_cycle);
        }

        // Category filter
        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category_id', $request->category);
        }

        // Assigned To filter
        if ($request->filled('assigned_to') && $request->assigned_to !== 'all') {
            if ($request->assigned_to === 'unassigned') {
                $query->whereNull('assigned_to');
            } else {
                $query->where('assigned_to', $request->assigned_to);
            }
        }

        // Sorting
        $sortField = $request->input('sort_field', 'created_at');
        $sortDirection = $request->input('sort_direction', 'desc');
        $allowedSorts = ['id', 'name', 'code', 'price', 'billing_cycle', 'status', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, in_array($sortDirection, ['asc', 'desc']) ? $sortDirection : 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 10)));
        $services = $query->paginate($perPage)->withQueryString();

        $categories = Category::where('created_by', $tenantId)->where('status', 'active')->get(['id', 'name']);
        $taxes = Tax::where('created_by', $tenantId)->where('status', 'active')->get(['id', 'name', 'rate']);
        $users = User::where('created_by', $tenantId)->where('status', 'active')->select('id', 'name', 'email')->get();

        return Inertia::render('services/index', [
            'services' => $services,
            'categories' => $categories,
            'taxes' => $taxes,
            'users' => $users,
            'filters' => $request->all(['search', 'category', 'status', 'billing_cycle', 'assigned_to', 'sort_field', 'sort_direction', 'per_page', 'view', 'page']),
        ]);
    }

    public function create()
    {
        $tenantId = createdBy();
        $categories = Category::where('created_by', $tenantId)->where('status', 'active')->get(['id', 'name']);
        $taxes = Tax::where('created_by', $tenantId)->where('status', 'active')->get(['id', 'name', 'rate']);
        $users = User::where('created_by', $tenantId)->where('status', 'active')->select('id', 'name', 'email')->get();

        return Inertia::render('services/create', [
            'categories' => $categories,
            'taxes' => $taxes,
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $tenantId = createdBy();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100',
            'category_id' => 'nullable|exists:categories,id',
            'tax_id' => 'nullable|exists:taxes,id',
            'price' => 'required|numeric|min:0',
            'billing_cycle' => 'required|in:one_time,hourly,daily,monthly,quarterly,yearly',
            'description' => 'nullable|string|max:65535',
            'status' => 'required|in:active,inactive',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $validated['created_by'] = $tenantId;

        // Auto-generate code if empty
        if (empty($validated['code'])) {
            $nextCount = Service::where('created_by', $tenantId)->count() + 1;
            $validated['code'] = 'SRV-' . str_pad((string)$nextCount, 3, '0', STR_PAD_LEFT);
        }

        $service = Service::create($validated);

        return redirect()->route('services.index')->with('success', __('Service created successfully.'));
    }

    public function show($id)
    {
        $tenantId = createdBy();
        $service = Service::where('id', $id)
            ->where('created_by', $tenantId)
            ->with(['category', 'tax', 'assignedUser', 'creator'])
            ->with([
                'leads' => function ($q) {
                    $q->select('leads.id', 'leads.name', 'leads.email', 'leads.phone', 'leads.value', 'leads.lead_status_id')
                        ->with('leadStatus:id,name');
                },
                'accounts' => function ($q) {
                    $q->select('accounts.id', 'accounts.name', 'accounts.email', 'accounts.phone', 'accounts.account_type_id')
                        ->with('accountType:id,name');
                },
                'opportunities' => function ($q) {
                    $q->select('opportunities.id', 'opportunities.name', 'opportunities.amount', 'opportunities.opportunity_stage_id')
                        ->with('opportunityStage:id,name');
                }
            ])
            ->firstOrFail();

        return Inertia::render('services/show', [
            'service' => $service,
        ]);
    }

    public function edit($id)
    {
        $tenantId = createdBy();
        $service = Service::where('id', $id)
            ->where('created_by', $tenantId)
            ->firstOrFail();

        $categories = Category::where('created_by', $tenantId)->where('status', 'active')->get(['id', 'name']);
        $taxes = Tax::where('created_by', $tenantId)->where('status', 'active')->get(['id', 'name', 'rate']);
        $users = User::where('created_by', $tenantId)->where('status', 'active')->select('id', 'name', 'email')->get();

        return Inertia::render('services/edit', [
            'service' => $service,
            'categories' => $categories,
            'taxes' => $taxes,
            'users' => $users,
        ]);
    }

    public function update(Request $request, $id)
    {
        $tenantId = createdBy();
        $service = Service::where('id', $id)
            ->where('created_by', $tenantId)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100',
            'category_id' => 'nullable|exists:categories,id',
            'tax_id' => 'nullable|exists:taxes,id',
            'price' => 'required|numeric|min:0',
            'billing_cycle' => 'required|in:one_time,hourly,daily,monthly,quarterly,yearly',
            'description' => 'nullable|string|max:65535',
            'status' => 'required|in:active,inactive',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        $service->update($validated);

        return redirect()->route('services.index')->with('success', __('Service updated successfully.'));
    }

    public function destroy($id)
    {
        $tenantId = createdBy();
        $service = Service::where('id', $id)
            ->where('created_by', $tenantId)
            ->firstOrFail();

        $service->delete();

        return redirect()->route('services.index')->with('success', __('Service deleted successfully.'));
    }

    public function toggleStatus($id)
    {
        $tenantId = createdBy();
        $service = Service::where('id', $id)
            ->where('created_by', $tenantId)
            ->firstOrFail();

        $service->status = $service->status === 'active' ? 'inactive' : 'active';
        $service->save();

        return redirect()->back()->with('success', __('Service status updated successfully.'));
    }
}
