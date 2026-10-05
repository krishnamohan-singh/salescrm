<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\User;
use App\Models\UserTimeLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserActivityController extends Controller
{
    /**
     * Periodic heartbeat from frontend to record active and idle time.
     * Active time is ONLY tracked and accumulated when user is officially checked in!
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $today = now()->toDateString();
        $creatorId = method_exists($user, 'creatorId') ? $user->creatorId() : ($user->created_by ?? $user->id);

        $att = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        $isCheckedIn = $att && $att->clock_in && !$att->clock_out;
        $isOnBreak = (bool)($att?->is_on_break);

        // If user is NOT checked in or is on break, DO NOT accumulate active working seconds!
        if (!$isCheckedIn || $isOnBreak) {
            $user->forceFill([
                'last_activity_at' => now(),
                'current_status' => $isOnBreak ? 'idle' : 'offline',
            ])->save();

            $log = UserTimeLog::where('user_id', $user->id)->where('date', $today)->first();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'today_total_seconds' => $log ? (int)$log->total_seconds : 0,
                    'today_active_seconds' => $log ? (int)$log->active_seconds : 0,
                    'today_idle_seconds' => $log ? (int)$log->idle_seconds : 0,
                    'formatted_total_time' => $log ? $log->formatted_total_time : '00m 00s',
                    'formatted_active_time' => $log ? $log->formatted_active_time : '00m 00s',
                    'formatted_idle_time' => $log ? $log->formatted_idle_time : '00m 00s',
                    'active_percentage' => $log ? (int)$log->active_percentage : 0,
                    'current_status' => $isOnBreak ? 'idle' : 'offline',
                    'first_login_at' => $att?->clock_in ? $att->clock_in->format('h:i A') : ($log?->first_login_at ? $log->first_login_at->format('h:i A') : null),
                    'is_checked_in' => false,
                ]
            ]);
        }

        // When user IS checked in and NOT on break:
        $log = UserTimeLog::firstOrCreate(
            [
                'user_id' => $user->id,
                'date' => $today,
            ],
            [
                'created_by' => $creatorId,
                'first_login_at' => $att->clock_in ?: now(),
                'status' => 'active',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]
        );

        $activeDelta = max(0, min(300, (int) $request->input('active_delta', 0)));
        $idleDelta = max(0, min(300, (int) $request->input('idle_delta', 0)));
        $isActive = filter_var($request->input('is_active', true), FILTER_VALIDATE_BOOLEAN);
        $currentUrl = (string) $request->input('current_url', '');

        $log->active_seconds += $activeDelta;
        $log->idle_seconds += $idleDelta;
        $log->total_seconds = $log->active_seconds + $log->idle_seconds;
        $log->status = $isActive ? 'active' : 'idle';
        $log->last_activity_at = now();
        
        if (!empty($currentUrl)) {
            $log->last_active_url = substr($currentUrl, 0, 255);
        }
        $log->save();

        // Sync with Attendance record
        if ($att) {
            $att->active_seconds = $log->active_seconds;
            $att->idle_seconds = $log->idle_seconds;
            $att->total_seconds = $log->total_seconds;
            $att->active_hours = round($log->active_seconds / 3600, 2);
            $att->idle_hours = round($log->idle_seconds / 3600, 2);
            $att->total_hours = round($log->total_seconds / 3600, 2);
            $att->save();
        }

        // Update user state
        $user->forceFill([
            'last_activity_at' => now(),
            'current_status' => $isActive ? 'active' : 'idle',
            'current_page' => !empty($currentUrl) ? substr($currentUrl, 0, 255) : $user->current_page,
        ])->save();

        return response()->json([
            'status' => 'success',
            'data' => [
                'today_total_seconds' => $log->total_seconds,
                'today_active_seconds' => $log->active_seconds,
                'today_idle_seconds' => $log->idle_seconds,
                'formatted_total_time' => $log->formatted_total_time,
                'formatted_active_time' => $log->formatted_active_time,
                'formatted_idle_time' => $log->formatted_idle_time,
                'active_percentage' => $log->active_percentage,
                'current_status' => $log->status,
                'first_login_at' => $log->first_login_at ? $log->first_login_at->format('h:i A') : null,
                'is_checked_in' => true,
            ]
        ]);
    }

    /**
     * Get initial/today's summary for active session timer initialization.
     */
    public function getTodaySummary(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $today = now()->toDateString();
        $att = Attendance::where('user_id', $user->id)->where('date', $today)->first();
        $isCheckedIn = $att && $att->clock_in && !$att->clock_out;
        $isOnBreak = (bool)($att?->is_on_break);

        $log = UserTimeLog::where('user_id', $user->id)->where('date', $today)->first();

        if (!$log || !$isCheckedIn) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'today_total_seconds' => $log ? (int)$log->total_seconds : 0,
                    'today_active_seconds' => $log ? (int)$log->active_seconds : 0,
                    'today_idle_seconds' => $log ? (int)$log->idle_seconds : 0,
                    'formatted_total_time' => $log ? $log->formatted_total_time : '00m 00s',
                    'formatted_active_time' => $log ? $log->formatted_active_time : '00m 00s',
                    'formatted_idle_time' => $log ? $log->formatted_idle_time : '00m 00s',
                    'active_percentage' => $log ? (int)$log->active_percentage : 0,
                    'current_status' => $isOnBreak ? 'idle' : ($isCheckedIn ? 'active' : 'offline'),
                    'first_login_at' => $att?->clock_in ? $att->clock_in->format('h:i A') : ($log?->first_login_at ? $log->first_login_at->format('h:i A') : null),
                    'is_checked_in' => (bool)$isCheckedIn,
                ]
            ]);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'today_total_seconds' => $log->total_seconds,
                'today_active_seconds' => $log->active_seconds,
                'today_idle_seconds' => $log->idle_seconds,
                'formatted_total_time' => $log->formatted_total_time,
                'formatted_active_time' => $log->formatted_active_time,
                'formatted_idle_time' => $log->formatted_idle_time,
                'active_percentage' => $log->active_percentage,
                'current_status' => $isOnBreak ? 'idle' : $log->status,
                'first_login_at' => $log->first_login_at ? $log->first_login_at->format('h:i A') : null,
                'is_checked_in' => (bool)$isCheckedIn,
            ]
        ]);
    }
}
