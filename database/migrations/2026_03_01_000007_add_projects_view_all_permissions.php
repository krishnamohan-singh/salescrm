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
                'name' => 'manage-all-projects',
                'module' => 'projects',
                'label' => 'Manage All Projects',
                'description' => 'Can view and manage all projects in the company',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-projects',
                'module' => 'projects',
                'label' => 'View All Projects',
                'description' => 'Can view all projects in the company',
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
            'manage-all-projects',
            'view-all-projects',
        ])->delete();
    }
};
