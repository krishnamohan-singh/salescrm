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
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (Schema::hasColumn('products', 'sku')) {
                    $table->string('sku')->nullable()->change();
                }
                if (Schema::hasColumn('products', 'price')) {
                    $table->decimal('price', 10, 2)->nullable()->default(0)->change();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (Schema::hasColumn('products', 'sku')) {
                    $table->string('sku')->nullable(false)->change();
                }
                if (Schema::hasColumn('products', 'price')) {
                    $table->decimal('price', 10, 2)->nullable(false)->change();
                }
            });
        }
    }
};
