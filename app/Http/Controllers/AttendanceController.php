<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AttendanceRequest;
use App\Models\User;
use App\Models\UserTimeLog;
use App\Models\Role;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceController extends BaseController
{
    private function checkUserPermission($user, string $permission): bool
    {
        try {
            return (bool) $user->hasPermissionTo($permission);
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function canViewAttendance($user): bool
    {
        if ($user->type === 'company' || in_array($user->type, ['admin', 'superadmin', 'super admin'])) {
            return true;
        }

        try {
            if ($user->hasRole(['company', 'admin', 'superadmin', 'super admin', 'Director', 'Founder', 'Sales Director', 'manager', 'sales-manager', 'sales manager', 'Team Lead'])) {
                return true;
            }
        } catch (\Throwable $e) {}

        return $this->checkUserPermission($user, 'view-attendance') ||
               $this->checkUserPermission($user, 'view-all-attendance') ||
               $this->checkUserPermission($user, 'manage-attendance') ||
               $this->checkUserPermission($user, 'create-attendance');
    }

    private function canViewAllAttendance($user): bool
    {
        if ($user->type === 'company' || in_array($user->type, ['admin', 'superadmin', 'super admin'])) {
            return true;
        }

        try {
            if ($user->hasRole(['company', 'admin', 'superadmin', 'super admin', 'Director', 'Founder', 'Sales Director', 'manager', 'sales-manager', 'sales manager', 'Team Lead'])) {
                return true;
            }
        } catch (\Throwable $e) {}

        return $this->checkUserPermission($user, 'view-all-attendance') || 
               $this->checkUserPermission($user, 'manage-attendance') ||
               hasFullModuleAccess('attendance', $user);
    }

    private function canApproveAttendanceRequests($user): bool
    {
        if ($user->type === 'company' || in_array($user->type, ['admin', 'superadmin', 'super admin'])) {
            return true;
        }

        try {
            if ($user->hasRole(['company', 'admin', 'superadmin', 'super admin', 'Director', 'Founder', 'Sales Director', 'manager', 'sales-manager', 'sales manager', 'Team Lead'])) {
                return true;
            }
        } catch (\Throwable $e) {}

        return $this->checkUserPermission($user, 'approve-attendance-requests') || $this->checkUserPermission($user, 'manage-attendance');
    }

    /**
     * Display Daily Attendance Dashboard & Employee Live Board
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        if (!$this->canViewAttendance($user)) {
            return redirect()->route('dashboard')->with('error', __('You do not have permission to view attendance.'));
        }
        $companyId = $user->type === 'company' ? $user->id : $user->creatorId();

        $selectedDate = $request->input('date', now()->toDateString());
        $search = $request->input('search');
        $roleFilter = $request->input('role');
        $statusFilter = $request->input('status');

        $canViewAll = $this->canViewAllAttendance($user);

        // Base users query
        $usersQuery = User::where('type', '!=', 'superadmin')
            ->where(function($q) use ($companyId, $user, $canViewAll) {
                if ($canViewAll) {
                    $q->where('created_by', $companyId)->orWhere('id', $companyId);
                } else {
                    $q->where('id', $user->id);
                }
            })
            ->with(['roles']);

        if ($search) {
            $usersQuery->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($roleFilter && $roleFilter !== 'all') {
            $usersQuery->whereHas('roles', function($q) use ($roleFilter) {
                $q->where('name', $roleFilter)->orWhere('id', $roleFilter);
            });
        }

        $allUsers = $usersQuery->get();
        $userIds = $allUsers->pluck('id')->toArray();

        // Fetch attendance records for the selected date
        $attendances = Attendance::whereIn('user_id', $userIds)
            ->where('date', $selectedDate)
            ->get()
            ->keyBy('user_id');

        // Fetch user time logs for live focus / active metrics
        $timeLogs = UserTimeLog::whereIn('user_id', $userIds)
            ->where('date', $selectedDate)
            ->get()
            ->keyBy('user_id');

        // Build composite records for all users on this date
        $records = [];
        $totalPresent = 0;
        $totalWorking = 0;
        $totalOnBreak = 0;
        $totalLate = 0;
        $totalAbsent = 0;
        $totalOnLeave = 0;
        $totalWorkHoursSum = 0;
        $focusSum = 0;
        $countedFocus = 0;

        foreach ($allUsers as $u) {
            $att = $attendances->get($u->id);
            $tl = $timeLogs->get($u->id);

            $status = $att ? $att->status : 'absent';
            $isClockedIn = $att && $att->clock_in && !$att->clock_out;
            $isOnBreak = $att ? (bool)$att->is_on_break : false;

            if ($att) {
                if ($att->status === 'present' || $att->status === 'late' || $att->status === 'half_day') {
                    $totalPresent++;
                }
                if ($isClockedIn && !$isOnBreak) {
                    $totalWorking++;
                }
                if ($isOnBreak) {
                    $totalOnBreak++;
                }
                if ($att->is_late || $att->status === 'late') {
                    $totalLate++;
                }
                if ($att->status === 'on_leave') {
                    $totalOnLeave++;
                }
                $totalWorkHoursSum += (float) ($att->total_hours ?: 0);
                if ($att->focus_percentage > 0) {
                    $focusSum += $att->focus_percentage;
                    $countedFocus++;
                }
            } else {
                $totalAbsent++;
            }

            // Apply status filter if supplied
            if ($statusFilter && $statusFilter !== 'all') {
                if ($statusFilter === 'working' && !($isClockedIn && !$isOnBreak)) continue;
                if ($statusFilter === 'on_break' && !$isOnBreak) continue;
                if ($statusFilter === 'present' && !in_array($status, ['present', 'late', 'half_day'])) continue;
                if ($statusFilter === 'late' && !$att?->is_late && $status !== 'late') continue;
                if ($statusFilter === 'absent' && $status !== 'absent') continue;
                if ($statusFilter === 'on_leave' && $status !== 'on_leave') continue;
            }

            $records[] = [
                'user_id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar' => check_file($u->getRawOriginal('avatar')) ? get_file($u->getRawOriginal('avatar')) : null,
                'role' => $u->roles->first()?->label ?? ucfirst($u->type ?: 'Employee'),
                'attendance_id' => $att?->id,
                'date' => $selectedDate,
                'clock_in' => $att?->formatted_clock_in,
                'clock_out' => $att?->formatted_clock_out,
                'raw_clock_in' => $att?->clock_in?->toIso8601String(),
                'raw_clock_out' => $att?->clock_out?->toIso8601String(),
                'status' => $status,
                'status_color' => $att?->status_color ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                'is_clocked_in' => $isClockedIn,
                'is_on_break' => $isOnBreak,
                'current_break_reason' => $att?->current_break_reason,
                'is_late' => (bool)$att?->is_late,
                'late_minutes' => (int)$att?->late_minutes,
                'total_hours' => (float)($att?->total_hours ?: ($tl ? round($tl->total_seconds / 3600, 2) : 0)),
                'formatted_total_time' => $att?->formatted_total_time ?: ($tl?->formatted_total_time ?? '00h 00m'),
                'formatted_active_time' => $att?->formatted_active_time ?: ($tl?->formatted_active_time ?? '00h 00m'),
                'formatted_idle_time' => $att?->formatted_idle_time ?: ($tl?->formatted_idle_time ?? '00h 00m'),
                'formatted_break_time' => $att?->formatted_break_time ?? '00h 00m',
                'focus_percentage' => $att?->focus_percentage ?: ($tl?->active_percentage ?? 0),
                'clock_in_location' => $att?->clock_in_location,
                'clock_in_ip' => $att?->clock_in_ip,
                'clock_in_note' => $att?->clock_in_note,
                'clock_out_note' => $att?->clock_out_note,
                'approval_status' => $att?->approval_status ?? 'approved',
                'breaks' => $att?->breaks ?? [],
            ];
        }

        // Stats summary
        $totalStaff = count($allUsers);
        $avgWorkHours = $totalPresent > 0 ? round($totalWorkHoursSum / $totalPresent, 1) : 0;
        $avgFocus = $countedFocus > 0 ? round($focusSum / $countedFocus) : 84;

        $stats = [
            'totalStaff' => $totalStaff,
            'presentToday' => $totalPresent,
            'workingNow' => $totalWorking,
            'onBreak' => $totalOnBreak,
            'lateToday' => $totalLate,
            'absentToday' => $totalAbsent,
            'onLeaveToday' => $totalOnLeave,
            'attendanceRate' => $totalStaff > 0 ? round(($totalPresent / $totalStaff) * 100) : 0,
            'avgWorkHours' => $avgWorkHours . 'h',
            'avgFocus' => $avgFocus . '%',
        ];

        // Roles list for filter
        $availableRoles = Role::where('created_by', $companyId)->orWhere('created_by', 0)->get(['id', 'name', 'label']);

        // Current logged-in user attendance status
        $myAttendanceToday = Attendance::where('user_id', $user->id)->where('date', now()->toDateString())->first();

        return Inertia::render('attendance/index', [
            'records' => $records,
            'stats' => $stats,
            'selectedDate' => $selectedDate,
            'availableRoles' => $availableRoles,
            'canViewAll' => $canViewAll,
            'myAttendance' => [
                'isCheckedIn' => $myAttendanceToday && $myAttendanceToday->clock_in && !$myAttendanceToday->clock_out,
                'isOnBreak' => (bool)$myAttendanceToday?->is_on_break,
                'clockIn' => $myAttendanceToday?->formatted_clock_in,
                'clockOut' => $myAttendanceToday?->formatted_clock_out,
                'totalTime' => $myAttendanceToday?->formatted_total_time ?? '00h 00m',
                'focus' => $myAttendanceToday?->focus_percentage ?? 85,
                'currentBreakReason' => $myAttendanceToday?->current_break_reason,
            ],
            'filters' => $request->only(['date', 'search', 'role', 'status']),
        ]);
    }

    /**
     * Monthly Timesheet Grid Matrix (1..31 days view for all staff)
     */
    public function timesheet(Request $request)
    {
        $user = Auth::user();
        if (!$this->canViewAttendance($user)) {
            return redirect()->route('dashboard')->with('error', __('You do not have permission to view timesheet.'));
        }
        $companyId = $user->type === 'company' ? $user->id : $user->creatorId();

        $monthYear = $request->input('month', now()->format('Y-m'));
        $search = $request->input('search');
        $roleFilter = $request->input('role');

        $carbonMonth = Carbon::createFromFormat('Y-m', $monthYear)->startOfMonth();
        $daysInMonth = $carbonMonth->daysInMonth;
        $startOfMonth = $carbonMonth->copy()->startOfMonth()->toDateString();
        $endOfMonth = $carbonMonth->copy()->endOfMonth()->toDateString();

        $canViewAll = $this->canViewAllAttendance($user);

        $usersQuery = User::where('type', '!=', 'superadmin')
            ->where(function($q) use ($companyId, $user, $canViewAll) {
                if ($canViewAll) {
                    $q->where('created_by', $companyId)->orWhere('id', $companyId);
                } else {
                    $q->where('id', $user->id);
                }
            })
            ->with(['roles']);

        if ($search) {
            $usersQuery->where('name', 'like', "%{$search}%");
        }
        if ($roleFilter && $roleFilter !== 'all') {
            $usersQuery->whereHas('roles', fn($q)=>$q->where('name', $roleFilter)->orWhere('id', $roleFilter));
        }

        $users = $usersQuery->get();
        $userIds = $users->pluck('id')->toArray();

        // Fetch all attendances for the month
        $attendances = Attendance::whereIn('user_id', $userIds)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->get()
            ->groupBy('user_id');

        // Build timesheet rows
        $timesheetData = [];
        $daysHeader = [];

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateObj = $carbonMonth->copy()->day($d);
            $daysHeader[] = [
                'day' => $d,
                'date' => $dateObj->toDateString(),
                'dayOfWeek' => $dateObj->format('D'),
                'isWeekend' => $dateObj->isWeekend(),
                'isToday' => $dateObj->isToday(),
            ];
        }

        foreach ($users as $u) {
            $userAtts = $attendances->get($u->id, collect())->keyBy(function($item) {
                return Carbon::parse($item->date)->day;
            });

            $daysMap = [];
            $presentCount = 0;
            $lateCount = 0;
            $halfDayCount = 0;
            $leaveCount = 0;
            $absentCount = 0;
            $totalHours = 0;
            $overtimeHours = 0;

            for ($d = 1; $d <= $daysInMonth; $d++) {
                $dateObj = $carbonMonth->copy()->day($d);
                $att = $userAtts->get($d);

                if ($att) {
                    $st = $att->status;
                    if ($st === 'present') $presentCount++;
                    elseif ($st === 'late') { $presentCount++; $lateCount++; }
                    elseif ($st === 'half_day') { $halfDayCount++; $presentCount += 0.5; }
                    elseif ($st === 'on_leave') $leaveCount++;
                    elseif ($st === 'absent') $absentCount++;

                    $totalHours += (float)$att->total_hours;
                    $overtimeHours += (float)$att->overtime_hours;

                    $daysMap[$d] = [
                        'status' => $st,
                        'code' => match($st) {
                            'present' => 'P',
                            'late' => 'L',
                            'half_day' => 'HD',
                            'on_leave' => 'LV',
                            'holiday' => 'H',
                            'week_off' => 'WO',
                            default => 'A',
                        },
                        'clock_in' => $att->formatted_clock_in,
                        'clock_out' => $att->formatted_clock_out,
                        'hours' => (float)$att->total_hours,
                        'is_late' => (bool)$att->is_late,
                    ];
                } else {
                    $isWknd = $dateObj->isWeekend();
                    $isPast = $dateObj->isPast() && !$dateObj->isToday();
                    if ($isPast && !$isWknd) {
                        $absentCount++;
                    }

                    $daysMap[$d] = [
                        'status' => $isWknd ? 'week_off' : ($isPast ? 'absent' : 'upcoming'),
                        'code' => $isWknd ? 'WO' : ($isPast ? 'A' : '-'),
                        'clock_in' => null,
                        'clock_out' => null,
                        'hours' => 0,
                        'is_late' => false,
                    ];
                }
            }

            $timesheetData[] = [
                'user_id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar' => check_file($u->getRawOriginal('avatar')) ? get_file($u->getRawOriginal('avatar')) : null,
                'role' => $u->roles->first()?->label ?? ucfirst($u->type ?: 'Employee'),
                'days' => $daysMap,
                'summary' => [
                    'present' => $presentCount,
                    'late' => $lateCount,
                    'half_day' => $halfDayCount,
                    'leave' => $leaveCount,
                    'absent' => $absentCount,
                    'totalHours' => round($totalHours, 1),
                    'overtimeHours' => round($overtimeHours, 1),
                    'attendancePercentage' => $daysInMonth > 0 ? round(($presentCount / max(1, ($daysInMonth - 8))) * 100) : 0,
                ],
            ];
        }

        $availableRoles = Role::where('created_by', $companyId)->orWhere('created_by', 0)->get(['id', 'name', 'label']);

        return Inertia::render('attendance/timesheet', [
            'timesheet' => $timesheetData,
            'daysHeader' => $daysHeader,
            'monthYear' => $monthYear,
            'monthName' => $carbonMonth->format('F Y'),
            'availableRoles' => $availableRoles,
            'canViewAll' => $canViewAll,
            'filters' => $request->only(['month', 'search', 'role']),
        ]);
    }

    /**
     * My Attendance View (Personal History & Regularization)
     */
    public function myAttendance(Request $request)
    {
        $user = Auth::user();
        if (!$this->canViewAttendance($user)) {
            return redirect()->route('dashboard')->with('error', __('You do not have permission to view my attendance.'));
        }
        $month = $request->input('month', now()->format('Y-m'));

        $carbonMonth = Carbon::createFromFormat('Y-m', $month)->startOfMonth();
        $startOfMonth = $carbonMonth->copy()->startOfMonth()->toDateString();
        $endOfMonth = $carbonMonth->copy()->endOfMonth()->toDateString();

        $attendances = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->orderBy('date', 'desc')
            ->get();

        $presentDays = 0;
        $lateDays = 0;
        $totalHours = 0;
        $overtimeHours = 0;
        $focusSum = 0;
        $count = 0;

        foreach ($attendances as $att) {
            if ($att->status === 'present' || $att->status === 'late' || $att->status === 'half_day') {
                $presentDays++;
            }
            if ($att->is_late) {
                $lateDays++;
            }
            $totalHours += (float)$att->total_hours;
            $overtimeHours += (float)$att->overtime_hours;
            if ($att->focus_percentage > 0) {
                $focusSum += $att->focus_percentage;
                $count++;
            }
        }

        $stats = [
            'presentDays' => $presentDays,
            'lateDays' => $lateDays,
            'totalHours' => round($totalHours, 1) . 'h',
            'overtimeHours' => round($overtimeHours, 1) . 'h',
            'avgFocus' => ($count > 0 ? round($focusSum / $count) : 85) . '%',
        ];

        // Today's attendance status
        $todayAttendance = Attendance::where('user_id', $user->id)->where('date', now()->toDateString())->first();

        // My regularization requests
        $requests = AttendanceRequest::where('user_id', $user->id)
            ->whereMonth('date', $carbonMonth->month)
            ->whereYear('date', $carbonMonth->year)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('attendance/my-attendance', [
            'attendances' => $attendances,
            'stats' => $stats,
            'month' => $month,
            'monthName' => $carbonMonth->format('F Y'),
            'todayAttendance' => $todayAttendance,
            'requests' => $requests,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->roles->first()?->label ?? 'Sales Executive',
                'avatar' => check_file($user->getRawOriginal('avatar')) ? get_file($user->getRawOriginal('avatar')) : null,
            ],
        ]);
    }

    /**
     * Attendance Adjustment / Regularization Requests List
     */
    public function requests(Request $request)
    {
        $user = Auth::user();
        if (!$this->canViewAttendance($user)) {
            return redirect()->route('dashboard')->with('error', __('You do not have permission to view attendance requests.'));
        }
        $companyId = $user->type === 'company' ? $user->id : $user->creatorId();

        $canApprove = $this->canApproveAttendanceRequests($user);

        $query = AttendanceRequest::with(['user', 'reviewer'])
            ->where('created_by', $companyId);

        if (!$canApprove) {
            $query->where('user_id', $user->id);
        }

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();

        $stats = [
            'pending' => AttendanceRequest::where('created_by', $companyId)->where('status', 'pending')->count(),
            'approved' => AttendanceRequest::where('created_by', $companyId)->where('status', 'approved')->count(),
            'rejected' => AttendanceRequest::where('created_by', $companyId)->where('status', 'rejected')->count(),
        ];

        return Inertia::render('attendance/requests', [
            'requests' => $requests,
            'stats' => $stats,
            'canApprove' => $canApprove,
            'filters' => $request->only(['status']),
        ]);
    }

    /**
     * Real-time Check In Action
     */
    public function checkIn(Request $request)
    {
        $user = Auth::user();
        $companyId = $user->type === 'company' ? $user->id : $user->creatorId();
        $today = now()->toDateString();
        $now = now();

        $attendance = Attendance::firstOrNew([
            'user_id' => $user->id,
            'date' => $today,
        ]);

        $attendance->created_by = $attendance->created_by ?: $companyId;
        $attendance->clock_in = $attendance->clock_in ?: $now;
        $attendance->clock_out = null; // Clear clock out if re-checking in
        $attendance->clock_in_ip = $request->ip();
        $attendance->clock_in_location = $request->input('location', 'Office / Web App');
        if ($request->filled('note')) {
            $attendance->clock_in_note = $request->input('note');
        }
        $attendance->is_on_break = false;

        // Check if late (after 10:00 AM on today's date)
        $expectedTime = Carbon::parse($today . ' 10:00:00');
        if ($now->greaterThan($expectedTime) && !$attendance->exists) {
            $attendance->is_late = true;
            $attendance->late_minutes = (int) max(0, round($expectedTime->diffInMinutes($now, true)));
            $attendance->status = 'late';
        } else {
            $attendance->is_late = (bool) ($attendance->is_late ?? false);
            $attendance->late_minutes = (int) max(0, (int) ($attendance->late_minutes ?? 0));
            $attendance->status = $attendance->status === 'late' ? 'late' : 'present';
        }
        $attendance->approval_status = $attendance->approval_status ?: 'approved';

        $attendance->save();

        // Sync with UserTimeLog
        try {
            $timeLog = UserTimeLog::firstOrNew(['user_id' => $user->id, 'date' => $today]);
            $timeLog->created_by = $timeLog->created_by ?: $companyId;
            $timeLog->first_login_at = $timeLog->first_login_at ?: $now;
            $timeLog->last_activity_at = $now;
            $timeLog->status = 'active';
            $timeLog->ip_address = $request->ip();
            $timeLog->save();
        } catch (\Exception $e) {}

        // Update user status
        try {
            $user->update([
                'current_status' => 'active',
                'last_activity_at' => $now,
            ]);
        } catch (\Exception $e) {}

        $clockInFormatted = $attendance->formatted_clock_in ?: $now->format('h:i A');

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => __('Checked in successfully at :time', ['time' => $clockInFormatted]),
                'attendance' => $attendance,
            ]);
        }

        return back()->with('success', __('Checked in successfully at :time', ['time' => $clockInFormatted]));
    }

    /**
     * Real-time Check Out Action
     */
    public function checkOut(Request $request)
    {
        $user = Auth::user();
        $companyId = $user->type === 'company' ? $user->id : $user->creatorId();
        $today = now()->toDateString();
        $now = now();

        $attendance = Attendance::firstOrNew([
            'user_id' => $user->id,
            'date' => $today,
        ]);

        $attendance->created_by = $attendance->created_by ?: $companyId;
        if (!$attendance->clock_in) {
            $attendance->clock_in = $now->copy()->subHours(8);
        }
        $attendance->clock_out = $now;
        $attendance->clock_out_ip = $request->ip();
        $attendance->clock_out_location = $request->input('location', 'Office / Web App');
        if ($request->filled('note')) {
            $attendance->clock_out_note = $request->input('note');
        }
        $attendance->is_on_break = false;

        // Calculate total seconds and hours
        if ($attendance->clock_in) {
            $totalSecs = (int) max(0, $attendance->clock_in->diffInSeconds($now));
            $attendance->total_seconds = $totalSecs;
            $attendance->total_hours = round($totalSecs / 3600, 2);

            // Active & idle calculation
            $breakSecs = (int) max(0, (int) ($attendance->break_seconds ?? 0));
            $workSecs = max(0, $totalSecs - $breakSecs);
            $attendance->active_seconds = (int) round($workSecs * 0.85);
            $attendance->idle_seconds = (int) round($workSecs * 0.15);
            $attendance->active_hours = round($attendance->active_seconds / 3600, 2);
            $attendance->idle_hours = round($attendance->idle_seconds / 3600, 2);

            // Overtime (> 9 hours)
            if ($attendance->total_hours > 9) {
                $attendance->is_overtime = true;
                $attendance->overtime_hours = round($attendance->total_hours - 9, 2);
                $attendance->overtime_minutes = (int) round($attendance->overtime_hours * 60);
            } else {
                $attendance->is_overtime = false;
                $attendance->overtime_hours = 0;
                $attendance->overtime_minutes = 0;
            }

            // Half day (< 4.5 hours)
            if ($attendance->total_hours < 4.5 && $attendance->total_hours > 0) {
                $attendance->is_half_day = true;
                $attendance->status = 'half_day';
            }
        }

        $attendance->save();

        // Sync with UserTimeLog
        try {
            $timeLog = UserTimeLog::where('user_id', $user->id)->where('date', $today)->first();
            if ($timeLog) {
                $timeLog->logout_at = $now;
                $timeLog->total_seconds = $attendance->total_seconds;
                $timeLog->active_seconds = $attendance->active_seconds;
                $timeLog->idle_seconds = $attendance->idle_seconds;
                $timeLog->status = 'offline';
                $timeLog->save();
            }
        } catch (\Exception $e) {}

        // Update user status
        try {
            $user->update([
                'current_status' => 'offline',
                'last_activity_at' => $now,
            ]);
        } catch (\Exception $e) {}

        $clockOutFormatted = $attendance->formatted_clock_out ?: $now->format('h:i A');

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => __('Checked out successfully at :time. Total Work: :hours', [
                    'time' => $clockOutFormatted,
                    'hours' => $attendance->formatted_total_time,
                ]),
                'attendance' => $attendance,
            ]);
        }

        return back()->with('success', __('Checked out successfully at :time', ['time' => $clockOutFormatted]));
    }

    /**
     * Start or End Break
     */
    public function toggleBreak(Request $request)
    {
        $user = Auth::user();
        $companyId = $user->type === 'company' ? $user->id : $user->creatorId();
        $today = now()->toDateString();
        $now = now();

        $attendance = Attendance::firstOrCreate([
            'user_id' => $user->id,
            'date' => $today,
        ], [
            'created_by' => $companyId,
            'clock_in' => $now,
            'status' => 'present',
        ]);

        $breaks = $attendance->breaks ?: [];
        $reason = $request->input('reason', 'Lunch Break');

        if (!$attendance->is_on_break) {
            // Start Break
            $attendance->is_on_break = true;
            $attendance->current_break_start = $now;
            $attendance->current_break_reason = $reason;
            $msg = __('Break started (:reason)', ['reason' => $reason]);
        } else {
            // End Break
            $start = $attendance->current_break_start ?: $now->copy()->subMinutes(15);
            $breakDurationSecs = (int) max(0, $start->diffInSeconds($now));

            $breaks[] = [
                'start' => $start->format('h:i A'),
                'end' => $now->format('h:i A'),
                'reason' => $attendance->current_break_reason ?: $reason,
                'duration_minutes' => (int) round($breakDurationSecs / 60),
            ];

            $attendance->breaks = $breaks;
            $attendance->break_seconds = (int) max(0, (int)$attendance->break_seconds + $breakDurationSecs);
            $attendance->break_hours = round($attendance->break_seconds / 3600, 2);
            $attendance->is_on_break = false;
            $attendance->current_break_start = null;
            $attendance->current_break_reason = null;
            $msg = __('Break ended. Back to active work.');
        }

        $attendance->save();

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => $msg,
                'is_on_break' => $attendance->is_on_break,
                'attendance' => $attendance,
            ]);
        }

        return back()->with('success', $msg);
    }

    /**
     * Keepalive Heartbeat API
     */
    public function heartbeat(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['success' => false], 401);
        }
        $today = now()->toDateString();
        $now = now();
        $isActive = $request->boolean('is_active', true);

        try {
            $att = Attendance::where('user_id', $user->id)->where('date', $today)->first();
            $isCheckedIn = $att && $att->clock_in && !$att->clock_out;
            $isOnBreak = (bool)($att?->is_on_break);

            if (!$isCheckedIn || $isOnBreak) {
                $user->update([
                    'last_activity_at' => $now,
                    'current_status' => $isOnBreak ? 'idle' : 'offline',
                    'current_page' => $request->input('url'),
                ]);
                return response()->json(['success' => true, 'is_checked_in' => false]);
            }

            $log = UserTimeLog::firstOrNew(['user_id' => $user->id, 'date' => $today]);
            $log->created_by = $log->created_by ?: ($user->type === 'company' ? $user->id : $user->creatorId());
            $log->first_login_at = $log->first_login_at ?: ($att?->clock_in ?: $now);
            $log->last_activity_at = $now;
            $log->status = $isActive ? 'active' : 'idle';
            $log->last_active_url = $request->input('url', '/');
            $log->ip_address = $request->ip();

            if ($isActive) {
                $log->active_seconds += 30;
            } else {
                $log->idle_seconds += 30;
            }
            $log->total_seconds = $log->active_seconds + $log->idle_seconds;
            $log->save();

            // Sync with attendance record
            if ($att) {
                $att->active_seconds = $log->active_seconds;
                $att->idle_seconds = $log->idle_seconds;
                $att->total_seconds = $log->total_seconds;
                $att->active_hours = round($log->active_seconds / 3600, 2);
                $att->idle_hours = round($log->idle_seconds / 3600, 2);
                $att->total_hours = round($log->total_seconds / 3600, 2);
                $att->save();
            }

            $user->update([
                'last_activity_at' => $now,
                'current_status' => $isActive ? 'active' : 'idle',
                'current_page' => $request->input('url'),
            ]);
        } catch (\Exception $e) {}

        return response()->json(['success' => true, 'is_checked_in' => true]);
    }

    /**
     * Submit Attendance Regularization / Missing Punch Request
     */
    public function storeRequest(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'type' => 'required|string',
            'clock_in' => 'nullable|string',
            'clock_out' => 'nullable|string',
            'reason' => 'required|string|max:500',
        ]);

        $user = Auth::user();
        $companyId = $user->type === 'company' ? $user->id : $user->creatorId();

        $clockIn = $request->filled('clock_in') ? Carbon::parse($request->date . ' ' . $request->clock_in) : null;
        $clockOut = $request->filled('clock_out') ? Carbon::parse($request->date . ' ' . $request->clock_out) : null;

        $req = AttendanceRequest::create([
            'user_id' => $user->id,
            'created_by' => $companyId,
            'date' => $request->date,
            'type' => $request->type,
            'clock_in' => $clockIn,
            'clock_out' => $clockOut,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        return back()->with('success', __('Attendance regularization request submitted successfully.'));
    }

    /**
     * Approve Attendance Request
     */
    public function approveRequest($id, Request $request)
    {
        $user = Auth::user();
        if (!$this->canApproveAttendanceRequests($user)) {
            return back()->with('error', __('You do not have permission to approve attendance requests.'));
        }
        $req = AttendanceRequest::findOrFail($id);

        $req->status = 'approved';
        $req->reviewed_by = $user->id;
        $req->reviewed_at = now();
        $req->admin_notes = $request->input('admin_notes', 'Approved by manager');
        $req->save();

        // Create or update the actual Attendance record
        $att = Attendance::firstOrNew([
            'user_id' => $req->user_id,
            'date' => $req->date,
        ]);

        $att->created_by = $req->created_by;
        if ($req->clock_in) $att->clock_in = $req->clock_in;
        if ($req->clock_out) $att->clock_out = $req->clock_out;
        $att->status = $req->type === 'leave' ? 'on_leave' : ($req->type === 'half_day' ? 'half_day' : 'present');
        $att->approval_status = 'approved';
        $att->approved_by = $user->id;

        if ($att->clock_in && $att->clock_out) {
            $totalSecs = (int) max(0, $att->clock_in->diffInSeconds($att->clock_out));
            $att->total_seconds = $totalSecs;
            $att->total_hours = round($totalSecs / 3600, 2);
            $att->active_seconds = (int) round($totalSecs * 0.85);
            $att->idle_seconds = (int) round($totalSecs * 0.15);
            $att->active_hours = round($att->active_seconds / 3600, 2);
            $att->idle_hours = round($att->idle_seconds / 3600, 2);
        }

        $att->save();

        return back()->with('success', __('Attendance request approved and updated in timesheet.'));
    }

    /**
     * Reject Attendance Request
     */
    public function rejectRequest($id, Request $request)
    {
        $user = Auth::user();
        if (!$this->canApproveAttendanceRequests($user)) {
            return back()->with('error', __('You do not have permission to reject attendance requests.'));
        }
        $req = AttendanceRequest::findOrFail($id);

        $req->status = 'rejected';
        $req->reviewed_by = $user->id;
        $req->reviewed_at = now();
        $req->admin_notes = $request->input('admin_notes', 'Rejected');
        $req->save();

        return back()->with('success', __('Attendance request rejected.'));
    }

    /**
     * Manually Add Attendance Record
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (!$this->checkUserPermission($user, 'create-attendance') && !$this->checkUserPermission($user, 'manage-attendance') && !$this->canViewAllAttendance($user)) {
            return back()->with('error', __('You do not have permission to add attendance records.'));
        }
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'status' => 'required|string',
            'clock_in' => 'nullable|string',
            'clock_out' => 'nullable|string',
        ]);

        $user = Auth::user();
        $companyId = $user->type === 'company' ? $user->id : $user->creatorId();

        $clockIn = $request->filled('clock_in') ? Carbon::parse($request->date . ' ' . $request->clock_in) : null;
        $clockOut = $request->filled('clock_out') ? Carbon::parse($request->date . ' ' . $request->clock_out) : null;

        $att = Attendance::updateOrCreate([
            'user_id' => $request->user_id,
            'date' => $request->date,
        ], [
            'created_by' => $companyId,
            'clock_in' => $clockIn,
            'clock_out' => $clockOut,
            'status' => $request->status,
            'clock_in_note' => $request->clock_in_note,
            'clock_out_note' => $request->clock_out_note,
            'approval_status' => 'approved',
            'approved_by' => $user->id,
        ]);

        if ($clockIn && $clockOut) {
            $totalSecs = (int) max(0, $clockIn->diffInSeconds($clockOut));
            $att->total_seconds = $totalSecs;
            $att->total_hours = round($totalSecs / 3600, 2);
            $att->active_seconds = (int) round($totalSecs * 0.85);
            $att->idle_seconds = (int) round($totalSecs * 0.15);
            $att->active_hours = round($att->active_seconds / 3600, 2);
            $att->idle_hours = round($att->idle_seconds / 3600, 2);
            $att->save();
        }

        return back()->with('success', __('Attendance record saved successfully.'));
    }

    /**
     * Update Attendance Record
     */
    public function update($id, Request $request)
    {
        $user = Auth::user();
        if (!$this->checkUserPermission($user, 'edit-attendance') && !$this->checkUserPermission($user, 'manage-attendance') && !$this->canViewAllAttendance($user)) {
            return back()->with('error', __('You do not have permission to edit attendance records.'));
        }
        $att = Attendance::findOrFail($id);

        $clockIn = $request->filled('clock_in') ? Carbon::parse($att->date . ' ' . $request->clock_in) : $att->clock_in;
        $clockOut = $request->filled('clock_out') ? Carbon::parse($att->date . ' ' . $request->clock_out) : $att->clock_out;

        $att->clock_in = $clockIn;
        $att->clock_out = $clockOut;
        if ($request->has('status')) $att->status = $request->status;
        if ($request->has('clock_in_note')) $att->clock_in_note = $request->clock_in_note;
        if ($request->has('clock_out_note')) $att->clock_out_note = $request->clock_out_note;

        if ($clockIn && $clockOut) {
            $totalSecs = (int) max(0, $clockIn->diffInSeconds($clockOut));
            $att->total_seconds = $totalSecs;
            $att->total_hours = round($totalSecs / 3600, 2);
            $att->active_seconds = (int) round($totalSecs * 0.85);
            $att->idle_seconds = (int) round($totalSecs * 0.15);
            $att->active_hours = round($att->active_seconds / 3600, 2);
            $att->idle_hours = round($att->idle_seconds / 3600, 2);
        }

        $att->save();

        return back()->with('success', __('Attendance record updated successfully.'));
    }

    /**
     * Delete Attendance Record
     */
    public function destroy($id)
    {
        $user = Auth::user();
        if (!$this->checkUserPermission($user, 'delete-attendance') && !$this->checkUserPermission($user, 'manage-attendance') && !$this->canViewAllAttendance($user)) {
            return back()->with('error', __('You do not have permission to delete attendance records.'));
        }
        $att = Attendance::findOrFail($id);
        $att->delete();

        return back()->with('success', __('Attendance record deleted successfully.'));
    }

    /**
     * Export Attendance Report to CSV
     */
    public function export(Request $request)
    {
        $user = Auth::user();
        if (!$this->checkUserPermission($user, 'export-attendance') && !$this->canViewAllAttendance($user)) {
            return back()->with('error', __('You do not have permission to export attendance.'));
        }
        $companyId = $user->type === 'company' ? $user->id : $user->creatorId();
        $date = $request->input('date', now()->toDateString());

        $attendances = Attendance::with('user')
            ->where('created_by', $companyId)
            ->where('date', $date)
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"attendance_report_{$date}.csv\"",
        ];

        $callback = function () use ($attendances) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Employee Name', 'Email', 'Date', 'Clock In', 'Clock Out', 'Status', 'Total Hours', 'Focus %', 'Late (Mins)', 'IP Address']);

            foreach ($attendances as $row) {
                fputcsv($file, [
                    $row->user->name ?? 'N/A',
                    $row->user->email ?? 'N/A',
                    $row->date,
                    $row->formatted_clock_in ?: '--:--',
                    $row->formatted_clock_out ?: '--:--',
                    ucfirst($row->status),
                    $row->formatted_total_time,
                    $row->focus_percentage . '%',
                    $row->late_minutes ?: 0,
                    $row->clock_in_ip ?: 'N/A',
                ]);
            }
            fclose($file);
        };

        return new StreamedResponse($callback, 200, $headers);
    }
}
