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
        if (Schema::hasTable('leads') && !Schema::hasColumn('leads', 'last_contacted_date')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dateTime('last_contacted_date')->nullable()->after('campaign_id')->index();
            });
        }

        if (Schema::hasTable('accounts') && !Schema::hasColumn('accounts', 'last_contacted_date')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->dateTime('last_contacted_date')->nullable()->after('assigned_to')->index();
            });
        }

        if (Schema::hasTable('opportunities') && !Schema::hasColumn('opportunities', 'last_contacted_date')) {
            Schema::table('opportunities', function (Blueprint $table) {
                $table->dateTime('last_contacted_date')->nullable()->after('assigned_to')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'last_contacted_date')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropIndex(['last_contacted_date']);
                $table->dropColumn('last_contacted_date');
            });
        }

        if (Schema::hasTable('accounts') && Schema::hasColumn('accounts', 'last_contacted_date')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->dropIndex(['last_contacted_date']);
                $table->dropColumn('last_contacted_date');
            });
        }

        if (Schema::hasTable('opportunities') && Schema::hasColumn('opportunities', 'last_contacted_date')) {
            Schema::table('opportunities', function (Blueprint $table) {
                $table->dropIndex(['last_contacted_date']);
                $table->dropColumn('last_contacted_date');
            });
        }
    }
};
