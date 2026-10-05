<?php

namespace App\Http\Controllers;

use App\Models\ReturnOrder;
use App\Models\SalesOrder;
use App\Models\Account;
use App\Models\Contact;
use App\Models\Product;
use App\Models\ShippingProviderType;
use App\Events\ReturnOrderCreated;
use App\Exports\ReturnOrderExport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ReturnOrderController extends Controller
{
    public function index(Request $request)
    {
        $query = ReturnOrder::query()
            ->with(['salesOrder', 'account', 'contact', 'shippingProviderType', 'creator', 'assignedUser', 'products'])
            ->where('created_by', createdBy());

        if ($request->has('search') && !empty($request->search)) {
            $query->where(function($q) use ($request) {
                $q->where('return_number', 'like', '%' . $request->search . '%')
                  ->orWhere('name', 'like', '%' . $request->search . '%')
                  ->orWhereHas('account', fn($q) => $q->where('name', 'like', '%' . $request->search . '%'));
            });
        }

        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
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
        $allowedSorts=['id', 'return_number', 'name', 'return_date'];
        $allowedDirection = ['asc', 'desc'];
        if (!in_array($sortDirection, $allowedDirection)) {
            $sortDirection = 'desc';
        }
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        }

        $perPage = max(1, min(100, (int) $request->get('per_page', 10)));
        $returnOrders = $query->paginate($perPage)->withQueryString();

        $userQuery = \App\Models\User::where('created_by', createdBy());
        $allUsers = (clone $userQuery)->select('id', 'name', 'email')->get();
        $users = (clone $userQuery)->where('status', 'active')->select('id', 'name', 'email')->get();

        return Inertia::render('return-orders/index', [
            'returnOrders' => $returnOrders,
            'salesOrders' => SalesOrder::where('created_by', createdBy())->select('id', 'name', 'order_number')->get(),
            'accounts' => Account::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get(),
            'contacts' => Contact::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get(),
            'products' => $this->getFilteredProducts(),
            'shippingProviderTypes' => ShippingProviderType::where('created_by', createdBy())->where('status', 'active')->select('id', 'name')->get(),
            'users' => $users,
            'allUsers' => $allUsers,
            'filters' => $request->all(['search', 'status', 'assigned_to', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    public function create()
    {
        $salesOrders = SalesOrder::where('created_by', createdBy())->select('id', 'name', 'order_number')->get();
        $accounts = Account::where('created_by', createdBy())->select('id', 'name')->get();
        $contacts = Contact::where('created_by', createdBy())->select('id', 'name')->get();
        $products = $this->getFilteredProducts();
        $shippingProviderTypes = ShippingProviderType::where('created_by', createdBy())->select('id', 'name')->get();
        $users = \App\Models\User::where('created_by', createdBy())->select('id', 'name', 'email')->get();

        return Inertia::render('return-orders/create', [
            'salesOrders' => $salesOrders,
            'accounts' => $accounts,
            'contacts' => $contacts,
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
            'tracking_number' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) {
                if ($value && ReturnOrder::where('tracking_number', $value)->where('created_by', createdBy())->exists()) {
                    $fail('The tracking number has already been taken.');
                }
            }],
            'status' => 'nullable|in:pending,approved,shipped,received,processed,cancelled',
            'reason' => 'nullable|in:defective,wrong_item,damaged,not_needed,other',
            'reason_description' => 'nullable|string',
            'return_date' => 'required|date',
            'notes' => 'nullable|string',
            'assigned_to' => 'required|exists:users,id',
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.unit_price' => 'required|numeric|min:0',
        ]);

        $validated['created_by'] = createdBy();
        $validated['status'] = $validated['status'] ?? 'pending';

        $products = $validated['products'] ?? [];
        unset($validated['products']);

        $returnOrder = ReturnOrder::create($validated);

        if (!empty($products)) {
            $syncData = [];
            foreach ($products as $product) {
                $productId = $product['product_id'];
                $totalPrice = $product['quantity'] * $product['unit_price'];

                $syncData[$productId] = [
                    'quantity' => $product['quantity'],
                    'unit_price' => $product['unit_price'],
                    'total_price' => $totalPrice,
                ];
            }
            $returnOrder->products()->sync($syncData);
        }

        $returnOrder->calculateTotals();

        if ($returnOrder && !IsDemo()) {
            event(new \App\Events\ReturnOrderCreated($returnOrder));
        }

        $emailError = session()->pull('email_error');

        if ($emailError) {
            $message = __('Return order created successfully, but ') . __('Email send failed: ') . $emailError;
            return redirect()->back()->with('warning', $message);
        }

        return redirect()->route('return-orders.index')->with('success', __('Return order created successfully.'));
    }

    public function show($returnOrderId)
    {
        $returnOrder = ReturnOrder::where('id', $returnOrderId)
            ->where('created_by', createdBy())
            ->with(['salesOrder', 'account', 'contact', 'shippingProviderType', 'creator', 'assignedUser', 'products.tax'])
            ->first();

        if (!$returnOrder) {
            return redirect()->route('return-orders.index')->with('error', __('Return order not found.'));
        }

        return Inertia::render('return-orders/show', [
            'returnOrder' => $returnOrder,
        ]);
    }

    public function edit($id)
    {
        $returnOrder = ReturnOrder::with([
            'salesOrder',
            'account',
            'contact',
            'shippingProviderType',
            'creator',
            'assignedUser',
            'products.tax'
        ])
        ->where('created_by', createdBy())
        ->where('id', $id)
        ->first();

        if ($returnOrder) {
            $salesOrders = SalesOrder::where('created_by', createdBy())->select('id', 'name', 'order_number')->get();
            $accounts = Account::where('created_by', createdBy())->select('id', 'name')->get();
            $contacts = Contact::where('created_by', createdBy())->select('id', 'name')->get();
            $products = $this->getFilteredProducts();
            $shippingProviderTypes = ShippingProviderType::where('created_by', createdBy())->select('id', 'name')->get();
            $users = \App\Models\User::where('created_by', createdBy())->select('id', 'name', 'email')->get();

            return Inertia::render('return-orders/edit', [
                'returnOrder' => $returnOrder,
                'salesOrders' => $salesOrders,
                'accounts' => $accounts,
                'contacts' => $contacts,
                'products' => $products,
                'shippingProviderTypes' => $shippingProviderTypes,
                'users' => $users
            ]);
        } else {
            return redirect()->route('return-orders.index')->with('error', __('Return order not found.'));
        }
    }

    public function update(Request $request, $returnOrderId)
    {
        $returnOrder = ReturnOrder::where('id', $returnOrderId)
            ->where('created_by', createdBy())
            ->first();

        if (!$returnOrder) {
            return redirect()->back()->with('error', __('Return order not found.'));
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sales_order_id' => 'required|exists:sales_orders,id',
            'account_id' => 'required|exists:accounts,id',
            'contact_id' => 'required|exists:contacts,id',
            'shipping_provider_type_id' => 'required|exists:shipping_provider_types,id',
            'tracking_number' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) use ($returnOrderId) {
                if ($value && ReturnOrder::where('tracking_number', $value)->where('created_by', createdBy())->where('id', '!=', $returnOrderId)->exists()) {
                    $fail('The Tracking number has already been taken.');
                }
            }],
            'status' => 'nullable|in:pending,approved,shipped,received,processed,cancelled',
            'reason' => 'nullable|in:defective,wrong_item,damaged,not_needed,other',
            'reason_description' => 'nullable|string',
            'return_date' => 'required|date',
            'notes' => 'nullable|string',
            'assigned_to' => 'required|exists:users,id',
            'products' => 'required|array|min:1',
            'products.*.product_id' => 'required|exists:products,id',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.unit_price' => 'required|numeric|min:0',
        ]);

        $products = $validated['products'] ?? [];
        unset($validated['products']);

        $returnOrder->update($validated);

        if (!empty($products)) {
            $syncData = [];
            foreach ($products as $product) {
                $productId = $product['product_id'];
                $totalPrice = $product['quantity'] * $product['unit_price'];

                $syncData[$productId] = [
                    'quantity' => $product['quantity'],
                    'unit_price' => $product['unit_price'],
                    'total_price' => $totalPrice,
                ];
            }
            $returnOrder->products()->sync($syncData);
        } else {
            $returnOrder->products()->detach();
        }

        $returnOrder->calculateTotals();

        return redirect()->route('return-orders.index')->with('success', __('Return order updated successfully.'));
    }

    public function destroy($returnOrderId)
    {
        $returnOrder = ReturnOrder::where('id', $returnOrderId)
            ->where('created_by', createdBy())
            ->first();

        if (!$returnOrder) {
            return redirect()->back()->with('error', __('Return order not found.'));
        }

        $returnOrder->products()->detach();
        $returnOrder->delete();

        return redirect()->back()->with('success', __('Return order deleted successfully.'));
    }

    public function getSalesOrderDetails($salesOrderId, Request $request)
    {
        $salesOrder = SalesOrder::with(['account', 'contact', 'products'])
            ->where('id', $salesOrderId)
            ->where('created_by', createdBy())
            ->first();

        if (!$salesOrder) {
            return response()->json(['error' => 'Sales order not found'], 404);
        }

        // Sum already-returned quantities per product for this sales order,
        // excluding the current return order being edited (if any)
        $excludeReturnOrderId = $request->query('exclude_return_order_id');

        $returnedQtys = \DB::table('return_order_product')
            ->join('return_orders', 'return_orders.id', '=', 'return_order_product.return_order_id')
            ->where('return_orders.sales_order_id', $salesOrderId)
            ->where('return_orders.created_by', createdBy())
            ->when($excludeReturnOrderId, fn($q) => $q->where('return_orders.id', '!=', $excludeReturnOrderId))
            ->select('return_order_product.product_id', \DB::raw('SUM(return_order_product.quantity) as returned_qty'))
            ->groupBy('return_order_product.product_id')
            ->pluck('returned_qty', 'product_id');

        return response()->json([
            'account_id' => $salesOrder->account_id,
            'contact_id' => $salesOrder->billing_contact_id ?? $salesOrder->contact_id,
            'shipping_provider_type_id' => $salesOrder->shipping_provider_type_id,
            'products' => $salesOrder->products->map(function ($product) use ($returnedQtys) {
                $orderedQty = $product->pivot->quantity ?? 1;
                $returnedQty = (int) ($returnedQtys[$product->id] ?? 0);
                $availableQty = max(0, $orderedQty - $returnedQty);
                return [
                    'product_id'   => $product->id,
                    'quantity'     => $availableQty,
                    'ordered_qty'  => $orderedQty,
                    'returned_qty' => $returnedQty,
                    'unit_price'   => $product->pivot->unit_price ?? $product->price ?? 0,
                    'discount_type'  => $product->pivot->discount_type ?? 'none',
                    'discount_value' => $product->pivot->discount_value ?? 0,
                ];
            })->filter(fn($p) => $p['quantity'] > 0)->values()
        ]);
    }
    
    private function getFilteredProducts()
    {
        return Product::where('created_by', createdBy())->with('tax')->select('id', 'name', 'price', 'tax_id')->get();
    }

    public function fileExport()
    {
        if (!auth()->user()->can('export-return-orders')) {
            return redirect()->back()->with('error', __('Permission denied.'));
        }

        $name = 'return_order_' . date('Y-m-d i:h:s');
        return Excel::download(new ReturnOrderExport(), $name . '.xlsx');
    }
}
