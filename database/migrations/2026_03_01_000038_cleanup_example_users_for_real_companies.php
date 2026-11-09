<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Clean up dummy/example users that were automatically generated for real companies.
     */
    public function up(): void
    {
        // Delete any dummy example staff users associated with real non-demo companies
        // Real companies are not company@example.com (e.g., id != 2)
        User::where(function ($q) {
            $q->where('email', 'like', '%@example.com%')
              ->orWhere('email', 'like', '%@example.org%')
              ->orWhere('email', 'like', '%@example.net%')
              ->orWhere('email', 'like', '%@test.com%');
        })
        ->where('created_by', '!=', 2)
        ->where('id', '>', 10)
        ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse operation needed
    }
};
