<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class SalesTarget extends BaseModel
{
    use HasFactory, SoftDeletes;

    protected $table = 'sales_targets';

    protected $fillable = [
        'created_by',
        'user_id',
        'parent_id',
        'title',
        'period_type',
        'financial_year',
        'quarter',
        'month',
        'week_number',
        'start_date',
        'end_date',
        'business_type',
        'target_revenue',
        'actual_revenue',
        'target_new_business_revenue',
        'actual_new_business_revenue',
        'target_upsell_revenue',
        'actual_upsell_revenue',
        'target_renewal_revenue',
        'actual_renewal_revenue',
        'target_mrr',
        'actual_mrr',
        'target_arr',
        'actual_arr',
        'target_new_accounts',
        'actual_new_accounts',
        'target_outreach',
        'actual_outreach',
        'target_cold_calls',
        'actual_cold_calls',
        'target_cold_emails',
        'actual_cold_emails',
        'target_linkedin_outreach',
        'actual_linkedin_outreach',
        'target_meetings',
        'actual_meetings',
        'target_demos',
        'actual_demos',
        'target_proposals',
        'actual_proposals',
        'target_followups',
        'actual_followups',
        'target_opportunities',
        'actual_opportunities',
        'pipeline_amount',
        'forecast_revenue',
        'source_type',
        'assigned_by',
        'target_history_json',
        'daily_minimums_json',
        'weekly_breakdown_json',
        'health_status',
        'status',
        'notes',
        'manager_feedback',
    ];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
        'month' => 'integer',
        'week_number' => 'integer',
        'target_history_json' => 'array',
        'daily_minimums_json' => 'array',
        'weekly_breakdown_json' => 'array',
        'target_revenue' => 'decimal:2',
        'actual_revenue' => 'decimal:2',
        'target_new_business_revenue' => 'decimal:2',
        'actual_new_business_revenue' => 'decimal:2',
        'target_upsell_revenue' => 'decimal:2',
        'actual_upsell_revenue' => 'decimal:2',
        'target_renewal_revenue' => 'decimal:2',
        'actual_renewal_revenue' => 'decimal:2',
        'target_mrr' => 'decimal:2',
        'actual_mrr' => 'decimal:2',
        'target_arr' => 'decimal:2',
        'actual_arr' => 'decimal:2',
        'pipeline_amount' => 'decimal:2',
        'forecast_revenue' => 'decimal:2',
        'target_new_accounts' => 'integer',
        'actual_new_accounts' => 'integer',
        'target_outreach' => 'integer',
        'actual_outreach' => 'integer',
        'target_cold_calls' => 'integer',
        'actual_cold_calls' => 'integer',
        'target_cold_emails' => 'integer',
        'actual_cold_emails' => 'integer',
        'target_linkedin_outreach' => 'integer',
        'actual_linkedin_outreach' => 'integer',
        'target_meetings' => 'integer',
        'actual_meetings' => 'integer',
        'target_demos' => 'integer',
        'actual_demos' => 'integer',
        'target_proposals' => 'integer',
        'actual_proposals' => 'integer',
        'target_followups' => 'integer',
        'actual_followups' => 'integer',
        'target_opportunities' => 'integer',
        'actual_opportunities' => 'integer',
    ];

    protected $appends = [
        'revenue_achievement_rate',
        'activity_achievement_rate',
        'overall_achievement_rate',
        'variance_revenue',
        'computed_health',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(SalesTarget::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(SalesTarget::class, 'parent_id')->orderBy('start_date');
    }

    public function dayPlans(): HasMany
    {
        return $this->hasMany(SalesDayPlan::class, 'sales_target_id');
    }

    /**
     * Record a target revision entry into target_history_json
     */
    public function recordRevision(array $oldValues, array $newValues, string $reason = '', ?int $updaterId = null): void
    {
        $history = $this->target_history_json ?? [];
        $history[] = [
            'date' => Carbon::now()->toDateTimeString(),
            'updated_by' => $updaterId ?? auth()->id(),
            'reason' => $reason ?: 'Target adjustment',
            'changes' => [
                'old_revenue' => $oldValues['target_revenue'] ?? $this->target_revenue,
                'new_revenue' => $newValues['target_revenue'] ?? null,
                'old_calls' => $oldValues['target_cold_calls'] ?? $this->target_cold_calls,
                'new_calls' => $newValues['target_cold_calls'] ?? null,
                'old_meetings' => $oldValues['target_meetings'] ?? $this->target_meetings,
                'new_meetings' => $newValues['target_meetings'] ?? null,
            ],
        ];

        $this->target_history_json = $history;
        $this->save();
    }

    public function getRevenueAchievementRateAttribute(): int
    {
        if ($this->target_revenue <= 0) {
            return $this->actual_revenue > 0 ? 100 : 0;
        }
        return (int) round(($this->actual_revenue / $this->target_revenue) * 100);
    }

    public function getActivityAchievementRateAttribute(): int
    {
        $activities = [
            ['tgt' => $this->target_outreach, 'act' => $this->actual_outreach],
            ['tgt' => $this->target_cold_calls, 'act' => $this->actual_cold_calls],
            ['tgt' => $this->target_cold_emails, 'act' => $this->actual_cold_emails],
            ['tgt' => $this->target_meetings, 'act' => $this->actual_meetings],
            ['tgt' => $this->target_demos, 'act' => $this->actual_demos],
            ['tgt' => $this->target_proposals, 'act' => $this->actual_proposals],
            ['tgt' => $this->target_opportunities, 'act' => $this->actual_opportunities],
        ];

        $rates = [];
        foreach ($activities as $act) {
            if ($act['tgt'] > 0) {
                $rates[] = min(150, ($act['act'] / $act['tgt']) * 100);
            }
        }

        if (empty($rates)) {
            return 0;
        }

        return (int) round(array_sum($rates) / count($rates));
    }

    public function getOverallAchievementRateAttribute(): int
    {
        $hasRev = $this->target_revenue > 0;
        $actRate = $this->activity_achievement_rate;
        $revRate = $this->revenue_achievement_rate;

        if ($hasRev && $actRate > 0) {
            return (int) round(($revRate * 0.6) + ($actRate * 0.4));
        }

        return $hasRev ? $revRate : $actRate;
    }

    public function getVarianceRevenueAttribute(): float
    {
        return (float) ($this->actual_revenue - $this->target_revenue);
    }

    public function getComputedHealthAttribute(): string
    {
        $today = Carbon::today();
        $start = Carbon::parse($this->start_date);
        $end = Carbon::parse($this->end_date);

        if ($today->lt($start)) {
            return 'on_track';
        }

        $totalDays = max(1, $start->diffInDays($end));
        $daysPassed = min($totalDays, $start->diffInDays(min($today, $end)));
        $timeElapsedPct = ($daysPassed / $totalDays) * 100;

        $revPct = $this->revenue_achievement_rate;
        $actPct = $this->activity_achievement_rate;

        // If ahead or close to time elapsed
        if ($revPct >= ($timeElapsedPct * 0.85) || $actPct >= ($timeElapsedPct * 0.9)) {
            return 'on_track';
        }

        // If pipeline can cover remaining gap
        $remainingTarget = max(0, $this->target_revenue - $this->actual_revenue);
        if ($this->pipeline_amount >= ($remainingTarget * 2.5) && $actPct >= ($timeElapsedPct * 0.7)) {
            return 'at_risk';
        }

        if ($timeElapsedPct > 50 && $revPct < ($timeElapsedPct * 0.5)) {
            return 'critical';
        }

        return 'at_risk';
    }
}
