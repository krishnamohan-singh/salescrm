<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use App\Models\Setting;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;

class BankPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'amount' => 'required|numeric|min:0',
            'receipt' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);

            $receiptPath = null;
            if ($request->hasFile('receipt') && !IsDemo()) {
                $file = $request->file('receipt');
                $fileNameToStore = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '_' . time() . '.' . $file->getClientOriginalExtension();
                $upload = upload_file($request, 'receipt', $fileNameToStore, 'bank-receipts');
                if ($upload['status'] == true) {
                    $receiptPath = $upload['url'];
                }
            }

            createPlanOrder([
                'user_id' => auth()->id(),
                'plan_id' => $plan->id,
                'billing_cycle' => $validated['billing_cycle'],
                'payment_method' => 'bank',
                'coupon_code' => $validated['coupon_code'] ?? null,
                'payment_id' => 'BANK_' . strtoupper(uniqid()),
                'status' => 'pending',
                'receipt_path' => $receiptPath,
            ]);

            return back()->with('success', __('Payment request submitted. Your plan will be activated after payment verification.'));
        } catch (\Exception $e) {
            return handlePaymentError($e, 'bank');
        }
    }
}
