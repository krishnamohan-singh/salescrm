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
        // 1. Extend sales_targets with source tracking, revision history, and daily minimums
        Schema::table('sales_targets', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_targets', 'source_type')) {
                $table->string('source_type', 50)->default('manager_assigned')->after('business_type'); // manager_assigned, derived, individual
            }
            if (!Schema::hasColumn('sales_targets', 'assigned_by')) {
                $table->unsignedBigInteger('assigned_by')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('sales_targets', 'target_history_json')) {
                $table->json('target_history_json')->nullable()->after('manager_feedback');
            }
            if (!Schema::hasColumn('sales_targets', 'daily_minimums_json')) {
                $table->json('daily_minimums_json')->nullable()->after('target_history_json');
            }
        });

        // 2. Extend sales_day_plans with gap intelligence, shortage reasons, reachability, and manager overrides
        Schema::table('sales_day_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_day_plans', 'is_below_target')) {
                $table->boolean('is_below_target')->default(false)->after('sales_target_id');
            }
            if (!Schema::hasColumn('sales_day_plans', 'reachability_status')) {
                $table->string('reachability_status', 30)->default('on_track')->after('is_below_target'); // on_track, at_risk, behind
            }
            if (!Schema::hasColumn('sales_day_plans', 'target_gap_json')) {
                $table->json('target_gap_json')->nullable()->after('reachability_status');
            }
            if (!Schema::hasColumn('sales_day_plans', 'shortage_reason')) {
                $table->text('shortage_reason')->nullable()->after('target_gap_json');
            }
            if (!Schema::hasColumn('sales_day_plans', 'manager_approved')) {
                $table->boolean('manager_approved')->default(false)->after('shortage_reason');
            }
            if (!Schema::hasColumn('sales_day_plans', 'manager_approval_reason')) {
                $table->text('manager_approval_reason')->nullable()->after('manager_approved');
            }
            if (!Schema::hasColumn('sales_day_plans', 'revision_requested')) {
                $table->boolean('revision_requested')->default(false)->after('manager_approval_reason');
            }
            if (!Schema::hasColumn('sales_day_plans', 'revision_comments')) {
                $table->text('revision_comments')->nullable()->after('revision_requested');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_targets', function (Blueprint $table) {
            $columns = ['source_type', 'assigned_by', 'target_history_json', 'daily_minimums_json'];
            foreach ($columns as $col) {
                if (Schema::hasColumn('sales_targets', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('sales_day_plans', function (Blueprint $table) {
            $columns = [
                'is_below_target', 'reachability_status', 'target_gap_json', 
                'shortage_reason', 'manager_approved', 'manager_approval_reason',
                'revision_requested', 'revision_comments'
            ];
            foreach ($columns as $col) {
                if (Schema::hasColumn('sales_day_plans', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
