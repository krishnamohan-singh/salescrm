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
        if (!Schema::hasTable('crm_emails')) {
            Schema::create('crm_emails', function (Blueprint $table) {
                $table->id();
                $table->foreignId('created_by')->comment('Tenant/Company ID');
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
                $table->string('message_id')->index();
                $table->string('thread_id')->nullable()->index();
                $table->enum('direction', ['inbound', 'outbound'])->default('inbound');
                $table->string('from_email');
                $table->string('from_name')->nullable();
                $table->json('to_emails')->nullable();
                $table->json('cc_emails')->nullable();
                $table->json('bcc_emails')->nullable();
                $table->string('subject')->nullable();
                $table->text('snippet')->nullable();
                $table->longText('body_text')->nullable();
                $table->longText('body_html')->nullable();
                $table->timestamp('sent_at')->nullable()->index();
                $table->foreignId('lead_id')->nullable()->constrained('leads')->onDelete('cascade');
                $table->foreignId('contact_id')->nullable()->constrained('contacts')->onDelete('cascade');
                $table->foreignId('account_id')->nullable()->constrained('accounts')->onDelete('cascade');
                $table->foreignId('opportunity_id')->nullable()->constrained('opportunities')->onDelete('cascade');
                $table->boolean('has_attachments')->default(false);
                $table->json('attachment_names')->nullable();
                $table->json('raw_headers')->nullable();
                $table->string('source')->default('gmail'); // gmail, smtp, manual, webhook
                $table->timestamps();

                $table->index(['created_by', 'sent_at']);
                $table->index(['created_by', 'message_id']);
                $table->index(['lead_id', 'created_at']);
                $table->index(['contact_id', 'created_at']);
                $table->index(['account_id', 'created_at']);
                $table->index(['opportunity_id', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crm_emails');
    }
};
