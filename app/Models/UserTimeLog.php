<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserTimeLog extends Model
{
    use HasFactory;

    protected $table = 'user_time_logs';

    protected $fillable = [
        'user_id',
        'created_by',
        'date',
        'first_login_at',
        'last_activity_at',
        'logout_at',
        'total_seconds',
        'active_seconds',
        'idle_seconds',
        'status',
        'last_active_url',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'first_login_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'logout_at' => 'datetime',
        'total_seconds' => 'integer',
        'active_seconds' => 'integer',
        'idle_seconds' => 'integer',
    ];

    protected $appends = [
        'formatted_total_time',
        'formatted_active_time',
        'formatted_idle_time',
        'active_percentage',
        'idle_percentage',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getFormattedTotalTimeAttribute(): string
    {
        return $this->formatSeconds($this->total_seconds ? (int)$this->total_seconds : 0);
    }

    public function getFormattedActiveTimeAttribute(): string
    {
        return $this->formatSeconds($this->active_seconds ? (int)$this->active_seconds : 0);
    }

    public function getFormattedIdleTimeAttribute(): string
    {
        return $this->formatSeconds($this->idle_seconds ? (int)$this->idle_seconds : 0);
    }

    public function getActivePercentageAttribute(): int
    {
        $total = (int)($this->total_seconds ?? 0);
        $active = (int)($this->active_seconds ?? 0);
        if ($total <= 0) {
            return 0;
        }
        return (int) round(($active / $total) * 100);
    }

    public function getIdlePercentageAttribute(): int
    {
        $total = (int)($this->total_seconds ?? 0);
        $idle = (int)($this->idle_seconds ?? 0);
        if ($total <= 0) {
            return 0;
        }
        return (int) round(($idle / $total) * 100);
    }

    public static function formatSeconds(?int $seconds): string
    {
        if (!$seconds || $seconds <= 0) {
            return '00m 00s';
        }
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $secs = $seconds % 60;

        if ($hours > 0) {
            return sprintf('%02dh %02dm %02ds', $hours, $minutes, $secs);
        }
        return sprintf('%02dm %02ds', $minutes, $secs);
    }
}
