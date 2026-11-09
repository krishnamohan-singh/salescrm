<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpportunityActivity extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'opportunity_id',
        'user_id',
        'activity_type',
        'title',
        'description',
        'old_values',
        'new_values',
        'field_changed',
        'created_by',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    protected static function booted()
    {
        static::created(function ($activity) {
            if ($activity->activity_type === 'created') {
                return;
            }

            $opportunity = Opportunity::find($activity->opportunity_id);
            if (!$opportunity) {
                return;
            }

            // Skip initial assignment activity triggered at creation time
            if ($activity->activity_type === 'assigned' && $opportunity->created_at) {
                $createdAtTime = strtotime((string)($activity->created_at ?: now()));
                $oppCreatedAtTime = strtotime((string)$opportunity->created_at);
                if (abs($createdAtTime - $oppCreatedAtTime) <= 5) {
                    return;
                }
            }

            // If call or meeting controller already set a custom last_contacted_date in the current request
            if (in_array(strtolower((string)$activity->activity_type), ['meeting created', 'meeting updated', 'call_held', 'call_scheduled', 'call_logged', 'meeting_held'])) {
                if ($opportunity->last_contacted_date) {
                    return;
                }
            }

            Opportunity::where('id', $activity->opportunity_id)->update(['last_contacted_date' => now()]);
        });
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}