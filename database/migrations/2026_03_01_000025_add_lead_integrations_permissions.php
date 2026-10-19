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
                'name' => 'manage-lead-integrations',
                'module' => 'leads',
                'label' => 'Manage Lead Integrations',
                'description' => 'Can configure Facebook, Google Ads, Webhooks, and API Lead integrations',
            ],
            [
                'name' => 'view-lead-integrations',
                'module' => 'leads',
                'label' => 'View Lead Integrations',
                'description' => 'Can view lead integration settings and URLs',
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
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        Permission::whereIn('name', ['manage-lead-integrations', 'view-lead-integrations'])->delete();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
