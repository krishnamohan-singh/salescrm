<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Service extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'category_id',
        'tax_id',
        'price',
        'billing_cycle',
        'description',
        'status',
        'created_by',
        'assigned_to',
    ];

    protected $casts = [
        'price' => 'decimal:2',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function tax(): BelongsTo
    {
        return $this->belongsTo(Tax::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function leads(): BelongsToMany
    {
        return $this->belongsToMany(Lead::class, 'lead_services')
            ->withPivot('id', 'price', 'notes')
            ->withTimestamps();
    }

    public function accounts(): BelongsToMany
    {
        return $this->belongsToMany(Account::class, 'account_services')
            ->withPivot('id', 'price', 'status', 'start_date', 'end_date', 'notes')
            ->withTimestamps();
    }

    public function opportunities(): BelongsToMany
    {
        return $this->belongsToMany(Opportunity::class, 'opportunity_services')
            ->withPivot('id', 'quantity', 'unit_price', 'total_price', 'notes')
            ->withTimestamps();
    }

    /**
     * Seed default IT & business services for a tenant if none exist.
     */
    public static function seedDefaultsForTenant(int $tenantId): void
    {
        if (static::where('created_by', $tenantId)->exists()) {
            return;
        }

        $defaultItems = config('crm_services.items', [
            ['value' => 'SEO', 'label' => 'SEO (Search Engine Optimization)'],
            ['value' => 'Website Development', 'label' => 'Website Development'],
            ['value' => 'Web Application Development', 'label' => 'Web Application Development'],
            ['value' => 'Mobile App Development', 'label' => 'Mobile App Development (iOS & Android)'],
            ['value' => 'UI/UX Design', 'label' => 'UI/UX Design & Prototyping'],
            ['value' => 'Social Media Marketing', 'label' => 'Social Media Marketing (SMM)'],
            ['value' => 'Custom Software Development', 'label' => 'Custom Software Development'],
            ['value' => 'Cloud & DevOps', 'label' => 'Cloud Computing & DevOps (AWS / GCP / Azure)'],
            ['value' => 'IT Consulting', 'label' => 'IT Consulting & Architecture Advisory'],
            ['value' => 'Maintenance & IT Support', 'label' => 'Website Maintenance & IT Support (SLA)'],
        ]);

        $defaultPrices = [
            'SEO' => 499.00,
            'Website Development' => 1499.00,
            'Web Application Development' => 2999.00,
            'Mobile App Development' => 3499.00,
            'UI/UX Design' => 799.00,
            'Social Media Marketing' => 599.00,
            'Custom Software Development' => 4999.00,
            'Cloud & DevOps' => 1299.00,
            'IT Consulting' => 150.00,
            'Maintenance & IT Support' => 299.00,
        ];

        $defaultCycles = [
            'SEO' => 'monthly',
            'Website Development' => 'one_time',
            'Web Application Development' => 'one_time',
            'Mobile App Development' => 'one_time',
            'UI/UX Design' => 'one_time',
            'Social Media Marketing' => 'monthly',
            'Custom Software Development' => 'one_time',
            'Cloud & DevOps' => 'monthly',
            'IT Consulting' => 'hourly',
            'Maintenance & IT Support' => 'monthly',
        ];

        $codeNum = 1;
        foreach ($defaultItems as $item) {
            $val = $item['value'] ?? $item['label'];
            $label = $item['label'] ?? $item['value'];
            static::create([
                'name' => $label,
                'code' => 'SRV-' . str_pad((string)$codeNum, 3, '0', STR_PAD_LEFT),
                'price' => $defaultPrices[$val] ?? 250.00,
                'billing_cycle' => $defaultCycles[$val] ?? 'one_time',
                'description' => 'Professional ' . $label . ' provided to client.',
                'status' => 'active',
                'created_by' => $tenantId,
            ]);
            $codeNum++;
        }
    }
}
