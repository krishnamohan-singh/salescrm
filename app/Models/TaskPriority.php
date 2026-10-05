<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskPriority extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'color',
        'level',
        'description',
        'status',
        'created_by',
    ];

    protected $casts = [
        'level' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'task_priority_id');
    }

    /**
     * Seed default task priorities for a tenant if none exist.
     */
    public static function seedDefaultsForTenant(int $userId): void
    {
        $existing = self::where('created_by', $userId)->count();
        if ($existing === 0) {
            $defaults = [
                ['name' => 'Low', 'color' => '#64748b', 'level' => 1, 'description' => 'Low priority - can be handled whenever time permits', 'status' => 'active'],
                ['name' => 'Medium', 'color' => '#3b82f6', 'level' => 2, 'description' => 'Standard priority follow-up', 'status' => 'active'],
                ['name' => 'High', 'color' => '#f97316', 'level' => 3, 'description' => 'High priority - requires prompt attention', 'status' => 'active'],
                ['name' => 'Urgent', 'color' => '#ef4444', 'level' => 4, 'description' => 'Immediate priority - critical timeline', 'status' => 'active'],
            ];

            foreach ($defaults as $item) {
                self::create(array_merge($item, ['created_by' => $userId]));
            }
        }
    }
}
