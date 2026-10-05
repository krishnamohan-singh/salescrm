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
                'name' => 'manage-dashboard',
                'module' => 'dashboard',
                'label' => 'Manage Dashboard',
                'description' => 'Can access and manage dashboards',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-admin-dashboard',
                'module' => 'dashboard',
                'label' => 'View Admin / Director Dashboard',
                'description' => 'Can view Sales Director / Founder / Admin Dashboard with company performance and strategic analytics',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-manager-dashboard',
                'module' => 'dashboard',
                'label' => 'View Sales Manager Dashboard',
                'description' => 'Can view Sales Manager Dashboard with business and team visibility',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-salesperson-dashboard',
                'module' => 'dashboard',
                'label' => 'View Salesperson Dashboard',
                'description' => 'Can view Salesperson Dashboard with targets, pipeline, clients, and priorities',
                'guard_name' => 'web',
            ],
            [
                'name' => 'manage-dashboard-settings',
                'module' => 'dashboard',
                'label' => 'Manage Dashboard Settings',
                'description' => 'Can configure role dashboard assignments and default views',
                'guard_name' => 'web',
            ],
        ];

        foreach ($permissions as $permData) {
            Permission::firstOrCreate(
                ['name' => $permData['name'], 'guard_name' => $permData['guard_name']],
                $permData
            );
        }

        // Assign permissions to Admin & Company roles
        $adminRoles = Role::whereIn('name', ['super admin', 'superadmin', 'admin', 'company', 'Director', 'Founder', 'Sales Director'])->get();
        foreach ($adminRoles as $role) {
            foreach ($permissions as $perm) {
                try {
                    if (!$role->hasPermissionTo($perm['name'])) {
                        $role->givePermissionTo($perm['name']);
                    }
                } catch (\Exception $e) {}
            }
        }

        // Assign permissions to Manager roles
        $managerRoles = Role::whereIn('name', ['manager', 'sales-manager', 'sales manager', 'Team Lead'])->get();
        foreach ($managerRoles as $role) {
            $mgrPerms = ['manage-dashboard', 'view-manager-dashboard', 'view-salesperson-dashboard'];
            foreach ($mgrPerms as $permName) {
                try {
                    if (!$role->hasPermissionTo($permName)) {
                        $role->givePermissionTo($permName);
                    }
                } catch (\Exception $e) {}
            }
        }

        // Assign permissions to Salesperson roles
        $salesRoles = Role::whereIn('name', ['salesperson', 'sales-executive', 'sales executive', 'staff', 'employee'])->get();
        foreach ($salesRoles as $role) {
            $salesPerms = ['manage-dashboard', 'view-salesperson-dashboard'];
            foreach ($salesPerms as $permName) {
                try {
                    if (!$role->hasPermissionTo($permName)) {
                        $role->givePermissionTo($permName);
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
        $permissions = [
            'view-admin-dashboard',
            'view-manager-dashboard',
            'view-salesperson-dashboard',
            'manage-dashboard-settings',
        ];

        foreach ($permissions as $name) {
            try {
                Permission::where('name', $name)->delete();
            } catch (\Exception $e) {}
        }
    }
};