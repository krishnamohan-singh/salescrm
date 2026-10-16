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
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create assign-leads permission if not exists
        $assignPerm = Permission::firstOrCreate(
            ['name' => 'assign-leads', 'guard_name' => 'web'],
            [
                'module' => 'leads',
                'label' => 'Assign Leads',
                'description' => 'Can assign leads to sales users',
            ]
        );

        // 2. Assign to Superadmin roles
        $superAdminRoles = Role::whereIn('name', ['superadmin', 'super admin'])->get();
        foreach ($superAdminRoles as $sRole) {
            $sRole->givePermissionTo($assignPerm);
        }

        // 3. Assign to Company / Admin roles
        $companyRoles = Role::whereIn('name', ['company', 'admin'])->get();
        foreach ($companyRoles as $cRole) {
            $cRole->givePermissionTo($assignPerm);
        }

        // 4. Assign to Manager and Sales Manager roles
        $managerRoles = Role::whereIn('name', ['sales-manager', 'manager', 'general-manager', 'director'])->get();
        foreach ($managerRoles as $mRole) {
            $mRole->givePermissionTo($assignPerm);
        }

        // Reset cached permissions again
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $perm = Permission::where('name', 'assign-leads')->first();
        if ($perm) {
            $perm->delete();
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
