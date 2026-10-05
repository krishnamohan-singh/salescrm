<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskStatus extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'color',
        'description',
        'status',
        'is_default',
        'created_by',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'task_status_id');
    }

    /**
     * Seed default task statuses for a tenant if none exist.
     */
    public static function seedDefaultsForTenant(int $userId): void
    {
        $existing = self::where('created_by', $userId)->count();
        if ($existing === 0) {
            $hasIsDefault = \Illuminate\Support\Facades\Schema::hasColumn('task_statuses', 'is_default');
            $defaults = [
                ['name' => 'To Do', 'color' => '#6B7280', 'description' => 'Tasks that are ready to be started', 'status' => 'active', 'is_default' => true],
                ['name' => 'Pending', 'color' => '#f59e0b', 'description' => 'Task is scheduled and awaiting execution', 'status' => 'active', 'is_default' => false],
                ['name' => 'In Progress', 'color' => '#3b82f6', 'description' => 'Task is currently underway', 'status' => 'active', 'is_default' => false],
                ['name' => 'Review', 'color' => '#F59E0B', 'description' => 'Tasks pending review or approval', 'status' => 'active', 'is_default' => false],
                ['name' => 'Completed', 'color' => '#10b981', 'description' => 'Task has been completed successfully', 'status' => 'active', 'is_default' => false],
                ['name' => 'Done', 'color' => '#10b77f', 'description' => 'Completed tasks', 'status' => 'active', 'is_default' => false],
                ['name' => 'On Hold', 'color' => '#8b5cf6', 'description' => 'Task is temporarily paused', 'status' => 'active', 'is_default' => false],
                ['name' => 'Cancelled', 'color' => '#6b7280', 'description' => 'Task was cancelled', 'status' => 'active', 'is_default' => false],
            ];

            foreach ($defaults as $item) {
                if (!$hasIsDefault) {
                    unset($item['is_default']);
                }
                self::create(array_merge($item, ['created_by' => $userId]));
            }
        }
    }
}