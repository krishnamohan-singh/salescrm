<?php

namespace Tests\Feature;

use App\Models\AccountIndustry;
use App\Models\Lead;
use App\Models\LeadIntegration;
use App\Models\LeadIntegrationLog;
use App\Models\LeadSource;
use App\Models\LeadStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadIntegrationTest extends TestCase
{
    protected User $company;
    protected LeadStatus $status;
    protected LeadSource $source;
    protected AccountIndustry $industry;

    protected function setUp(): void
    {
        parent::setUp();

        // Find or create test company user
        $this->company = User::where('type', 'company')->first() ?? User::factory()->create([
            'type' => 'company',
            'email' => 'company_test_' . rand(1000, 9999) . '@example.com',
        ]);

        $this->status = LeadStatus::firstOrCreate(
            ['created_by' => $this->company->id, 'name' => 'New Integration Test'],
            ['status' => 'active', 'color' => '#3b82f6']
        );

        $this->source = LeadSource::firstOrCreate(
            ['created_by' => $this->company->id, 'name' => 'Website Integration'],
            ['status' => 'active']
        );

        $this->industry = AccountIndustry::firstOrCreate(
            ['created_by' => $this->company->id, 'name' => 'Technology'],
            ['status' => 'active']
        );
    }

    public function test_ensure_defaults_for_company_initializes_all_four_channels(): void
    {
        $integrations = LeadIntegration::ensureDefaultsForCompany($this->company->id);

        $this->assertArrayHasKey('facebook', $integrations);
        $this->assertArrayHasKey('google_ads', $integrations);
        $this->assertArrayHasKey('webhook', $integrations);
        $this->assertArrayHasKey('api', $integrations);

        $this->assertNotEmpty($integrations['facebook']->webhook_token);
        $this->assertNotEmpty($integrations['google_ads']->webhook_token);
        $this->assertNotEmpty($integrations['webhook']->webhook_token);
        $this->assertNotEmpty($integrations['api']->api_key);
    }

    public function test_custom_webhook_ingests_lead_and_logs_request(): void
    {
        $integrations = LeadIntegration::ensureDefaultsForCompany($this->company->id);
        $webhook = $integrations['webhook'];

        $testEmail = 'webhook_' . rand(1000, 9999) . '@example.com';
        $payload = [
            'name' => 'Sarah Connor',
            'email' => $testEmail,
            'phone' => '+1 555-123-4567',
            'company' => 'Cyberdyne Systems',
            'notes' => 'Urgent inquiry from landing page webhook',
            'value' => 7500,
        ];

        $response = $this->postJson("/api/integrations/webhook/{$webhook->webhook_token}", $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'action' => 'created',
            ]);

        // Assert lead exists
        $lead = Lead::where('created_by', $this->company->id)
            ->where('email', $testEmail)
            ->first();

        $this->assertNotNull($lead);
        $this->assertEquals('Sarah Connor', $lead->name);
        $this->assertEquals('webhook', $lead->integration_source);

        // Assert log was recorded
        $log = LeadIntegrationLog::where('lead_integration_id', $webhook->id)->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertEquals('success', $log->status);
        $this->assertEquals($lead->id, $log->lead_id);
    }

    public function test_facebook_webhook_verification_challenge(): void
    {
        $integrations = LeadIntegration::ensureDefaultsForCompany($this->company->id);
        $facebook = $integrations['facebook'];

        $verifyToken = $facebook->configuration['verify_token'] ?? $facebook->secret_key;

        $response = $this->get("/api/integrations/facebook/{$facebook->webhook_token}?hub_mode=subscribe&hub_verify_token={$verifyToken}&hub_challenge=CHALLENGE_CODE_123");

        $response->assertStatus(200);
        $this->assertEquals('CHALLENGE_CODE_123', $response->getContent());
    }

    public function test_google_ads_webhook_validates_google_key_and_parses_user_columns(): void
    {
        $integrations = LeadIntegration::ensureDefaultsForCompany($this->company->id);
        $googleAds = $integrations['google_ads'];

        $googleKey = $googleAds->configuration['google_key'] ?? $googleAds->secret_key;
        $testEmail = 'gads_' . rand(1000, 9999) . '@example.com';

        $payload = [
            'lead_id' => 'gads_test_999',
            'google_key' => $googleKey,
            'user_column_data' => [
                ['column_id' => 'FULL_NAME', 'string_value' => 'Thomas Anderson'],
                ['column_id' => 'EMAIL', 'string_value' => $testEmail],
                ['column_id' => 'PHONE_NUMBER', 'string_value' => '+1 555-0199'],
                ['column_id' => 'COMPANY_NAME', 'string_value' => 'MetaCortex'],
            ],
        ];

        $response = $this->postJson("/api/integrations/google-ads/{$googleAds->webhook_token}", $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'action' => 'created',
            ]);

        $lead = Lead::where('created_by', $this->company->id)->where('email', $testEmail)->first();
        $this->assertNotNull($lead);
        $this->assertEquals('Thomas Anderson', $lead->name);
        $this->assertEquals('google_ads', $lead->integration_source);
        $this->assertEquals('gads_test_999', $lead->external_lead_id);
    }

    public function test_rest_api_creates_and_lists_leads(): void
    {
        $integrations = LeadIntegration::ensureDefaultsForCompany($this->company->id);
        $api = $integrations['api'];

        $testEmail = 'api_' . rand(1000, 9999) . '@example.com';

        // 1. Create Lead via API
        $response = $this->postJson('/api/v1/leads', [
            'name' => 'API Prospect',
            'email' => $testEmail,
            'phone' => '+1 800-555-0123',
            'company' => 'API Solutions Ltd',
            'value' => 12000,
        ], [
            'Authorization' => "Bearer {$api->api_key}",
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'action' => 'created',
            ]);

        // 2. List Leads via API
        $listResponse = $this->getJson('/api/v1/leads?search=API+Prospect', [
            'Authorization' => "Bearer {$api->api_key}",
        ]);

        $listResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertNotEmpty($listResponse->json('data'));
    }
}
