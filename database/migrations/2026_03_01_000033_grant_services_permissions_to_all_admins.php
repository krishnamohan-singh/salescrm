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
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $perms = [
            [
                'name' => 'manage-services',
                'module' => 'services',
                'label' => 'Manage Services',
                'description' => 'Can view and manage services catalog and mappings',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-services',
                'module' => 'services',
                'label' => 'View Services',
                'description' => 'Can view services and mapped entities',
                'guard_name' => 'web',
            ],
            [
                'name' => 'create-services',
                'module' => 'services',
                'label' => 'Create Services',
                'description' => 'Can create new services in catalog',
                'guard_name' => 'web',
            ],
            [
                'name' => 'edit-services',
                'module' => 'services',
                'label' => 'Edit Services',
                'description' => 'Can edit service details and pricing',
                'guard_name' => 'web',
            ],
            [
                'name' => 'delete-services',
                'module' => 'services',
                'label' => 'Delete Services',
                'description' => 'Can delete services from catalog',
                'guard_name' => 'web',
            ],
            [
                'name' => 'toggle-status-services',
                'module' => 'services',
                'label' => 'Toggle Status Services',
                'description' => 'Can activate or deactivate services',
                'guard_name' => 'web',
            ],
        ];

        $createdPerms = [];
        foreach ($perms as $p) {
            $createdPerms[] = Permission::updateOrCreate(
                ['name' => $p['name'], 'guard_name' => 'web'],
                $p
            );
        }

        $permNames = array_column($perms, 'name');

        // Grant to all Admin, Company, and SuperAdmin roles
        $roles = Role::where('guard_name', 'web')->get();
        foreach ($roles as $role) {
            $rName = strtolower($role->name);
            if (
                str_contains($rName, 'admin') ||
                str_contains($rName, 'company') ||
                str_contains($rName, 'super') ||
                str_contains($rName, 'owner') ||
                str_contains($rName, 'founder') ||
                str_contains($rName, 'director')
            ) {
                try {
                    $role->givePermissionTo($permNames);
                } catch (\Throwable $e) {
                    // Ignore if already assigned
                }
            }
        }

        // Grant directly to all admin/company users
        $adminUsers = User::whereIn('type', ['company', 'admin', 'superadmin', 'super admin'])->get();
        foreach ($adminUsers as $user) {
            try {
                $user->givePermissionTo($permNames);
            } catch (\Throwable $e) {
                // Ignore if already assigned
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep permissions intact
    }
};
