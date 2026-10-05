<?php

namespace App\Observers;

use App\Models\LeadActivity;
use App\Models\AccountActivity;
use App\Models\OpportunityActivity;
use App\Models\Contact;
use App\Models\User;
use Carbon\Carbon;

class TaskObserver
{
    /**
     * Helper to log activity across parent modules (Leads, Accounts, Opportunities, Contacts)
     */
    protected function logActivity($task, string $activityType, string $title, ?string $description = null, array $oldValues = [], array $newValues = []): void
    {
        try {
            $userId = auth()->id() ?? $task->created_by;
            $createdBy = $task->created_by ?? createdBy();

            // 1. Lead Activity
            if (!empty($task->lead_id)) {
                LeadActivity::create([
                    'lead_id' => $task->lead_id,
                    'user_id' => $userId,
                    'activity_type' => $activityType,
                    'title' => $title,
                    'description' => $description,
                    'old_values' => !empty($oldValues) ? $oldValues : null,
                    'new_values' => !empty($newValues) ? $newValues : null,
                    'created_by' => $createdBy,
                ]);
            }

            // 2. Account Activity
            if (!empty($task->account_id)) {
                AccountActivity::create([
                    'account_id' => $task->account_id,
                    'user_id' => $userId,
                    'activity_type' => $activityType,
                    'title' => $title,
                    'description' => $description,
                    'old_values' => !empty($oldValues) ? $oldValues : null,
                    'new_values' => !empty($newValues) ? $newValues : null,
                    'created_by' => $createdBy,
                ]);
            }

            // 3. Opportunity Activity
            if (!empty($task->opportunity_id)) {
                OpportunityActivity::create([
                    'opportunity_id' => $task->opportunity_id,
                    'user_id' => $userId,
                    'activity_type' => $activityType,
                    'title' => $title,
                    'description' => $description,
                    'old_values' => !empty($oldValues) ? $oldValues : null,
                    'new_values' => !empty($newValues) ? $newValues : null,
                    'created_by' => $createdBy,
                ]);
            }

            // 4. Contact Activity (if contact has associated account_id and account activity not already logged)
            if (!empty($task->contact_id) && empty($task->account_id)) {
                $contact = Contact::find($task->contact_id);
                if ($contact && $contact->account_id) {
                    AccountActivity::create([
                        'account_id' => $contact->account_id,
                        'user_id' => $userId,
                        'activity_type' => $activityType,
                        'title' => $title . ' (Contact: ' . $contact->name . ')',
                        'description' => $description,
                        'old_values' => !empty($oldValues) ? $oldValues : null,
                        'new_values' => !empty($newValues) ? $newValues : null,
                        'created_by' => $createdBy,
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Silently catch so activity logging errors never disrupt task CRUD operations
        }
    }

    public function created($task): void
    {
        $userName = auth()->user()?->name ?? 'System';
        $typeLabel = $task->taskType?->name ?? ucfirst(str_replace('_', ' ', $task->type ?: 'Task'));
        $priorityLabel = $task->taskPriority?->name ?? ucfirst(str_replace('_', ' ', $task->priority ?: 'Medium'));
        $dueDateStr = $task->due_date ? Carbon::parse($task->due_date)->format('M d, Y') : null;
        $timeStr = $task->due_time ? ' at ' . substr($task->due_time, 0, 5) : '';

        $title = $userName . ' scheduled a ' . strtolower($typeLabel) . ': ' . $task->title;
        $description = 'Type: ' . $typeLabel . ' | Priority: ' . $priorityLabel . ($dueDateStr ? ' | Due: ' . $dueDateStr . $timeStr : '');
        if ($task->description) {
            $description .= "\n" . $task->description;
        }

        $this->logActivity($task, 'Task Created', $title, $description, [], $task->toArray());
    }

    public function updated($task): void
    {
        $userName = auth()->user()?->name ?? 'System';
        $changes = $task->getChanges();
        $original = $task->getOriginal();

        if (empty($changes)) return;

        // If status changed
        if (array_key_exists('status', $changes)) {
            $newStatus = $changes['status'];
            if ($newStatus === 'completed') {
                $title = $userName . ' completed task: ' . $task->title;
                $this->logActivity($task, 'Task Completed', $title, 'Task marked as completed.', ['status' => $original['status'] ?? null], ['status' => 'completed']);
            } else {
                $title = $userName . ' updated task status to ' . ucfirst(str_replace('_', ' ', $newStatus)) . ': ' . $task->title;
                $this->logActivity($task, 'Task Status Updated', $title, 'Status changed from ' . ($original['status'] ?? 'unknown') . ' to ' . $newStatus, ['status' => $original['status'] ?? null], ['status' => $newStatus]);
            }
            return;
        }

        // If assigned_to changed
        if (array_key_exists('assigned_to', $changes)) {
            $assignedUser = User::find($task->assigned_to);
            $assignedName = $assignedUser ? $assignedUser->name : 'Unassigned';
            $title = $userName . ' assigned task "' . $task->title . '" to ' . $assignedName;
            $this->logActivity($task, 'Task Assigned', $title, null, ['assigned_to' => $original['assigned_to'] ?? null], ['assigned_to' => $task->assigned_to]);
            return;
        }

        // General update
        if (count(array_diff(array_keys($changes), ['updated_at'])) > 0) {
            $title = $userName . ' updated task: ' . $task->title;
            $this->logActivity($task, 'Task Updated', $title, $task->description, $original, $changes);
        }
    }

    public function deleted($task): void
    {
        $userName = auth()->user()?->name ?? 'System';
        $title = $userName . ' deleted task: ' . $task->title;
        $this->logActivity($task, 'Task Deleted', $title);
    }
}
