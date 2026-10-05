<?php

namespace App\Http\Controllers;

use App\Models\DeliveryOrder;
use App\Models\SalesOrder;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\ShippingProviderType;
use App\Exports\DeliveryOrderExport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class DeliveryOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = DeliveryOrder::query()
            ->with(['salesOrder', 'account', 'contact', 'shippingProviderType', 'creator', 'assignedUser', 'products'])
            ->where('created_by', createdBy());

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function ($q) use ($request) {
                $q->where('delivery_number', 'like', '%' . $request->search . '%')
                    ->orWhere('name', 'like', '%' . $request->search . '%')
                    ->orWhereHas('account', fn($q) => $q->where('name', 'like', '%' . $request->search . '%'));
            });
        }

        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('account_id') && !empty($request->account_id) && $request->account_id !== 'all') {
            $query->where('account_id', $request->account_id);
        }

        if ($request->has('sales_order_id') && !empty($request->sales_order_id) && $request->sales_order_id !== 'all') {
            $query->where('sales_order_id', $request->sales_order_id);
        }

        if ($request->has('assigned_to') && !empty($request->assigned_to) && $request->assigned_to !== 'all') {
            if ($request->assigned_to === 'unassigned') {
                $query->whereNull('assigned_to');
            } else {
                $query->where('assigned_to', $request->assigned_to);
            }
        }

        $sortField = $request->input('sort_field', 'id');
        $sortDirection = $request->input('sort_direction', 'desc');
        $allowedSorts = ['id', 'delivery_number', 'name', 'delivery_date', 'created_at'];
        $allowedDirection = ['asc', 'desc'];
        if (!in_array($sortDirection, $allowedDirection)) {
            $sortDirection = 'desc';
        }
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 10)));
        $deliveryOrders = $query->paginate($perPage)->withQueryString();

        $userQuery = \App\Models\User::where('created_by', createdBy());
        $allUsers = (clone $userQuery)->select('id', 'name', 'email')->get();

        $accountQuery = Account::where('created_by', createdBy());
        $allAccounts = (clone $accountQuery)->select('id', 'name')->get();

        return Inertia::render('delivery-orders/index', [
            'deliveryOrders' => $deliveryOrders,
            'allAccounts' => $allAccounts,
            'salesOrders' => SalesOrder::where('created_by', createdBy())->select('id', 'name', 'order_number')->get(),
            'allUsers' => $allUsers,
            'filters' => $request->only(['search', 'status', 'account_id', 'sales_order_id', 'assigned_to', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function create()
    {
        $accounts = Account::where('created_by', createdBy())->select('id', 'name')->get();
        $contacts = Contact::where('created_by', createdBy())->select('id', 'name')->get();
        $salesOrders = SalesOrder::where('created_by', createdBy())->select('id', 'name', 'order_number')->get();
        $products = $this->getFilteredProducts();
        $shippingProviderTypes = ShippingProviderType::where('created_by', createdBy())->select('id', 'name')->get();
        $users = \App\Models\User::where('created_by', createdBy())->select('id', 'name', 'email')->get();

        return Inertia::render('delivery-orders/create', [
            'accounts' => $accounts,
            'contacts' => $contacts,
            'salesOrders' => $salesOrders,
            'products' => $products,
            'shippingProviderTypes' => $shippingProviderTypes,
            'users' => $users
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sales_order_id' => 'required|exists:sales_orders,id',
            'account_id' => 'required|exists:accounts,id',
            'contact_id' => 'required|exists:contacts,id',
            'shipping_provider_type_id' => 'required|exists:shipping_provider_types,id',
            'delivery_address' => 'required|string',
            'delivery_city' => 'required|string|max:255',
            'delivery_state' => 'required|string|max:255',
            'delivery_postal_code' => 'required|string|max:255',
            'delivery_country' => 'required|string|max:255',
            'delivery_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date|after:delivery_date',
            'status' => 'nullable|in:pending,in_transit,delivered,cancelled',
            'tracking_number' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) {
                if ($value && DeliveryOrder::where('tracking_number', $value)->where('created_by', createdBy())->exists()) {
                    $fail('The tracking number has already been taken.');
                }
            }],
            'delivery_notes' => 'nullable|string',
            'shipping_cost' => 'nullable|numeric|min:0',
            'assigned_to' => 'required|exists:users,id',
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.unit_weight' => 'nullable|numeric|min:0',
        ]);

        $validated['created_by'] = createdBy();
        $validated['status'] = $validated['status'] ?? 'pending';

        $products = $validated['products'] ?? [];
        unset($validated['products']);

        $deliveryOrder = DeliveryOrder::create($validated);

        if (!empty($products)) {
            $syncData = [];
            foreach ($products as $product) {
                $productId = $product['product_id'];
                $unitWeight = $product['unit_weight'] ?? 0;
                $totalWeight = $product['quantity'] * $unitWeight;

                $syncData[$productId] = [
                    'quantity' => $product['quantity'],
                    'unit_weight' => $unitWeight,
                    'total_weight' => $totalWeight,
                ];
            }
            $deliveryOrder->products()->sync($syncData);
        }

        $deliveryOrder->calculateTotalWeight();

        // Fire DeliveryOrderCreated event for sending email
        if ($deliveryOrder && !IsDemo()) {
            event(new \App\Events\DeliveryOrderCreated($deliveryOrder));
        }

        // Check for email error
        $emailError = session()->pull('email_error');

        if ($emailError) {
            $message = __('Delivery order created successfully, but ') . __('Email send failed: ') . $emailError;
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->route('delivery-orders.index')->with('success', __('Delivery order created successfully.'));
    }

    public function show($deliveryOrderId)
    {
        $deliveryOrder = DeliveryOrder::where('id', $deliveryOrderId)
            ->where('created_by', createdBy())
            ->with([
                'salesOrder',
                'account',
                'contact',
                'shippingProviderType',
                'creator',
                'assignedUser',
                'products'
            ])
            ->first();

        if (!$deliveryOrder) {
            return redirect()->route('delivery-orders.index')->with('error', __('Delivery order not found.'));
        }

        return Inertia::render('delivery-orders/show', [
            'deliveryOrder' => $deliveryOrder,
        ]);
    }

    public function edit($id)
    {
        $deliveryOrder = DeliveryOrder::with([
            'salesOrder',
            'account',
            'contact',
            'shippingProviderType',
            'creator',
            'assignedUser',
            'products'
        ])
            ->where('created_by', createdBy())
            ->where('id', $id)
            ->first();
            
        if ($deliveryOrder) {
            $accounts = Account::where('created_by', createdBy())->select('id', 'name')->get();
            $contacts = Contact::where('created_by', createdBy())->select('id', 'name')->get();
            $salesOrders = SalesOrder::where('created_by', createdBy())->select('id', 'name', 'order_number')->get();
            $products = $this->getFilteredProducts();
            $shippingProviderTypes = ShippingProviderType::where('created_by', createdBy())->select('id', 'name')->get();
            $users = \App\Models\User::where('created_by', createdBy())->select('id', 'name', 'email')->get();

            return Inertia::render('delivery-orders/edit', [
                'deliveryOrder' => $deliveryOrder,
                'accounts' => $accounts,
                'contacts' => $contacts,
                'salesOrders' => $salesOrders,
                'products' => $products,
                'shippingProviderTypes' => $shippingProviderTypes,
                'users' => $users
            ]);
        } else {
            return redirect()->route('delivery-orders.index')->with('error', __('Delivery order not found.'));
        }
    }
    public function update(Request $request, $deliveryOrderId)
    {
        $deliveryOrder = DeliveryOrder::where('id', $deliveryOrderId)
            ->where('created_by', createdBy())
            ->first();

        if (!$deliveryOrder) {
            return redirect()->back()->with('error', __('Delivery order not found.'));
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sales_order_id' => 'required|exists:sales_orders,id',
            'account_id' => 'required|exists:accounts,id',
            'contact_id' => 'required|exists:contacts,id',
            'shipping_provider_type_id' => 'required|exists:shipping_provider_types,id',
            'delivery_address' => 'required|string',
            'delivery_city' => 'required|string|max:255',
            'delivery_state' => 'required|string|max:255',
            'delivery_postal_code' => 'required|string|max:255',
            'delivery_country' => 'required|string|max:255',
            'delivery_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date|after:delivery_date',
            'status' => 'nullable|in:pending,in_transit,delivered,cancelled',
            'tracking_number' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) use ($deliveryOrderId) {
                if ($value && DeliveryOrder::where('tracking_number', $value)->where('created_by', createdBy())->where('id', '!=', $deliveryOrderId)->exists()) {
                    $fail('The Tracking number has already been taken.');
                }
            }],
            'delivery_notes' => 'nullable|string',
            'shipping_cost' => 'nullable|numeric|min:0',
            'assigned_to' => 'required|exists:users,id',
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.unit_weight' => 'nullable|numeric|min:0',
        ]);

        $products = $validated['products'] ?? [];
        unset($validated['products']);

        $deliveryOrder->update($validated);

        if (!empty($products)) {
            $syncData = [];
            foreach ($products as $product) {
                $productId = $product['product_id'];
                $unitWeight = $product['unit_weight'] ?? 0;
                $totalWeight = $product['quantity'] * $unitWeight;

                $syncData[$productId] = [
                    'quantity' => $product['quantity'],
                    'unit_weight' => $unitWeight,
                    'total_weight' => $totalWeight,
                ];
            }
            $deliveryOrder->products()->sync($syncData);
        } else {
            $deliveryOrder->products()->detach();
        }

        $deliveryOrder->calculateTotalWeight();

        return redirect()->route('delivery-orders.index')->with('success', __('Delivery order updated successfully.'));
    }

    public function destroy($deliveryOrderId)
    {
        $deliveryOrder = DeliveryOrder::where('id', $deliveryOrderId)
            ->where('created_by', createdBy())
            ->first();

        if (!$deliveryOrder) {
            return redirect()->back()->with('error', __('Delivery order not found.'));
        }

        $deliveryOrder->products()->detach();
        $deliveryOrder->delete();

        return redirect()->back()->with('success', __('Delivery order deleted successfully.'));
    }

    public function toggleStatus(Request $request, $deliveryOrderId)
    {
        $deliveryOrder = DeliveryOrder::where('id', $deliveryOrderId)
            ->where('created_by', createdBy())
            ->first();

        if (!$deliveryOrder) {
            return redirect()->back()->with('error', __('Delivery order not found.'));
        }

        $validated = $request->validate([
            'status' => 'required|in:pending,in_transit,delivered,cancelled'
        ]);

        $deliveryOrder->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', __('Delivery order status updated successfully.'));
    }

    public function assignUser(Request $request, $deliveryOrderId)
    {
        $deliveryOrder = DeliveryOrder::where('id', $deliveryOrderId)
            ->where('created_by', createdBy())
            ->first();

        if (!$deliveryOrder) {
            return redirect()->back()->with('error', __('Delivery order not found.'));
        }

        $validated = $request->validate([
            'assigned_to' => 'required|exists:users,id'
        ]);

        $deliveryOrder->update(['assigned_to' => $validated['assigned_to']]);

        return redirect()->back()->with('success', __('User assigned to delivery order successfully.'));
    }

    public function fileExport()
    {
        if (!auth()->user()->can('export-delivery-orders')) {
            return redirect()->back()->with('error', __('Permission denied.'));
        }

        $name = 'delivery_order_' . date('Y-m-d i:h:s');
        return Excel::download(new DeliveryOrderExport(), $name . '.xlsx');
    }

    public function getSalesOrderDetails($salesOrderId)
    {
        $salesOrder = SalesOrder::with(['products'])
            ->where('id', $salesOrderId)
            ->where('created_by', createdBy())
            ->first();
        if (!$salesOrder) {
            return response()->json(['error' => 'Sales order not found'], 404);
        }

        return response()->json([
            'account_id'               => $salesOrder->account_id,
            'contact_id'               => $salesOrder->billing_contact_id ?? $salesOrder->contact_id,
            'shipping_provider_type_id' => $salesOrder->shipping_provider_type_id,
            'delivery_address'         => $salesOrder->shipping_address,
            'delivery_city'            => $salesOrder->shipping_city,
            'delivery_state'           => $salesOrder->shipping_state,
            'delivery_postal_code'     => $salesOrder->shipping_postal_code,
            'delivery_country'         => $salesOrder->shipping_country,
            'products'                 => $salesOrder->products->map(function ($product) {
                return [
                    'product_id'  => $product->id,
                    'quantity'    => $product->pivot->quantity ?? 1,
                    'unit_weight' => 0,
                ];
            }),
        ]);
    }

    private function getFilteredProducts()
    {
        return Product::where('created_by', createdBy())->select('id', 'name')->get();
    }
}
