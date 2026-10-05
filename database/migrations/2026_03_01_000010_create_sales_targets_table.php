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
        Schema::create('sales_targets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('created_by');
            $table->unsignedBigInteger('user_id')->nullable(); // Specific salesperson or null for company/team
            $table->unsignedBigInteger('parent_id')->nullable(); // Parent target (Annual -> Quarter -> Month -> Week)

            $table->string('title');
            $table->string('period_type', 30)->default('monthly'); // annual, quarterly, monthly, weekly, daily
            $table->string('financial_year', 20)->default('2026-27');
            $table->string('quarter', 10)->nullable(); // Q1, Q2, Q3, Q4
            $table->unsignedTinyInteger('month')->nullable(); // 1-12
            $table->unsignedTinyInteger('week_number')->nullable(); // 1-53
            $table->date('start_date');
            $table->date('end_date');
            $table->string('business_type', 50)->default('all'); // all, services, solutions, saas, custom

            // Outcome / Revenue Targets (Lagging Indicators)
            $table->decimal('target_revenue', 15, 2)->default(0.00);
            $table->decimal('actual_revenue', 15, 2)->default(0.00);
            $table->decimal('target_new_business_revenue', 15, 2)->default(0.00);
            $table->decimal('actual_new_business_revenue', 15, 2)->default(0.00);
            $table->decimal('target_upsell_revenue', 15, 2)->default(0.00);
            $table->decimal('actual_upsell_revenue', 15, 2)->default(0.00);
            $table->decimal('target_renewal_revenue', 15, 2)->default(0.00);
            $table->decimal('actual_renewal_revenue', 15, 2)->default(0.00);
            $table->decimal('target_mrr', 15, 2)->default(0.00);
            $table->decimal('actual_mrr', 15, 2)->default(0.00);
            $table->decimal('target_arr', 15, 2)->default(0.00);
            $table->decimal('actual_arr', 15, 2)->default(0.00);
            $table->unsignedInteger('target_new_accounts')->default(0);
            $table->unsignedInteger('actual_new_accounts')->default(0);

            // Sales Activity Targets (Leading Indicators)
            $table->unsignedInteger('target_outreach')->default(0); // Accounts/Contacts outreach
            $table->unsignedInteger('actual_outreach')->default(0);
            $table->unsignedInteger('target_cold_calls')->default(0);
            $table->unsignedInteger('actual_cold_calls')->default(0);
            $table->unsignedInteger('target_cold_emails')->default(0);
            $table->unsignedInteger('actual_cold_emails')->default(0);
            $table->unsignedInteger('target_linkedin_outreach')->default(0);
            $table->unsignedInteger('actual_linkedin_outreach')->default(0);
            $table->unsignedInteger('target_meetings')->default(0); // Discovery / Discovery meetings
            $table->unsignedInteger('actual_meetings')->default(0);
            $table->unsignedInteger('target_demos')->default(0); // Demo / Solution presentations
            $table->unsignedInteger('actual_demos')->default(0);
            $table->unsignedInteger('target_proposals')->default(0);
            $table->unsignedInteger('actual_proposals')->default(0);
            $table->unsignedInteger('target_followups')->default(0);
            $table->unsignedInteger('actual_followups')->default(0);
            $table->unsignedInteger('target_opportunities')->default(0);
            $table->unsignedInteger('actual_opportunities')->default(0);

            // Funnel, Forecast & Health
            $table->decimal('pipeline_amount', 15, 2)->default(0.00);
            $table->decimal('forecast_revenue', 15, 2)->default(0.00);
            $table->string('health_status', 30)->default('on_track'); // on_track, at_risk, critical
            $table->string('status', 30)->default('active'); // draft, active, achieved, behind, closed
            $table->text('notes')->nullable();
            $table->text('manager_feedback')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('parent_id')->references('id')->on('sales_targets')->onDelete('cascade');

            $table->index(['created_by', 'period_type', 'financial_year']);
            $table->index(['user_id', 'start_date', 'end_date']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_targets');
    }
};
