<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadIntegrationLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'created_by',
        'lead_integration_id',
        'integration_type',
        'status',
        'ip_address',
        'payload',
        'response_message',
        'lead_id',
        'created_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'created_at' => 'datetime',
    ];

    public function leadIntegration(): BelongsTo
    {
        return $this->belongsTo(LeadIntegration::class, 'lead_integration_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
