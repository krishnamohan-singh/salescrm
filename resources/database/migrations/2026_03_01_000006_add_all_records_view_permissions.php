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
            // Lead Permissions
            [
                'name' => 'manage-all-leads',
                'module' => 'leads',
                'label' => 'Manage All Leads',
                'description' => 'Can view and manage all leads in the company',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-leads',
                'module' => 'leads',
                'label' => 'View All Leads',
                'description' => 'Can view all leads in the company',
                'guard_name' => 'web',
            ],

            // Account Permissions
            [
                'name' => 'manage-all-accounts',
                'module' => 'accounts',
                'label' => 'Manage All Accounts',
                'description' => 'Can view and manage all accounts in the company',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-accounts',
                'module' => 'accounts',
                'label' => 'View All Accounts',
                'description' => 'Can view all accounts in the company',
                'guard_name' => 'web',
            ],

            // Opportunity Permissions
            [
                'name' => 'manage-all-opportunities',
                'module' => 'opportunities',
                'label' => 'Manage All Opportunities',
                'description' => 'Can view and manage all opportunities in the company',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-opportunities',
                'module' => 'opportunities',
                'label' => 'View All Opportunities',
                'description' => 'Can view all opportunities in the company',
                'guard_name' => 'web',
            ],

            // Contact Permissions
            [
                'name' => 'manage-all-contacts',
                'module' => 'contacts',
                'label' => 'Manage All Contacts',
                'description' => 'Can view and manage all contacts in the company',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-contacts',
                'module' => 'contacts',
                'label' => 'View All Contacts',
                'description' => 'Can view all contacts in the company',
                'guard_name' => 'web',
            ],

            // Universal Task Permissions
            [
                'name' => 'manage-tasks',
                'module' => 'tasks',
                'label' => 'Manage Tasks',
                'description' => 'Can manage tasks',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-tasks',
                'module' => 'tasks',
                'label' => 'View Tasks',
                'description' => 'Can view tasks',
                'guard_name' => 'web',
            ],
            [
                'name' => 'create-tasks',
                'module' => 'tasks',
                'label' => 'Create Tasks',
                'description' => 'Can create tasks',
                'guard_name' => 'web',
            ],
            [
                'name' => 'edit-tasks',
                'module' => 'tasks',
                'label' => 'Edit Tasks',
                'description' => 'Can edit tasks',
                'guard_name' => 'web',
            ],
            [
                'name' => 'delete-tasks',
                'module' => 'tasks',
                'label' => 'Delete Tasks',
                'description' => 'Can delete tasks',
                'guard_name' => 'web',
            ],
            [
                'name' => 'manage-all-tasks',
                'module' => 'tasks',
                'label' => 'Manage All Tasks',
                'description' => 'Can view and manage all tasks in the company',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-tasks',
                'module' => 'tasks',
                'label' => 'View All Tasks',
                'description' => 'Can view all tasks in the company',
                'guard_name' => 'web',
            ],

            // Project Task Permissions
            [
                'name' => 'manage-all-project-tasks',
                'module' => 'project_tasks',
                'label' => 'Manage All Project Tasks',
                'description' => 'Can view and manage all project tasks in the company',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-project-tasks',
                'module' => 'project_tasks',
                'label' => 'View All Project Tasks',
                'description' => 'Can view all project tasks in the company',
                'guard_name' => 'web',
            ],
        ];

        $permissionNames = [];
        foreach ($permissions as $permData) {
            $perm = Permission::firstOrCreate(
                ['name' => $permData['name'], 'guard_name' => $permData['guard_name']],
                $permData
            );
            $permissionNames[] = $permData['name'];
        }

        // Assign to company, admin, and superadmin roles
        $roles = Role::whereIn('name', ['company', 'admin', 'superadmin', 'super-admin'])->get();
        foreach ($roles as $role) {
            $role->givePermissionTo($permissionNames);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Permission::whereIn('name', [
            'manage-all-leads',
            'view-all-leads',
            'manage-all-accounts',
            'view-all-accounts',
            'manage-all-opportunities',
            'view-all-opportunities',
            'manage-all-contacts',
            'view-all-contacts',
            'manage-tasks',
            'view-tasks',
            'create-tasks',
            'edit-tasks',
            'delete-tasks',
            'manage-all-tasks',
            'view-all-tasks',
            'manage-all-project-tasks',
            'view-all-project-tasks',
        ])->delete();
    }
};
