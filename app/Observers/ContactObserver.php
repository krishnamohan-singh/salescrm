<?php

namespace App\Observers;

use App\Models\Contact;
use App\Models\ContactActivity;
use App\Models\User;

class ContactObserver
{
    public function created(Contact $contact): void
    {
        $creator = User::find(auth()->id() ?? $contact->created_by);
        $assignedName = $contact->assignedUser ? $contact->assignedUser->name : 'Unassigned';
        $selfAssigned = $creator && $contact->assignedUser && $creator->id === $contact->assignedUser->id;

        ContactActivity::create([
            'contact_id' => $contact->id,
            'user_id' => $creator->id ?? $contact->created_by,
            'activity_type' => 'created',
            'title' => ($creator->name ?? 'System') . ' created this contact',
            'description' => ucfirst($contact->status ?? 'Active'),
            'new_values' => $contact->toArray(),
            'created_by' => $contact->created_by
        ]);

        if (!$selfAssigned && $contact->assignedUser) {
            ContactActivity::create([
                'contact_id' => $contact->id,
                'user_id' => $creator->id ?? $contact->created_by,
                'activity_type' => 'assigned',
                'title' => ($creator->name ?? 'System') . ' assigned to ' . $assignedName,
                'description' => '',
                'new_values' => ['assigned_to' => $contact->assigned_to],
                'created_by' => $contact->created_by
            ]);
        } elseif ($selfAssigned) {
            ContactActivity::create([
                'contact_id' => $contact->id,
                'user_id' => $creator->id ?? $contact->created_by,
                'activity_type' => 'assigned',
                'title' => ($creator->name ?? 'System') . ' self-assigned this contact',
                'description' => '',
                'new_values' => ['assigned_to' => $contact->assigned_to],
                'created_by' => $contact->created_by
            ]);
        }
    }

    public function updated(Contact $contact): void
    {
        $changes = $contact->getChanges();
        $original = $contact->getOriginal();

        if (empty($changes)) return;

        $userName = auth()->user()?->name ?? 'System';

        foreach ($changes as $field => $newValue) {
            if (in_array($field, ['updated_at'])) continue;

            $oldValue = $original[$field] ?? null;

            $title = $this->getUpdateTitle($field, $oldValue, $newValue, $userName);
            $description = $this->getUpdateDescription($field, $oldValue, $newValue);

            ContactActivity::create([
                'contact_id' => $contact->id,
                'user_id' => auth()->id() ?? $contact->created_by,
                'activity_type' => 'updated',
                'title' => $title,
                'description' => $description,
                'field_changed' => $field,
                'old_values' => [$field => $oldValue],
                'new_values' => [$field => $newValue],
                'created_by' => $contact->created_by
            ]);
        }
    }

    private function getUpdateTitle($field, $oldValue, $newValue, $userName): string
    {
        switch ($field) {
            case 'status':
                return $userName . ' updated status';
            case 'name':
                return $userName . ' updated name';
            case 'email':
                return $userName . ' updated email';
            case 'phone':
                return $userName . ' updated phone';
            case 'position':
                return $userName . ' updated job title/position';
            case 'account_id':
                return $userName . ' updated associated account';
            case 'assigned_to':
                $newUser = $newValue ? User::find($newValue)?->name : 'Unassigned';
                if ($newUser === $userName) {
                    return $userName . ' self-assigned this contact';
                }
                return $userName . ' assigned to ' . $newUser;
            default:
                $fieldName = str_replace(['_id', '_'], [' ', ' '], $field);
                return $userName . ' updated ' . $fieldName;
        }
    }

    private function getUpdateDescription($field, $oldValue, $newValue): string
    {
        switch ($field) {
            case 'status':
                $statusColors = [
                    'active' => 'bg-green-50 text-green-700 ring-green-600/20',
                    'inactive' => 'bg-red-50 text-red-700 ring-red-600/20'
                ];
                $oldColor = $statusColors[$oldValue] ?? $statusColors['active'];
                $newColor = $statusColors[$newValue] ?? $statusColors['active'];
                $oldStatus = $oldValue ? '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ' . $oldColor . '">' . ucfirst($oldValue) . '</span>' : 'None';
                $newStatus = $newValue ? '<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ' . $newColor . '">' . ucfirst($newValue) . '</span>' : 'None';
                return $oldStatus . ' into ' . $newStatus;
            case 'account_id':
                $oldAccount = $oldValue ? \App\Models\Account::find($oldValue)?->name : 'None';
                $newAccount = $newValue ? \App\Models\Account::find($newValue)?->name : 'None';
                return '<span class="font-bold text-base">' . ($oldAccount ?? 'None') . '</span> into <span class="font-bold text-base">' . ($newAccount ?? 'None') . '</span>';
            case 'assigned_to':
                $oldUser = $oldValue ? User::find($oldValue)?->name : 'Unassigned';
                $newUser = $newValue ? User::find($newValue)?->name : 'Unassigned';
                return '<span class="font-bold text-base">' . $oldUser . '</span> into <span class="font-bold text-base">' . $newUser . '</span>';
            default:
                $oldVal = $oldValue ?? 'None';
                $newVal = $newValue ?? 'None';
                return '<span class="font-bold text-base">' . $oldVal . '</span> into <span class="font-bold text-base">' . $newVal . '</span>';
        }
    }
}
