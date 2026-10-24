<?php

namespace App\Http\Controllers;

use App\Models\Opportunity;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\OpportunityStage;
use App\Models\OpportunitySource;
use App\Exports\OpportunityExport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class OpportunityController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $canViewAll = hasFullModuleAccess('opportunities', $user);

        $query = Opportunity::query()
            ->with(['account', 'contact', 'opportunityStage', 'opportunitySource', 'assignedUser', 'products'])
            ->where('created_by', createdBy());

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Handle filters
        if ($request->has('account_id') && !empty($request->account_id) && $request->account_id !== 'all') {
            $query->where('account_id', $request->account_id);
        }

        if ($request->has('opportunity_stage_id') && !empty($request->opportunity_stage_id) && $request->opportunity_stage_id !== 'all') {
            $query->where('opportunity_stage_id', $request->opportunity_stage_id);
        }

        if ($request->has('opportunity_source_id') && !empty($request->opportunity_source_id) && $request->opportunity_source_id !== 'all') {
            $query->where('opportunity_source_id', $request->opportunity_source_id);
        }

        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Visibility scoping
        if (!$canViewAll) {
            $query->where('assigned_to', $user->id);
        } else {
            if ($request->has('assigned_to') && !empty($request->assigned_to) && $request->assigned_to !== 'all') {
                $query->where('assigned_to', $request->assigned_to);
            }
        }

        // Handle sorting
        $sortField = $request->input('sort_field', 'id');
        $sortDirection = $request->input('sort_direction', 'desc');
        $allowedSorts=['id', 'name', 'amount', 'close_date', 'created_at'];
        $allowedDirection = ['asc', 'desc'];
        if (!in_array($sortDirection, $allowedDirection)) {
            $sortDirection = 'desc';
        }
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        if ($request->view === 'kanban' || empty($request->view)) {
            $opportunities = collect(['data' => $query->get()]);
        } else {
            $defaultPerPage = $request->view === 'grid' ? 12 : 10;
            $perPage = max(1, min(200, (int) $request->get('per_page', $defaultPerPage)));
            $opportunities = $query->paginate($perPage)->withQueryString();
        }
        // Get data for dropdowns - filter by assigned_to for non-company users
        $accountQuery = Account::where('created_by', createdBy());
        $allAccounts = (clone $accountQuery)->get(['id', 'name']);
        $accounts = (clone $accountQuery)->where('status', 'active')->get(['id', 'name']);

        $contacts = Contact::where('created_by', createdBy())->where('status', 'active')->get(['id', 'name', 'account_id']);

        $products = Product::where('created_by', createdBy())->where('status', 'active')->with('tax')->get(['id', 'name', 'price', 'tax_id']);

        $opportunityStageQuery = OpportunityStage::where('created_by', createdBy());
        $allOpportunityStages = (clone $opportunityStageQuery)->get(['id', 'name', 'color']);
        $opportunityStages = (clone $opportunityStageQuery)->where('status', 'active')->get(['id', 'name', 'color']);

        $opportunitySourceQuery = OpportunitySource::where('created_by', createdBy());
        $allOpportunitySources = (clone $opportunitySourceQuery)->get(['id', 'name']);
        $opportunitySources = (clone $opportunitySourceQuery)->where('status', 'active')->get(['id', 'name']);

        $userQuery = \App\Models\User::where('created_by', createdBy());
        $allUsers = (clone $userQuery)->select('id', 'name', 'email')->get();
        $users = (clone $userQuery)->where('status', 'active')->select('id', 'name', 'email')->get();

        return Inertia::render('opportunities/index', [
            'opportunities' => $opportunities,
            'accounts' => $accounts,
            'allAccounts' => $allAccounts,
            'contacts' => $contacts,
            'products' => $products,
            'opportunityStages' => $opportunityStages,
            'allOpportunityStages' => $allOpportunityStages,
            'opportunitySources' => $opportunitySources,
            'allOpportunitySources' => $allOpportunitySources,
            'users' => $users,
            'allUsers' => $allUsers,
            'canViewAll' => $canViewAll,
            'filters' => $request->all(['view', 'search', 'account_id', 'opportunity_stage_id', 'opportunity_source_id', 'status', 'assigned_to', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function create(Request $request)
    {
        $accounts = Account::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name']);

        $contacts = Contact::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name', 'account_id']);

        $products = Product::where('created_by', createdBy())
            ->where('status', 'active')->with('tax')->get(['id', 'name', 'price', 'tax_id']);

        $opportunityStages = OpportunityStage::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name', 'color']);

        $opportunitySources = OpportunitySource::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name']);

        $users = \App\Models\User::where('created_by', createdBy())
            ->where('status', 'active')->select('id', 'name', 'email')->get();

        return Inertia::render('opportunities/create', [
            'accounts'                    => $accounts,
            'contacts'                    => $contacts,
            'products'                    => $products,
            'opportunityStages'           => $opportunityStages,
            'opportunitySources'          => $opportunitySources,
            'users'                       => $users,
            'prefilledOpportunityStageId' => $request->get('opportunity_stage_id', ''),
            'prefilledAccountId'          => $request->get('account_id', ''),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'amount' => 'nullable|numeric|min:0',
            'close_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'account_id' => 'required|exists:accounts,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'opportunity_stage_id' => 'required|exists:opportunity_stages,id',
            'opportunity_source_id' => 'nullable|exists:opportunity_sources,id',
            'status' => 'nullable|in:active,inactive',
            'assigned_to' => 'required|exists:users,id',
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.unit_price' => 'required|numeric|min:0',
        ]);

        $validated['created_by'] = createdBy();
        $validated['status'] = $validated['status'] ?? 'active';

        $products = $validated['products'] ?? [];
        unset($validated['products']);

        $opportunity = Opportunity::create($validated);

        // Attach products
        if (!empty($products)) {
            foreach ($products as $product) {
                $opportunity->products()->attach($product['product_id'], [
                    'quantity' => $product['quantity'],
                    'unit_price' => $product['unit_price'],
                    'total_price' => $product['quantity'] * $product['unit_price'],
                ]);
            }

            // Calculate and update totals
            $opportunity->load('products.tax');
            $opportunity->calculateTotals();
        }

        if ($opportunity && !IsDemo()) {
            event(new \App\Events\OpportunityCreated($opportunity));
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
            $message = __('opportunity created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->route('opportunities.index')->with('success', __('Opportunity created successfully.'));
    }

    public function show($opportunityId)
    {
        $opportunity = Opportunity::where('id', $opportunityId)
            ->where('created_by', createdBy())
            ->with(['account', 'contact', 'opportunityStage', 'opportunitySource', 'assignedUser', 'products.tax', 'quotes', 'activities.user', 'comments.user'])
            ->first();

        if (!$opportunity) {
            return redirect()->route('opportunities.index')->with('error', __('Opportunity not found.'));
        }

        $parentMeetings = \App\Models\Meeting::where('created_by', createdBy())
            ->where('parent_module', 'opportunity')->where('parent_id', $opportunityId)
            ->with(['creator', 'assignedUser'])->get();

        $parentCalls = \App\Models\Call::where('created_by', createdBy())
            ->where('parent_module', 'opportunity')->where('parent_id', $opportunityId)
            ->with(['creator', 'assignedUser'])->get()
            ->map(function ($call) { $call->type = 'call'; return $call; });

        $meetings = $parentMeetings->merge($parentCalls)->sortByDesc('start_date')->values();

        $tenantId = createdBy();
        \App\Models\TaskStatus::seedDefaultsForTenant($tenantId);
        \App\Models\TaskType::seedDefaultsForTenant($tenantId);
        \App\Models\TaskPriority::seedDefaultsForTenant($tenantId);

        $tasksQuery = \App\Models\Task::where('opportunity_id', $opportunityId)
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

        $opportunity->load(['services.category', 'services.tax', 'products.category', 'products.tax']);

        $activeServices = \App\Models\Service::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'code', 'price', 'billing_cycle')
            ->orderBy('name')
            ->get();

        $activeProducts = \App\Models\Product::where('created_by', $tenantId)
            ->where('status', true)
            ->select('id', 'name', 'sku', 'price', 'category_id', 'tax_id')
            ->with(['category:id,name', 'tax:id,name,rate'])
            ->orderBy('name')
            ->get();

        return Inertia::render('opportunities/show', [
            'opportunity'    => $opportunity,
            'streamItems'    => $opportunity->activities()->with('user:id,name,avatar')->orderBy('created_at', 'asc')->get(),
            'meetings'       => $meetings,
            'tasks'          => $tasks,
            'users'          => $users,
            'taskStatuses'   => $taskStatuses,
            'taskTypes'      => $taskTypes,
            'taskPriorities' => $taskPriorities,
            'activeServices' => $activeServices,
            'activeProducts' => $activeProducts,
        ]);
    }

    public function attachService(Request $request, $id)
    {
        $opportunity = Opportunity::where('id', $id)->where('created_by', createdBy())->firstOrFail();

        $validated = $request->validate([
            'service_id' => 'required|exists:services,id',
            'quantity' => 'nullable|integer|min:1',
            'unit_price' => 'required|numeric|min:0',
            'total_price' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $service = \App\Models\Service::findOrFail($validated['service_id']);
        $quantity = $validated['quantity'] ?? 1;

        $opportunity->services()->syncWithoutDetaching([
            $service->id => [
                'quantity' => $quantity,
                'unit_price' => $validated['unit_price'],
                'total_price' => $validated['total_price'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => createdBy(),
            ]
        ]);

        \App\Models\OpportunityActivity::create([
            'opportunity_id' => $opportunity->id,
            'user_id' => auth()->id(),
            'activity_type' => 'Service Mapped',
            'title' => auth()->user()->name . ' mapped service: ' . $service->name,
            'description' => 'Added service ' . $service->name . ' (' . ($service->code ?? '') . ') x ' . $quantity . ' at $' . number_format($validated['unit_price'], 2) . ' = $' . number_format($validated['total_price'], 2) . ($validated['notes'] ? "\nNotes: " . $validated['notes'] : ''),
            'created_by' => createdBy()
        ]);

        return redirect()->back()->with('success', __('Service mapped to opportunity successfully.'));
    }

    public function detachService($id, $serviceId)
    {
        $opportunity = Opportunity::where('id', $id)->where('created_by', createdBy())->firstOrFail();
        $service = \App\Models\Service::find($serviceId);

        $opportunity->services()->detach($serviceId);

        if ($service) {
            \App\Models\OpportunityActivity::create([
                'opportunity_id' => $opportunity->id,
                'user_id' => auth()->id(),
                'activity_type' => 'Service Removed',
                'title' => auth()->user()->name . ' removed mapped service: ' . $service->name,
                'description' => 'Removed service association ' . $service->name,
                'created_by' => createdBy()
            ]);
        }

        return redirect()->back()->with('success', __('Service removed from opportunity.'));
    }

    public function attachProduct(Request $request, $id)
    {
        $opportunity = Opportunity::where('id', $id)->where('created_by', createdBy())->firstOrFail();

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $product = \App\Models\Product::findOrFail($validated['product_id']);
        $quantity = max(1, (int) ($validated['quantity'] ?? 1));
        $unitPrice = isset($validated['unit_price']) && $validated['unit_price'] !== '' ? (float) $validated['unit_price'] : (float) $product->price;
        $totalPrice = $quantity * $unitPrice;

        $opportunity->products()->syncWithoutDetaching([
            $product->id => [
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => $totalPrice,
                'notes' => $validated['notes'] ?? null,
            ]
        ]);

        \App\Models\OpportunityActivity::create([
            'opportunity_id' => $opportunity->id,
            'user_id' => auth()->id(),
            'activity_type' => 'Product Tagged',
            'title' => auth()->user()->name . ' added product: ' . $product->name,
            'description' => "Added product {$product->name} (Qty: {$quantity}, Unit Price: " . (function_exists('currency_symbol') ? currency_symbol() : '$') . number_format($unitPrice, 2) . ", Total: " . (function_exists('currency_symbol') ? currency_symbol() : '$') . number_format($totalPrice, 2) . ")" . ($validated['notes'] ? "\nNotes: " . $validated['notes'] : ''),
            'created_by' => createdBy()
        ]);

        return redirect()->back()->with('success', __('Product added to opportunity successfully.'));
    }

    public function detachProduct($id, $productId)
    {
        $opportunity = Opportunity::where('id', $id)->where('created_by', createdBy())->firstOrFail();
        $product = \App\Models\Product::find($productId);

        $opportunity->products()->detach($productId);

        if ($product) {
            \App\Models\OpportunityActivity::create([
                'opportunity_id' => $opportunity->id,
                'user_id' => auth()->id(),
                'activity_type' => 'Product Removed',
                'title' => auth()->user()->name . ' removed product: ' . $product->name,
                'description' => 'Removed product ' . $product->name,
                'created_by' => createdBy()
            ]);
        }

        return redirect()->back()->with('success', __('Product removed from opportunity.'));
    }

    public function edit($opportunityId)
    {
        $opportunity = Opportunity::where('id', $opportunityId)
            ->where('created_by', createdBy())
            ->with(['products.tax'])
            ->first();

        if (!$opportunity) {
            return redirect()->route('opportunities.index')->with('error', __('Opportunity not found.'));
        }

        $accounts = Account::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name']);

        $contacts = Contact::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name', 'account_id']);

        $products = Product::where('created_by', createdBy())
            ->where('status', 'active')->with('tax')->get(['id', 'name', 'price', 'tax_id']);

        $opportunityStages = OpportunityStage::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name', 'color']);

        $opportunitySources = OpportunitySource::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name']);

        $users = \App\Models\User::where('created_by', createdBy())
            ->where('status', 'active')->select('id', 'name', 'email')->get();

        return Inertia::render('opportunities/edit', [
            'opportunity'        => $opportunity,
            'accounts'           => $accounts,
            'contacts'           => $contacts,
            'products'           => $products,
            'opportunityStages'  => $opportunityStages,
            'opportunitySources' => $opportunitySources,
            'users'              => $users,
        ]);
    }

    public function update(Request $request, $opportunityId)
    {
        $opportunity = Opportunity::where('id', $opportunityId)
            ->where('created_by', createdBy())
            ->first();

        if ($opportunity) {
            try {
                $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'description' => 'nullable|string',
                    'amount' => 'nullable|numeric|min:0',
                    'close_date' => 'nullable|date',
                    'notes' => 'nullable|string',
                    'account_id' => 'required|exists:accounts,id',
                    'contact_id' => 'nullable|exists:contacts,id',
                    'opportunity_stage_id' => 'required|exists:opportunity_stages,id',
                    'opportunity_source_id' => 'nullable|exists:opportunity_sources,id',
                    'status' => 'nullable|in:active,inactive',
                    'assigned_to' => 'required|exists:users,id',
                    'products' => 'required|array|min:1',
                    'products.*.product_id' => 'required|exists:products,id',
                    'products.*.quantity' => 'required|integer|min:1',
                    'products.*.unit_price' => 'required|numeric|min:0',
                ]);

                $products = $validated['products'] ?? [];
                unset($validated['products']);

                // Remove amount from validated data if products exist to prevent auto-calculation override
                if ($opportunity->products()->count() > 0) {
                    unset($validated['amount']);
                }

                $opportunity->fill($validated);

                if (isEmailTemplateEnabled('Opportunity Status Changed', createdBy()) && $opportunity && $opportunity->assigned_to && $opportunity->isDirty('opportunity_stage_id') && !IsDemo()) {
                    $old = $opportunity->getOriginal('opportunity_stage_id');
                    $new = $opportunity->opportunity_stage_id;

                    $oldStageName = \App\Models\OpportunityStage::find($old)?->name ?? 'N/A';
                    $newStageName = \App\Models\OpportunityStage::find($new)?->name ?? 'N/A';
                    event(new \App\Events\OpportunityStageChanged($opportunity, $oldStageName, $newStageName));
                }

                $opportunity->update($validated);

                // Only sync products if products data is provided
                if (isset($request->products)) {
                    $opportunity->products()->detach();
                    if (!empty($products)) {
                        foreach ($products as $product) {
                            $opportunity->products()->attach($product['product_id'], [
                                'quantity' => $product['quantity'],
                                'unit_price' => $product['unit_price'],
                                'total_price' => $product['quantity'] * $product['unit_price'],
                            ]);
                        }

                        // Calculate and update totals
                        $opportunity->load('products.tax');
                        $opportunity->calculateTotals();
                    } else {
                        // If no products, set amount to 0
                        $opportunity->updateQuietly(['amount' => 0]);
                    }
                }

                return redirect()->route('opportunities.index')->with('success', __('Opportunity updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update opportunity.'));
            }
        } else {
            return redirect()->back()->with('error', __('Opportunity not found.'));
        }
    }

    public function destroy($opportunityId)
    {
        $opportunity = Opportunity::where('id', $opportunityId)
            ->where('created_by', createdBy())
            ->first();

        if ($opportunity) {
            try {
                $opportunity->products()->detach();
                $opportunity->delete();
                return redirect()->back()->with('success', __('Opportunity deleted successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete opportunity.'));
            }
        } else {
            return redirect()->back()->with('error', __('Opportunity not found.'));
        }
    }

    public function deleteActivities($id)
    {
        $opportunity = Opportunity::where('id', $id)
            ->where('created_by', createdBy())
            ->firstOrFail();

        \App\Models\OpportunityActivity::where('opportunity_id', $opportunity->id)->delete();

        return redirect()->back()->with('success', __('All activities deleted successfully.'));
    }

    public function deleteActivity($opportunityId, $activityId)
    {
        $opportunity = Opportunity::where('id', $opportunityId)
            ->where('created_by', createdBy())
            ->firstOrFail();

        \App\Models\OpportunityActivity::where('id', $activityId)
            ->where('opportunity_id', $opportunity->id)
            ->delete();

        return redirect()->back()->with('success', __('Activity deleted successfully.'));
    }

    public function toggleStatus($opportunityId)
    {
        $opportunity = Opportunity::where('id', $opportunityId)
            ->where('created_by', createdBy())
            ->first();

        if ($opportunity) {
            try {
                $opportunity->status = $opportunity->status === 'active' ? 'inactive' : 'active';
                $opportunity->save();

                return redirect()->back()->with('success', __('Opportunity status updated successfully.'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update opportunity status.'));
            }
        } else {
            return redirect()->back()->with('error', __('Opportunity not found.'));
        }
    }

    public function updateStatus(Request $request, $opportunityId)
    {
        $validated = $request->validate([
            'opportunity_stage_id' => 'required|exists:opportunity_stages,id',
        ]);

        $opportunity = Opportunity::where('id', $opportunityId)
            ->where('created_by', createdBy())
            ->firstOrFail();

        $opportunity->fill($validated);

        if (isEmailTemplateEnabled('Opportunity Status Changed', createdBy()) && $opportunity && $opportunity->assigned_to && $opportunity->isDirty('opportunity_stage_id') && !IsDemo()) {
            $old = $opportunity->getOriginal('opportunity_stage_id');
            $new = $opportunity->opportunity_stage_id;

            $oldStageName = \App\Models\OpportunityStage::find($old)?->name ?? 'N/A';
            $newStageName = \App\Models\OpportunityStage::find($new)?->name ?? 'N/A';
            event(new \App\Events\OpportunityStageChanged($opportunity, $oldStageName, $newStageName));
        }
        $opportunity->update([
            'opportunity_stage_id' => $validated['opportunity_stage_id']
        ]);

        return redirect()->back()->with('success', __('Opportunity status updated successfully.'));
    }

    public function fileExport()
    {
        if (!auth()->user()->can('export-opportunities')) {
            return redirect()->back()->with('error', __('Permission denied.'));
        }

        $name = 'opportunity_' . date('Y-m-d i:h:s');
        return Excel::download(new OpportunityExport(), $name . '.xlsx');
    }
}
