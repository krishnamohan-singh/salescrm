<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            // Target Management
            [
                'name' => 'manage-targets',
                'module' => 'targets',
                'label' => 'Manage Targets',
                'description' => 'Can view and manage sales targets',
                'guard_name' => 'web',
            ],
            [
                'name' => 'manage-all-targets',
                'module' => 'targets',
                'label' => 'Manage All Targets',
                'description' => 'Can view and manage all team members sales targets',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-targets',
                'module' => 'targets',
                'label' => 'View Targets',
                'description' => 'Can view sales targets',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-targets',
                'module' => 'targets',
                'label' => 'View All Targets',
                'description' => 'Can view all team members sales targets',
                'guard_name' => 'web',
            ],
            [
                'name' => 'create-targets',
                'module' => 'targets',
                'label' => 'Create Targets',
                'description' => 'Can create sales targets',
                'guard_name' => 'web',
            ],
            [
                'name' => 'edit-targets',
                'module' => 'targets',
                'label' => 'Edit Targets',
                'description' => 'Can edit sales targets',
                'guard_name' => 'web',
            ],
            [
                'name' => 'delete-targets',
                'module' => 'targets',
                'label' => 'Delete Targets',
                'description' => 'Can delete sales targets',
                'guard_name' => 'web',
            ],
            [
                'name' => 'allocate-targets',
                'module' => 'targets',
                'label' => 'Allocate Targets',
                'description' => 'Can allocate and assign targets to team members',
                'guard_name' => 'web',
            ],
            [
                'name' => 'export-targets',
                'module' => 'targets',
                'label' => 'Export Targets',
                'description' => 'Can export sales targets data',
                'guard_name' => 'web',
            ],

            // Sales Day Plans
            [
                'name' => 'manage-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'Manage Sales Day Plans',
                'description' => 'Can view and manage day plans',
                'guard_name' => 'web',
            ],
            [
                'name' => 'manage-all-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'Manage All Sales Day Plans',
                'description' => 'Can view and manage all team members day plans',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'View Sales Day Plans',
                'description' => 'Can view day plans',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'View All Sales Day Plans',
                'description' => 'Can view all team members day plans',
                'guard_name' => 'web',
            ],
            [
                'name' => 'create-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'Create Sales Day Plans',
                'description' => 'Can create daily sales plans',
                'guard_name' => 'web',
            ],
            [
                'name' => 'edit-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'Edit Sales Day Plans',
                'description' => 'Can edit sales day plans and submit EOD reports',
                'guard_name' => 'web',
            ],
            [
                'name' => 'delete-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'Delete Sales Day Plans',
                'description' => 'Can delete sales day plans',
                'guard_name' => 'web',
            ],
            [
                'name' => 'send-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'Send Sales Daily Reports',
                'description' => 'Can send/email daily reports to managers',
                'guard_name' => 'web',
            ],
            [
                'name' => 'review-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'Review Sales Day Plans',
                'description' => 'Can review and provide feedback on sales day plans',
                'guard_name' => 'web',
            ],
            [
                'name' => 'export-sales-day-plans',
                'module' => 'sales_day_plans',
                'label' => 'Export Sales Day Plans',
                'description' => 'Can export sales day plans and reports',
                'guard_name' => 'web',
            ],

            // User Performance
            [
                'name' => 'manage-user-performance',
                'module' => 'user_performance',
                'label' => 'Manage User Performance',
                'description' => 'Can view and manage team user performance dashboard and time logs',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-user-performance',
                'module' => 'user_performance',
                'label' => 'View User Performance',
                'description' => 'Can view user performance dashboard',
                'guard_name' => 'web',
            ],

            // Universal Tasks
            [
                'name' => 'manage-tasks',
                'module' => 'tasks',
                'label' => 'Manage Tasks',
                'description' => 'Can manage tasks',
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
                'name' => 'view-tasks',
                'module' => 'tasks',
                'label' => 'View Tasks',
                'description' => 'View Tasks',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-tasks',
                'module' => 'tasks',
                'label' => 'View All Tasks',
                'description' => 'Can view all tasks in the company',
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
        ];

        // 1. Ensure all permissions are created/updated with correct metadata
        foreach ($permissions as $permData) {
            Permission::updateOrCreate(
                ['name' => $permData['name'], 'guard_name' => $permData['guard_name']],
                [
                    'module' => $permData['module'],
                    'label' => $permData['label'],
                    'description' => $permData['description'],
                ]
            );
        }

        // 2. Assign Superadmin all permissions
        $superAdminRoles = Role::whereIn('name', ['superadmin', 'super admin'])->get();
        $allPermissions = Permission::all();
        foreach ($superAdminRoles as $sRole) {
            $sRole->syncPermissions($allPermissions);
        }

        // 3. Assign company role all company-module permissions
        $companyModules = config('role-permissions.company', []);
        $companyPermissions = Permission::where(function ($q) use ($companyModules) {
            $q->whereIn('module', $companyModules)
              ->orWhereIn('name', [
                  'view-permissions',
                  'manage-plans',
                  'view-plans',
                  'manage-plan-requests',
                  'manage-plan-orders',
                  'view-plan-orders',
                  'request-plans',
                  'trial-plans',
                  'subscribe-plans',
                  'manage-referral',
                  'manage-users-referral',
                  'manage-setting-referral',
                  'manage-payout-referral',
                  'approve-payout-referral',
                  'reject-payout-referral',
                  'manage-email-settings',
                  'manage-brand-settings',
                  'manage-webhook-settings',
                  'manage-settings',
                  'manage-invoices-settings',
                  'manage-quotes-settings',
                  'manage-sales-orders-settings',
                  'manage-calendar',
                  'view-calendar',
                  'manage-language',
                  'edit-language',
                  'view-language',
                  'view-landing-page',
                  'manage-analytics',
                  'manage-login-history',
                  'show-login-history',
                  'delete-login-history',
              ]);
        })->get();

        $companyRoles = Role::whereIn('name', ['company', 'admin'])->get();
        foreach ($companyRoles as $cRole) {
            $cRole->syncPermissions($companyPermissions);
        }

        // 4. Assign permissions to existing staff roles
        $salesManagerPerms = [
            'manage-user-performance', 'view-user-performance',
            'manage-targets', 'view-targets', 'create-targets', 'edit-targets', 'delete-targets', 'allocate-targets', 'manage-all-targets', 'view-all-targets', 'export-targets',
            'manage-sales-day-plans', 'view-sales-day-plans', 'create-sales-day-plans', 'edit-sales-day-plans', 'delete-sales-day-plans', 'send-sales-day-plans', 'review-sales-day-plans', 'manage-all-sales-day-plans', 'view-all-sales-day-plans', 'export-sales-day-plans',
            'manage-tasks', 'view-tasks', 'create-tasks', 'edit-tasks', 'delete-tasks', 'manage-all-tasks', 'view-all-tasks',
        ];
        $salesManagerRoles = Role::where('name', 'sales-manager')->get();
        foreach ($salesManagerRoles as $smRole) {
            $smRole->givePermissionTo(Permission::whereIn('name', $salesManagerPerms)->get());
        }

        $salesRepPerms = [
            'manage-targets', 'view-targets',
            'manage-sales-day-plans', 'view-sales-day-plans', 'create-sales-day-plans', 'edit-sales-day-plans', 'send-sales-day-plans',
            'manage-tasks', 'view-tasks', 'create-tasks', 'edit-tasks',
        ];
        $salesRepRoles = Role::where('name', 'sales-rep')->get();
        foreach ($salesRepRoles as $srRole) {
            $srRole->givePermissionTo(Permission::whereIn('name', $salesRepPerms)->get());
        }

        $managerRoles = Role::where('name', 'manager')->get();
        foreach ($managerRoles as $mRole) {
            $mRole->givePermissionTo(Permission::whereIn('name', $salesManagerPerms)->get());
        }

        // Reset cached permissions again
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
