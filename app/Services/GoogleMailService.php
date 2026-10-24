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
use Carbon\Carbon;
use Google\Client as GoogleClient;
use Google\Service\Gmail as GoogleGmail;
use Google\Service\Gmail\Message as GmailMessage;
use Google\Service\Oauth2 as GoogleOauth2;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class GoogleMailService
{
    /**
     * Check if Google Mail integration is enabled in settings
     */
    public function isEnabled($tenantId): bool
    {
        return getSetting('googleMailEnabled', '0', $tenantId) === '1';
    }

    /**
     * Check if Google Mail is authorized and connected with valid token
     */
    public function isConnected($tenantId): bool
    {
        $connectedEmail = getSetting('googleMailConnectedEmail', null, $tenantId);
        $token = getSetting('googleMailAccessToken', null, $tenantId);
        $refreshToken = getSetting('googleMailRefreshToken', null, $tenantId);

        return !empty($connectedEmail) && (!empty($token) || !empty($refreshToken));
    }

    /**
     * Get Google OAuth client configured with tenant credentials
     */
    public function getClient($tenantId): GoogleClient
    {
        $client = new GoogleClient();

        $clientId = getSetting('googleMailClientId', config('services.google.client_id', ''), $tenantId);
        $clientSecret = getSetting('googleMailClientSecret', config('services.google.client_secret', ''), $tenantId);

        if (empty($clientId) || empty($clientSecret)) {
            // Also check if there is a calendar service account / oauth json uploaded
            $jsonPath = getSetting('googleCalendarJsonPath', null, $tenantId);
            if ($jsonPath && file_exists(storage_path('app/public/' . $jsonPath))) {
                $client->setAuthConfig(storage_path('app/public/' . $jsonPath));
            }
        } else {
            $client->setClientId($clientId);
            $clientSecret = trim($clientSecret);
            $client->setClientSecret($clientSecret);
        }

        $client->setRedirectUri(route('google-mail.callback'));
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setIncludeGrantedScopes(true);

        $client->addScope([
            GoogleGmail::GMAIL_READONLY,
            GoogleGmail::GMAIL_SEND,
            GoogleGmail::GMAIL_MODIFY,
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ]);

        // Load existing token
        $tokenJson = getSetting('googleMailAccessToken', null, $tenantId);
        if ($tokenJson) {
            $token = is_array($tokenJson) ? $tokenJson : json_decode($tokenJson, true);
            if (is_array($token)) {
                $client->setAccessToken($token);

                if ($client->isAccessTokenExpired()) {
                    $refreshToken = getSetting('googleMailRefreshToken', null, $tenantId) ?: ($token['refresh_token'] ?? null);
                    if ($refreshToken) {
                        try {
                            $newToken = $client->fetchAccessTokenWithRefreshToken($refreshToken);
                            if (!isset($newToken['error'])) {
                                if (!isset($newToken['refresh_token'])) {
                                    $newToken['refresh_token'] = $refreshToken;
                                }
                                updateSetting('googleMailAccessToken', json_encode($newToken), $tenantId);
                            }
                        } catch (\Exception $e) {
                            Log::warning('Failed refreshing Google Mail token', ['tenant' => $tenantId, 'error' => $e->getMessage()]);
                        }
                    }
                }
            }
        }

        return $client;
    }

    /**
     * Generate Google OAuth authorization URL
     */
    public function getAuthUrl($tenantId): string
    {
        $client = $this->getClient($tenantId);
        return $client->createAuthUrl();
    }

    /**
     * Handle OAuth code exchange callback from Google
     */
    public function handleCallback(string $code, $tenantId): array
    {
        $client = $this->getClient($tenantId);
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

        // Save tokens and settings
        updateSetting('googleMailEnabled', '1', $tenantId);
        updateSetting('googleMailConnected', '1', $tenantId);
        updateSetting('googleMailAccessToken', json_encode($token), $tenantId);
        if (!empty($token['refresh_token'])) {
            updateSetting('googleMailRefreshToken', $token['refresh_token'], $tenantId);
        }
        updateSetting('googleMailConnectedEmail', $connectedEmail, $tenantId);
        updateSetting('googleMailConnectedName', $connectedName, $tenantId);
        updateSetting('googleMailConnectedAt', Carbon::now()->toDateTimeString(), $tenantId);

        return [
            'email' => $connectedEmail,
            'name' => $connectedName,
        ];
    }

    /**
     * Disconnect Google Mail account
     */
    public function disconnect($tenantId): void
    {
        try {
            $client = $this->getClient($tenantId);
            $client->revokeToken();
        } catch (\Exception $e) {
            // Ignore revoke errors
        }

        updateSetting('googleMailEnabled', '0', $tenantId);
        updateSetting('googleMailConnected', '0', $tenantId);
        updateSetting('googleMailAccessToken', '', $tenantId);
        updateSetting('googleMailRefreshToken', '', $tenantId);
        updateSetting('googleMailConnectedEmail', '', $tenantId);
        updateSetting('googleMailConnectedName', '', $tenantId);
    }

    /**
     * Sync messages from Gmail (Inbox & Sent) and automatically match to CRM timeline
     */
    public function syncEmails($tenantId, int $maxResults = 50): array
    {
        if (!$this->isConnected($tenantId)) {
            return [
                'success' => false,
                'message' => 'Google Mail is not connected. Please connect your Google account in Settings.',
                'captured' => 0,
            ];
        }

        $client = $this->getClient($tenantId);
        $gmail = new GoogleGmail($client);
        $connectedEmail = strtolower(getSetting('googleMailConnectedEmail', '', $tenantId));

        $capturedCount = 0;
        $matchedEntities = [
            'leads' => 0,
            'contacts' => 0,
            'accounts' => 0,
            'opportunities' => 0,
        ];

        try {
            // Query messages newer than 30 days
            $response = $gmail->users_messages->listUsersMessages('me', [
                'maxResults' => min($maxResults, 100),
                'q' => 'newer_than:30d',
            ]);

            $messages = $response->getMessages() ?: [];

            foreach ($messages as $messageItem) {
                $gmailId = $messageItem->getId();

                // Check if already captured
                if (CrmEmail::where('created_by', $tenantId)->where('message_id', $gmailId)->exists()) {
                    continue;
                }

                $msg = $gmail->users_messages->get('me', $gmailId, ['format' => 'full']);
                $parsed = $this->parseGmailMessage($msg);

                // Collect all email addresses in From, To, and Cc
                $allAddresses = array_unique(array_filter(array_merge(
                    [$parsed['from_email']],
                    $parsed['to_emails'],
                    $parsed['cc_emails']
                )));

                // Filter out the user's own connected email to match CRM contact emails
                $contactEmails = array_values(array_filter($allAddresses, function ($addr) use ($connectedEmail) {
                    return !empty($addr) && strtolower($addr) !== $connectedEmail;
                }));

                if (empty($contactEmails)) {
                    continue;
                }

                // Match with CRM entities
                $matchedLead = Lead::where('created_by', $tenantId)
                    ->where(function ($q) use ($contactEmails) {
                        $q->whereIn('email', $contactEmails)
                          ->orWhereIn('alternate_email', $contactEmails);
                    })->first();

                $matchedContact = Contact::where('created_by', $tenantId)
                    ->where(function ($q) use ($contactEmails) {
                        $q->whereIn('email', $contactEmails)
                          ->orWhereIn('alternate_email', $contactEmails);
                    })->first();

                $matchedAccount = Account::where('created_by', $tenantId)
                    ->where(function ($q) use ($contactEmails) {
                        $q->whereIn('email', $contactEmails)
                          ->orWhereIn('alternate_email', $contactEmails);
                    })->first();

                // If lead or contact has an associated account, link that too
                if (!$matchedAccount) {
                    if ($matchedContact && $matchedContact->account_id) {
                        $matchedAccount = Account::where('id', $matchedContact->account_id)->where('created_by', $tenantId)->first();
                    } elseif ($matchedLead && $matchedLead->account_id) {
                        $matchedAccount = Account::where('id', $matchedLead->account_id)->where('created_by', $tenantId)->first();
                    }
                }

                // Match active opportunity
                $matchedOpportunity = null;
                if ($matchedAccount) {
                    $matchedOpportunity = Opportunity::where('created_by', $tenantId)
                        ->where('account_id', $matchedAccount->id)
                        ->orderBy('created_at', 'desc')
                        ->first();
                } elseif ($matchedContact) {
                    $matchedOpportunity = Opportunity::where('created_by', $tenantId)
                        ->where('contact_id', $matchedContact->id)
                        ->orderBy('created_at', 'desc')
                        ->first();
                }

                // Only capture if at least one CRM entity matched!
                if (!$matchedLead && !$matchedContact && !$matchedAccount && !$matchedOpportunity) {
                    continue;
                }

                // Determine direction
                $direction = (strtolower($parsed['from_email']) === $connectedEmail) ? 'outbound' : 'inbound';

                // Save to crm_emails table
                $crmEmail = CrmEmail::create([
                    'created_by' => $tenantId,
                    'user_id' => auth()->id() ?? $tenantId,
                    'message_id' => $gmailId,
                    'thread_id' => $parsed['thread_id'],
                    'direction' => $direction,
                    'from_email' => $parsed['from_email'],
                    'from_name' => $parsed['from_name'],
                    'to_emails' => $parsed['to_emails'],
                    'cc_emails' => $parsed['cc_emails'],
                    'bcc_emails' => [],
                    'subject' => $parsed['subject'] ?: '(No Subject)',
                    'snippet' => $parsed['snippet'],
                    'body_text' => $parsed['body_text'],
                    'body_html' => $parsed['body_html'],
                    'sent_at' => $parsed['sent_at'],
                    'lead_id' => $matchedLead ? $matchedLead->id : null,
                    'contact_id' => $matchedContact ? $matchedContact->id : null,
                    'account_id' => $matchedAccount ? $matchedAccount->id : null,
                    'opportunity_id' => $matchedOpportunity ? $matchedOpportunity->id : null,
                    'has_attachments' => $parsed['has_attachments'],
                    'attachment_names' => $parsed['attachment_names'],
                    'source' => 'gmail',
                ]);

                // Log into Activity Streams / Timelines
                $this->logActivityForEntities(
                    $tenantId,
                    $crmEmail,
                    $direction,
                    $matchedLead,
                    $matchedContact,
                    $matchedAccount,
                    $matchedOpportunity
                );

                $capturedCount++;
                if ($matchedLead) $matchedEntities['leads']++;
                if ($matchedContact) $matchedEntities['contacts']++;
                if ($matchedAccount) $matchedEntities['accounts']++;
                if ($matchedOpportunity) $matchedEntities['opportunities']++;
            }

            updateSetting('googleMailLastSyncAt', Carbon::now()->toDateTimeString(), $tenantId);

            return [
                'success' => true,
                'captured' => $capturedCount,
                'total_scanned' => count($messages),
                'matched' => $matchedEntities,
                'message' => "Successfully captured {$capturedCount} new email(s) into CRM timeline.",
            ];
        } catch (\Exception $e) {
            Log::error('Google Mail Sync Error: ' . $e->getMessage(), ['tenant' => $tenantId, 'trace' => $e->getTraceAsString()]);
            return [
                'success' => false,
                'message' => 'Google Mail Sync Error: ' . $e->getMessage(),
                'captured' => 0,
            ];
        }
    }

    /**
     * Send email to a Lead, Contact, Account, or Opportunity directly from CRM,
     * using connected Gmail (or fallback to SMTP), and immediately record to timeline!
     */
    public function sendEmail($tenantId, array $data): array
    {
        $to = $data['to'];
        $subject = $data['subject'] ?? '(No Subject)';
        $body = $data['body'] ?? '';
        $leadId = $data['lead_id'] ?? null;
        $contactId = $data['contact_id'] ?? null;
        $accountId = $data['account_id'] ?? null;
        $opportunityId = $data['opportunity_id'] ?? null;

        $connectedEmail = getSetting('googleMailConnectedEmail', '', $tenantId);
        $connectedName = getSetting('googleMailConnectedName', auth()->user()->name ?? 'CRM User', $tenantId);
        $fromEmail = $connectedEmail ?: (config('mail.from.address') ?: 'crm@company.com');
        $fromName = $connectedName ?: (config('mail.from.name') ?: 'Sales Team');

        $messageId = 'crm_' . uniqid() . '_' . time();
        $source = 'smtp';

        // Attempt sending via Google Gmail API if connected
        if ($this->isConnected($tenantId)) {
            try {
                $client = $this->getClient($tenantId);
                $gmail = new GoogleGmail($client);

                $rawMime = "From: =?utf-8?B?" . base64_encode($fromName) . "?= <{$fromEmail}>\r\n";
                $rawMime .= "To: <{$to}>\r\n";
                $rawMime .= "Subject: =?utf-8?B?" . base64_encode($subject) . "?=\r\n";
                $rawMime .= "MIME-Version: 1.0\r\n";
                $rawMime .= "Content-Type: text/html; charset=utf-8\r\n\r\n";
                $rawMime .= nl2br($body);

                $encoded = rtrim(strtr(base64_encode($rawMime), '+/', '-_'), '=');
                $gmailMsg = new GmailMessage();
                $gmailMsg->setRaw($encoded);

                $sentResponse = $gmail->users_messages->send('me', $gmailMsg);
                if ($sentResponse && $sentResponse->getId()) {
                    $messageId = $sentResponse->getId();
                    $source = 'gmail';
                }
            } catch (\Exception $e) {
                Log::warning('Failed sending via Gmail API, falling back to SMTP: ' . $e->getMessage());
                // Fallback to Laravel Mail
                try {
                    Mail::html(nl2br($body), function ($message) use ($to, $subject, $fromEmail, $fromName) {
                        $message->to($to)
                            ->from($fromEmail, $fromName)
                            ->subject($subject);
                    });
                } catch (\Exception $mailEx) {
                    Log::error('SMTP mail send failed: ' . $mailEx->getMessage());
                }
            }
        } else {
            // Send via standard Laravel Mail
            try {
                Mail::html(nl2br($body), function ($message) use ($to, $subject, $fromEmail, $fromName) {
                    $message->to($to)
                        ->from($fromEmail, $fromName)
                        ->subject($subject);
                });
            } catch (\Exception $e) {
                Log::warning('SMTP send failed: ' . $e->getMessage());
            }
        }

        // Create CrmEmail record
        $crmEmail = CrmEmail::create([
            'created_by' => $tenantId,
            'user_id' => auth()->id() ?? $tenantId,
            'message_id' => $messageId,
            'thread_id' => null,
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
            'has_attachments' => false,
            'source' => $source,
        ]);

        // Log into Activity Timelines
        $matchedLead = $leadId ? Lead::find($leadId) : null;
        $matchedContact = $contactId ? Contact::find($contactId) : null;
        $matchedAccount = $accountId ? Account::find($accountId) : null;
        $matchedOpportunity = $opportunityId ? Opportunity::find($opportunityId) : null;

        $this->logActivityForEntities(
            $tenantId,
            $crmEmail,
            'outbound',
            $matchedLead,
            $matchedContact,
            $matchedAccount,
            $matchedOpportunity
        );

        return [
            'success' => true,
            'message' => __('Email sent and logged to timeline successfully.'),
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
            'sent_at' => $email->sent_at ? $email->sent_at->toDateTimeString() : now()->toDateTimeString(),
            'source' => $email->source,
        ];

        // 1. Lead Activity
        if ($lead) {
            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => auth()->id() ?? $lead->assigned_to ?? $tenantId,
                'activity_type' => $activityType,
                'title' => $title,
                'description' => $description,
                'new_values' => $activityValues,
                'field_changed' => 'email',
                'created_by' => $tenantId,
            ]);
        }

        // 2. Contact Activity
        if ($contact) {
            ContactActivity::create([
                'contact_id' => $contact->id,
                'user_id' => auth()->id() ?? $contact->assigned_to ?? $tenantId,
                'activity_type' => $activityType,
                'title' => $title,
                'description' => $description,
                'new_values' => $activityValues,
                'field_changed' => 'email',
                'created_by' => $tenantId,
            ]);
        }

        // 3. Account Activity
        if ($account) {
            AccountActivity::create([
                'account_id' => $account->id,
                'user_id' => auth()->id() ?? $account->assigned_to ?? $tenantId,
                'activity_type' => $activityType,
                'title' => $title,
                'description' => $description,
                'new_values' => $activityValues,
                'field_changed' => 'email',
                'created_by' => $tenantId,
            ]);
        }

        // 4. Opportunity Activity
        if ($opportunity) {
            OpportunityActivity::create([
                'opportunity_id' => $opportunity->id,
                'user_id' => auth()->id() ?? $opportunity->assigned_to ?? $tenantId,
                'activity_type' => $activityType,
                'title' => $title,
                'description' => $description,
                'new_values' => $activityValues,
                'field_changed' => 'email',
                'created_by' => $tenantId,
            ]);
        }
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
            $fromEmail = trim($matches[2]);
        } else {
            $fromEmail = trim($fromRaw);
        }

        $parseAddresses = function ($raw) {
            if (!$raw) return [];
            $addrs = explode(',', $raw);
            $clean = [];
            foreach ($addrs as $addr) {
                if (preg_match('/<([^>]+)>/', $addr, $m)) {
                    $clean[] = trim($m[1]);
                } else {
                    $clean[] = trim($addr);
                }
            }
            return array_filter($clean);
        };

        $toEmails = $parseAddresses($headerMap['to'] ?? '');
        $ccEmails = $parseAddresses($headerMap['cc'] ?? '');
        $subject = $headerMap['subject'] ?? '';
        $dateRaw = $headerMap['date'] ?? null;
        $sentAt = $dateRaw ? Carbon::parse($dateRaw) : Carbon::now();

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

        return [
            'id' => $msg->getId(),
            'thread_id' => $msg->getThreadId(),
            'from_raw' => $fromRaw,
            'from_email' => $fromEmail,
            'from_name' => $fromName,
            'to_emails' => $toEmails,
            'cc_emails' => $ccEmails,
            'subject' => $subject,
            'snippet' => $msg->getSnippet(),
            'body_text' => $bodyText,
            'body_html' => $bodyHtml,
            'sent_at' => $sentAt,
            'has_attachments' => $hasAttachments,
            'attachment_names' => $attachmentNames,
        ];
    }
}
