<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Exports\AccountExport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $canViewAll = hasFullModuleAccess('accounts', $user);

        $query = Account::query()
            ->with(['assignedUser', 'accountType', 'accountIndustry'])
            ->where('created_by', createdBy());

        // Handle search
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                    ->orWhere('email', 'like', '%' . $request->search . '%')
                    ->orWhere('alternate_email', 'like', '%' . $request->search . '%')
                    ->orWhere('phone', 'like', '%' . $request->search . '%');
            });
        }

        // Handle type filter
        if ($request->has('type') && !empty($request->type) && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        // Handle account_type_id filter
        if ($request->has('account_type_id') && !empty($request->account_type_id) && $request->account_type_id !== 'all') {
            $query->where('account_type_id', $request->account_type_id);
        }

        // Handle account_industry_id filter
        if ($request->has('account_industry_id') && !empty($request->account_industry_id) && $request->account_industry_id !== 'all') {
            $query->where('account_industry_id', $request->account_industry_id);
        }

        // Handle status filter
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
        $allowedSorts = ['id', 'name', 'email', 'created_at'];
        $allowedDirection = ['asc', 'desc'];
        if (!in_array($sortDirection, $allowedDirection)) {
            $sortDirection = 'desc';
        }
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        $defaultPerPage = $request->view === 'grid' ? 12 : 10;
        $perPage = max(1, min(200, (int) $request->get('per_page', $defaultPerPage)));
        $accounts = $query->paginate($perPage)->withQueryString();

        // Get users for assignment dropdown
        $userQuery = \App\Models\User::where('created_by', createdBy());
        $allUsers = (clone $userQuery)->select('id', 'name', 'email')->get();
        $users = (clone $userQuery)->where('status', 'active')->select('id', 'name', 'email')->get();

        $accountTypeQuery = \App\Models\AccountType::where('created_by', createdBy());
        $allAccountTypes = (clone $accountTypeQuery)->get(['id', 'name']);
        $accountTypes = (clone $accountTypeQuery)->where('status', 'active')->get(['id', 'name']);

        $accountIndustryQuery = \App\Models\AccountIndustry::where('created_by', createdBy());
        $allAccountIndustries = (clone $accountIndustryQuery)->get(['id', 'name']);
        $accountIndustries = (clone $accountIndustryQuery)->where('status', 'active')->get(['id', 'name']);

        // Get plan limits for company users
        $planLimits = null;
        $company = \App\Models\User::find(createdBy());
        if ($company && $company->plan) {
            $currentAccountsCount = Account::where('created_by', createdBy())->count();
            $planLimits = [
                'max_accounts' => $company->plan->max_accounts,
                'current_accounts' => $currentAccountsCount,
                'can_create' => $currentAccountsCount < $company->plan->max_accounts
            ];
        }

        return Inertia::render('accounts/index', [
            'accounts' => $accounts,
            'users' => $users,
            'allUsers' => $allUsers,
            'accountTypes' => $accountTypes,
            'allAccountTypes' => $allAccountTypes,
            'accountIndustries' => $accountIndustries,
            'allAccountIndustries' => $allAccountIndustries,
            'canViewAll' => $canViewAll,
            'planLimits' => $planLimits,
            'filters' => $request->all(['search', 'account_type_id', 'account_industry_id', 'status', 'assigned_to', 'sort_field', 'sort_direction', 'per_page', 'view', 'page']),
        ]);
    }

    public function create()
    {
        $accountTypes = \App\Models\AccountType::where('created_by', createdBy())
            ->where('status', 'active')
            ->get(['id', 'name']);

        $accountIndustries = \App\Models\AccountIndustry::where('created_by', createdBy())
            ->where('status', 'active')
            ->get(['id', 'name']);

        $users = \App\Models\User::where('created_by', createdBy())
            ->where('status', 'active')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('accounts/create', [
            'accountTypes'      => $accountTypes,
            'accountIndustries' => $accountIndustries,
            'users'             => $users,
            'availableServices' => Account::defaultServices(),
        ]);
    }

    public function store(Request $request)
    {
        // Check plan limits for company users
        if (auth()->user()->type === 'company') {
            $company = \App\Models\User::find(createdBy());
            if ($company && $company->plan) {
                $currentAccountsCount = Account::where('created_by', createdBy())->count();
                if ($currentAccountsCount >= $company->plan->max_accounts) {
                    return redirect()->back()->with('error', __('Account limit reached. Your plan allows maximum :max accounts.', ['max' => $company->plan->max_accounts]));
                }
            }
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:accounts,email,NULL,id,created_by,' . createdBy(),
            'alternate_email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'website' => 'nullable|url|max:255',
            'account_type_id' => 'required|exists:account_types,id',
            'account_industry_id' => 'required|exists:account_industries,id',
            'billing_address' => 'nullable|string',
            'billing_city' => 'nullable|string|max:255',
            'billing_state' => 'nullable|string|max:255',
            'billing_postal_code' => 'nullable|string|max:255',
            'billing_country' => 'nullable|string|max:255',
            'shipping_address' => 'nullable|string',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_state' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:255',
            'shipping_country' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,inactive',
            'assigned_to' => 'required|exists:users,id',
            'services' => 'nullable|array',
            'services.*' => 'string|max:255',
        ]);

        $validated['created_by'] = createdBy();
        $validated['status'] = $validated['status'] ?? 'active';

        $account = Account::create($validated);
        if ($account && !IsDemo()) {
            event(new \App\Events\AccountCreate($account));
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
            $message = __('Account created successfully, but ') . implode(', ', $errors);
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->route('accounts.index')->with('success', __('Account created successfully.'));
    }

    public function show($id)
    {
        $account = Account::with(['assignedUser', 'creator', 'accountType', 'accountIndustry', 'activities.user', 'comments.user', 'contacts', 'quotes'])
            ->where('created_by', createdBy())
            ->where('id', $id)
            ->first();
        if ($account) {

            $parentMeetings = \App\Models\Meeting::where('created_by', createdBy())
                ->where('parent_module', 'account')->where('parent_id', $id)
                ->with(['creator', 'assignedUser'])->get();

            $parentCalls = \App\Models\Call::where('created_by', createdBy())
                ->where('parent_module', 'account')->where('parent_id', $id)
                ->with(['creator', 'assignedUser'])->get()
                ->map(function ($call) {
                    $call->type = 'call';
                    return $call;
                });

            $meetings = $parentMeetings->merge($parentCalls)->sortByDesc('start_date')->values();

            $tenantId = createdBy();
            \App\Models\TaskStatus::seedDefaultsForTenant($tenantId);
            \App\Models\TaskType::seedDefaultsForTenant($tenantId);
            \App\Models\TaskPriority::seedDefaultsForTenant($tenantId);

            $tasksQuery = \App\Models\Task::where('account_id', $account->id)
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

            $account->load(['services.category', 'services.tax', 'products.category', 'products.tax']);

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

            return Inertia::render('accounts/show', [
                'account'        => $account,
                'streamItems'    => $account->activities()->with('user:id,name,avatar')->orderBy('created_at', 'asc')->get(),
                'meetings'       => $meetings,
                'tasks'          => $tasks,
                'users'          => $users,
                'taskStatuses'   => $taskStatuses,
                'taskTypes'      => $taskTypes,
                'taskPriorities' => $taskPriorities,
                'activeServices' => $activeServices,
                'activeProducts' => $activeProducts,
            ]);
        } else {
            return redirect()->route('accounts.index')->with('error', __('Account not found.'));
        }
    }

    public function attachService(Request $request, $id)
    {
        $account = Account::where('id', $id)->where('created_by', createdBy())->firstOrFail();

        $validated = $request->validate([
            'service_id' => 'required|exists:services,id',
            'price' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:active,pending,suspended,cancelled,completed',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $service = \App\Models\Service::findOrFail($validated['service_id']);
        $price = $validated['price'] ?? $service->price;

        $account->services()->syncWithoutDetaching([
            $service->id => [
                'price' => $price,
                'status' => $validated['status'] ?? 'active',
                'start_date' => $validated['start_date'] ?? null,
                'end_date' => $validated['end_date'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by' => createdBy(),
            ]
        ]);

        \App\Models\AccountActivity::create([
            'account_id' => $account->id,
            'user_id' => auth()->id(),
            'activity_type' => 'Service Mapped',
            'title' => auth()->user()->name . ' mapped service: ' . $service->name,
            'description' => 'Contracted/associated service ' . $service->name . ' (' . ($service->code ?? '') . ') at ' . ($price ? '$' . number_format($price, 2) : 'standard rate') . ($validated['notes'] ? "\nNotes: " . $validated['notes'] : ''),
            'created_by' => createdBy()
        ]);

        return redirect()->back()->with('success', __('Service mapped to account successfully.'));
    }

    public function detachService($id, $serviceId)
    {
        $account = Account::where('id', $id)->where('created_by', createdBy())->firstOrFail();
        $service = \App\Models\Service::find($serviceId);

        $account->services()->detach($serviceId);

        if ($service) {
            \App\Models\AccountActivity::create([
                'account_id' => $account->id,
                'user_id' => auth()->id(),
                'activity_type' => 'Service Removed',
                'title' => auth()->user()->name . ' removed mapped service: ' . $service->name,
                'description' => 'Removed service association ' . $service->name,
                'created_by' => createdBy()
            ]);
        }

        return redirect()->back()->with('success', __('Service removed from account.'));
    }

    public function attachProduct(Request $request, $id)
    {
        $account = Account::where('id', $id)->where('created_by', createdBy())->firstOrFail();

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:active,delivered,pending,cancelled',
            'notes' => 'nullable|string|max:1000',
        ]);

        $product = \App\Models\Product::findOrFail($validated['product_id']);
        $quantity = max(1, (int) ($validated['quantity'] ?? 1));
        $unitPrice = isset($validated['unit_price']) && $validated['unit_price'] !== '' ? (float) $validated['unit_price'] : (float) $product->price;
        $totalPrice = $quantity * $unitPrice;

        $account->products()->syncWithoutDetaching([
            $product->id => [
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'total_price' => $totalPrice,
                'status' => $validated['status'] ?? 'active',
                'notes' => $validated['notes'] ?? null,
                'created_by' => createdBy(),
            ]
        ]);

        \App\Models\AccountActivity::create([
            'account_id' => $account->id,
            'user_id' => auth()->id(),
            'activity_type' => 'Product Tagged',
            'title' => auth()->user()->name . ' tagged product: ' . $product->name,
            'description' => "Tagged product {$product->name} (Qty: {$quantity}, Unit Price: " . (function_exists('currency_symbol') ? currency_symbol() : '$') . number_format($unitPrice, 2) . ", Total: " . (function_exists('currency_symbol') ? currency_symbol() : '$') . number_format($totalPrice, 2) . ")" . ($validated['notes'] ? "\nNotes: " . $validated['notes'] : ''),
            'created_by' => createdBy()
        ]);

        return redirect()->back()->with('success', __('Product tagged to account successfully.'));
    }

    public function detachProduct($id, $productId)
    {
        $account = Account::where('id', $id)->where('created_by', createdBy())->firstOrFail();
        $product = \App\Models\Product::find($productId);

        $account->products()->detach($productId);

        if ($product) {
            \App\Models\AccountActivity::create([
                'account_id' => $account->id,
                'user_id' => auth()->id(),
                'activity_type' => 'Product Removed',
                'title' => auth()->user()->name . ' removed tagged product: ' . $product->name,
                'description' => 'Removed product association ' . $product->name,
                'created_by' => createdBy()
            ]);
        }

        return redirect()->back()->with('success', __('Product removed from account.'));
    }

    public function edit($accountId)
    {
        $account = Account::where('id', $accountId)
            ->where('created_by', createdBy())
            ->first();

        if (!$account) {
            return redirect()->route('accounts.index')->with('error', __('Account not found.'));
        }

        $accountTypes = \App\Models\AccountType::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name']);

        $accountIndustries = \App\Models\AccountIndustry::where('created_by', createdBy())
            ->where('status', 'active')->get(['id', 'name']);

        $users = \App\Models\User::where('created_by', createdBy())
            ->where('status', 'active')->select('id', 'name', 'email')->get();

        return Inertia::render('accounts/edit', [
            'account'           => $account,
            'accountTypes'      => $accountTypes,
            'accountIndustries' => $accountIndustries,
            'users'             => $users,
            'availableServices' => Account::defaultServices(),
        ]);
    }

    public function update(Request $request, $accountId)
    {
        $account = Account::where('id', $accountId)
            ->where('created_by', createdBy())
            ->first();

        if ($account) {
              $validated = $request->validate([
                    'name' => 'required|string|max:255',
                    'email' => 'required|email|max:255|unique:accounts,email,' . $accountId . ',id,created_by,' . createdBy(),
                    'alternate_email' => 'nullable|email|max:255',
                    'phone' => 'nullable|string|max:255',
                    'website' => 'nullable|url|max:255',
                    'account_type_id' => 'required|exists:account_types,id',
                    'account_industry_id' => 'required|exists:account_industries,id',
                    'billing_address' => 'nullable|string',
                    'billing_city' => 'nullable|string|max:255',
                    'billing_state' => 'nullable|string|max:255',
                    'billing_postal_code' => 'nullable|string|max:255',
                    'billing_country' => 'nullable|string|max:255',
                    'shipping_address' => 'nullable|string',
                    'shipping_city' => 'nullable|string|max:255',
                    'shipping_state' => 'nullable|string|max:255',
                    'shipping_postal_code' => 'nullable|string|max:255',
                    'shipping_country' => 'nullable|string|max:255',
                    'status' => 'nullable|in:active,inactive',
                    'assigned_to' => 'required|exists:users,id',
                    'services' => 'nullable|array',
                    'services.*' => 'string|max:255',
                ]);
            try {
                $account->update($validated);

                return redirect()->route('accounts.index')->with('success', __('Account updated successfully'));
            }catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update account'));
            }
        } else {
            return redirect()->route('accounts.index')->with('error', __('Account not found.'));
        }
    }

    public function destroy($accountId)
    {
        $account = Account::where('id', $accountId)
            ->where('created_by', createdBy())
            ->first();

        if ($account) {
            try {
                $account->delete();
                return redirect()->back()->with('success', __('Account deleted successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to delete account'));
            }
        } else {
            return redirect()->back()->with('error', __('Account not found.'));
        }
    }

    public function toggleStatus($accountId)
    {
        $account = Account::where('id', $accountId)
            ->where('created_by', createdBy())
            ->first();

        if ($account) {
            try {
                $account->status = $account->status === 'active' ? 'inactive' : 'active';
                $account->save();

                return redirect()->back()->with('success', __('Account status updated successfully'));
            } catch (\Exception $e) {
                return redirect()->back()->with('error', $e->getMessage() ?: __('Failed to update account status'));
            }
        } else {
            return redirect()->back()->with('error', __('Account not found.'));
        }
    }

    public function deleteActivities($id)
    {
        $account = Account::where('id', $id)
            ->where('created_by', createdBy())
            ->firstOrFail();

        \App\Models\AccountActivity::where('account_id', $account->id)->delete();

        return redirect()->back()->with('success', __('All activities deleted successfully'));
    }

    public function deleteActivity($accountId, $activityId)
    {
        $account = Account::where('id', $accountId)
            ->where('created_by', createdBy())
            ->firstOrFail();

        \App\Models\AccountActivity::where('id', $activityId)
            ->where('account_id', $account->id)
            ->delete();

        return redirect()->back()->with('success', __('Activity deleted successfully'));
    }

    public function fileExport()
    {
        if (!auth()->user()->can('export-accounts')) {
            return redirect()->back()->with('error', __('Permission denied.'));
        }

        $name = 'account_' . date('Y-m-d i:h:s');
        return Excel::download(new AccountExport(), $name . '.xlsx');
    }
}
