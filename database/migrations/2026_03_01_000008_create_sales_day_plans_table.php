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
        Schema::create('sales_day_plans', function (Blueprint $table) {
            $table->id();
            $table->date('plan_date');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('created_by');
            $table->string('title')->nullable();
            
            // Targets & Morning Plans
            $table->integer('target_calls')->default(0);
            $table->integer('target_meetings')->default(0);
            $table->integer('target_leads')->default(0);
            $table->decimal('target_sales_amount', 15, 2)->default(0.00);
            $table->text('planned_activities')->nullable();
            $table->text('planned_accounts')->nullable();

            // Actual Achievements & End of Day (EOD) Report
            $table->integer('actual_calls')->default(0);
            $table->integer('actual_meetings')->default(0);
            $table->integer('actual_leads')->default(0);
            $table->decimal('actual_sales_amount', 15, 2)->default(0.00);
            $table->text('achievements_summary')->nullable();
            $table->text('challenges_notes')->nullable();
            $table->text('next_day_plan')->nullable();

            // Status & Workflow
            $table->string('status', 30)->default('draft'); // draft, submitted, in_progress, completed, reviewed
            $table->timestamp('report_sent_at')->nullable();
            $table->string('report_sent_to')->nullable();
            $table->text('manager_feedback')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');

            $table->index(['created_by', 'plan_date']);
            $table->index(['user_id', 'plan_date']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_day_plans');
    }
};
