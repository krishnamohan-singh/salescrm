<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaskType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'icon',
        'color',
        'description',
        'status',
        'created_by',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'task_type_id');
    }

    /**
     * Seed default task types for a tenant if none exist.
     */
    public static function seedDefaultsForTenant(int $userId): void
    {
        $existing = self::where('created_by', $userId)->count();
        if ($existing === 0) {
            $defaults = [
                ['name' => 'Follow-up', 'icon' => 'Clock', 'color' => '#6366f1', 'description' => 'General lead/customer follow-up', 'status' => 'active'],
                ['name' => 'Phone Call', 'icon' => 'Phone', 'color' => '#0ea5e9', 'description' => 'Scheduled telephone call or outreach', 'status' => 'active'],
                ['name' => 'Meeting', 'icon' => 'Users', 'color' => '#10b981', 'description' => 'In-person or virtual client meeting', 'status' => 'active'],
                ['name' => 'Email', 'icon' => 'Mail', 'color' => '#8b5cf6', 'description' => 'Email dispatch or correspondence', 'status' => 'active'],
                ['name' => 'Product Demo', 'icon' => 'Video', 'color' => '#f59e0b', 'description' => 'Product walkthrough or live demo', 'status' => 'active'],
                ['name' => 'Contract / Quote Review', 'icon' => 'FileText', 'color' => '#ec4899', 'description' => 'Proposal or agreement review', 'status' => 'active'],
                ['name' => 'Task / Todo', 'icon' => 'CheckSquare', 'color' => '#64748b', 'description' => 'Action item or internal task', 'status' => 'active'],
            ];

            foreach ($defaults as $item) {
                self::create(array_merge($item, ['created_by' => $userId]));
            }
        }
    }
}
