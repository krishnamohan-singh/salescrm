<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesDayPlan extends BaseModel
{
    use HasFactory, SoftDeletes;

    protected $table = 'sales_day_plans';

    protected $fillable = [
        'plan_date',
        'user_id',
        'sales_target_id',
        'created_by',
        'title',
        'target_calls',
        'target_outreach',
        'target_emails',
        'target_meetings',
        'target_demos',
        'target_leads',
        'target_followups',
        'target_proposals',
        'target_sales_amount',
        'planned_activities',
        'planned_accounts',
        'priority_accounts_json',
        'actual_calls',
        'actual_outreach',
        'actual_emails',
        'actual_meetings',
        'actual_demos',
        'actual_leads',
        'actual_followups',
        'actual_proposals',
        'actual_sales_amount',
        'new_pipeline_created',
        'proposal_value',
        'achievements_summary',
        'key_wins',
        'challenges_notes',
        'client_feedback',
        'support_needed',
        'next_day_plan',
        'is_below_target',
        'reachability_status',
        'target_gap_json',
        'shortage_reason',
        'manager_approved',
        'manager_approval_reason',
        'revision_requested',
        'revision_comments',
        'status',
        'report_sent_at',
        'report_sent_to',
        'manager_feedback',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'plan_date' => 'date:Y-m-d',
        'is_below_target' => 'boolean',
        'manager_approved' => 'boolean',
        'revision_requested' => 'boolean',
        'target_gap_json' => 'array',
        'priority_accounts_json' => 'array',
        'target_calls' => 'integer',
        'target_outreach' => 'integer',
        'target_emails' => 'integer',
        'target_meetings' => 'integer',
        'target_demos' => 'integer',
        'target_leads' => 'integer',
        'target_followups' => 'integer',
        'target_proposals' => 'integer',
        'target_sales_amount' => 'decimal:2',
        'actual_calls' => 'integer',
        'actual_outreach' => 'integer',
        'actual_emails' => 'integer',
        'actual_meetings' => 'integer',
        'actual_demos' => 'integer',
        'actual_leads' => 'integer',
        'actual_followups' => 'integer',
        'actual_proposals' => 'integer',
        'actual_sales_amount' => 'decimal:2',
        'new_pipeline_created' => 'decimal:2',
        'proposal_value' => 'decimal:2',
        'report_sent_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    protected $appends = [
        'completion_rate',
        'calls_completion_rate',
        'outreach_completion_rate',
        'emails_completion_rate',
        'meetings_completion_rate',
        'demos_completion_rate',
        'sales_completion_rate',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function salesTarget(): BelongsTo
    {
        return $this->belongsTo(SalesTarget::class, 'sales_target_id');
    }

    public function getCallsCompletionRateAttribute(): int
    {
        if ($this->target_calls <= 0) {
            return $this->actual_calls > 0 ? 100 : 0;
        }
        return min(150, (int) round(($this->actual_calls / $this->target_calls) * 100));
    }

    public function getOutreachCompletionRateAttribute(): int
    {
        if ($this->target_outreach <= 0) {
            return $this->actual_outreach > 0 ? 100 : 0;
        }
        return min(150, (int) round(($this->actual_outreach / $this->target_outreach) * 100));
    }

    public function getEmailsCompletionRateAttribute(): int
    {
        if ($this->target_emails <= 0) {
            return $this->actual_emails > 0 ? 100 : 0;
        }
        return min(150, (int) round(($this->actual_emails / $this->target_emails) * 100));
    }

    public function getMeetingsCompletionRateAttribute(): int
    {
        if ($this->target_meetings <= 0) {
            return $this->actual_meetings > 0 ? 100 : 0;
        }
        return min(150, (int) round(($this->actual_meetings / $this->target_meetings) * 100));
    }

    public function getDemosCompletionRateAttribute(): int
    {
        if ($this->target_demos <= 0) {
            return $this->actual_demos > 0 ? 100 : 0;
        }
        return min(150, (int) round(($this->actual_demos / $this->target_demos) * 100));
    }

    public function getSalesCompletionRateAttribute(): int
    {
        if ($this->target_sales_amount <= 0) {
            return $this->actual_sales_amount > 0 ? 100 : 0;
        }
        return min(150, (int) round(($this->actual_sales_amount / $this->target_sales_amount) * 100));
    }

    public function getCompletionRateAttribute(): int
    {
        $rates = [];
        if ($this->target_calls > 0) $rates[] = $this->calls_completion_rate;
        if ($this->target_outreach > 0) $rates[] = $this->outreach_completion_rate;
        if ($this->target_emails > 0) $rates[] = $this->emails_completion_rate;
        if ($this->target_meetings > 0) $rates[] = $this->meetings_completion_rate;
        if ($this->target_demos > 0) $rates[] = $this->demos_completion_rate;
        if ($this->target_sales_amount > 0) $rates[] = $this->sales_completion_rate;

        if (empty($rates)) {
            return in_array($this->status, ['completed', 'reviewed']) ? 100 : ($this->status === 'submitted' ? 75 : 25);
        }

        return (int) round(array_sum($rates) / count($rates));
    }
}
