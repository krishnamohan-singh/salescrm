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
        Schema::table('sales_targets', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_targets', 'weekly_breakdown_json')) {
                $table->json('weekly_breakdown_json')->nullable()->after('daily_minimums_json');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_targets', function (Blueprint $table) {
            if (Schema::hasColumn('sales_targets', 'weekly_breakdown_json')) {
                $table->dropColumn('weekly_breakdown_json');
            }
        });
    }
};
