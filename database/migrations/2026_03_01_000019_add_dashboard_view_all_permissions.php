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
                'name' => 'view-all-dashboard-data',
                'module' => 'dashboard',
                'label' => 'View All Dashboard Data',
                'description' => 'Can toggle and view aggregated all team/company data on sales dashboard',
                'guard_name' => 'web',
            ],
            [
                'name' => 'manage-all-dashboard-data',
                'module' => 'dashboard',
                'label' => 'Manage All Dashboard Data',
                'description' => 'Can manage and view all sales data across all modules on dashboard',
                'guard_name' => 'web',
            ],
        ];

        foreach ($permissions as $permData) {
            Permission::firstOrCreate(
                ['name' => $permData['name'], 'guard_name' => $permData['guard_name']],
                $permData
            );
        }

        // Assign to Admin, Company, and Director/Founder roles
        $roles = Role::whereIn('name', ['super admin', 'superadmin', 'admin', 'company', 'Director', 'Founder', 'Sales Director'])->get();
        foreach ($roles as $role) {
            foreach ($permissions as $perm) {
                try {
                    if (!$role->hasPermissionTo($perm['name'])) {
                        $role->givePermissionTo($perm['name']);
                    }
                } catch (\Exception $e) {}
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Permission::whereIn('name', [
            'view-all-dashboard-data',
            'manage-all-dashboard-data',
        ])->delete();
    }
};
