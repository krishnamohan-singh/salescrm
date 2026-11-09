<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class CompanySystemSettingsController extends Controller
{
    /**
     * Update the company system settings.
     *
     * Handles company-level configuration including:
     * - Language and localization settings
     * - Date/time formats and timezone
     * - Excludes email verification and landing page settings
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function update(Request $request)
    {
        try {
            $validated = $request->validate([
                'defaultLanguage' => 'required|string',
                'dateFormat' => 'required|string',
                'timeFormat' => 'required|string',
                'defaultTimezone' => 'required|string',
            ]);

            foreach ($validated as $key => $value) {
                updateSetting($key, $value);
            }

            return redirect()->back()->with('success', __('System settings updated successfully.'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to update system settings: :error', ['error' => $e->getMessage()]));
        }
    }

    /**
     * Update daily sales report automation settings.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function updateDailyReport(Request $request)
    {
        try {
            $companyId = createdBy();

            $request->validate([
                'daily_report_enabled' => 'nullable',
                'daily_report_send_time' => 'nullable|string',
                'daily_report_days' => 'nullable|string|in:weekdays,everyday',
                'daily_report_custom_cc' => 'nullable|string',
                'daily_report_include_idle' => 'nullable',
            ]);

            $enabled = $request->has('daily_report_enabled') ? ($request->boolean('daily_report_enabled') ? 'on' : 'off') : 'on';
            $includeIdle = $request->has('daily_report_include_idle') ? ($request->boolean('daily_report_include_idle') ? 'on' : 'off') : 'off';
            $sendTime = $request->input('daily_report_send_time', '19:00');
            $days = $request->input('daily_report_days', 'weekdays');
            $customCc = trim((string)$request->input('daily_report_custom_cc', ''));

            updateSetting('daily_report_enabled', $enabled, $companyId);
            updateSetting('daily_report_send_time', $sendTime, $companyId);
            updateSetting('daily_report_days', $days, $companyId);
            updateSetting('daily_report_custom_cc', $customCc, $companyId);
            updateSetting('daily_report_include_idle', $includeIdle, $companyId);

            return redirect()->back()->with('success', __('Daily sales report settings updated successfully.'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', __('Failed to update daily sales report settings: :error', ['error' => $e->getMessage()]));
        }
    }
}