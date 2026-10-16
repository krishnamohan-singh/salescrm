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
        if (Schema::hasTable('leads') && !Schema::hasColumn('leads', 'services')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->json('services')->nullable()->after('website');
            });
        }

        if (Schema::hasTable('accounts') && !Schema::hasColumn('accounts', 'services')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->json('services')->nullable()->after('website');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'services')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropColumn('services');
            });
        }

        if (Schema::hasTable('accounts') && Schema::hasColumn('accounts', 'services')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->dropColumn('services');
            });
        }
    }
};
