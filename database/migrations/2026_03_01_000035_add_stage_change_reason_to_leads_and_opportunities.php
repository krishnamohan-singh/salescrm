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
        if (Schema::hasTable('leads') && !Schema::hasColumn('leads', 'stage_change_reason')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->text('stage_change_reason')->nullable()->after('lead_status_id');
            });
        }

        if (Schema::hasTable('opportunities') && !Schema::hasColumn('opportunities', 'stage_change_reason')) {
            Schema::table('opportunities', function (Blueprint $table) {
                $table->text('stage_change_reason')->nullable()->after('opportunity_stage_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'stage_change_reason')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropColumn('stage_change_reason');
            });
        }

        if (Schema::hasTable('opportunities') && Schema::hasColumn('opportunities', 'stage_change_reason')) {
            Schema::table('opportunities', function (Blueprint $table) {
                $table->dropColumn('stage_change_reason');
            });
        }
    }
};
