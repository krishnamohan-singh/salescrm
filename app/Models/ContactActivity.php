<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactActivity extends BaseModel
{
    use HasFactory;

    protected $fillable = [
        'contact_id',
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

            $contact = Contact::find($activity->contact_id);
            if (!$contact || !$contact->account_id) {
                return;
            }

            // Skip initial assignment activity triggered at creation time
            if ($activity->activity_type === 'assigned' && $contact->created_at) {
                $createdAtTime = strtotime((string)($activity->created_at ?: now()));
                $contCreatedAtTime = strtotime((string)$contact->created_at);
                if (abs($createdAtTime - $contCreatedAtTime) <= 5) {
                    return;
                }
            }

            Account::where('id', $contact->account_id)->update(['last_contacted_date' => now()]);
        });
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
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
