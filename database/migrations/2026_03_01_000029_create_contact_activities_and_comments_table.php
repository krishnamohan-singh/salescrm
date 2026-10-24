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
        if (!Schema::hasTable('contact_activities')) {
            Schema::create('contact_activities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contact_id')->constrained('contacts')->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
                $table->string('activity_type'); // created, updated, assigned, comment, call, meeting, etc.
                $table->string('title');
                $table->text('description')->nullable();
                $table->json('old_values')->nullable();
                $table->json('new_values')->nullable();
                $table->string('field_changed')->nullable();
                $table->foreignId('created_by')->nullable();
                $table->timestamps();

                $table->index(['contact_id', 'created_at']);
            });
        }

        if (!Schema::hasTable('contact_comments')) {
            Schema::create('contact_comments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('contact_id')->constrained('contacts')->onDelete('cascade');
                $table->text('comment');
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contact_comments');
        Schema::dropIfExists('contact_activities');
    }
};
