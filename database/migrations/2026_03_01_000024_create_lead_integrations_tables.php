<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('lead_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->string('type', 50); // 'facebook', 'google_ads', 'webhook', 'api'
            $table->string('name', 255);
            $table->boolean('is_active')->default(true);
            $table->string('webhook_token', 64)->unique();
            $table->string('api_key', 64)->nullable()->unique();
            $table->string('secret_key', 255)->nullable();
            $table->foreignId('default_lead_status_id')->nullable()->constrained('lead_statuses')->onDelete('set null');
            $table->foreignId('default_lead_source_id')->nullable()->constrained('lead_sources')->onDelete('set null');
            $table->foreignId('default_account_industry_id')->nullable()->constrained('account_industries')->onDelete('set null');
            $table->foreignId('default_assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->json('configuration')->nullable();
            $table->unsignedInteger('total_received')->default(0);
            $table->unsignedInteger('successful_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->timestamp('last_received_at')->nullable();
            $table->timestamps();

            $table->index(['created_by', 'type']);
        });

        Schema::create('lead_integration_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('lead_integration_id')->nullable()->constrained('lead_integrations')->onDelete('cascade');
            $table->string('integration_type', 50);
            $table->string('status', 20)->default('success'); // 'success', 'failed', 'ignored'
            $table->string('ip_address', 45)->nullable();
            $table->json('payload')->nullable();
            $table->text('response_message')->nullable();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->onDelete('set null');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['created_by', 'integration_type']);
            $table->index('created_at');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('lead_integration_id')->nullable()->after('campaign_id')->constrained('lead_integrations')->onDelete('set null');
            $table->string('integration_source', 50)->nullable()->after('lead_integration_id');
            $table->string('external_lead_id', 255)->nullable()->after('integration_source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['lead_integration_id']);
            $table->dropColumn(['lead_integration_id', 'integration_source', 'external_lead_id']);
        });

        Schema::dropIfExists('lead_integration_logs');
        Schema::dropIfExists('lead_integrations');
    }
};
