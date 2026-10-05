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
        ];

        foreach ($permissions as $permData) {
            $perm = Permission::firstOrCreate(
                ['name' => $permData['name'], 'guard_name' => $permData['guard_name']],
                $permData
            );
        }

        // Assign to company and admin roles if they exist
        $roles = Role::whereIn('name', ['company', 'admin', 'superadmin', 'super-admin'])->get();
        foreach ($roles as $role) {
            $role->givePermissionTo(['manage-user-performance', 'view-user-performance']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Permission::whereIn('name', ['manage-user-performance', 'view-user-performance'])->delete();
    }
};
