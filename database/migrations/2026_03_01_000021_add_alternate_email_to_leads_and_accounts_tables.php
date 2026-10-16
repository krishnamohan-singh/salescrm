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
        if (Schema::hasTable('leads') && !Schema::hasColumn('leads', 'alternate_email')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->string('alternate_email')->nullable()->after('email');
            });
        }

        if (Schema::hasTable('accounts') && !Schema::hasColumn('accounts', 'alternate_email')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->string('alternate_email')->nullable()->after('email');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'alternate_email')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropColumn('alternate_email');
            });
        }

        if (Schema::hasTable('accounts') && Schema::hasColumn('accounts', 'alternate_email')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->dropColumn('alternate_email');
            });
        }
    }
};
