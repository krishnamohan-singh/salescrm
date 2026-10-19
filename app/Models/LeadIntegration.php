<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class LeadIntegration extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'created_by',
        'type',
        'name',
        'is_active',
        'webhook_token',
        'api_key',
        'secret_key',
        'default_lead_status_id',
        'default_lead_source_id',
        'default_account_industry_id',
        'default_assigned_to',
        'configuration',
        'total_received',
        'successful_count',
        'failed_count',
        'last_received_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'configuration' => 'array',
        'last_received_at' => 'datetime',
        'total_received' => 'integer',
        'successful_count' => 'integer',
        'failed_count' => 'integer',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function defaultLeadStatus(): BelongsTo
    {
        return $this->belongsTo(LeadStatus::class, 'default_lead_status_id');
    }

    public function defaultLeadSource(): BelongsTo
    {
        return $this->belongsTo(LeadSource::class, 'default_lead_source_id');
    }

    public function defaultAccountIndustry(): BelongsTo
    {
        return $this->belongsTo(AccountIndustry::class, 'default_account_industry_id');
    }

    public function defaultAssignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'default_assigned_to');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(LeadIntegrationLog::class, 'lead_integration_id')->orderBy('created_at', 'desc');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'lead_integration_id')->orderBy('created_at', 'desc');
    }

    /**
     * Get webhook URL for this integration
     */
    public function getWebhookUrlAttribute(): string
    {
        return match ($this->type) {
            'facebook'   => url("/api/integrations/facebook/{$this->webhook_token}"),
            'google_ads' => url("/api/integrations/google-ads/{$this->webhook_token}"),
            'webhook'    => url("/api/integrations/webhook/{$this->webhook_token}"),
            default      => url("/api/v1/leads"),
        };
    }

    /**
     * Ensure default integrations exist for a company
     */
    public static function ensureDefaultsForCompany(int $companyId): array
    {
        $types = [
            'facebook' => [
                'name' => 'Facebook Lead Ads',
                'secret_key' => Str::random(24),
                'configuration' => [
                    'verify_token' => Str::random(32),
                    'page_id' => '',
                    'form_id' => '',
                    'app_secret' => '',
                    'access_token' => '',
                ],
            ],
            'google_ads' => [
                'name' => 'Google Ads Lead Form',
                'secret_key' => Str::random(20),
                'configuration' => [
                    'google_key' => Str::random(24),
                    'customer_id' => '',
                    'campaign_name' => '',
                ],
            ],
            'webhook' => [
                'name' => 'Custom Webhook (Forms, Zapier, Web)',
                'secret_key' => Str::random(32),
                'configuration' => [
                    'secret_header_enabled' => false,
                    'secret_header_name' => 'X-Webhook-Secret',
                    'field_mapping' => [
                        'name' => 'name',
                        'email' => 'email',
                        'phone' => 'phone',
                        'company' => 'company',
                        'notes' => 'notes',
                        'value' => 'value',
                    ],
                ],
            ],
            'api' => [
                'name' => 'Lead REST API Integration',
                'secret_key' => Str::random(32),
                'configuration' => [
                    'rate_limit' => 60,
                    'allowed_ips' => '',
                ],
            ],
        ];

        // Retrieve existing default status and source
        $defaultStatus = LeadStatus::where('created_by', $companyId)->where('status', 'active')->first();
        $defaultSource = LeadSource::where('created_by', $companyId)->where('status', 'active')->first();
        $defaultIndustry = AccountIndustry::where('created_by', $companyId)->where('status', 'active')->first();

        $integrations = [];

        foreach ($types as $type => $data) {
            $integration = self::where('created_by', $companyId)
                ->where('type', $type)
                ->first();

            if (!$integration) {
                $integration = self::create([
                    'created_by' => $companyId,
                    'type' => $type,
                    'name' => $data['name'],
                    'is_active' => true,
                    'webhook_token' => Str::random(32),
                    'api_key' => 'scrm_' . Str::random(40),
                    'secret_key' => $data['secret_key'],
                    'default_lead_status_id' => $defaultStatus?->id,
                    'default_lead_source_id' => $defaultSource?->id,
                    'default_account_industry_id' => $defaultIndustry?->id,
                    'default_assigned_to' => $companyId,
                    'configuration' => $data['configuration'],
                    'total_received' => 0,
                    'successful_count' => 0,
                    'failed_count' => 0,
                ]);
            }

            $integrations[$type] = $integration;
        }

        return $integrations;
    }
}
