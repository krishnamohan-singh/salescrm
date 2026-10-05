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
        if (Schema::hasTable('task_statuses')) {
            Schema::table('task_statuses', function (Blueprint $table) {
                if (!Schema::hasColumn('task_statuses', 'is_default')) {
                    $table->boolean('is_default')->default(false)->after('status');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('task_statuses')) {
            Schema::table('task_statuses', function (Blueprint $table) {
                if (Schema::hasColumn('task_statuses', 'is_default')) {
                    $table->dropColumn('is_default');
                }
            });
        }
    }
};
