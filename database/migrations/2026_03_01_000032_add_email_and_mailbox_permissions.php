<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Permission;
use App\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $permissions = [
            [
                'name' => 'manage-emails',
                'module' => 'emails',
                'label' => 'Manage Emails & Mailbox',
                'description' => 'Can access Emails & Mailbox, connect separate Google account, send and sync emails',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-emails',
                'module' => 'emails',
                'label' => 'View Own Emails & Mailbox',
                'description' => 'Can view own sent and received emails and Mailbox',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-emails',
                'module' => 'emails',
                'label' => 'View All Emails & Mailbox',
                'description' => 'Can view all emails across company team members',
                'guard_name' => 'web',
            ],
            [
                'name' => 'send-emails',
                'module' => 'emails',
                'label' => 'Send Emails',
                'description' => 'Can compose and send emails to leads, contacts, accounts, and opportunities',
                'guard_name' => 'web',
            ],
            [
                'name' => 'delete-emails',
                'module' => 'emails',
                'label' => 'Delete Emails',
                'description' => 'Can delete emails from CRM Mailbox',
                'guard_name' => 'web',
            ],
        ];

        foreach ($permissions as $permData) {
            Permission::firstOrCreate(
                ['name' => $permData['name'], 'guard_name' => $permData['guard_name']],
                $permData
            );
        }

        // Automatically assign all email permissions to company and admin roles
        $roles = Role::whereIn('name', ['company', 'admin', 'superadmin', 'super-admin'])->get();
        $permNames = array_column($permissions, 'name');
        foreach ($roles as $role) {
            $role->givePermissionTo($permNames);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permNames = ['manage-emails', 'view-emails', 'view-all-emails', 'send-emails', 'delete-emails'];
        Permission::whereIn('name', $permNames)->delete();
    }
};
