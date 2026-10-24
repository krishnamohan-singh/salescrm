<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

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
            ],
            [
                'name' => 'view-services',
                'module' => 'services',
                'label' => 'View Services',
                'description' => 'Can view services and mapped entities',
            ],
            [
                'name' => 'create-services',
                'module' => 'services',
                'label' => 'Create Services',
                'description' => 'Can create new services in catalog',
            ],
            [
                'name' => 'edit-services',
                'module' => 'services',
                'label' => 'Edit Services',
                'description' => 'Can edit service details and pricing',
            ],
            [
                'name' => 'delete-services',
                'module' => 'services',
                'label' => 'Delete Services',
                'description' => 'Can delete services from catalog',
            ],
            [
                'name' => 'toggle-status-services',
                'module' => 'services',
                'label' => 'Toggle Status Services',
                'description' => 'Can activate or deactivate services',
            ],
        ];

        $createdPerms = [];
        foreach ($perms as $p) {
            $createdPerms[] = Permission::firstOrCreate(
                ['name' => $p['name'], 'guard_name' => 'web'],
                $p
            );
        }

        // Assign to Superadmin
        $superAdminRoles = Role::whereIn('name', ['superadmin', 'super admin'])->get();
        foreach ($superAdminRoles as $sRole) {
            foreach ($createdPerms as $perm) {
                $sRole->givePermissionTo($perm);
            }
        }

        // Assign to Company / Admin
        $companyRoles = Role::whereIn('name', ['company', 'admin'])->get();
        foreach ($companyRoles as $cRole) {
            foreach ($createdPerms as $perm) {
                $cRole->givePermissionTo($perm);
            }
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $perms = [
            'manage-services',
            'view-services',
            'create-services',
            'edit-services',
            'delete-services',
            'toggle-status-services',
        ];

        Permission::whereIn('name', $perms)->delete();
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
