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
        // 1. Task Statuses Table
        if (!Schema::hasTable('task_statuses')) {
            Schema::create('task_statuses', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('color', 20)->default('#6366f1');
                $table->text('description')->nullable();
                $table->string('status', 20)->default('active'); // active, inactive
                $table->boolean('is_default')->default(false);
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->index(['created_by', 'status']);
            });
        }

        // 2. Task Types Table
        if (!Schema::hasTable('task_types')) {
            Schema::create('task_types', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('icon', 50)->nullable()->default('CheckSquare');
                $table->string('color', 20)->default('#3b82f6');
                $table->text('description')->nullable();
                $table->string('status', 20)->default('active'); // active, inactive
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->index(['created_by', 'status']);
            });
        }

        // 3. Task Priorities Table
        if (!Schema::hasTable('task_priorities')) {
            Schema::create('task_priorities', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('color', 20)->default('#f59e0b');
                $table->integer('level')->default(1); // 1 = low, 2 = medium, 3 = high, 4 = urgent
                $table->text('description')->nullable();
                $table->string('status', 20)->default('active'); // active, inactive
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->index(['created_by', 'status']);
            });
        }

        // 4. Universal Tasks Table
        if (!Schema::hasTable('tasks')) {
            Schema::create('tasks', function (Blueprint $table) {
                $table->id();
                $table->string('title');
                $table->text('description')->nullable();

                // Polymorphic parent link
                $table->string('parent_type', 50)->nullable()->default('lead'); // lead, account, contact, opportunity, none
                $table->unsignedBigInteger('parent_id')->nullable();

                // Explicit foreign keys for high performance querying
                $table->foreignId('lead_id')->nullable()->constrained('leads')->onDelete('cascade');
                $table->foreignId('account_id')->nullable()->constrained('accounts')->onDelete('cascade');
                $table->foreignId('contact_id')->nullable()->constrained('contacts')->onDelete('cascade');
                $table->foreignId('opportunity_id')->nullable()->constrained('opportunities')->onDelete('cascade');

                // Dynamic master links
                $table->foreignId('task_status_id')->nullable()->constrained('task_statuses')->onDelete('set null');
                $table->foreignId('task_type_id')->nullable()->constrained('task_types')->onDelete('set null');
                $table->foreignId('task_priority_id')->nullable()->constrained('task_priorities')->onDelete('set null');

                // String fallbacks for standard types/statuses/priorities
                $table->string('status', 50)->default('pending'); // pending, in_progress, completed, cancelled
                $table->string('type', 50)->default('followup'); // followup, call, meeting, email, demo, task
                $table->string('priority', 50)->default('medium'); // low, medium, high, urgent

                // User scoping & scheduling
                $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');

                $table->date('due_date');
                $table->time('due_time')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index(['created_by', 'status', 'due_date']);
                $table->index(['assigned_to', 'status', 'due_date']);
                $table->index(['parent_type', 'parent_id']);
                $table->index(['lead_id']);
                $table->index(['account_id']);
                $table->index(['contact_id']);
                $table->index(['opportunity_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('task_priorities');
        Schema::dropIfExists('task_types');
        Schema::dropIfExists('task_statuses');
    }
};
