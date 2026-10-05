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
        Schema::create('user_time_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('created_by')->default(0)->index();
            $table->date('date')->index();
            $table->timestamp('first_login_at')->nullable();
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamp('logout_at')->nullable();
            
            // Counters stored in seconds
            $table->unsignedInteger('total_seconds')->default(0);
            $table->unsignedInteger('active_seconds')->default(0);
            $table->unsignedInteger('idle_seconds')->default(0);
            
            $table->string('status', 20)->default('active'); // active, idle, offline
            $table->string('last_active_url')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'date']);
        });

        // Add real-time presence columns to users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'last_activity_at')) {
                $table->timestamp('last_activity_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('users', 'current_status')) {
                $table->string('current_status', 20)->default('offline')->after('status');
            }
            if (!Schema::hasColumn('users', 'current_page')) {
                $table->string('current_page')->nullable()->after('current_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_time_logs');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'last_activity_at')) {
                $table->dropColumn('last_activity_at');
            }
            if (Schema::hasColumn('users', 'current_status')) {
                $table->dropColumn('current_status');
            }
            if (Schema::hasColumn('users', 'current_page')) {
                $table->dropColumn('current_page');
            }
        });
    }
};
