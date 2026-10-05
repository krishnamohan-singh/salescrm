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
        $permissions = [
            'manage-targets',
            'view-targets',
            'create-targets',
            'edit-targets',
            'delete-targets',
            'allocate-targets',
            'manage-all-targets',
            'view-all-targets',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        // Assign to Super Admin & Company & Admin roles
        $superAdminRoles = Role::whereIn('name', ['super admin', 'superadmin', 'admin', 'company'])->get();
        foreach ($superAdminRoles as $role) {
            foreach ($permissions as $name) {
                if (!$role->hasPermissionTo($name)) {
                    $role->givePermissionTo($name);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissions = [
            'manage-targets',
            'view-targets',
            'create-targets',
            'edit-targets',
            'delete-targets',
            'allocate-targets',
            'manage-all-targets',
            'view-all-targets',
        ];

        foreach ($permissions as $name) {
            Permission::where('name', $name)->delete();
        }
    }
};
