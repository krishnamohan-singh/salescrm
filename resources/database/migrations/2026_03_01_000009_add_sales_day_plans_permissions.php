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
            'manage-sales-day-plans',
            'manage-all-sales-day-plans',
            'view-sales-day-plans',
            'view-all-sales-day-plans',
            'create-sales-day-plans',
            'edit-sales-day-plans',
            'delete-sales-day-plans',
            'send-sales-day-plans',
            'review-sales-day-plans',
            'export-sales-day-plans',
        ])->delete();
    }
};
