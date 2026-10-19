<?php

namespace App\Services;

use App\Events\LeadAssigned;
use App\Models\AccountIndustry;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadIntegration;
use App\Models\LeadIntegrationLog;
use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LeadIntegrationService
{
    /**
     * Process Facebook Lead Ads Webhook
     */
    public function handleFacebook(LeadIntegration $integration, Request $request): array
    {
        // 1. Meta Webhook Verification challenge
        if ($request->has('hub_mode') || $request->has('hub_challenge')) {
            $verifyToken = $integration->configuration['verify_token'] ?? $integration->secret_key;
            if ($request->input('hub_verify_token') === $verifyToken) {
                return [
                    'status' => 200,
                    'is_challenge' => true,
                    'challenge' => $request->input('hub_challenge'),
                ];
            }
            return [
                'status' => 403,
                'is_challenge' => true,
                'error' => 'Invalid verify token',
            ];
        }

        if (!$integration->is_active) {
            $this->logFailure($integration, 'facebook', $request, 'Integration is inactive');
            return ['status' => 400, 'error' => 'Integration is currently disabled'];
        }

        $payload = $request->all();
        $leadData = [];
        $externalId = null;

        // Check if Meta leadgen payload format
        if (isset($payload['entry'][0]['changes'][0]['value'])) {
            $val = $payload['entry'][0]['changes'][0]['value'];
            $externalId = $val['leadgen_id'] ?? null;
            $formId = $val['form_id'] ?? null;
            $pageId = $val['page_id'] ?? null;

            // If access token is configured, try fetching lead details directly from Graph API
            $accessToken = $integration->configuration['access_token'] ?? null;
            if ($externalId && $accessToken) {
                try {
                    $fbRes = Http::timeout(10)->get("https://graph.facebook.com/v19.0/{$externalId}", [
                        'access_token' => $accessToken,
                    ]);
                    if ($fbRes->successful()) {
                        $graphData = $fbRes->json();
                        $leadData = $this->extractFacebookFieldData($graphData['field_data'] ?? []);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Facebook Graph API fetch error: ' . $e->getMessage());
                }
            }
        }

        // Check if field_data passed directly (e.g. from simulator, Zapier, or Meta lead testing tool)
        if (empty($leadData['name']) && !empty($payload['field_data'])) {
            $leadData = $this->extractFacebookFieldData($payload['field_data']);
        }

        // Direct flat fallback
        if (empty($leadData['name'])) {
            $leadData['name'] = $payload['name'] ?? $payload['full_name'] ?? ($payload['first_name'] ?? '' . ' ' . ($payload['last_name'] ?? ''));
            $leadData['email'] = $payload['email'] ?? null;
            $leadData['phone'] = $payload['phone'] ?? $payload['phone_number'] ?? null;
            $leadData['company'] = $payload['company'] ?? $payload['company_name'] ?? null;
            $leadData['notes'] = $payload['notes'] ?? null;
        }

        if (empty($leadData['name']) && empty($leadData['email']) && empty($leadData['phone'])) {
            $this->logFailure($integration, 'facebook', $request, 'No valid lead data fields found in payload');
            return ['status' => 422, 'error' => 'Payload does not contain lead information'];
        }

        if (empty($leadData['name'])) {
            $leadData['name'] = 'Facebook Lead ' . ($externalId ? "#$externalId" : date('Ymd-His'));
        }

        return $this->createOrUpdateLead($integration, $leadData, $payload, 'facebook', $externalId);
    }

    /**
     * Process Google Ads Lead Form Webhook
     */
    public function handleGoogleAds(LeadIntegration $integration, Request $request): array
    {
        if (!$integration->is_active) {
            $this->logFailure($integration, 'google_ads', $request, 'Integration is inactive');
            return ['status' => 400, 'error' => 'Integration is currently disabled'];
        }

        $payload = $request->all();

        // Validate Google Key if configured
        $expectedKey = $integration->configuration['google_key'] ?? $integration->secret_key;
        if (!empty($expectedKey)) {
            $providedKey = $payload['google_key'] ?? $request->header('google_key') ?? $request->query('google_key');
            if ($providedKey !== $expectedKey) {
                $this->logFailure($integration, 'google_ads', $request, 'Invalid google_key supplied');
                return ['status' => 401, 'error' => 'Unauthorized: Invalid Google Key'];
            }
        }

        $leadData = [];
        $externalId = $payload['lead_id'] ?? null;

        // Parse Google user_column_data
        if (!empty($payload['user_column_data']) && is_array($payload['user_column_data'])) {
            $firstName = '';
            $lastName = '';
            foreach ($payload['user_column_data'] as $col) {
                $colId = strtoupper($col['column_id'] ?? $col['column_name'] ?? '');
                $val = trim($col['string_value'] ?? '');

                if (empty($val)) continue;

                switch ($colId) {
                    case 'FIRST_NAME':
                        $firstName = $val;
                        break;
                    case 'LAST_NAME':
                        $lastName = $val;
                        break;
                    case 'FULL_NAME':
                        $leadData['name'] = $val;
                        break;
                    case 'EMAIL':
                    case 'WORK_EMAIL':
                        $leadData['email'] = $val;
                        break;
                    case 'PHONE_NUMBER':
                    case 'WORK_PHONE':
                        $leadData['phone'] = $val;
                        break;
                    case 'COMPANY_NAME':
                        $leadData['company'] = $val;
                        break;
                    case 'JOB_TITLE':
                        $leadData['position'] = $val;
                        break;
                    case 'STREET_ADDRESS':
                    case 'CITY':
                    case 'POSTAL_CODE':
                        $leadData['address'] = trim(($leadData['address'] ?? '') . ' ' . $val);
                        break;
                }
            }

            if (empty($leadData['name']) && (!empty($firstName) || !empty($lastName))) {
                $leadData['name'] = trim("$firstName $lastName");
            }
        }

        // Direct flat fallback
        if (empty($leadData['name'])) {
            $leadData['name'] = $payload['name'] ?? $payload['full_name'] ?? null;
            $leadData['email'] = $payload['email'] ?? null;
            $leadData['phone'] = $payload['phone'] ?? $payload['phone_number'] ?? null;
            $leadData['company'] = $payload['company'] ?? null;
        }

        if (empty($leadData['name']) && empty($leadData['email']) && empty($leadData['phone'])) {
            $this->logFailure($integration, 'google_ads', $request, 'No valid lead data fields found in Google payload');
            return ['status' => 422, 'error' => 'Payload does not contain valid lead data'];
        }

        if (empty($leadData['name'])) {
            $leadData['name'] = 'Google Ads Lead ' . ($externalId ? "#$externalId" : date('Ymd-His'));
        }

        return $this->createOrUpdateLead($integration, $leadData, $payload, 'google_ads', $externalId);
    }

    /**
     * Process Custom Incoming Webhook
     */
    public function handleWebhook(LeadIntegration $integration, Request $request): array
    {
        if (!$integration->is_active) {
            $this->logFailure($integration, 'webhook', $request, 'Integration is inactive');
            return ['status' => 400, 'error' => 'Integration is currently disabled'];
        }

        // Optional Secret Header verification
        $secEnabled = $integration->configuration['secret_header_enabled'] ?? false;
        if ($secEnabled) {
            $headerName = $integration->configuration['secret_header_name'] ?? 'X-Webhook-Secret';
            $providedSecret = $request->header($headerName) ?? $request->query('secret');
            if ($providedSecret !== $integration->secret_key) {
                $this->logFailure($integration, 'webhook', $request, 'Secret key header mismatch');
                return ['status' => 401, 'error' => 'Unauthorized: Invalid Webhook Secret'];
            }
        }

        $payload = $request->all();
        $mapping = $integration->configuration['field_mapping'] ?? [];

        $leadData = [];
        // Apply custom mapping if configured
        if (!empty($mapping) && is_array($mapping)) {
            foreach ($mapping as $crmField => $payloadKey) {
                if (!empty($payloadKey) && isset($payload[$payloadKey])) {
                    $leadData[$crmField] = $payload[$payloadKey];
                }
            }
        }

        // Automatic fallback detection
        if (empty($leadData['name'])) {
            $leadData['name'] = $payload['name'] ?? $payload['full_name'] ?? trim(($payload['first_name'] ?? '') . ' ' . ($payload['last_name'] ?? ''));
        }
        if (empty($leadData['email'])) {
            $leadData['email'] = $payload['email'] ?? $payload['work_email'] ?? $payload['user_email'] ?? null;
        }
        if (empty($leadData['alternate_email'])) {
            $leadData['alternate_email'] = $payload['alternate_email'] ?? $payload['alt_email'] ?? null;
        }
        if (empty($leadData['phone'])) {
            $leadData['phone'] = $payload['phone'] ?? $payload['phone_number'] ?? $payload['mobile'] ?? $payload['telephone'] ?? null;
        }
        if (empty($leadData['company'])) {
            $leadData['company'] = $payload['company'] ?? $payload['company_name'] ?? $payload['organization'] ?? null;
        }
        if (empty($leadData['account_name'])) {
            $leadData['account_name'] = $payload['account_name'] ?? $leadData['company'] ?? null;
        }
        if (empty($leadData['website'])) {
            $leadData['website'] = $payload['website'] ?? $payload['url'] ?? null;
        }
        if (empty($leadData['position'])) {
            $leadData['position'] = $payload['position'] ?? $payload['job_title'] ?? $payload['title'] ?? null;
        }
        if (empty($leadData['address'])) {
            $leadData['address'] = $payload['address'] ?? $payload['location'] ?? null;
        }
        if (empty($leadData['notes'])) {
            $leadData['notes'] = $payload['notes'] ?? $payload['message'] ?? $payload['description'] ?? $payload['comments'] ?? null;
        }
        if (empty($leadData['value'])) {
            $leadData['value'] = isset($payload['value']) ? (float)$payload['value'] : (isset($payload['budget']) ? (float)$payload['budget'] : null);
        }
        if (empty($leadData['services']) && !empty($payload['services'])) {
            $leadData['services'] = is_array($payload['services']) ? $payload['services'] : array_map('trim', explode(',', $payload['services']));
        }

        if (empty($leadData['name']) && empty($leadData['email']) && empty($leadData['phone'])) {
            $this->logFailure($integration, 'webhook', $request, 'No name, email, or phone found in webhook payload');
            return ['status' => 422, 'error' => 'Payload missing required contact fields (name, email, or phone)'];
        }

        if (empty($leadData['name'])) {
            $leadData['name'] = 'Webhook Lead ' . date('Ymd-His');
        }

        $externalId = $payload['id'] ?? $payload['lead_id'] ?? null;

        return $this->createOrUpdateLead($integration, $leadData, $payload, 'webhook', $externalId);
    }

    /**
     * Process API Lead Creation
     */
    public function handleApi(LeadIntegration $integration, Request $request): array
    {
        if (!$integration->is_active) {
            $this->logFailure($integration, 'api', $request, 'Integration is inactive');
            return ['status' => 400, 'error' => 'API Integration is currently disabled'];
        }

        $payload = $request->all();

        $name = trim($payload['name'] ?? $payload['full_name'] ?? '');
        if (empty($name)) {
            $this->logFailure($integration, 'api', $request, 'Validation error: name field is required');
            return ['status' => 422, 'error' => 'Validation error: The name field is required.'];
        }

        $leadData = [
            'name'                => $name,
            'email'               => $payload['email'] ?? null,
            'alternate_email'     => $payload['alternate_email'] ?? null,
            'phone'               => $payload['phone'] ?? null,
            'company'             => $payload['company'] ?? null,
            'account_name'        => $payload['account_name'] ?? $payload['company'] ?? null,
            'website'             => $payload['website'] ?? null,
            'position'            => $payload['position'] ?? null,
            'address'             => $payload['address'] ?? null,
            'notes'               => $payload['notes'] ?? null,
            'value'               => isset($payload['value']) ? (float)$payload['value'] : null,
            'services'            => isset($payload['services']) && is_array($payload['services']) ? $payload['services'] : null,
            'lead_status_id'      => $payload['lead_status_id'] ?? null,
            'lead_source_id'      => $payload['lead_source_id'] ?? null,
            'account_industry_id' => $payload['account_industry_id'] ?? null,
            'assigned_to'         => $payload['assigned_to'] ?? null,
        ];

        return $this->createOrUpdateLead($integration, $leadData, $payload, 'api', $payload['external_id'] ?? null);
    }

    /**
     * Helper to extract Facebook form field_data array
     */
    protected function extractFacebookFieldData(array $fieldData): array
    {
        $data = [];
        $firstName = '';
        $lastName = '';

        foreach ($fieldData as $field) {
            $name = strtolower($field['name'] ?? '');
            $val = $field['values'][0] ?? null;

            if (empty($val)) continue;

            if (in_array($name, ['full_name', 'name'])) {
                $data['name'] = $val;
            } elseif ($name === 'first_name') {
                $firstName = $val;
            } elseif ($name === 'last_name') {
                $lastName = $val;
            } elseif (str_contains($name, 'email')) {
                $data['email'] = $val;
            } elseif (str_contains($name, 'phone')) {
                $data['phone'] = $val;
            } elseif (str_contains($name, 'company')) {
                $data['company'] = $val;
            } elseif (str_contains($name, 'job') || str_contains($name, 'title') || str_contains($name, 'position')) {
                $data['position'] = $val;
            } elseif (str_contains($name, 'city') || str_contains($name, 'address') || str_contains($name, 'street')) {
                $data['address'] = trim(($data['address'] ?? '') . ' ' . $val);
            } else {
                // Collect other custom questions in notes
                $data['notes'] = trim(($data['notes'] ?? '') . "\n" . ucfirst(str_replace('_', ' ', $name)) . ": " . $val);
            }
        }

        if (empty($data['name']) && (!empty($firstName) || !empty($lastName))) {
            $data['name'] = trim("$firstName $lastName");
        }

        return $data;
    }

    /**
     * Create or update lead and record activity & log
     */
    protected function createOrUpdateLead(LeadIntegration $integration, array $leadData, array $rawPayload, string $sourceType, ?string $externalId = null): array
    {
        $companyId = $integration->created_by;

        // Resolve Status
        $statusId = $leadData['lead_status_id'] ?? $integration->default_lead_status_id;
        if (!$statusId || !LeadStatus::where('id', $statusId)->where('created_by', $companyId)->exists()) {
            $firstStatus = LeadStatus::where('created_by', $companyId)->where('status', 'active')->first();
            $statusId = $firstStatus?->id;
        }

        // Resolve Source
        $sourceId = $leadData['lead_source_id'] ?? $integration->default_lead_source_id;
        if (!$sourceId || !LeadSource::where('id', $sourceId)->where('created_by', $companyId)->exists()) {
            // Try to find matching source by name
            $sourceName = match ($sourceType) {
                'facebook'   => 'Social Media',
                'google_ads' => 'Website',
                'webhook'    => 'Website',
                default      => 'Website',
            };
            $matchingSource = LeadSource::where('created_by', $companyId)
                ->where('name', 'like', "%{$sourceName}%")
                ->first();
            $sourceId = $matchingSource?->id ?: LeadSource::where('created_by', $companyId)->first()?->id;
        }

        // Resolve Industry
        $industryId = $leadData['account_industry_id'] ?? $integration->default_account_industry_id;
        if (!$industryId || !AccountIndustry::where('id', $industryId)->where('created_by', $companyId)->exists()) {
            $firstIndustry = AccountIndustry::where('created_by', $companyId)->where('status', 'active')->first();
            $industryId = $firstIndustry?->id;
        }

        // Resolve Assignee
        $assignedTo = $leadData['assigned_to'] ?? $integration->default_assigned_to;
        if (!$assignedTo || !User::where('id', $assignedTo)->where(function ($q) use ($companyId) {
            $q->where('id', $companyId)->orWhere('created_by', $companyId);
        })->exists()) {
            $assignedTo = $companyId;
        }

        // Check if lead already exists with same email for this company
        $existingLead = null;
        if (!empty($leadData['email'])) {
            $existingLead = Lead::where('created_by', $companyId)
                ->where('email', $leadData['email'])
                ->first();
        }

        $sourceLabel = match ($sourceType) {
            'facebook'   => 'Facebook Lead Ads',
            'google_ads' => 'Google Ads Lead Form',
            'webhook'    => 'Custom Webhook',
            'api'        => 'REST API',
            default      => ucfirst($sourceType),
        };

        if ($existingLead) {
            // Update existing lead with latest phone / notes / external ID
            $updateFields = [
                'lead_integration_id' => $integration->id,
                'integration_source'  => $sourceType,
            ];
            if (!empty($externalId)) {
                $updateFields['external_lead_id'] = $externalId;
            }
            if (empty($existingLead->phone) && !empty($leadData['phone'])) {
                $updateFields['phone'] = $leadData['phone'];
            }
            if (!empty($leadData['services'])) {
                $updateFields['services'] = array_values(array_unique(array_merge($existingLead->services ?? [], $leadData['services'])));
            }

            $existingLead->update($updateFields);

            // Add activity log to existing lead
            LeadActivity::create([
                'lead_id'       => $existingLead->id,
                'user_id'       => $assignedTo,
                'activity_type' => 'updated',
                'title'         => "Repeat inquiry from {$sourceLabel}",
                'description'   => "Lead submitted new information via {$sourceLabel}. External ID: " . ($externalId ?: 'N/A'),
                'created_by'    => $companyId,
            ]);

            $this->logSuccess($integration, $sourceType, $rawPayload, "Existing lead #{$existingLead->id} updated via {$sourceLabel}", $existingLead->id);

            return [
                'status'  => 200,
                'success' => true,
                'action'  => 'updated',
                'message' => "Lead updated successfully from {$sourceLabel}",
                'lead'    => $existingLead,
            ];
        }

        // Create new lead
        $newLead = Lead::create([
            'name'                => $leadData['name'],
            'email'               => $leadData['email'] ?? null,
            'alternate_email'     => $leadData['alternate_email'] ?? null,
            'phone'               => $leadData['phone'] ?? null,
            'company'             => $leadData['company'] ?? null,
            'account_name'        => $leadData['account_name'] ?? $leadData['company'] ?? null,
            'account_industry_id' => $industryId,
            'website'             => $leadData['website'] ?? null,
            'position'            => $leadData['position'] ?? null,
            'address'             => $leadData['address'] ?? null,
            'notes'               => $leadData['notes'] ?? null,
            'value'               => $leadData['value'] ?? null,
            'status'              => 'active',
            'is_converted'        => false,
            'lead_status_id'      => $statusId,
            'lead_source_id'      => $sourceId,
            'created_by'          => $companyId,
            'creator_id'          => $companyId,
            'assigned_to'         => $assignedTo,
            'services'            => $leadData['services'] ?? null,
            'lead_integration_id' => $integration->id,
            'integration_source'  => $sourceType,
            'external_lead_id'    => $externalId,
        ]);

        // Create Activity
        LeadActivity::create([
            'lead_id'       => $newLead->id,
            'user_id'       => $assignedTo,
            'activity_type' => 'created',
            'title'         => "Lead captured via {$sourceLabel}",
            'description'   => "Automatically imported from {$sourceLabel} integration. External ID: " . ($externalId ?: 'None'),
            'created_by'    => $companyId,
        ]);

        // Dispatch LeadAssigned event
        try {
            event(new LeadAssigned($newLead));
        } catch (\Throwable $e) {
            Log::warning('LeadAssigned event error: ' . $e->getMessage());
        }

        $this->logSuccess($integration, $sourceType, $rawPayload, "Lead #{$newLead->id} created successfully via {$sourceLabel}", $newLead->id);

        return [
            'status'  => 201,
            'success' => true,
            'action'  => 'created',
            'message' => "Lead created successfully from {$sourceLabel}",
            'lead'    => $newLead,
        ];
    }

    /**
     * Record success in logs and update stats
     */
    protected function logSuccess(LeadIntegration $integration, string $type, array $payload, string $msg, ?int $leadId = null): void
    {
        $integration->increment('total_received');
        $integration->increment('successful_count');
        $integration->update(['last_received_at' => now()]);

        LeadIntegrationLog::create([
            'created_by'          => $integration->created_by,
            'lead_integration_id' => $integration->id,
            'integration_type'    => $type,
            'status'              => 'success',
            'ip_address'          => request()->ip(),
            'payload'             => $payload,
            'response_message'    => $msg,
            'lead_id'             => $leadId,
            'created_at'          => now(),
        ]);
    }

    /**
     * Record failure in logs and update stats
     */
    protected function logFailure(LeadIntegration $integration, string $type, Request $request, string $errMsg): void
    {
        $integration->increment('total_received');
        $integration->increment('failed_count');
        $integration->update(['last_received_at' => now()]);

        LeadIntegrationLog::create([
            'created_by'          => $integration->created_by,
            'lead_integration_id' => $integration->id,
            'integration_type'    => $type,
            'status'              => 'failed',
            'ip_address'          => $request->ip(),
            'payload'             => $request->all(),
            'response_message'    => $errMsg,
            'lead_id'             => null,
            'created_at'          => now(),
        ]);
    }
}
