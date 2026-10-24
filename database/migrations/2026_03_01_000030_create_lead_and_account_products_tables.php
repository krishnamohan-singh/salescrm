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
        if (!Schema::hasTable('lead_products')) {
            Schema::create('lead_products', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lead_id')->constrained('leads')->onDelete('cascade');
                $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
                $table->integer('quantity')->default(1);
                $table->decimal('unit_price', 15, 2)->nullable();
                $table->decimal('total_price', 15, 2)->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['lead_id', 'product_id']);
            });
        }

        if (!Schema::hasTable('account_products')) {
            Schema::create('account_products', function (Blueprint $table) {
                $table->id();
                $table->foreignId('account_id')->constrained('accounts')->onDelete('cascade');
                $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
                $table->integer('quantity')->default(1);
                $table->decimal('unit_price', 15, 2)->nullable();
                $table->decimal('total_price', 15, 2)->nullable();
                $table->string('status', 50)->default('active'); // active, delivered, pending, cancelled
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('cascade');
                $table->timestamps();

                $table->unique(['account_id', 'product_id']);
            });
        }

        if (Schema::hasTable('opportunity_products') && !Schema::hasColumn('opportunity_products', 'notes')) {
            Schema::table('opportunity_products', function (Blueprint $table) {
                $table->text('notes')->nullable()->after('total_price');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('opportunity_products') && Schema::hasColumn('opportunity_products', 'notes')) {
            Schema::table('opportunity_products', function (Blueprint $table) {
                $table->dropColumn('notes');
            });
        }
        Schema::dropIfExists('account_products');
        Schema::dropIfExists('lead_products');
    }
};
