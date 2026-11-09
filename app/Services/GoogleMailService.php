<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountActivity;
use App\Models\Contact;
use App\Models\ContactActivity;
use App\Models\CrmEmail;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\Opportunity;
use App\Models\OpportunityActivity;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
use Google\Client as GoogleClient;
use Google\Service\Gmail as GoogleGmail;
use Google\Service\Gmail\Message as GmailMessage;
use Google\Service\Oauth2 as GoogleOauth2;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mime\Address as SymfonyAddress;
use Symfony\Component\Mime\Email as SymfonyEmail;

class GoogleMailService
{
    /**
     * Resolve the active connected Google account.
     * Ensures strict user-level isolation: Each team member connects and accesses
     * ONLY their own Google account. Disconnected accounts never fall back to admin or any other user.
     */
    public function resolveGoogleAccount($userId = null): ?array
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : null);

        if ($targetUserId) {
            return $this->findAccountForUser((int) $targetUserId);
        }

        return null;
    }

    /**
     * Get list of user IDs who currently have an active, connected Google Mail account.
     */
    public function getConnectedUserIds(?int $tenantId = null): array
    {
        $query = Setting::where('key', 'googleMailConnected')
            ->where('value', '1')
            ->whereNotNull('user_id');

        if ($tenantId) {
            $companyUserIds = User::where(function ($q) use ($tenantId) {
                $q->where('id', $tenantId)->orWhere('created_by', $tenantId);
            })->pluck('id')->toArray();

            $query->whereIn('user_id', $companyUserIds);
        }

        $userIds = $query->pluck('user_id')->unique()->toArray();

        $validUserIds = [];
        foreach ($userIds as $uid) {
            if ($this->findAccountForUser((int) $uid)) {
                $validUserIds[] = (int) $uid;
            }
        }

        return $validUserIds;
    }

    /**
     * Purge all emails and timeline activities from users who are currently NOT connected.
     * Ensures only connected Google account mail and data are retained in CRM.
     */
    public function purgeDisconnectedData(?int $tenantId = null): void
    {
        try {
            $connectedUserIds = $this->getConnectedUserIds($tenantId);

            $emailQuery = CrmEmail::where('source', 'gmail');
            if ($tenantId) {
                $emailQuery->where('created_by', $tenantId);
            }
            if (empty($connectedUserIds)) {
                $emailQuery->delete();
            } else {
                $emailQuery->whereNotIn('user_id', $connectedUserIds)->delete();
            }

            // Also clean timeline activities for disconnected users
            $cleanActivities = function ($modelClass) use ($tenantId, $connectedUserIds) {
                $q = $modelClass::where('field_changed', 'email');
                if ($tenantId) {
                    $q->where('created_by', $tenantId);
                }
                if (empty($connectedUserIds)) {
                    $q->delete();
                } else {
                    $q->whereNotIn('user_id', $connectedUserIds)->delete();
                }
            };

            $cleanActivities(LeadActivity::class);
            $cleanActivities(ContactActivity::class);
            $cleanActivities(AccountActivity::class);
            $cleanActivities(OpportunityActivity::class);
        } catch (\Throwable $e) {
            Log::warning('Error purging disconnected Google Mail data: ' . $e->getMessage());
        }
    }

    /**
     * Helper to retrieve connected Google account details for a specific user ID.
     * Queries the database Setting table directly to prevent any helper or session fallback.
     */
    public function findAccountForUser(int $uid): ?array
    {
        if ($uid <= 0) {
            return null;
        }

        $connectedEmail = Setting::where('user_id', $uid)->where('key', 'googleMailConnectedEmail')->value('value');
        $tokenJson = Setting::where('user_id', $uid)->where('key', 'googleMailAccessToken')->value('value');
        $refreshToken = Setting::where('user_id', $uid)->where('key', 'googleMailRefreshToken')->value('value');

        if (!empty($connectedEmail) && (!empty($tokenJson) || !empty($refreshToken))) {
            $user = User::find($uid);
            $connectedName = Setting::where('user_id', $uid)->where('key', 'googleMailConnectedName')->value('value');
            return [
                'user_id' => $uid,
                'email' => $connectedEmail,
                'name' => !empty($connectedName) ? $connectedName : ($user?->name ?? 'CRM User'),
                'token' => $tokenJson,
                'refresh_token' => $refreshToken,
            ];
        }

        return null;
    }

    /**
     * Get high-level connection summary for a specific user
     */
    public function getStatusSummary($userId = null): array
    {
        $account = $this->resolveGoogleAccount($userId);
        $syncAt = $account 
            ? Setting::where('user_id', $account['user_id'])->where('key', 'googleMailLastSyncAt')->value('value') 
            : null;

        return [
            'isConnected' => !is_null($account),
            'connectedEmail' => $account['email'] ?? null,
            'connectedName' => $account['name'] ?? null,
            'lastSyncAt' => $syncAt,
        ];
    }

    /**
     * Check if Google Mail integration is enabled in settings
     */
    public function isEnabled($userId = null): bool
    {
        $account = $this->resolveGoogleAccount($userId);
        if ($account) {
            return true;
        }
        $uid = $userId ?: (auth()->check() ? auth()->id() : 1);
        return Setting::where('user_id', $uid)->where('key', 'googleMailEnabled')->value('value') === '1';
    }

    /**
     * Check if Google Mail is authorized and connected with valid token
     */
    public function isConnected($userId = null): bool
    {
        return !is_null($this->resolveGoogleAccount($userId));
    }

    /**
     * Get Google OAuth client configured with credentials and active token
     */
    public function getClient($userId = null): GoogleClient
    {
        $client = new GoogleClient();

        $account = $this->resolveGoogleAccount($userId);
        $targetUserId = $account ? $account['user_id'] : ($userId ?: (auth()->check() ? auth()->id() : 1));
        $companyId = auth()->check() ? createdBy() : $targetUserId;

        $clientId = getSetting('googleMailClientId', null, $targetUserId);
        if (empty($clientId) && $companyId && $companyId != $targetUserId) {
            $clientId = getSetting('googleMailClientId', null, $companyId);
        }
        if (empty($clientId) && $targetUserId !== 1) {
            $clientId = getSetting('googleMailClientId', null, 1);
        }
        if (empty($clientId)) {
            $clientId = config('services.google.client_id', '');
        }

        $clientSecret = getSetting('googleMailClientSecret', null, $targetUserId);
        if (empty($clientSecret) && $companyId && $companyId != $targetUserId) {
            $clientSecret = getSetting('googleMailClientSecret', null, $companyId);
        }
        if (empty($clientSecret) && $targetUserId !== 1) {
            $clientSecret = getSetting('googleMailClientSecret', null, 1);
        }
        if (empty($clientSecret)) {
            $clientSecret = config('services.google.client_secret', '');
        }

        if (empty($clientId) || empty($clientSecret)) {
            $jsonPath = getSetting('googleCalendarJsonPath', null, $targetUserId) ?: getSetting('googleCalendarJsonPath', null, 1);
            if ($jsonPath && file_exists(storage_path('app/public/' . $jsonPath))) {
                $client->setAuthConfig(storage_path('app/public/' . $jsonPath));
            }
        } else {
            $client->setClientId(trim($clientId));
            $client->setClientSecret(trim($clientSecret));
        }

        $redirectUri = config('services.google.redirect') ?: route('google-mail.callback');
        $client->setRedirectUri($redirectUri);
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setIncludeGrantedScopes(true);

        $client->addScope([
            GoogleGmail::GMAIL_READONLY,
            GoogleGmail::GMAIL_SEND,
            GoogleGmail::GMAIL_MODIFY,
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
        ]);

        // Load existing token
        $tokenData = $account['token'] ?? Setting::where('user_id', $targetUserId)->where('key', 'googleMailAccessToken')->value('value');
        if ($tokenData) {
            $token = is_array($tokenData) ? $tokenData : json_decode($tokenData, true);
            if (is_array($token)) {
                $client->setAccessToken($token);

                if ($client->isAccessTokenExpired()) {
                    $refreshToken = $account['refresh_token'] 
                        ?? (Setting::where('user_id', $targetUserId)->where('key', 'googleMailRefreshToken')->value('value') ?: ($token['refresh_token'] ?? null));
                    if ($refreshToken) {
                        try {
                            $newToken = $client->fetchAccessTokenWithRefreshToken($refreshToken);
                            if (!isset($newToken['error'])) {
                                if (!isset($newToken['refresh_token'])) {
                                    $newToken['refresh_token'] = $refreshToken;
                                }
                                Setting::updateOrCreate(['user_id' => $targetUserId, 'key' => 'googleMailAccessToken'], ['value' => json_encode($newToken)]);
                                $client->setAccessToken($newToken);
                            } else {
                                Log::error('Google Mail token refresh failed', ['error' => $newToken]);
                            }
                        } catch (\Exception $e) {
                            Log::warning('Failed refreshing Google Mail token', ['user_id' => $targetUserId, 'error' => $e->getMessage()]);
                        }
                    }
                }
            }
        }

        return $client;
    }

    /**
     * Generate Google OAuth authorization URL with encoded state
     */
    public function getAuthUrl($userId = null): string
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : 1);
        $companyId = auth()->check() ? createdBy() : $targetUserId;

        $client = $this->getClient($targetUserId);
        $statePayload = base64_encode(json_encode([
            'tenant_id' => $companyId,
            'user_id' => $targetUserId,
            'origin' => request()->getSchemeAndHttpHost(),
        ]));
        $client->setState($statePayload);
        return $client->createAuthUrl();
    }

    /**
     * Handle OAuth code exchange callback from Google
     */
    public function handleCallback(string $code, $userId = null, $tenantId = null): array
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : 1);
        $companyId = $tenantId ?: (auth()->check() ? createdBy() : $targetUserId);

        $client = $this->getClient($targetUserId);
        $token = $client->fetchAccessTokenWithAuthCode($code);

        if (isset($token['error'])) {
            throw new \Exception('Google OAuth Error: ' . ($token['error_description'] ?? $token['error']));
        }

        $client->setAccessToken($token);

        // Fetch user profile email
        $oauth2 = new GoogleOauth2($client);
        $userInfo = $oauth2->userinfo->get();
        $connectedEmail = $userInfo->getEmail();
        $connectedName = $userInfo->getName();

        // Save tokens and settings ONLY for this specific user ($targetUserId)
        Setting::updateOrCreate(['user_id' => $targetUserId, 'key' => 'googleMailEnabled'], ['value' => '1']);
        Setting::updateOrCreate(['user_id' => $targetUserId, 'key' => 'googleMailConnected'], ['value' => '1']);
        Setting::updateOrCreate(['user_id' => $targetUserId, 'key' => 'googleMailAccessToken'], ['value' => json_encode($token)]);
        if (!empty($token['refresh_token'])) {
            Setting::updateOrCreate(['user_id' => $targetUserId, 'key' => 'googleMailRefreshToken'], ['value' => $token['refresh_token']]);
        }
        Setting::updateOrCreate(['user_id' => $targetUserId, 'key' => 'googleMailConnectedEmail'], ['value' => $connectedEmail]);
        Setting::updateOrCreate(['user_id' => $targetUserId, 'key' => 'googleMailConnectedName'], ['value' => $connectedName]);
        Setting::updateOrCreate(['user_id' => $targetUserId, 'key' => 'googleMailConnectedAt'], ['value' => Carbon::now()->toDateTimeString()]);

        // If user is company or admin, also ensure company flag is enabled
        $currentUser = auth()->user();
        if ($currentUser && in_array($currentUser->type ?? '', ['company', 'superadmin', 'admin'])) {
            Setting::updateOrCreate(['user_id' => $companyId, 'key' => 'googleMailEnabled'], ['value' => '1']);
        }

        return [
            'email' => $connectedEmail,
            'name' => $connectedName,
            'user_id' => $targetUserId,
        ];
    }

    /**
     * Disconnect Google Mail account for a specific user and purge all synced emails and timeline activities.
     */
    public function disconnect($userId = null): void
    {
        $targetUserId = $userId ?: (auth()->check() ? auth()->id() : null);
        if (!$targetUserId) {
            return;
        }

        $account = $this->findAccountForUser((int) $targetUserId);
        $connectedEmail = $account['email'] ?? Setting::where('user_id', $targetUserId)->where('key', 'googleMailConnectedEmail')->value('value');

        if ($account) {
            try {
                $client = $this->getClient($targetUserId);
                $client->revokeToken();
            } catch (\Exception $e) {
                // Ignore revoke errors
            }
        }

        // 1. Purge all synced emails belonging to this disconnected user/account
        $emailQuery = CrmEmail::where('user_id', $targetUserId);
        if (!empty($connectedEmail)) {
            $emailQuery->orWhere(function ($q) use ($connectedEmail) {
                $q->where('source', 'gmail')
                  ->where(function ($sub) use ($connectedEmail) {
                      $sub->where('from_email', $connectedEmail)
                          ->orWhereJsonContains('to_emails', $connectedEmail);
                  });
            });
        }
        $emailQuery->delete();

        // 2. Purge all activity timeline entries generated from this user's email sync
        $activityCondition = function ($q) use ($targetUserId, $connectedEmail) {
            $q->where('field_changed', 'email')
              ->where(function ($sub) use ($targetUserId, $connectedEmail) {
                  $sub->where('user_id', $targetUserId);
                  if (!empty($connectedEmail)) {
                      $sub->orWhere('new_values->from_email', $connectedEmail)
                          ->orWhereJsonContains('new_values->to', $connectedEmail);
                  }
              });
        };

        LeadActivity::where($activityCondition)->delete();
        ContactActivity::where($activityCondition)->delete();
        AccountActivity::where($activityCondition)->delete();
        OpportunityActivity::where($activityCondition)->delete();

        // 3. Clear settings ONLY for this specific user
        Setting::where('user_id', $targetUserId)->whereIn('key', [
            'googleMailEnabled',
            'googleMailConnected',
            'googleMailAccessToken',
            'googleMailRefreshToken',
            'googleMailConnectedEmail',
            'googleMailConnectedName',
            'googleMailLastSyncAt',
            'googleMailConnectedAt',
        ])->delete();
    }

    /**
     * Sync messages from Gmail and automatically match to CRM timeline.
     * Captures ALL available received (inbox, updates, categories, archived) and sent emails into CRM.
     */
    public function syncEmails($userId = null, int $maxResults = 500): array
    {
        $account = $this->resolveGoogleAccount($userId);
        if (!$account) {
            return [
                'success' => false,
                'message' => 'Google Mail is not connected. Please connect your Google account in Settings.',
                'captured' => 0,
            ];
        }

        @set_time_limit(300);

        $targetUser = User::find($account['user_id']);
        $effectiveUserId = $account['user_id'];
        $effectiveTenantId = ($targetUser && in_array($targetUser->type ?? '', ['superadmin', 'company']))
            ? $targetUser->id
            : ($targetUser->created_by ?? $effectiveUserId);
        if (auth()->check()) {
            $effectiveTenantId = createdBy();
        }

        $client = $this->getClient($effectiveUserId);
        $gmail = new GoogleGmail($client);
        $connectedEmail = strtolower(trim($account['email']));

        $capturedCount = 0;
        $matchedEntities = [
            'leads' => 0,
            'contacts' => 0,
            'accounts' => 0,
            'opportunities' => 0,
            'unlinked' => 0,
        ];

        try {
            // Retrieve messages with pagination across ALL folders to capture ALL received (Inbox, Categories, Archive) and Sent emails
            $messageMap = [];
            $targetInbox = min(300, max(100, (int) ($maxResults * 0.6)));
            $targetGeneral = min(250, max(100, (int) ($maxResults * 0.5)));
            $targetSent = min(200, max(50, (int) ($maxResults * 0.4)));

            // 1. Explicit INBOX messages (Guaranteed to fetch all incoming received mail)
            try {
                $pageToken = null;
                $inboxFetched = 0;
                do {
                    $params = [
                        'maxResults' => min(100, $targetInbox - $inboxFetched),
                        'labelIds' => ['INBOX'],
                    ];
                    if ($pageToken) {
                        $params['pageToken'] = $pageToken;
                    }
                    $resp = $gmail->users_messages->listUsersMessages('me', $params);
                    $msgs = $resp->getMessages() ?: [];
                    if (empty($msgs)) {
                        break;
                    }
                    foreach ($msgs as $m) {
                        $messageMap[$m->getId()] = $m;
                        $inboxFetched++;
                    }
                    $pageToken = $resp->getNextPageToken();
                } while ($pageToken && $inboxFetched < $targetInbox);
            } catch (\Throwable $e) {
                Log::warning('Error querying Gmail inbox: ' . $e->getMessage());
            }

            // 2. All Mail / General mailbox messages (Covers all Categories: Updates, Promotions, Archived, Inbound)
            try {
                $pageToken = null;
                $generalFetched = 0;
                do {
                    $params = [
                        'maxResults' => min(100, $targetGeneral - $generalFetched),
                    ];
                    if ($pageToken) {
                        $params['pageToken'] = $pageToken;
                    }
                    $resp = $gmail->users_messages->listUsersMessages('me', $params);
                    $msgs = $resp->getMessages() ?: [];
                    if (empty($msgs)) {
                        break;
                    }
                    foreach ($msgs as $m) {
                        $messageMap[$m->getId()] = $m;
                        $generalFetched++;
                    }
                    $pageToken = $resp->getNextPageToken();
                } while ($pageToken && $generalFetched < $targetGeneral);
            } catch (\Throwable $e) {
                Log::warning('Error querying Gmail general mail: ' . $e->getMessage());
            }

            // 3. SENT messages (Guaranteed to fetch all sent outbound mail)
            try {
                $pageToken = null;
                $sentFetched = 0;
                do {
                    $params = [
                        'maxResults' => min(100, $targetSent - $sentFetched),
                        'labelIds' => ['SENT'],
                    ];
                    if ($pageToken) {
                        $params['pageToken'] = $pageToken;
                    }
                    $sentResp = $gmail->users_messages->listUsersMessages('me', $params);
                    $msgs = $sentResp->getMessages() ?: [];
                    if (empty($msgs)) {
                        break;
                    }
                    foreach ($msgs as $m) {
                        $messageMap[$m->getId()] = $m;
                        $sentFetched++;
                    }
                    $pageToken = $sentResp->getNextPageToken();
                } while ($pageToken && $sentFetched < $targetSent);
            } catch (\Throwable $e) {
                Log::warning('Error querying Gmail sent: ' . $e->getMessage());
            }

            $messages = array_values($messageMap);

            foreach ($messages as $messageItem) {
                $gmailId = $messageItem->getId();

                try {
                    // Check if already captured in CRM database
                    $existing = CrmEmail::where('message_id', $gmailId)
                        ->where(function ($q) use ($effectiveUserId, $effectiveTenantId) {
                            $q->where('user_id', $effectiveUserId)
                              ->orWhere('created_by', $effectiveTenantId);
                        })->first();

                    if ($existing) {
                        // If it's already captured, check if it needs entity linking
                        if (!$existing->lead_id && !$existing->contact_id && !$existing->account_id && !$existing->opportunity_id) {
                            $contactEmails = array_values(array_filter(array_merge(
                                [$existing->from_email],
                                $existing->to_emails ?: [],
                                $existing->cc_emails ?: []
                            ), function ($addr) use ($connectedEmail) {
                                return !empty($addr) && strtolower(trim($addr)) !== $connectedEmail;
                            }));

                            if (!empty($contactEmails)) {
                                $mLead = Lead::where(function ($q) use ($contactEmails) {
                                    foreach ($contactEmails as $ce) {
                                        $c = strtolower(trim($ce));
                                        $q->orWhereRaw('LOWER(email) = ?', [$c])
                                          ->orWhereRaw('LOWER(alternate_email) = ?', [$c]);
                                    }
                                })->first();

                                $mContact = Contact::where(function ($q) use ($contactEmails) {
                                    foreach ($contactEmails as $ce) {
                                        $c = strtolower(trim($ce));
                                        $q->orWhereRaw('LOWER(email) = ?', [$c]);
                                    }
                                })->first();

                                $mAccount = Account::where(function ($q) use ($contactEmails) {
                                    foreach ($contactEmails as $ce) {
                                        $c = strtolower(trim($ce));
                                        $q->orWhereRaw('LOWER(email) = ?', [$c])
                                          ->orWhereRaw('LOWER(alternate_email) = ?', [$c]);
                                    }
                                })->first();

                                if (!$mAccount && $mContact && $mContact->account_id) {
                                    $mAccount = Account::find($mContact->account_id);
                                }

                                if ($mLead || $mContact || $mAccount) {
                                    $existing->lead_id = $mLead ? $mLead->id : null;
                                    $existing->contact_id = $mContact ? $mContact->id : null;
                                    $existing->account_id = $mAccount ? $mAccount->id : null;
                                    $existing->save();

                                    $this->logActivityForEntities(
                                        $effectiveTenantId,
                                        $existing,
                                        $existing->direction,
                                        $mLead,
                                        $mContact,
                                        $mAccount,
                                        null
                                    );
                                }
                            }
                        }
                        continue;
                    }

                    $msg = $gmail->users_messages->get('me', $gmailId, ['format' => 'full']);
                    $parsed = $this->parseGmailMessage($msg);
                    $labels = $msg->getLabelIds() ?: [];

                    // Determine direction: SENT label or from_email matching connected user
                    $fromEmail = strtolower(trim($parsed['from_email']));
                    $isSent = in_array('SENT', $labels) || ($fromEmail === $connectedEmail && !in_array('INBOX', $labels));
                    $direction = $isSent ? 'outbound' : 'inbound';

                    // Collect all external email addresses to match CRM entities
                    $allAddresses = array_unique(array_filter(array_merge(
                        [$parsed['from_email']],
                        $parsed['to_emails'],
                        $parsed['cc_emails']
                    )));

                    $contactEmails = array_values(array_filter($allAddresses, function ($addr) use ($connectedEmail) {
                        return !empty($addr) && strtolower(trim($addr)) !== $connectedEmail;
                    }));

                    $matchedLead = null;
                    $matchedContact = null;
                    $matchedAccount = null;
                    $matchedOpportunity = null;

                    if (!empty($contactEmails)) {
                        // 1. Match Lead (Leads table has email and alternate_email)
                        $matchedLead = Lead::where(function ($q) use ($contactEmails) {
                            foreach ($contactEmails as $ce) {
                                $c = strtolower(trim($ce));
                                $q->orWhereRaw('LOWER(email) = ?', [$c])
                                  ->orWhereRaw('LOWER(alternate_email) = ?', [$c]);
                            }
                        })->first();

                        // 2. Match Contact (Contacts table has email, NO alternate_email)
                        $matchedContact = Contact::where(function ($q) use ($contactEmails) {
                            foreach ($contactEmails as $ce) {
                                $c = strtolower(trim($ce));
                                $q->orWhereRaw('LOWER(email) = ?', [$c]);
                            }
                        })->first();

                        // 3. Match Account (Accounts table has email and alternate_email)
                        $matchedAccount = Account::where(function ($q) use ($contactEmails) {
                            foreach ($contactEmails as $ce) {
                                $c = strtolower(trim($ce));
                                $q->orWhereRaw('LOWER(email) = ?', [$c])
                                  ->orWhereRaw('LOWER(alternate_email) = ?', [$c]);
                            }
                        })->first();

                        if (!$matchedAccount) {
                            if ($matchedContact && $matchedContact->account_id) {
                                $matchedAccount = Account::find($matchedContact->account_id);
                            } elseif ($matchedLead && $matchedLead->account_id) {
                                $matchedAccount = Account::find($matchedLead->account_id);
                            }
                        }

                        if ($matchedAccount) {
                            $matchedOpportunity = Opportunity::where('account_id', $matchedAccount->id)
                                ->orderBy('created_at', 'desc')
                                ->first();
                        } elseif ($matchedContact) {
                            $matchedOpportunity = Opportunity::where('contact_id', $matchedContact->id)
                                ->orderBy('created_at', 'desc')
                                ->first();
                        }
                    }

                    // Format body and snippet fallbacks
                    $bodyHtml = !empty($parsed['body_html']) ? $parsed['body_html'] : (!empty($parsed['body_text']) ? '<p>' . nl2br(e($parsed['body_text'])) . '</p>' : '');
                    $bodyText = !empty($parsed['body_text']) ? $parsed['body_text'] : (!empty($parsed['body_html']) ? strip_tags($parsed['body_html']) : '');
                    $snippet = !empty($parsed['snippet']) ? $parsed['snippet'] : substr($bodyText, 0, 160);

                    // ALWAYS store the email so that ALL inbox and outbox messages display in CRM!
                    $crmEmail = CrmEmail::create([
                        'created_by' => $effectiveTenantId,
                        'user_id' => $effectiveUserId,
                        'message_id' => $gmailId,
                        'thread_id' => $parsed['thread_id'],
                        'direction' => $direction,
                        'from_email' => $parsed['from_email'],
                        'from_name' => $parsed['from_name'],
                        'to_emails' => $parsed['to_emails'],
                        'cc_emails' => $parsed['cc_emails'],
                        'bcc_emails' => [],
                        'subject' => $parsed['subject'] ?: '(No Subject)',
                        'snippet' => $snippet,
                        'body_text' => $bodyText,
                        'body_html' => $bodyHtml,
                        'sent_at' => $parsed['sent_at'],
                        'lead_id' => $matchedLead ? $matchedLead->id : null,
                        'contact_id' => $matchedContact ? $matchedContact->id : null,
                        'account_id' => $matchedAccount ? $matchedAccount->id : null,
                        'opportunity_id' => $matchedOpportunity ? $matchedOpportunity->id : null,
                        'has_attachments' => $parsed['has_attachments'],
                        'attachment_names' => $parsed['attachment_names'],
                        'raw_headers' => $parsed['raw_headers'] ?? null,
                        'source' => 'gmail',
                    ]);

                    // If any CRM entity matched, log to timeline
                    if ($matchedLead || $matchedContact || $matchedAccount || $matchedOpportunity) {
                        $this->logActivityForEntities(
                            $effectiveTenantId,
                            $crmEmail,
                            $direction,
                            $matchedLead,
                            $matchedContact,
                            $matchedAccount,
                            $matchedOpportunity
                        );
                    }

                    $capturedCount++;
                    if ($matchedLead) $matchedEntities['leads']++;
                    if ($matchedContact) $matchedEntities['contacts']++;
                    if ($matchedAccount) $matchedEntities['accounts']++;
                    if ($matchedOpportunity) $matchedEntities['opportunities']++;
                    if (!$matchedLead && !$matchedContact && !$matchedAccount && !$matchedOpportunity) {
                        $matchedEntities['unlinked']++;
                    }
                } catch (\Throwable $itemEx) {
                    Log::warning("Skipping individual Gmail message {$gmailId} due to parsing error: " . $itemEx->getMessage());
                    continue;
                }
            }

            Setting::updateOrCreate(
                ['user_id' => $effectiveUserId, 'key' => 'googleMailLastSyncAt'],
                ['value' => Carbon::now()->toDateTimeString()]
            );

            return [
                'success' => true,
                'captured' => $capturedCount,
                'total_scanned' => count($messages),
                'matched' => $matchedEntities,
                'message' => "Successfully synced {$capturedCount} email(s) from Inbox & Outbox into CRM Mailbox.",
            ];
        } catch (\Exception $e) {
            $cleanError = $this->formatGoogleErrorMessage($e);
            Log::error('Google Mail Sync Error: ' . $e->getMessage(), ['user_id' => $effectiveUserId, 'clean_error' => $cleanError]);
            return [
                'success' => false,
                'message' => __('Google Mail Sync Error: :error', ['error' => $cleanError]),
                'captured' => 0,
            ];
        }
    }

    /**
     * Send email directly from CRM using the connected Google Gmail account
     */
    public function sendEmail($senderUserId = null, array $data = [], array $attachments = []): array
    {
        $to = trim($data['to'] ?? '');
        $subject = trim($data['subject'] ?? '(No Subject)');
        $body = $data['body'] ?? '';
        $leadId = $data['lead_id'] ?? null;
        $contactId = $data['contact_id'] ?? null;
        $accountId = $data['account_id'] ?? null;
        $opportunityId = $data['opportunity_id'] ?? null;

        if (empty($attachments) && !empty($data['attachments'])) {
            $attachments = is_array($data['attachments']) ? $data['attachments'] : [$data['attachments']];
        }

        if (empty($to)) {
            return [
                'success' => false,
                'message' => __('Recipient email address is required.'),
            ];
        }

        // Must be sent via connected Google Account
        $targetUserId = $senderUserId ?: (auth()->check() ? auth()->id() : null);
        $googleAccount = $this->resolveGoogleAccount($targetUserId);
        if (!$googleAccount) {
            return [
                'success' => false,
                'message' => __('Google Mail is not connected. Please connect your Google account in Settings to send emails directly from your Gmail.'),
            ];
        }

        $effectiveTenantId = auth()->check() ? createdBy() : $googleAccount['user_id'];

        // Auto-match entity by recipient email if no entity was explicitly passed
        if (!$leadId && !$contactId && !$accountId && !$opportunityId) {
            $matchedLead = Lead::where('created_by', $effectiveTenantId)->where(function ($q) use ($to) {
                $q->where('email', $to)->orWhere('alternate_email', $to);
            })->first();
            if ($matchedLead) {
                $leadId = $matchedLead->id;
            }

            $matchedContact = Contact::where('created_by', $effectiveTenantId)->where('email', $to)->first();
            if ($matchedContact) {
                $contactId = $matchedContact->id;
                if (!$accountId && $matchedContact->account_id) {
                    $accountId = $matchedContact->account_id;
                }
            }

            if (!$accountId) {
                $matchedAccount = Account::where('created_by', $effectiveTenantId)->where(function ($q) use ($to) {
                    $q->where('email', $to)->orWhere('alternate_email', $to);
                })->first();
                if ($matchedAccount) {
                    $accountId = $matchedAccount->id;
                }
            }
        }

        // Sender MUST be the authenticated connected Google Account
        $fromEmail = $googleAccount['email'];
        $fromName = $googleAccount['name'] ?: (auth()->user()->name ?? 'CRM User');

        $attachmentMetadata = [];
        $hasAttachments = false;

        try {
            $client = $this->getClient($googleAccount['user_id']);
            $gmail = new GoogleGmail($client);

            // Construct standard RFC 2822 MIME email using Symfony Mime
            $mimeEmail = (new SymfonyEmail())
                ->from(new SymfonyAddress($fromEmail, $fromName))
                ->to($to)
                ->subject($subject)
                ->html(nl2br($body))
                ->text(strip_tags($body));

            // Attach documents and media files
            if (!empty($attachments)) {
                $hasAttachments = true;
                foreach ($attachments as $file) {
                    if (!$file instanceof \Illuminate\Http\UploadedFile) {
                        continue;
                    }

                    $origName = $file->getClientOriginalName();
                    $mimeType = $file->getClientMimeType() ?: 'application/octet-stream';
                    $realPath = $file->getRealPath();
                    $fileSize = $file->getSize();

                    // Attach directly to Symfony Mime email
                    $mimeEmail->attachFromPath($realPath, $origName, $mimeType);

                    // Store locally in public storage for CRM preview/download
                    try {
                        $storedPath = $file->store('crm_attachments', 'public');
                        $attachmentUrl = asset('storage/' . $storedPath);

                        $attachmentMetadata[] = [
                            'name' => $origName,
                            'size' => $fileSize,
                            'mime' => $mimeType,
                            'url' => $attachmentUrl,
                            'path' => $storedPath,
                        ];
                    } catch (\Throwable $storeEx) {
                        Log::warning('Error saving email attachment to storage: ' . $storeEx->getMessage());
                        $attachmentMetadata[] = [
                            'name' => $origName,
                            'size' => $fileSize,
                            'mime' => $mimeType,
                        ];
                    }
                }
            }

            $rawMime = $mimeEmail->toString();
            $encoded = rtrim(strtr(base64_encode($rawMime), '+/', '-_'), '=');

            $gmailMsg = new GmailMessage();
            $gmailMsg->setRaw($encoded);
            try {
                $sentResponse = $gmail->users_messages->send('me', $gmailMsg);
            } catch (\Exception $sendEx) {
                // If token expired, attempt immediate refresh and retry once
                $errMsg = $sendEx->getMessage();
                if (str_contains($errMsg, 'expired') || str_contains($errMsg, '401') || str_contains($errMsg, 'invalid_grant') || str_contains($errMsg, 'credentials')) {
                    $refreshToken = $googleAccount['refresh_token'] ?? getSetting('googleMailRefreshToken', null, $googleAccount['user_id']);
                    if ($refreshToken) {
                        $newToken = $client->fetchAccessTokenWithRefreshToken($refreshToken);
                        if (!isset($newToken['error'])) {
                            $newToken['refresh_token'] = $refreshToken;
                            updateSetting('googleMailAccessToken', json_encode($newToken), $googleAccount['user_id']);
                            $client->setAccessToken($newToken);
                            $gmail = new GoogleGmail($client);
                            $sentResponse = $gmail->users_messages->send('me', $gmailMsg);
                        } else {
                            throw $sendEx;
                        }
                    } else {
                        throw $sendEx;
                    }
                } else {
                    throw $sendEx;
                }
            }

            $messageId = $sentResponse->getId() ?: ('gmail_' . uniqid() . '_' . time());
            $threadId = $sentResponse->getThreadId() ?: null;
            $source = 'gmail';
        } catch (\Exception $e) {
            $cleanError = $this->formatGoogleErrorMessage($e);
            Log::error('Google Mail send failed via Gmail API: ' . $e->getMessage(), [
                'tenant' => $effectiveTenantId,
                'user_id' => $googleAccount['user_id'],
                'from' => $fromEmail,
                'to' => $to,
                'clean_error' => $cleanError,
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => __('Failed to send email via connected Google account: :error', ['error' => $cleanError]),
            ];
        }

        // Create CrmEmail record
        $crmEmail = CrmEmail::create([
            'created_by' => $effectiveTenantId,
            'user_id' => $googleAccount['user_id'],
            'message_id' => $messageId,
            'thread_id' => $threadId,
            'direction' => 'outbound',
            'from_email' => $fromEmail,
            'from_name' => $fromName,
            'to_emails' => [$to],
            'cc_emails' => [],
            'bcc_emails' => [],
            'subject' => $subject,
            'snippet' => substr(strip_tags($body), 0, 160),
            'body_text' => strip_tags($body),
            'body_html' => nl2br($body),
            'sent_at' => Carbon::now(),
            'lead_id' => $leadId,
            'contact_id' => $contactId,
            'account_id' => $accountId,
            'opportunity_id' => $opportunityId,
            'has_attachments' => $hasAttachments,
            'attachment_names' => $attachmentMetadata,
            'source' => $source,
        ]);

        // Log into Activity Timelines
        $matchedLead = $leadId ? Lead::find($leadId) : null;
        $matchedContact = $contactId ? Contact::find($contactId) : null;
        $matchedAccount = $accountId ? Account::find($accountId) : null;
        $matchedOpportunity = $opportunityId ? Opportunity::find($opportunityId) : null;

        $this->logActivityForEntities(
            $effectiveTenantId,
            $crmEmail,
            'outbound',
            $matchedLead,
            $matchedContact,
            $matchedAccount,
            $matchedOpportunity
        );

        return [
            'success' => true,
            'message' => __('Email successfully sent from :email via connected Google account and logged to timeline.', ['email' => $fromEmail]),
            'email' => $crmEmail,
        ];
    }

    /**
     * Simulate a test capture email for testing the timeline without live Google credentials
     */
    public function simulateTestSync($tenantId, array $data = []): array
    {
        $direction = $data['direction'] ?? 'inbound';
        $entityType = $data['entity_type'] ?? 'lead';
        $entityId = $data['entity_id'] ?? null;
        $subject = $data['subject'] ?? 'Product Inquiry & Pricing Discussion';
        $body = $data['body'] ?? "Hi, I wanted to follow up on our recent demonstration. Could you please send over the pricing catalogue and service agreements? Thanks!";
        
        $matchedLead = null;
        $matchedContact = null;
        $matchedAccount = null;
        $matchedOpportunity = null;

        if ($entityType === 'lead' && $entityId) {
            $matchedLead = Lead::where('id', $entityId)->where('created_by', $tenantId)->first();
        } elseif ($entityType === 'contact' && $entityId) {
            $matchedContact = Contact::where('id', $entityId)->where('created_by', $tenantId)->first();
            if ($matchedContact && $matchedContact->account_id) {
                $matchedAccount = Account::find($matchedContact->account_id);
            }
        } elseif ($entityType === 'account' && $entityId) {
            $matchedAccount = Account::where('id', $entityId)->where('created_by', $tenantId)->first();
        } elseif ($entityType === 'opportunity' && $entityId) {
            $matchedOpportunity = Opportunity::where('id', $entityId)->where('created_by', $tenantId)->first();
            if ($matchedOpportunity && $matchedOpportunity->account_id) {
                $matchedAccount = Account::find($matchedOpportunity->account_id);
            }
        }

        // If no specific entity given, grab first lead or account
        if (!$matchedLead && !$matchedContact && !$matchedAccount && !$matchedOpportunity) {
            $matchedLead = Lead::where('created_by', $tenantId)->first();
        }

        $contactEmail = $matchedLead ? $matchedLead->email : ($matchedContact ? $matchedContact->email : ($matchedAccount ? $matchedAccount->email : 'client@example.com'));
        $contactName = $matchedLead ? $matchedLead->name : ($matchedContact ? $matchedContact->name : ($matchedAccount ? $matchedAccount->name : 'Demo Client'));
        $connectedEmail = getSetting('googleMailConnectedEmail', 'sales@company.com', $tenantId);
        $connectedName = getSetting('googleMailConnectedName', auth()->user()->name ?? 'Sales Rep', $tenantId);

        $fromEmail = ($direction === 'inbound') ? $contactEmail : $connectedEmail;
        $fromName = ($direction === 'inbound') ? $contactName : $connectedName;
        $toEmail = ($direction === 'inbound') ? $connectedEmail : $contactEmail;

        $msgId = 'demo_gmail_' . uniqid() . '_' . time();

        $crmEmail = CrmEmail::create([
            'created_by' => $tenantId,
            'user_id' => auth()->id() ?? $tenantId,
            'message_id' => $msgId,
            'thread_id' => 'thread_' . substr(md5($subject), 0, 12),
            'direction' => $direction,
            'from_email' => $fromEmail,
            'from_name' => $fromName,
            'to_emails' => [$toEmail],
            'cc_emails' => [],
            'bcc_emails' => [],
            'subject' => $subject,
            'snippet' => substr($body, 0, 160),
            'body_text' => $body,
            'body_html' => '<p>' . nl2br(e($body)) . '</p>',
            'sent_at' => Carbon::now(),
            'lead_id' => $matchedLead ? $matchedLead->id : null,
            'contact_id' => $matchedContact ? $matchedContact->id : null,
            'account_id' => $matchedAccount ? $matchedAccount->id : null,
            'opportunity_id' => $matchedOpportunity ? $matchedOpportunity->id : null,
            'has_attachments' => false,
            'source' => 'gmail',
        ]);

        $this->logActivityForEntities(
            $tenantId,
            $crmEmail,
            $direction,
            $matchedLead,
            $matchedContact,
            $matchedAccount,
            $matchedOpportunity
        );

        updateSetting('googleMailLastSyncAt', Carbon::now()->toDateTimeString(), $tenantId);

        return [
            'success' => true,
            'message' => "Captured demo {$direction} email '{$subject}' into CRM timeline.",
            'email' => $crmEmail,
        ];
    }

    /**
     * Log activity to timeline across all matched entities
     */
    protected function logActivityForEntities($tenantId, CrmEmail $email, string $direction, $lead, $contact, $account, $opportunity): void
    {
        $isInbound = ($direction === 'inbound');
        $activityType = $isInbound ? 'email_inbound' : 'email_outbound';
        $titlePrefix = $isInbound ? 'Received Email: ' : 'Sent Email: ';
        $title = $titlePrefix . ($email->subject ?: '(No Subject)');
        $description = $email->snippet ?: substr(strip_tags($email->body_text ?: $email->body_html), 0, 250);
        $activityDate = $email->sent_at ? Carbon::parse($email->sent_at) : now();

        $activityValues = [
            'email_id' => $email->id,
            'message_id' => $email->message_id,
            'thread_id' => $email->thread_id,
            'direction' => $direction,
            'from' => $email->from_name ? "{$email->from_name} <{$email->from_email}>" : $email->from_email,
            'from_email' => $email->from_email,
            'to' => $email->to_emails,
            'subject' => $email->subject,
            'snippet' => $email->snippet,
            'body' => substr(strip_tags($email->body_text ?: $email->body_html), 0, 1000),
            'sent_at' => $activityDate->toIso8601String(),
            'source' => $email->source,
            'has_attachments' => (bool) $email->has_attachments,
            'attachment_names' => $email->attachment_names ?: [],
        ];

        // 1. Lead Activity
        if ($lead) {
            $exists = LeadActivity::where('lead_id', $lead->id)
                ->where('field_changed', 'email')
                ->where(function ($q) use ($email) {
                    $q->where('new_values->message_id', $email->message_id)
                      ->orWhere('new_values->email_id', $email->id);
                })->exists();

            if (!$exists) {
                LeadActivity::create([
                    'lead_id' => $lead->id,
                    'user_id' => auth()->id() ?? $lead->assigned_to ?? $tenantId,
                    'activity_type' => $activityType,
                    'title' => $title,
                    'description' => $description,
                    'new_values' => $activityValues,
                    'field_changed' => 'email',
                    'created_by' => $tenantId,
                    'created_at' => $activityDate,
                    'updated_at' => $activityDate,
                ]);
            }
        }

        // 2. Contact Activity
        if ($contact) {
            $exists = ContactActivity::where('contact_id', $contact->id)
                ->where('field_changed', 'email')
                ->where(function ($q) use ($email) {
                    $q->where('new_values->message_id', $email->message_id)
                      ->orWhere('new_values->email_id', $email->id);
                })->exists();

            if (!$exists) {
                ContactActivity::create([
                    'contact_id' => $contact->id,
                    'user_id' => auth()->id() ?? $contact->assigned_to ?? $tenantId,
                    'activity_type' => $activityType,
                    'title' => $title,
                    'description' => $description,
                    'new_values' => $activityValues,
                    'field_changed' => 'email',
                    'created_by' => $tenantId,
                    'created_at' => $activityDate,
                    'updated_at' => $activityDate,
                ]);
            }
        }

        // 3. Account Activity
        if ($account) {
            $exists = AccountActivity::where('account_id', $account->id)
                ->where('field_changed', 'email')
                ->where(function ($q) use ($email) {
                    $q->where('new_values->message_id', $email->message_id)
                      ->orWhere('new_values->email_id', $email->id);
                })->exists();

            if (!$exists) {
                AccountActivity::create([
                    'account_id' => $account->id,
                    'user_id' => auth()->id() ?? $account->assigned_to ?? $tenantId,
                    'activity_type' => $activityType,
                    'title' => $title,
                    'description' => $description,
                    'new_values' => $activityValues,
                    'field_changed' => 'email',
                    'created_by' => $tenantId,
                    'created_at' => $activityDate,
                    'updated_at' => $activityDate,
                ]);
            }
        }

        // 4. Opportunity Activity
        if ($opportunity) {
            $exists = OpportunityActivity::where('opportunity_id', $opportunity->id)
                ->where('field_changed', 'email')
                ->where(function ($q) use ($email) {
                    $q->where('new_values->message_id', $email->message_id)
                      ->orWhere('new_values->email_id', $email->id);
                })->exists();

            if (!$exists) {
                OpportunityActivity::create([
                    'opportunity_id' => $opportunity->id,
                    'user_id' => auth()->id() ?? $opportunity->assigned_to ?? $tenantId,
                    'activity_type' => $activityType,
                    'title' => $title,
                    'description' => $description,
                    'new_values' => $activityValues,
                    'field_changed' => 'email',
                    'created_by' => $tenantId,
                    'created_at' => $activityDate,
                    'updated_at' => $activityDate,
                ]);
            }
        }

        // Update last_contacted_date on lead, account, opportunity
        try {
            $emailDate = $email->sent_at ? \Carbon\Carbon::parse($email->sent_at) : ($email->date ? \Carbon\Carbon::parse($email->date) : now());
            if ($lead && (!$lead->last_contacted_date || \Carbon\Carbon::parse($lead->last_contacted_date)->lt($emailDate))) {
                $lead->update(['last_contacted_date' => $emailDate]);
            }
            if ($account && (!$account->last_contacted_date || \Carbon\Carbon::parse($account->last_contacted_date)->lt($emailDate))) {
                $account->update(['last_contacted_date' => $emailDate]);
            }
            if ($opportunity && (!$opportunity->last_contacted_date || \Carbon\Carbon::parse($opportunity->last_contacted_date)->lt($emailDate))) {
                $opportunity->update(['last_contacted_date' => $emailDate]);
            }
        } catch (\Exception $e) {
            // Ignore date parsing/update failure
        }
    }

    /**
     * Automatically discover and link any matching emails for a given CRM entity (Lead, Contact, Account, Opportunity)
     * and log them to its activity timeline.
     */
    public function syncEntityActivities(string $entityType, $entity, $tenantId = null): int
    {
        if (!$entity) {
            return 0;
        }

        $effectiveTenantId = $tenantId ?: (auth()->check() ? createdBy() : ($entity->created_by ?? 1));
        $emailsToMatch = [];

        if (!empty($entity->email)) {
            $emailsToMatch[] = strtolower(trim($entity->email));
        }
        if (!empty($entity->alternate_email)) {
            $emailsToMatch[] = strtolower(trim($entity->alternate_email));
        }

        if (empty($emailsToMatch) && $entityType !== 'opportunity') {
            return 0;
        }

        // Real-time live capture: fetch latest messages from connected Gmail for this entity's email
        $userId = auth()->id();
        $account = $this->resolveGoogleAccount($userId);
        if ($account && !empty($emailsToMatch)) {
            try {
                $client = $this->getClient($account['user_id']);
                $gmail = new GoogleGmail($client);
                $queryParts = [];
                foreach ($emailsToMatch as $em) {
                    $queryParts[] = "from:{$em}";
                    $queryParts[] = "to:{$em}";
                }
                $targetQuery = implode(' OR ', $queryParts);
                $resp = $gmail->users_messages->listUsersMessages('me', [
                    'maxResults' => 25,
                    'q' => $targetQuery,
                ]);
                $targetedMsgs = $resp->getMessages() ?: [];
                foreach ($targetedMsgs as $tm) {
                    $mId = $tm->getId();
                    if (!CrmEmail::where('message_id', $mId)->exists()) {
                        $fullMsg = $gmail->users_messages->get('me', $mId, ['format' => 'full']);
                        $parsed = $this->parseGmailMessage($fullMsg);
                        $labels = $fullMsg->getLabelIds() ?: [];
                        $fromEmail = strtolower(trim($parsed['from_email']));
                        $isSent = in_array('SENT', $labels) || ($fromEmail === strtolower(trim($account['email'])) && !in_array('INBOX', $labels));
                        $direction = $isSent ? 'outbound' : 'inbound';
                        $bodyHtml = !empty($parsed['body_html']) ? $parsed['body_html'] : (!empty($parsed['body_text']) ? '<p>' . nl2br(e($parsed['body_text'])) . '</p>' : '');
                        $bodyText = !empty($parsed['body_text']) ? $parsed['body_text'] : (!empty($parsed['body_html']) ? strip_tags($parsed['body_html']) : '');
                        $snippet = !empty($parsed['snippet']) ? $parsed['snippet'] : substr($bodyText, 0, 160);

                        CrmEmail::create([
                            'created_by' => $effectiveTenantId,
                            'user_id' => $account['user_id'],
                            'message_id' => $mId,
                            'thread_id' => $parsed['thread_id'],
                            'direction' => $direction,
                            'from_email' => $parsed['from_email'],
                            'from_name' => $parsed['from_name'],
                            'to_emails' => $parsed['to_emails'],
                            'cc_emails' => $parsed['cc_emails'],
                            'bcc_emails' => [],
                            'subject' => $parsed['subject'] ?: '(No Subject)',
                            'snippet' => $snippet,
                            'body_text' => $bodyText,
                            'body_html' => $bodyHtml,
                            'sent_at' => $parsed['sent_at'],
                            'lead_id' => $entityType === 'lead' ? $entity->id : null,
                            'contact_id' => $entityType === 'contact' ? $entity->id : null,
                            'account_id' => $entityType === 'account' ? $entity->id : null,
                            'opportunity_id' => $entityType === 'opportunity' ? $entity->id : null,
                            'has_attachments' => $parsed['has_attachments'],
                            'attachment_names' => $parsed['attachment_names'],
                            'raw_headers' => $parsed['raw_headers'] ?? null,
                            'source' => 'gmail',
                        ]);
                    }
                }
            } catch (\Throwable $liveEx) {
                Log::info('Targeted entity Gmail check notice: ' . $liveEx->getMessage());
            }
        }

        $connectedUserIds = $this->getConnectedUserIds($effectiveTenantId);

        // Clean any existing email activities from disconnected users on this entity
        $activityClass = match ($entityType) {
            'lead' => LeadActivity::class,
            'contact' => ContactActivity::class,
            'account' => AccountActivity::class,
            'opportunity' => OpportunityActivity::class,
            default => null,
        };
        if ($activityClass) {
            $cleanupQuery = $activityClass::where("{$entityType}_id", $entity->id)->where('field_changed', 'email');
            if (empty($connectedUserIds)) {
                $cleanupQuery->delete();
                return 0;
            } else {
                $cleanupQuery->whereNotIn('user_id', $connectedUserIds)->delete();
            }
        } elseif (empty($connectedUserIds)) {
            return 0;
        }

        $query = CrmEmail::query()->whereIn('user_id', $connectedUserIds);
        if ($entityType === 'lead') {
            $query->where(function ($q) use ($entity, $emailsToMatch) {
                $q->where('lead_id', $entity->id);
                foreach ($emailsToMatch as $em) {
                    $q->orWhereRaw('LOWER(from_email) = ?', [$em])
                      ->orWhereJsonContains('to_emails', $em)
                      ->orWhereJsonContains('cc_emails', $em);
                }
            });
        } elseif ($entityType === 'contact') {
            $query->where(function ($q) use ($entity, $emailsToMatch) {
                $q->where('contact_id', $entity->id);
                foreach ($emailsToMatch as $em) {
                    $q->orWhereRaw('LOWER(from_email) = ?', [$em])
                      ->orWhereJsonContains('to_emails', $em)
                      ->orWhereJsonContains('cc_emails', $em);
                }
            });
        } elseif ($entityType === 'account') {
            $query->where(function ($q) use ($entity, $emailsToMatch) {
                $q->where('account_id', $entity->id);
                foreach ($emailsToMatch as $em) {
                    $q->orWhereRaw('LOWER(from_email) = ?', [$em])
                      ->orWhereJsonContains('to_emails', $em)
                      ->orWhereJsonContains('cc_emails', $em);
                }
            });
        } elseif ($entityType === 'opportunity') {
            $query->where(function ($sub) use ($entity) {
                $sub->where('opportunity_id', $entity->id);
                if (!empty($entity->account_id)) {
                    $sub->orWhere('account_id', $entity->account_id);
                }
                if (!empty($entity->contact_id)) {
                    $sub->orWhere('contact_id', $entity->contact_id);
                }
            });
        }

        $emails = $query->get();
        $synced = 0;

        foreach ($emails as $email) {
            $column = "{$entityType}_id";
            if (empty($email->{$column})) {
                $email->{$column} = $entity->id;
                $email->save();
            }

            $this->logActivityForEntities(
                $effectiveTenantId,
                $email,
                $email->direction,
                $entityType === 'lead' ? $entity : null,
                $entityType === 'contact' ? $entity : null,
                $entityType === 'account' ? $entity : null,
                $entityType === 'opportunity' ? $entity : null
            );
            $synced++;
        }

        return $synced;
    }

    /**
     * Parse raw Gmail message structure into clean associative array
     */
    protected function parseGmailMessage($msg): array
    {
        $payload = $msg->getPayload();
        $headers = $payload->getHeaders();

        $headerMap = [];
        foreach ($headers as $header) {
            $headerMap[strtolower($header->getName())] = $header->getValue();
        }

        $fromRaw = $headerMap['from'] ?? '';
        $fromEmail = '';
        $fromName = '';
        if (preg_match('/(.*?)<([^>]+)>/', $fromRaw, $matches)) {
            $fromName = trim($matches[1], " \t\n\r\0\x0B\"'");
            $fromEmail = strtolower(trim($matches[2]));
        } else {
            $fromEmail = strtolower(trim($fromRaw));
        }

        $parseAddresses = function ($raw) {
            if (!$raw) return [];
            $addrs = explode(',', $raw);
            $clean = [];
            foreach ($addrs as $addr) {
                if (preg_match('/<([^>]+)>/', $addr, $m)) {
                    $clean[] = strtolower(trim($m[1]));
                } else {
                    $clean[] = strtolower(trim($addr));
                }
            }
            return array_values(array_filter($clean));
        };

        $toEmails = $parseAddresses($headerMap['to'] ?? '');
        $ccEmails = $parseAddresses($headerMap['cc'] ?? '');
        $subject = trim($headerMap['subject'] ?? '') ?: '(No Subject)';
        $dateRaw = $headerMap['date'] ?? null;
        $sentAt = null;
        if (is_object($msg) && method_exists($msg, 'getInternalDate') && !empty($msg->getInternalDate())) {
            try {
                $sentAt = Carbon::createFromTimestampMs((int) $msg->getInternalDate());
            } catch (\Throwable $e) {
                $sentAt = null;
            }
        }
        if (!$sentAt && !empty($dateRaw)) {
            try {
                $sentAt = Carbon::parse($dateRaw);
            } catch (\Throwable $e) {
                $sentAt = null;
            }
        }
        if (!$sentAt) {
            $sentAt = Carbon::now();
        }

        $bodyText = '';
        $bodyHtml = '';
        $hasAttachments = false;
        $attachmentNames = [];

        $extractParts = function ($part) use (&$extractParts, &$bodyText, &$bodyHtml, &$hasAttachments, &$attachmentNames) {
            $mimeType = $part->getMimeType();
            $body = $part->getBody();
            $filename = $part->getFilename();

            if (!empty($filename)) {
                $hasAttachments = true;
                $attachmentNames[] = $filename;
            }

            if ($body && $body->getData()) {
                $decoded = base64_decode(strtr($body->getData(), '-_', '+/'));
                if ($mimeType === 'text/plain') {
                    $bodyText .= $decoded;
                } elseif ($mimeType === 'text/html') {
                    $bodyHtml .= $decoded;
                }
            }

            if ($part->getParts()) {
                foreach ($part->getParts() as $subPart) {
                    $extractParts($subPart);
                }
            }
        };

        $extractParts($payload);

        $bodyText = trim($bodyText);
        $bodyHtml = trim($bodyHtml);
        if (empty($bodyText) && !empty($bodyHtml)) {
            $bodyText = trim(strip_tags($bodyHtml));
        }
        if (empty($bodyHtml) && !empty($bodyText)) {
            $bodyHtml = '<p>' . nl2br(e($bodyText)) . '</p>';
        }
        $snippet = $msg->getSnippet() ?: substr($bodyText, 0, 160);

        return [
            'id' => $msg->getId(),
            'thread_id' => $msg->getThreadId(),
            'from_raw' => $fromRaw,
            'from_email' => $fromEmail,
            'from_name' => $fromName,
            'to_emails' => $toEmails,
            'cc_emails' => $ccEmails,
            'subject' => $subject,
            'snippet' => $snippet,
            'body_text' => $bodyText,
            'body_html' => $bodyHtml,
            'sent_at' => $sentAt,
            'has_attachments' => $hasAttachments,
            'attachment_names' => $attachmentNames,
            'raw_headers' => $headerMap,
        ];
    }

    /**
     * Clean and format Google API error messages for user display
     */
    public function formatGoogleErrorMessage(\Throwable $e): string
    {
        $raw = $e->getMessage();

        // Extract JSON error structure if present
        if (preg_match('/\{[\s\S]*"error"[\s\S]*\}/', $raw, $matches)) {
            $json = json_decode($matches[0], true);
            if (!empty($json['error']['message'])) {
                $raw = $json['error']['message'];
            }
        }

        // Detect disabled Gmail API in Google Cloud Console
        if (str_contains($raw, 'SERVICE_DISABLED') || str_contains($raw, 'has not been used in project') || str_contains($raw, 'accessNotConfigured')) {
            $activationUrl = 'https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=606375667931';
            if (preg_match('/https:\/\/console\.developers\.google\.com[^\s]+/', $raw, $m)) {
                $activationUrl = rtrim($m[0], '.,');
            }
            return "The Gmail API is currently disabled in your Google Cloud Project. Please enable it by visiting: {$activationUrl} and wait 1-2 minutes before retrying.";
        }

        return $raw;
    }
}
