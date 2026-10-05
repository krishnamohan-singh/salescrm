<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'parent_type',
        'parent_id',
        'lead_id',
        'account_id',
        'contact_id',
        'opportunity_id',
        'task_status_id',
        'task_type_id',
        'task_priority_id',
        'status',
        'type',
        'priority',
        'assigned_to',
        'created_by',
        'due_date',
        'due_time',
        'completed_at',
    ];

    protected $casts = [
        'due_date' => 'date:Y-m-d',
        'completed_at' => 'datetime',
    ];

    protected $appends = [
        'parent_name',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'account_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'contact_id');
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class, 'opportunity_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function taskStatus(): BelongsTo
    {
        return $this->belongsTo(TaskStatus::class, 'task_status_id');
    }

    public function taskType(): BelongsTo
    {
        return $this->belongsTo(TaskType::class, 'task_type_id');
    }

    public function taskPriority(): BelongsTo
    {
        return $this->belongsTo(TaskPriority::class, 'task_priority_id');
    }

    /**
     * Get parent entity name attribute.
     */
    public function getParentNameAttribute(): ?string
    {
        if ($this->lead_id && $this->relationLoaded('lead') && $this->lead) {
            return $this->lead->name;
        }
        if ($this->account_id && $this->relationLoaded('account') && $this->account) {
            return $this->account->name;
        }
        if ($this->contact_id && $this->relationLoaded('contact') && $this->contact) {
            return $this->contact->name;
        }
        if ($this->opportunity_id && $this->relationLoaded('opportunity') && $this->opportunity) {
            return $this->opportunity->name;
        }
        return null;
    }
}
