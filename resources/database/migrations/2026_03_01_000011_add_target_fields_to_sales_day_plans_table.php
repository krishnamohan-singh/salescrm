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
        Schema::table('sales_day_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_day_plans', 'sales_target_id')) {
                $table->unsignedBigInteger('sales_target_id')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('sales_day_plans', 'target_demos')) {
                $table->integer('target_demos')->default(0)->after('target_meetings');
                $table->integer('actual_demos')->default(0)->after('actual_meetings');
            }
            if (!Schema::hasColumn('sales_day_plans', 'target_outreach')) {
                $table->integer('target_outreach')->default(0)->after('target_calls');
                $table->integer('actual_outreach')->default(0)->after('actual_calls');
            }
            if (!Schema::hasColumn('sales_day_plans', 'target_emails')) {
                $table->integer('target_emails')->default(0)->after('target_outreach');
                $table->integer('actual_emails')->default(0)->after('actual_outreach');
            }
            if (!Schema::hasColumn('sales_day_plans', 'target_followups')) {
                $table->integer('target_followups')->default(0)->after('target_leads');
                $table->integer('actual_followups')->default(0)->after('actual_leads');
            }
            if (!Schema::hasColumn('sales_day_plans', 'target_proposals')) {
                $table->integer('target_proposals')->default(0)->after('target_followups');
                $table->integer('actual_proposals')->default(0)->after('actual_followups');
            }
            if (!Schema::hasColumn('sales_day_plans', 'new_pipeline_created')) {
                $table->decimal('new_pipeline_created', 15, 2)->default(0.00)->after('actual_sales_amount');
            }
            if (!Schema::hasColumn('sales_day_plans', 'proposal_value')) {
                $table->decimal('proposal_value', 15, 2)->default(0.00)->after('new_pipeline_created');
            }
            if (!Schema::hasColumn('sales_day_plans', 'priority_accounts_json')) {
                $table->json('priority_accounts_json')->nullable()->after('planned_accounts');
            }
            if (!Schema::hasColumn('sales_day_plans', 'key_wins')) {
                $table->text('key_wins')->nullable()->after('achievements_summary');
            }
            if (!Schema::hasColumn('sales_day_plans', 'client_feedback')) {
                $table->text('client_feedback')->nullable()->after('challenges_notes');
            }
            if (!Schema::hasColumn('sales_day_plans', 'support_needed')) {
                $table->text('support_needed')->nullable()->after('client_feedback');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_day_plans', function (Blueprint $table) {
            $columns = [
                'sales_target_id', 'target_demos', 'actual_demos',
                'target_outreach', 'actual_outreach', 'target_emails', 'actual_emails',
                'target_followups', 'actual_followups', 'target_proposals', 'actual_proposals',
                'new_pipeline_created', 'proposal_value', 'priority_accounts_json',
                'key_wins', 'client_feedback', 'support_needed'
            ];
            foreach ($columns as $col) {
                if (Schema::hasColumn('sales_day_plans', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
