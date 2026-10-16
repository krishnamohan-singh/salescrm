<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->foreignId('creator_id')
                ->nullable()
                ->after('created_by')
                ->constrained('users')
                ->onDelete('set null');
        });

        // Backfill creator_id from lead_activities where available
        try {
            $activities = DB::table('lead_activities')
                ->where('activity_type', 'created')
                ->whereNotNull('user_id')
                ->get(['lead_id', 'user_id']);

            foreach ($activities as $activity) {
                DB::table('leads')
                    ->where('id', $activity->lead_id)
                    ->update(['creator_id' => $activity->user_id]);
            }

            // Fallback remaining to created_by
            DB::table('leads')
                ->whereNull('creator_id')
                ->update(['creator_id' => DB::raw('created_by')]);
        } catch (\Throwable $e) {
            \Log::warning('Could not backfill creator_id for leads: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['creator_id']);
            $table->dropColumn('creator_id');
        });
    }
};
