<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'alternate_email',
        'phone',
        'company',
        'account_name',
        'account_industry_id',
        'website',
        'position',
        'address',
        'notes',
        'value',
        'status',
        'is_converted',
        'lead_status_id',
        'lead_source_id',
        'created_by',
        'creator_id',
        'assigned_to',
        'campaign_id',
        'services',
        'lead_integration_id',
        'integration_source',
        'external_lead_id',
    ];

    protected $casts = [
        'is_converted' => 'boolean',
        'value' => 'decimal:2',
        'services' => 'array',
    ];

    public static function defaultServices(): array
    {
        return config('crm_services.items', []);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function leadStatus(): BelongsTo
    {
        return $this->belongsTo(LeadStatus::class);
    }

    public function leadSource(): BelongsTo
    {
        return $this->belongsTo(LeadSource::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function accountIndustry(): BelongsTo
    {
        return $this->belongsTo(AccountIndustry::class);
    }



    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function activities()
    {
        return $this->hasMany(LeadActivity::class)->with('user')->orderBy('created_at', 'desc');
    }

    public function comments()
    {
        return $this->hasMany(LeadComment::class)->with('user')->orderBy('created_at', 'desc');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'lead_id')->with(['assignedUser', 'creator', 'taskStatus', 'taskType', 'taskPriority'])->orderBy('due_date', 'asc');
    }

    public function leadIntegration(): BelongsTo
    {
        return $this->belongsTo(LeadIntegration::class, 'lead_integration_id');
    }
}