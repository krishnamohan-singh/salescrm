<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Attendance extends BaseModel
{
    use HasFactory;

    protected $table = 'attendances';

    protected $fillable = [
        'user_id',
        'created_by',
        'date',
        'clock_in',
        'clock_out',
        'status',
        'total_hours',
        'active_hours',
        'idle_hours',
        'break_hours',
        'overtime_hours',
        'total_seconds',
        'active_seconds',
        'idle_seconds',
        'break_seconds',
        'is_late',
        'late_minutes',
        'is_half_day',
        'is_overtime',
        'overtime_minutes',
        'clock_in_ip',
        'clock_out_ip',
        'clock_in_location',
        'clock_out_location',
        'clock_in_note',
        'clock_out_note',
        'breaks',
        'is_on_break',
        'current_break_start',
        'current_break_reason',
        'approval_status',
        'approved_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'clock_in' => 'datetime',
        'clock_out' => 'datetime',
        'current_break_start' => 'datetime',
        'breaks' => 'array',
        'is_late' => 'boolean',
        'is_half_day' => 'boolean',
        'is_overtime' => 'boolean',
        'is_on_break' => 'boolean',
        'total_hours' => 'decimal:2',
        'active_hours' => 'decimal:2',
        'idle_hours' => 'decimal:2',
        'break_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'total_seconds' => 'integer',
        'active_seconds' => 'integer',
        'idle_seconds' => 'integer',
        'break_seconds' => 'integer',
        'late_minutes' => 'integer',
        'overtime_minutes' => 'integer',
    ];

    protected $appends = [
        'formatted_clock_in',
        'formatted_clock_out',
        'formatted_total_time',
        'formatted_active_time',
        'formatted_idle_time',
        'formatted_break_time',
        'focus_percentage',
        'status_color',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getFormattedClockInAttribute(): ?string
    {
        return $this->clock_in ? $this->clock_in->format('h:i A') : null;
    }

    public function getFormattedClockOutAttribute(): ?string
    {
        return $this->clock_out ? $this->clock_out->format('h:i A') : null;
    }

    public function getFormattedTotalTimeAttribute(): string
    {
        $seconds = (int)($this->total_seconds ?? 0);
        if ($seconds <= 0 && $this->clock_in && !$this->clock_out) {
            $seconds = $this->clock_in->diffInSeconds(now());
        }
        return $this->formatSeconds($seconds);
    }

    public function getFormattedActiveTimeAttribute(): string
    {
        $seconds = (int)($this->active_seconds ?? 0);
        if ($seconds <= 0 && $this->clock_in && !$this->clock_out) {
            $elapsed = $this->clock_in->diffInSeconds(now());
            $breakSecs = (int)($this->break_seconds ?? 0);
            $workSecs = max(0, $elapsed - $breakSecs);
            $seconds = round($workSecs * 0.85);
        }
        return $this->formatSeconds($seconds);
    }

    public function getFormattedIdleTimeAttribute(): string
    {
        $seconds = (int)($this->idle_seconds ?? 0);
        if ($seconds <= 0 && $this->clock_in && !$this->clock_out) {
            $elapsed = $this->clock_in->diffInSeconds(now());
            $breakSecs = (int)($this->break_seconds ?? 0);
            $workSecs = max(0, $elapsed - $breakSecs);
            $seconds = round($workSecs * 0.15);
        }
        return $this->formatSeconds($seconds);
    }

    public function getFormattedBreakTimeAttribute(): string
    {
        return $this->formatSeconds($this->break_seconds ? (int)$this->break_seconds : 0);
    }

    public function getFocusPercentageAttribute(): int
    {
        $total = (int)($this->total_seconds ?? 0);
        $active = (int)($this->active_seconds ?? 0);
        if ($total <= 0) {
            if ($this->clock_in && !$this->clock_out) {
                return 85;
            }
            return ($this->status === 'present' || $this->status === 'late') ? 85 : 0;
        }
        return (int) min(100, max(0, round(($active / $total) * 100)));
    }

    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'present' => 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300',
            'late' => 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300',
            'half_day' => 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300',
            'on_leave' => 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-300',
            'holiday' => 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300',
            'week_off' => 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
            default => 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-300',
        };
    }

    public static function formatSeconds(?int $seconds): string
    {
        if (!$seconds || $seconds <= 0) {
            return '00h 00m';
        }
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);

        return sprintf('%02dh %02dm', $hours, $minutes);
    }
}
