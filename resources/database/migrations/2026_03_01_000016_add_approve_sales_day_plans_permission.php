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

        // 1. Create approve-sales-day-plans permission if not exists
        $approvePerm = Permission::firstOrCreate(
            ['name' => 'approve-sales-day-plans', 'guard_name' => 'web'],
            [
                'module' => 'sales_day_plans',
                'label' => 'Approve Sales Day Plans',
                'description' => 'Can approve daily plans below target and request plan revisions',
            ]
        );

        // 2. Assign to Superadmin roles
        $superAdminRoles = Role::whereIn('name', ['superadmin', 'super admin'])->get();
        foreach ($superAdminRoles as $sRole) {
            $sRole->givePermissionTo($approvePerm);
        }

        // 3. Assign to Company / Admin roles
        $companyRoles = Role::whereIn('name', ['company', 'admin'])->get();
        foreach ($companyRoles as $cRole) {
            $cRole->givePermissionTo($approvePerm);
        }

        // 4. Assign to Manager and Sales Manager roles
        $managerRoles = Role::whereIn('name', ['sales-manager', 'manager', 'general-manager', 'director'])->get();
        foreach ($managerRoles as $mRole) {
            $mRole->givePermissionTo($approvePerm);
        }

        // 5. Ensure regular sales-rep roles DO NOT have approve-sales-day-plans or review-sales-day-plans
        $salesRepRoles = Role::where('name', 'sales-rep')->get();
        foreach ($salesRepRoles as $srRole) {
            $srRole->revokePermissionTo(['approve-sales-day-plans', 'review-sales-day-plans']);
        }

        // Reset cached permissions again
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
