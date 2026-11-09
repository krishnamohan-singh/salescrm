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
        $userId = auth()->id() ?: 1;
        $tenantId = createdBy() ?: $userId;

        $superAdmin = \App\Models\User::where('type', 'superadmin')->first();
        $superAdminId = $superAdmin ? $superAdmin->id : 1;

        $clientId = getSetting('googleMailClientId', null, $userId)
            ?: getSetting('googleMailClientId', null, $tenantId)
            ?: getSetting('googleMailClientId', null, $superAdminId)
            ?: getSetting('googleMailClientId', null, 1)
            ?: config('services.google.client_id', '');

        $clientSecret = getSetting('googleMailClientSecret', null, $userId)
            ?: getSetting('googleMailClientSecret', null, $tenantId)
            ?: getSetting('googleMailClientSecret', null, $superAdminId)
            ?: getSetting('googleMailClientSecret', null, 1)
            ?: config('services.google.client_secret', '');

        if (empty($clientId) || empty($clientSecret)) {
            // Check if service account or default credentials configured
            $jsonPath = getSetting('googleCalendarJsonPath', null, $tenantId)
                ?: getSetting('googleCalendarJsonPath', null, $superAdminId)
                ?: getSetting('googleCalendarJsonPath', null, 1);
            if (!$jsonPath || !file_exists(storage_path('app/public/' . $jsonPath))) {
                return redirect()->back()->with('error', __('Google OAuth credentials are not configured yet by the system administrator. Please contact your Super Admin.'));
            }
        }

        try {
            $authUrl = $this->googleMailService->getAuthUrl($userId);
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
        // Decode state if provided by Google OAuth
        $state = [];
        if ($request->has('state')) {
            $decoded = json_decode(base64_decode($request->get('state')), true);
            if (is_array($decoded)) {
                $state = $decoded;
            }
        }

        // Check if authorization was initiated from another host (e.g. localhost) and redirected to live domain
        $origin = $state['origin'] ?? null;
        $currentHost = $request->getSchemeAndHttpHost();
        if ($origin && $origin !== $currentHost && (str_contains($origin, 'localhost') || str_contains($origin, '127.0.0.1'))) {
            $forwardUrl = rtrim($origin, '/') . '/integrations/google-mail/callback?' . http_build_query($request->all());
            return redirect()->away($forwardUrl);
        }

        $userId = $state['user_id'] ?? (auth()->check() ? auth()->id() : null);
        $tenantId = $state['tenant_id'] ?? (auth()->check() ? createdBy() : $userId);

        // Restore auth session if dropped on cross-site redirect
        if (!auth()->check() && $userId) {
            auth()->loginUsingId($userId);
        }

        $userId = $userId ?: (auth()->check() ? auth()->id() : 1);
        $tenantId = $tenantId ?: (auth()->check() ? createdBy() : $userId);

        if ($request->has('error')) {
            return redirect()->route('emails.index')
                ->with('error', __('Google authorization cancelled or denied: :error', ['error' => $request->get('error')]));
        }

        $code = $request->get('code');
        if (!$code) {
            return redirect()->route('emails.index')
                ->with('error', __('Authorization code missing from Google response.'));
        }

        try {
            $result = $this->googleMailService->handleCallback($code, $userId, $tenantId);

            // Auto-trigger full initial sync of Inbox and Outbox for this connected user
            $syncResult = $this->googleMailService->syncEmails($userId, 200);

            $msg = __('Google account :email connected successfully!', ['email' => $result['email']]);
            if (($syncResult['captured'] ?? 0) > 0) {
                $msg .= ' ' . __(':count email(s) from Inbox and Sent synced into CRM Mailbox.', ['count' => $syncResult['captured']]);
            }

            return redirect()->route('emails.index')->with('success', $msg);
        } catch (\Exception $e) {
            Log::error('Google Mail callback error: ' . $e->getMessage());
            return redirect()->route('emails.index')
                ->with('error', __('Failed to connect Google account: :error', ['error' => $e->getMessage()]));
        }
    }

    /**
     * Disconnect Google account for the current user
     */
    public function disconnect(Request $request)
    {
        $userId = auth()->id();
        $this->googleMailService->disconnect($userId);

        return redirect()->back()->with('success', __('Google Mail disconnected successfully. All synced emails have been removed.'));
    }

    /**
     * Sync Gmail messages manually and match against CRM contacts/leads
     */
    public function sync(Request $request)
    {
        $userId = auth()->id();
        $result = $this->googleMailService->syncEmails($userId, (int) $request->get('limit', 200));

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
        $user = auth()->user();
        $isSuperAdmin = $user && ($user->type === 'superadmin' || $user->hasRole('superadmin'));
        $isCompany = $user && (in_array($user->type, ['company', 'admin']) || $user->hasRole('company') || $user->hasRole('admin'));
        $canSend = $isSuperAdmin || $isCompany || $user->can('send-emails') || $user->can('manage-emails');

        if (!$canSend) {
            if ($request->wantsJson()) {
                return response()->json(['success' => false, 'message' => __('You do not have permission to send emails.')], 403);
            }
            return redirect()->back()->with('error', __('You do not have permission to send emails.'));
        }

        $validated = $request->validate([
            'to' => 'required|email|max:255',
            'subject' => 'required|string|max:255',
            'body' => 'required|string',
            'lead_id' => 'nullable|exists:leads,id',
            'contact_id' => 'nullable|exists:contacts,id',
            'account_id' => 'nullable|exists:accounts,id',
            'opportunity_id' => 'nullable|exists:opportunities,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'nullable|file|max:25600', // max 25MB per file
        ]);

        $userId = auth()->id();
        $files = $request->file('attachments');
        if ($files && !is_array($files)) {
            $files = [$files];
        }

        $result = $this->googleMailService->sendEmail($userId, $validated, $files ?: []);

        if ($request->wantsJson()) {
            return response()->json($result, ($result['success'] ?? false) ? 200 : 422);
        }

        if (!($result['success'] ?? false)) {
            return redirect()->back()
                ->withErrors(['error' => $result['message']])
                ->with('error', $result['message']);
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
     * Get integration status for the current user
     */
    public function status(Request $request)
    {
        $userId = auth()->id();
        $tenantId = createdBy();
        $summary = $this->googleMailService->getStatusSummary($userId);
        $isEnabled = $this->googleMailService->isEnabled($userId);

        $clientId = getSetting('googleMailClientId', '', $userId)
            ?: getSetting('googleMailClientId', '', $tenantId)
            ?: config('services.google.client_id');
        $capturedCount = CrmEmail::where('user_id', $userId)->count();

        return response()->json([
            'enabled' => $isEnabled,
            'connected' => $summary['isConnected'],
            'connected_email' => $summary['connectedEmail'],
            'connected_name' => $summary['connectedName'],
            'last_sync_at' => $summary['lastSyncAt'],
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
        $user = auth()->user();
        $isSuperAdmin = ($user && ($user->type === 'superadmin' || (method_exists($user, 'hasRole') && $user->hasRole('superadmin'))));

        $rules = [
            'googleMailEnabled' => 'nullable|boolean',
            'googleMailAutoSync' => 'nullable|boolean',
            'googleMailCaptureInbound' => 'nullable|boolean',
            'googleMailCaptureOutbound' => 'nullable|boolean',
        ];

        if ($isSuperAdmin) {
            $rules['googleMailClientId'] = 'nullable|string|max:255';
            $rules['googleMailClientSecret'] = 'nullable|string|max:255';
        }

        $validated = $request->validate($rules);

        $superAdmin = \App\Models\User::where('type', 'superadmin')->first();
        $superAdminId = $superAdmin ? $superAdmin->id : 1;
        $targetId = $isSuperAdmin ? $superAdminId : (createdBy() ?: $user->id);

        foreach ($validated as $key => $value) {
            updateSetting($key, is_bool($value) ? ($value ? '1' : '0') : (string) ($value ?? ''), $targetId);
            if ($isSuperAdmin) {
                updateSetting($key, is_bool($value) ? ($value ? '1' : '0') : (string) ($value ?? ''), 1);
            }
        }

        return redirect()->back()->with('success', __('Google Mail settings updated successfully.'));
    }
}
