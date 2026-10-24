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
        if (!Schema::hasTable('services')) {
            Schema::create('services', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->nullable();
                $table->foreignId('category_id')->nullable()->constrained('categories')->onDelete('set null');
                $table->foreignId('tax_id')->nullable()->constrained('taxes')->onDelete('set null');
                $table->decimal('price', 15, 2)->default(0.00);
                $table->string('billing_cycle')->default('one_time'); // one_time, hourly, daily, monthly, quarterly, yearly
                $table->text('description')->nullable();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
                $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('lead_services')) {
            Schema::create('lead_services', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
                $table->foreignId('service_id')->constrained('services')->onDelete('cascade');
                $table->decimal('price', 15, 2)->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['lead_id', 'service_id']);
            });
        }

        if (!Schema::hasTable('account_services')) {
            Schema::create('account_services', function (Blueprint $table) {
                $table->id();
                $table->foreignId('account_id')->constrained('accounts')->onDelete('cascade');
                $table->foreignId('service_id')->constrained('services')->onDelete('cascade');
                $table->decimal('price', 15, 2)->nullable();
                $table->string('status')->default('active'); // active, pending, suspended, cancelled, completed
                $table->date('start_date')->nullable();
                $table->date('end_date')->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['account_id', 'service_id']);
            });
        }

        if (!Schema::hasTable('opportunity_services')) {
            Schema::create('opportunity_services', function (Blueprint $table) {
                $table->id();
                $table->foreignId('opportunity_id')->constrained('opportunities')->onDelete('cascade');
                $table->foreignId('service_id')->constrained('services')->onDelete('cascade');
                $table->integer('quantity')->default(1);
                $table->decimal('unit_price', 15, 2)->default(0.00);
                $table->decimal('total_price', 15, 2)->default(0.00);
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['opportunity_id', 'service_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opportunity_services');
        Schema::dropIfExists('account_services');
        Schema::dropIfExists('lead_services');
        Schema::dropIfExists('services');
    }
};
