<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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

    protected $appends = [
        'lead_age',
        'lead_age_days',
        'lead_age_badge',
    ];

    public function getLeadAgeAttribute(): string
    {
        if (!$this->created_at) {
            return '-';
        }

        $createdAt = \Carbon\Carbon::parse($this->created_at);
        $diffDays = (int) $createdAt->diffInDays();

        if ($diffDays === 0) {
            $diffHours = (int) $createdAt->diffInHours();
            if ($diffHours === 0) {
                $diffMinutes = max(1, (int) $createdAt->diffInMinutes());
                return $diffMinutes . ' ' . ($diffMinutes === 1 ? 'min' : 'mins');
            }
            return $diffHours . ' ' . ($diffHours === 1 ? 'hour' : 'hours');
        } elseif ($diffDays === 1) {
            return '1 day';
        } elseif ($diffDays < 30) {
            return $diffDays . ' days';
        } elseif ($diffDays < 365) {
            $months = (int) floor($diffDays / 30);
            $rem = $diffDays % 30;
            return $months . ' ' . ($months == 1 ? 'mo' : 'mos') . ($rem > 0 ? ' ' . $rem . 'd' : '');
        } else {
            $years = (int) floor($diffDays / 365);
            $remDays = $diffDays % 365;
            $remMonths = (int) floor($remDays / 30);
            return $years . ' ' . ($years == 1 ? 'yr' : 'yrs') . ($remMonths > 0 ? ' ' . $remMonths . 'mo' : '');
        }
    }

    public function getLeadAgeDaysAttribute(): int
    {
        if (!$this->created_at) {
            return 0;
        }
        return (int) \Carbon\Carbon::parse($this->created_at)->diffInDays();
    }

    public function getLeadAgeBadgeAttribute(): array
    {
        $days = $this->lead_age_days;
        if ($days < 7) {
            return [
                'type' => 'fresh',
                'label' => 'Fresh (< 7d)',
                'className' => 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400',
            ];
        } elseif ($days <= 30) {
            return [
                'type' => 'warm',
                'label' => 'Active (7-30d)',
                'className' => 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400',
            ];
        } else {
            return [
                'type' => 'aging',
                'label' => 'Aging (> 30d)',
                'className' => 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400',
            ];
        }
    }

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

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'lead_services')
            ->withPivot('id', 'price', 'notes')
            ->withTimestamps();
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'lead_products')
            ->withPivot('id', 'quantity', 'unit_price', 'total_price', 'notes')
            ->withTimestamps();
    }

    public function emails(): HasMany
    {
        return $this->hasMany(CrmEmail::class)->orderBy('sent_at', 'desc');
    }
}