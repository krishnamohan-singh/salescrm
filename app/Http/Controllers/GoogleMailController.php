<?php

namespace App\Http\Controllers;

use App\Models\CrmEmail;
use App\Services\GoogleMailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GoogleMailController extends Controller
{
    protected GoogleMailService $googleMailService;

    public function __construct(GoogleMailService $googleMailService)
    {
        $this->googleMailService = $googleMailService;
    }

    /**
     * Start Google OAuth2 authorization flow
     */
    public function connect(Request $request)
    {
        $tenantId = createdBy();

        $clientId = getSetting('googleMailClientId', config('services.google.client_id', ''), $tenantId);
        $clientSecret = getSetting('googleMailClientSecret', config('services.google.client_secret', ''), $tenantId);

        if (empty($clientId) || empty($clientSecret)) {
            // Check if service account or default credentials configured
            $jsonPath = getSetting('googleCalendarJsonPath', null, $tenantId);
            if (!$jsonPath || !file_exists(storage_path('app/public/' . $jsonPath))) {
                return redirect()->back()->with('error', __('Please configure your Google Client ID and Secret in settings before connecting.'));
            }
        }

        try {
            $authUrl = $this->googleMailService->getAuthUrl($tenantId);
            return redirect()->away($authUrl);
        } catch (\Exception $e) {
            Log::error('Google Mail connect error: ' . $e->getMessage());
            return redirect()->back()->with('error', __('Failed to initiate Google authorization: :error', ['error' => $e->getMessage()]));
        }
    }

    /**
     * Handle Google OAuth2 callback
     */
    public function callback(Request $request)
    {
        $tenantId = createdBy();

        if ($request->has('error')) {
            return redirect()->route('settings.index')
                ->with('error', __('Google authorization cancelled or denied: :error', ['error' => $request->get('error')]));
        }

        $code = $request->get('code');
        if (!$code) {
            return redirect()->route('settings.index')
                ->with('error', __('Authorization code missing from Google response.'));
        }

        try {
            $result = $this->googleMailService->handleCallback($code, $tenantId);

            // Auto-trigger initial sync
            $syncResult = $this->googleMailService->syncEmails($tenantId, 50);

            $msg = __('Google account :email connected successfully!', ['email' => $result['email']]);
            if (($syncResult['captured'] ?? 0) > 0) {
                $msg .= ' ' . __(':count recent email(s) captured into timeline.', ['count' => $syncResult['captured']]);
            }

            return redirect()->to(route('settings.index') . '#google-mail-settings')->with('success', $msg);
        } catch (\Exception $e) {
            Log::error('Google Mail callback error: ' . $e->getMessage());
            return redirect()->route('settings.index')
                ->with('error', __('Failed to connect Google account: :error', ['error' => $e->getMessage()]));
        }
    }

    /**
     * Disconnect Google account
     */
    public function disconnect(Request $request)
    {
        $tenantId = createdBy();
        $this->googleMailService->disconnect($tenantId);

        return redirect()->back()->with('success', __('Google Mail disconnected successfully.'));
    }

    /**
     * Sync Gmail messages manually and match against CRM contacts/leads
     */
    public function sync(Request $request)
    {
        $tenantId = createdBy();

        $result = $this->googleMailService->syncEmails($tenantId, (int) $request->get('limit', 50));

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        if ($result['success']) {
            return redirect()->back()->with('success', $result['message']);
        } else {
            return redirect()->back()->with('warning', $result['message']);
        }
    }

    /**
     * Send email directly from CRM to a Lead, Contact, Account, or Opportunity
     */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'to' => 'required|email|max:255',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'lead_id' => 'nullable|exists:leads,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'account_id' => 'nullable|exists:accounts,id',
            'opportunity_id' => 'nullable|exists:opportunities,id',
        ]);

        $tenantId = createdBy();
        $result = $this->googleMailService->sendEmail($tenantId, $validated);

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        return redirect()->back()->with('success', $result['message']);
    }

    /**
     * Simulate test email capture for instant timeline verification
     */
    public function simulateTestSync(Request $request)
    {
        $tenantId = createdBy();
        $result = $this->googleMailService->simulateTestSync($tenantId, $request->all());

        if ($request->wantsJson()) {
            return response()->json($result);
        }

        return redirect()->back()->with('success', $result['message']);
    }

    /**
     * Get integration status
     */
    public function status(Request $request)
    {
        $tenantId = createdBy();
        $isConnected = $this->googleMailService->isConnected($tenantId);
        $isEnabled = $this->googleMailService->isEnabled($tenantId);

        $connectedEmail = getSetting('googleMailConnectedEmail', '', $tenantId);
        $connectedName = getSetting('googleMailConnectedName', '', $tenantId);
        $lastSyncAt = getSetting('googleMailLastSyncAt', null, $tenantId);
        $clientId = getSetting('googleMailClientId', '', $tenantId);

        $capturedCount = CrmEmail::where('created_by', $tenantId)->count();

        return response()->json([
            'enabled' => $isEnabled,
            'connected' => $isConnected,
            'connected_email' => $connectedEmail,
            'connected_name' => $connectedName,
            'last_sync_at' => $lastSyncAt,
            'has_client_id' => !empty($clientId),
            'captured_count' => $capturedCount,
            'redirect_uri' => route('google-mail.callback'),
        ]);
    }

    /**
     * Update Google Mail settings (Client ID, Client Secret, auto-capture toggles)
     */
    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'googleMailEnabled' => 'nullable|boolean',
            'googleMailClientId' => 'nullable|string|max:255',
            'googleMailClientSecret' => 'nullable|string|max:255',
            'googleMailAutoSync' => 'nullable|boolean',
            'googleMailCaptureInbound' => 'nullable|boolean',
            'googleMailCaptureOutbound' => 'nullable|boolean',
        ]);

        $tenantId = createdBy();

        foreach ($validated as $key => $value) {
            updateSetting($key, is_bool($value) ? ($value ? '1' : '0') : (string) ($value ?? ''), $tenantId);
        }

        return redirect()->back()->with('success', __('Google Mail settings updated successfully.'));
    }
}
