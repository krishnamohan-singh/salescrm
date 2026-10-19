<?php

namespace App\Http\Controllers;

use App\Models\AccountIndustry;
use App\Models\Lead;
use App\Models\LeadIntegration;
use App\Models\LeadIntegrationLog;
use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Models\User;
use App\Services\LeadIntegrationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class LeadIntegrationController extends Controller
{
    /**
     * Display Lead Integrations dashboard
     */
    public function index(Request $request): Response
    {
        $companyId = createdBy();

        // Ensure default integrations exist
        LeadIntegration::ensureDefaultsForCompany($companyId);

        $integrations = LeadIntegration::where('created_by', $companyId)
            ->with(['defaultLeadStatus', 'defaultLeadSource', 'defaultAccountIndustry', 'defaultAssignedUser'])
            ->get()
            ->keyBy('type');

        // Append computed webhook_url
        $integrations->each(function ($item) {
            $item->webhook_url = $item->webhook_url;
        });

        // Dropdown options
        $leadStatuses = LeadStatus::where('created_by', $companyId)
            ->where('status', 'active')
            ->get(['id', 'name', 'color']);

        $leadSources = LeadSource::where('created_by', $companyId)
            ->where('status', 'active')
            ->get(['id', 'name']);

        $accountIndustries = AccountIndustry::where('created_by', $companyId)
            ->where('status', 'active')
            ->get(['id', 'name']);

        $users = User::where(function ($q) use ($companyId) {
            $q->where('id', $companyId)->orWhere('created_by', $companyId);
        })
            ->where('status', 'active')
            ->select('id', 'name', 'email')
            ->get();

        // Recent Logs
        $logs = LeadIntegrationLog::where('created_by', $companyId)
            ->with(['lead:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        // Aggregate statistics
        $stats = [
            'total_received'   => LeadIntegrationLog::where('created_by', $companyId)->count(),
            'total_successful' => LeadIntegrationLog::where('created_by', $companyId)->where('status', 'success')->count(),
            'total_failed'     => LeadIntegrationLog::where('created_by', $companyId)->where('status', 'failed')->count(),
            'active_channels'  => LeadIntegration::where('created_by', $companyId)->where('is_active', true)->count(),
        ];

        return Inertia::render('leads/integrations', [
            'integrations'      => $integrations,
            'leadStatuses'      => $leadStatuses,
            'leadSources'       => $leadSources,
            'accountIndustries' => $accountIndustries,
            'users'             => $users,
            'logs'              => $logs,
            'stats'             => $stats,
            'baseUrl'           => url('/'),
        ]);
    }

    /**
     * Update lead integration configuration
     */
    public function update(Request $request, LeadIntegration $leadIntegration): RedirectResponse
    {
        $this->authorizeIntegration($leadIntegration);

        $validated = $request->validate([
            'is_active'                    => 'nullable|boolean',
            'name'                         => 'nullable|string|max:255',
            'default_lead_status_id'       => 'nullable|exists:lead_statuses,id',
            'default_lead_source_id'       => 'nullable|exists:lead_sources,id',
            'default_account_industry_id'  => 'nullable|exists:account_industries,id',
            'default_assigned_to'          => 'nullable|exists:users,id',
            'secret_key'                   => 'nullable|string|max:255',
            'configuration'                => 'nullable|array',
        ]);

        $leadIntegration->update($validated);

        return back()->with('success', __(':name integration settings updated successfully.', ['name' => $leadIntegration->name]));
    }

    /**
     * Regenerate webhook token or API key
     */
    public function regenerateToken(Request $request, LeadIntegration $leadIntegration): RedirectResponse
    {
        $this->authorizeIntegration($leadIntegration);

        $target = $request->input('target', 'webhook_token'); // 'webhook_token' | 'api_key' | 'secret_key'

        if ($target === 'api_key') {
            $leadIntegration->update(['api_key' => 'scrm_' . Str::random(40)]);
            $msg = 'API Key regenerated successfully.';
        } elseif ($target === 'secret_key') {
            $leadIntegration->update(['secret_key' => Str::random(32)]);
            $msg = 'Secret Key regenerated successfully.';
        } else {
            $leadIntegration->update(['webhook_token' => Str::random(32)]);
            $msg = 'Webhook endpoint URL token regenerated successfully.';
        }

        return back()->with('success', __($msg));
    }

    /**
     * Send simulated test lead to verify integration
     */
    public function sendTestLead(Request $request, LeadIntegration $leadIntegration, LeadIntegrationService $service): JsonResponse
    {
        $this->authorizeIntegration($leadIntegration);

        $testEmail = 'test_' . Str::random(6) . '@example.com';
        $testPhone = '+1 555-' . rand(100, 999) . '-' . rand(1000, 9999);
        $testName = 'Test ' . ucfirst($leadIntegration->type) . ' Lead';

        $fakeRequest = new Request();

        switch ($leadIntegration->type) {
            case 'facebook':
                $fakeRequest->replace([
                    'field_data' => [
                        ['name' => 'full_name', 'values' => [$testName]],
                        ['name' => 'email', 'values' => [$testEmail]],
                        ['name' => 'phone_number', 'values' => [$testPhone]],
                        ['name' => 'company_name', 'values' => ['Acme Test Corp']],
                    ],
                    'leadgen_id' => 'fb_test_' . rand(100000, 999999),
                ]);
                $result = $service->handleFacebook($leadIntegration, $fakeRequest);
                break;

            case 'google_ads':
                $googleKey = $leadIntegration->configuration['google_key'] ?? $leadIntegration->secret_key;
                $fakeRequest->replace([
                    'lead_id' => 'gads_test_' . rand(100000, 999999),
                    'google_key' => $googleKey,
                    'user_column_data' => [
                        ['column_id' => 'FULL_NAME', 'string_value' => $testName],
                        ['column_id' => 'EMAIL', 'string_value' => $testEmail],
                        ['column_id' => 'PHONE_NUMBER', 'string_value' => $testPhone],
                        ['column_id' => 'COMPANY_NAME', 'string_value' => 'Google Ad Prospect'],
                    ],
                ]);
                $result = $service->handleGoogleAds($leadIntegration, $fakeRequest);
                break;

            case 'webhook':
                $fakeRequest->replace([
                    'name'    => $testName,
                    'email'   => $testEmail,
                    'phone'   => $testPhone,
                    'company' => 'Webhook Prospect Ltd',
                    'notes'   => 'This is a test submission via Custom Webhook simulator.',
                    'value'   => 1500,
                ]);
                if ($leadIntegration->configuration['secret_header_enabled'] ?? false) {
                    $fakeRequest->headers->set(
                        $leadIntegration->configuration['secret_header_name'] ?? 'X-Webhook-Secret',
                        $leadIntegration->secret_key
                    );
                }
                $result = $service->handleWebhook($leadIntegration, $fakeRequest);
                break;

            case 'api':
            default:
                $fakeRequest->replace([
                    'name'    => $testName,
                    'email'   => $testEmail,
                    'phone'   => $testPhone,
                    'company' => 'API Integration Test Co',
                    'notes'   => 'Created via REST API Lead test runner.',
                    'value'   => 2500,
                ]);
                $result = $service->handleApi($leadIntegration, $fakeRequest);
                break;
        }

        return response()->json($result, $result['status'] ?? 200);
    }

    /**
     * Get paginated logs via JSON
     */
    public function getLogs(Request $request): JsonResponse
    {
        $companyId = createdBy();
        $query = LeadIntegrationLog::where('created_by', $companyId)
            ->with(['lead:id,name,email']);

        if ($request->has('type') && !empty($request->type) && $request->type !== 'all') {
            $query->where('integration_type', $request->type);
        }

        if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($logs);
    }

    /**
     * Clear all integration logs
     */
    public function clearLogs(): RedirectResponse
    {
        $companyId = createdBy();
        LeadIntegrationLog::where('created_by', $companyId)->delete();

        return back()->with('success', __('Integration logs cleared successfully.'));
    }

    /**
     * Verify ownership of integration
     */
    protected function authorizeIntegration(LeadIntegration $leadIntegration): void
    {
        if ($leadIntegration->created_by !== createdBy() && !auth()->user()->hasRole('superadmin')) {
            abort(403, 'Unauthorized access to this integration.');
        }
    }
}
