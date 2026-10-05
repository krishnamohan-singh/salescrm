<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Call;
use App\Models\Lead;
use App\Models\Meeting;
use App\Models\Opportunity;
use App\Models\Task;
use App\Models\User;
use App\Models\UserTimeLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserPerformanceController extends Controller
{
    public function index(Request $request): Response
    {
        $currentUser = Auth::user();
        $creatorId = method_exists($currentUser, 'creatorId') ? $currentUser->creatorId() : ($currentUser->created_by ?? $currentUser->id);
        $isAdmin = in_array($currentUser->type, ['company', 'admin', 'superadmin', 'super admin']) || $currentUser->can('manage-users') || $currentUser->can('manage-user-performance');
        $canView = $isAdmin || $currentUser->can('view-user-performance');

        if (!$canView) {
            abort(403, __('You do not have permission to view User Performance.'));
        }

        // Team members list
        $teamUsersQuery = User::query();
        if ($currentUser->type === 'superadmin' || $currentUser->type === 'super admin') {
            $teamUsersQuery->whereNotIn('type', ['superadmin', 'super admin']);
        } elseif ($isAdmin) {
            $teamUsersQuery->where(function ($q) use ($creatorId) {
                $q->where('created_by', $creatorId)
                  ->orWhere('id', $creatorId);
            });
        } else {
            // Staff with only view-user-performance sees themselves
            $teamUsersQuery->where('id', $currentUser->id);
        }

        $teamUsers = $teamUsersQuery
            ->select('id', 'name', 'email', 'avatar', 'type', 'last_activity_at', 'current_status', 'current_page')
            ->orderBy('name')
            ->get()
            ->map(function ($u) {
                $u->avatar = $u->avatar ? (function_exists('check_file') && check_file($u->avatar) ? get_file($u->avatar) : $u->avatar) : null;
                return $u;
            });

        $selectedUserId = $request->input('user_id');
        if (!$isAdmin && $selectedUserId != $currentUser->id) {
            $selectedUserId = $currentUser->id;
        }

        // Parse Date Range
        $period = $request->input('period', 'today');
        $customStart = $request->input('start_date');
        $customEnd = $request->input('end_date');

        [$startDate, $endDate] = $this->resolveDateRange($period, $customStart, $customEnd);

        // Filtered Target User IDs
        $targetUserIds = $selectedUserId ? [(int) $selectedUserId] : $teamUsers->pluck('id')->toArray();

        // 1. Live Staff Presence Grid (calculated for today)
        $todayDate = now()->toDateString();
        $todayLogs = collect();
        try {
            $todayLogs = UserTimeLog::whereIn('user_id', $teamUsers->pluck('id'))
                ->where('date', $todayDate)
                ->get()
                ->keyBy('user_id');
        } catch (\Throwable $e) {
            \Log::warning("UserTimeLog fetch error: " . $e->getMessage());
        }

        $todayAttendances = collect();
        try {
            $todayAttendances = Attendance::whereIn('user_id', $teamUsers->pluck('id'))
                ->where('date', $todayDate)
                ->get()
                ->keyBy('user_id');
        } catch (\Throwable $e) {
            \Log::warning("Attendance fetch error: " . $e->getMessage());
        }

        $liveStaff = $teamUsers->map(function ($u) use ($todayLogs, $todayAttendances) {
            $att = $todayAttendances->get($u->id);
            $isCheckedIn = $att && $att->clock_in && !$att->clock_out;
            $isOnBreak = (bool) ($att?->is_on_break);

            $lastActivity = $u->last_activity_at ? Carbon::parse($u->last_activity_at) : null;
            // 90 seconds threshold for real-time idle detection
            $isRecent = $lastActivity && $lastActivity->diffInSeconds(now()) <= 90;

            // When NOT checked in, status is strictly offline and active time is not accumulating
            $status = 'offline';
            if ($isCheckedIn) {
                if ($isOnBreak) {
                    $status = 'idle';
                } elseif ($isRecent) {
                    $status = ($u->current_status === 'idle') ? 'idle' : 'active';
                } else {
                    $status = 'idle';
                }
            } else {
                $status = 'offline';
            }

            $log = $todayLogs->get($u->id);
            $totalSecs = $log ? (int) $log->total_seconds : ($att ? (int) $att->total_seconds : 0);
            $activeSecs = $log ? (int) $log->active_seconds : ($att ? (int) $att->active_seconds : 0);
            $idleSecs = $log ? (int) $log->idle_seconds : ($att ? (int) $att->idle_seconds : 0);

            // If checked in right now, ensure active seconds is live
            if ($isCheckedIn && $att?->clock_in && $activeSecs == 0) {
                $totalSecs = (int) max(0, $att->clock_in->diffInSeconds(now()));
                $breakSecs = (int) ($att->break_seconds ?? 0);
                $activeSecs = (int) max(0, $totalSecs - $breakSecs);
                $idleSecs = (int) round($activeSecs * 0.15);
            }

            $activePct = $totalSecs > 0 ? (int) round(($activeSecs / $totalSecs) * 100) : 0;

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar' => $u->avatar,
                'role' => $u->type,
                'status' => $status,
                'current_page' => $isCheckedIn ? ($u->current_page ?: 'Dashboard') : 'Offline',
                'last_activity_human' => $isCheckedIn
                    ? ($isOnBreak ? 'On Break' : ($lastActivity ? $lastActivity->diffForHumans() : 'Active Now'))
                    : ($att && $att->clock_out ? 'Checked Out' : 'Not Checked In'),
                'is_checked_in' => (bool) $isCheckedIn,
                'is_on_break' => (bool) $isOnBreak,
                'clock_in_time' => $att?->formatted_clock_in ?: ($isCheckedIn ? now()->format('h:i A') : null),
                'total_seconds' => $totalSecs,
                'active_seconds' => $activeSecs,
                'idle_seconds' => $idleSecs,
                'formatted_total' => UserTimeLog::formatSeconds($totalSecs),
                'formatted_active' => UserTimeLog::formatSeconds($activeSecs),
                'formatted_idle' => UserTimeLog::formatSeconds($idleSecs),
                'active_percentage' => $activePct,
            ];
        });

        // 2. Aggregate Time Logs within Date Range
        $timeLogsQuery = UserTimeLog::with('user:id,name,email,avatar,type')
            ->whereIn('user_id', $targetUserIds)
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()]);

        $allTimeLogsInRange = collect();
        try {
            $allTimeLogsInRange = (clone $timeLogsQuery)->get();
        } catch (\Throwable $e) {
            \Log::warning("Time logs query failed: " . $e->getMessage());
        }

        $totalActiveSeconds = (int) $allTimeLogsInRange->sum('active_seconds');
        $totalIdleSeconds = (int) $allTimeLogsInRange->sum('idle_seconds');
        $totalWorkSeconds = $totalActiveSeconds + $totalIdleSeconds;
        $activeRatio = $totalWorkSeconds > 0 ? (int) round(($totalActiveSeconds / $totalWorkSeconds) * 100) : 0;

        // 3. CRM Metrics in Date Range
        $totalTasks = 0;
        $completedTasks = 0;
        try {
            $taskQuery = Task::where(function ($q) use ($targetUserIds) {
                $q->whereIn('assigned_to', $targetUserIds)
                  ->orWhereIn('created_by', $targetUserIds);
            })->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()]);
            $totalTasks = (clone $taskQuery)->count();
            $completedTasks = (clone $taskQuery)->where('status', 'Completed')->count();
        } catch (\Throwable $e) {}

        $totalLeads = 0;
        $convertedLeads = 0;
        try {
            $leadQuery = Lead::where(function ($q) use ($targetUserIds) {
                $q->whereIn('assigned_to', $targetUserIds)
                  ->orWhereIn('created_by', $targetUserIds);
            })->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()]);
            $totalLeads = (clone $leadQuery)->count();
            $convertedLeads = (clone $leadQuery)->where('is_converted', 1)->count();
        } catch (\Throwable $e) {}

        $totalOpportunities = 0;
        $wonOpportunities = 0;
        $wonOpportunityRevenue = 0.0;
        try {
            $oppQuery = Opportunity::where(function ($q) use ($targetUserIds) {
                $q->whereIn('assigned_to', $targetUserIds)
                  ->orWhereIn('created_by', $targetUserIds);
            })->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()]);
            $totalOpportunities = (clone $oppQuery)->count();
            $wonOpportunities = (clone $oppQuery)->where(function ($q) {
                $q->where('status', 'Won')->orWhere('status', 'Closed Won');
            })->count();
            $wonOpportunityRevenue = (float) (clone $oppQuery)->where(function ($q) {
                $q->where('status', 'Won')->orWhere('status', 'Closed Won');
            })->sum('amount');
        } catch (\Throwable $e) {}

        $meetingsCount = 0;
        try {
            $meetingsCount = Meeting::where(function ($q) use ($targetUserIds) {
                $q->whereIn('assigned_to', $targetUserIds)
                  ->orWhereIn('created_by', $targetUserIds);
            })->whereBetween('start_date', [$startDate->toDateString(), $endDate->toDateString()])
              ->count();
        } catch (\Throwable $e) {}

        $callsCount = 0;
        try {
            $callsCount = Call::where(function ($q) use ($targetUserIds) {
                $q->whereIn('assigned_to', $targetUserIds)
                  ->orWhereIn('created_by', $targetUserIds);
            })->whereBetween('start_date', [$startDate->toDateString(), $endDate->toDateString()])
              ->count();
        } catch (\Throwable $e) {}

        // 4. Working Hours Trend Chart Data
        $trendData = [];
        $currentDay = $startDate->copy();
        while ($currentDay <= $endDate) {
            $dayStr = $currentDay->toDateString();
            $dayLogs = $allTimeLogsInRange->where('date', $dayStr);

            $dayActiveSec = (int) $dayLogs->sum('active_seconds');
            $dayIdleSec = (int) $dayLogs->sum('idle_seconds');

            $trendData[] = [
                'date' => $dayStr,
                'label' => $currentDay->format('M d'),
                'active_hours' => round($dayActiveSec / 3600, 2),
                'idle_hours' => round($dayIdleSec / 3600, 2),
                'total_hours' => round(($dayActiveSec + $dayIdleSec) / 3600, 2),
                'active_percentage' => ($dayActiveSec + $dayIdleSec) > 0 ? (int) round(($dayActiveSec / ($dayActiveSec + $dayIdleSec)) * 100) : 0,
            ];
            $currentDay->addDay();
        }

        // 5. Team Productivity Leaderboard
        $leaderboard = $teamUsers->map(function ($u) use ($allTimeLogsInRange, $startDate, $endDate) {
            $userLogs = $allTimeLogsInRange->where('user_id', $u->id);
            $uActive = (int) $userLogs->sum('active_seconds');
            $uIdle = (int) $userLogs->sum('idle_seconds');
            $uTotal = $uActive + $uIdle;
            $uRatio = $uTotal > 0 ? (int) round(($uActive / $uTotal) * 100) : 0;

            $uTasksCompleted = 0;
            try {
                $uTasksCompleted = Task::where(function ($q) use ($u) {
                    $q->where('assigned_to', $u->id)->orWhere('created_by', $u->id);
                })->where('status', 'Completed')
                  ->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
                  ->count();
            } catch (\Throwable $e) {}

            $uLeadsConverted = 0;
            try {
                $uLeadsConverted = Lead::where(function ($q) use ($u) {
                    $q->where('assigned_to', $u->id)->orWhere('created_by', $u->id);
                })->where('is_converted', 1)
                  ->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
                  ->count();
            } catch (\Throwable $e) {}

            $uOpportunitiesWon = 0;
            try {
                $uOpportunitiesWon = Opportunity::where(function ($q) use ($u) {
                    $q->where('assigned_to', $u->id)->orWhere('created_by', $u->id);
                })->where(function ($q) {
                    $q->where('status', 'Won')->orWhere('status', 'Closed Won');
                })->whereBetween('created_at', [$startDate->copy()->startOfDay(), $endDate->copy()->endOfDay()])
                  ->count();
            } catch (\Throwable $e) {}

            // Score formula: (active_hours * 10) + (completed_tasks * 15) + (leads_converted * 25) + (opps_won * 30)
            $score = (int) round(($uActive / 3600 * 10) + ($uTasksCompleted * 15) + ($uLeadsConverted * 25) + ($uOpportunitiesWon * 30));

            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar' => $u->avatar,
                'role' => $u->type,
                'active_seconds' => $uActive,
                'idle_seconds' => $uIdle,
                'total_seconds' => $uTotal,
                'formatted_active' => UserTimeLog::formatSeconds($uActive),
                'active_percentage' => $uRatio,
                'completed_tasks' => $uTasksCompleted,
                'converted_leads' => $uLeadsConverted,
                'won_opportunities' => $uOpportunitiesWon,
                'productivity_score' => $score,
            ];
        })->sortByDesc('productivity_score')->values();

        // 6. Paginated Time Logs Table
        try {
            $paginatedLogs = $timeLogsQuery->orderBy('date', 'desc')
                ->orderBy('id', 'desc')
                ->paginate(15)
                ->withQueryString();
        } catch (\Throwable $e) {
            $paginatedLogs = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 15);
        }

        return Inertia::render('user-performance/index', [
            'isAdmin' => $isAdmin,
            'teamUsers' => $teamUsers,
            'selectedUserId' => $selectedUserId,
            'period' => $period,
            'startDate' => $startDate->toDateString(),
            'endDate' => $endDate->toDateString(),
            'liveStaff' => $liveStaff,
            'summary' => [
                'total_seconds' => $totalWorkSeconds,
                'active_seconds' => $totalActiveSeconds,
                'idle_seconds' => $totalIdleSeconds,
                'formatted_total' => UserTimeLog::formatSeconds($totalWorkSeconds),
                'formatted_active' => UserTimeLog::formatSeconds($totalActiveSeconds),
                'formatted_idle' => UserTimeLog::formatSeconds($totalIdleSeconds),
                'active_ratio' => $activeRatio,
                'online_staff_count' => $liveStaff->whereIn('status', ['active', 'idle'])->count(),
                'active_staff_count' => $liveStaff->where('status', 'active')->count(),
                'idle_staff_count' => $liveStaff->where('status', 'idle')->count(),
                'offline_staff_count' => $liveStaff->where('status', 'offline')->count(),
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'task_completion_rate' => $totalTasks > 0 ? (int) round(($completedTasks / $totalTasks) * 100) : 0,
                'total_leads' => $totalLeads,
                'converted_leads' => $convertedLeads,
                'total_opportunities' => $totalOpportunities,
                'won_opportunities' => $wonOpportunities,
                'won_revenue' => $wonOpportunityRevenue,
                'meetings_count' => $meetingsCount,
                'calls_count' => $callsCount,
            ],
            'trendData' => $trendData,
            'leaderboard' => $leaderboard,
            'timeLogs' => $paginatedLogs,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $currentUser = Auth::user();
        $creatorId = method_exists($currentUser, 'creatorId') ? $currentUser->creatorId() : ($currentUser->created_by ?? $currentUser->id);
        $isAdmin = in_array($currentUser->type, ['company', 'admin', 'superadmin', 'super admin']) || $currentUser->can('manage-users') || $currentUser->can('manage-user-performance');
        $canView = $isAdmin || $currentUser->can('view-user-performance');

        if (!$canView) {
            abort(403, __('You do not have permission to export User Performance.'));
        }

        $period = $request->input('period', 'this_month');
        $customStart = $request->input('start_date');
        $customEnd = $request->input('end_date');
        [$startDate, $endDate] = $this->resolveDateRange($period, $customStart, $customEnd);

        $selectedUserId = $request->input('user_id');
        if (!$isAdmin) {
            $selectedUserId = $currentUser->id;
        }

        $logsQuery = UserTimeLog::with('user:id,name,email')
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()]);

        if ($selectedUserId) {
            $logsQuery->where('user_id', $selectedUserId);
        } else {
            if ($currentUser->type !== 'superadmin' && $currentUser->type !== 'super admin') {
                $teamIds = User::where(function ($q) use ($creatorId) {
                    $q->where('created_by', $creatorId)->orWhere('id', $creatorId);
                })->pluck('id');
                $logsQuery->whereIn('user_id', $teamIds);
            }
        }

        $logs = $logsQuery->orderBy('date', 'desc')->orderBy('id', 'desc')->get();

        $filename = "user_performance_time_logs_" . now()->format('Y_m_d_His') . ".csv";

        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Date',
                'User Name',
                'User Email',
                'First Login At',
                'Last Activity At',
                'Active Time',
                'Idle Time',
                'Total Time',
                'Active %',
                'Status',
                'Last Page',
                'IP Address'
            ]);

            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->date ? $log->date->format('Y-m-d') : '',
                    $log->user ? $log->user->name : 'N/A',
                    $log->user ? $log->user->email : 'N/A',
                    $log->first_login_at ? $log->first_login_at->format('Y-m-d H:i:s') : '',
                    $log->last_activity_at ? $log->last_activity_at->format('Y-m-d H:i:s') : '',
                    $log->formatted_active_time,
                    $log->formatted_idle_time,
                    $log->formatted_total_time,
                    $log->active_percentage . '%',
                    ucfirst($log->status),
                    $log->last_active_url ?: '-',
                    $log->ip_address ?: '-'
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function resolveDateRange(string $period, ?string $customStart, ?string $customEnd): array
    {
        $today = Carbon::today();

        switch ($period) {
            case 'yesterday':
                $start = $today->copy()->subDay();
                $end = $start->copy();
                break;
            case 'last_7_days':
                $start = $today->copy()->subDays(6);
                $end = $today->copy();
                break;
            case 'this_week':
                $start = $today->copy()->startOfWeek();
                $end = $today->copy()->endOfWeek();
                break;
            case 'this_month':
                $start = $today->copy()->startOfMonth();
                $end = $today->copy()->endOfMonth();
                break;
            case 'last_month':
                $start = $today->copy()->subMonth()->startOfMonth();
                $end = $today->copy()->subMonth()->endOfMonth();
                break;
            case 'custom':
                $start = $customStart ? Carbon::parse($customStart) : $today->copy()->subDays(30);
                $end = $customEnd ? Carbon::parse($customEnd) : $today->copy();
                break;
            case 'today':
            default:
                $start = $today->copy();
                $end = $today->copy();
                break;
        }

        return [$start, $end];
    }
}
