<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

Artisan::command('db:check-tables', function () {
    $info = [];
    $info['db'] = DB::connection()->getDatabaseName();
    $info['users_count'] = \App\Models\User::count();
    $info['leads_count'] = \App\Models\Lead::count();
    $info['opportunities_count'] = \App\Models\Opportunity::count();
    $info['tasks_count'] = \App\Models\Task::count();
    $info['calls_count'] = \App\Models\Call::count();
    $info['meetings_count'] = \App\Models\Meeting::count();
    $info['quotes_count'] = \App\Models\Quote::count();
    $info['accounts_count'] = \App\Models\Account::count();
    $info['targets_count'] = \App\Models\SalesTarget::count();
    $info['attendances_count'] = \App\Models\Attendance::count();
    $info['requests_count'] = \App\Models\AttendanceRequest::count();
    $info['time_logs_count'] = \App\Models\UserTimeLog::count();

    $users = \App\Models\User::with('roles')->get();
    $info['users'] = $users->map(fn($u) => [
        'id' => $u->id,
        'name' => $u->name,
        'email' => $u->email,
        'type' => $u->type,
        'created_by' => $u->created_by,
        'roles' => $u->roles->pluck('name'),
    ]);

    // Ensure permissions for attendance and dashboards
    $permissions = [
        'manage-attendance',
        'view-attendance',
        'view-all-attendance',
        'create-attendance',
        'edit-attendance',
        'delete-attendance',
        'approve-attendance-requests',
        'export-attendance',
        'view-admin-dashboard',
        'view-manager-dashboard',
        'view-salesperson-dashboard',
    ];

    foreach ($permissions as $pName) {
        \App\Models\Permission::firstOrCreate(['name' => $pName, 'guard_name' => 'web'], [
            'label' => ucwords(str_replace('-', ' ', $pName)),
            'module' => 'attendance',
            'guard_name' => 'web',
        ]);
    }

    $allRoles = \App\Models\Role::all();
    foreach ($allRoles as $r) {
        $rName = strtolower($r->name);
        if (in_array($rName, ['company', 'admin', 'superadmin', 'super admin', 'director', 'founder', 'sales director'])) {
            $r->givePermissionTo($permissions);
        } elseif (in_array($rName, ['manager', 'sales-manager', 'sales manager', 'team lead'])) {
            $r->givePermissionTo(['manage-attendance', 'view-attendance', 'view-all-attendance', 'create-attendance', 'edit-attendance', 'approve-attendance-requests', 'export-attendance', 'view-manager-dashboard', 'view-salesperson-dashboard']);
        } else {
            $r->givePermissionTo(['view-attendance', 'create-attendance', 'view-salesperson-dashboard']);
        }
    }

    file_put_contents(base_path('perms_dump2.json'), json_encode($info, JSON_PRETTY_PRINT));
    $this->info("Database and permissions verified successfully.");
});

Artisan::command('perms:sync-user-performance', function () {
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

    foreach ($permissions as $pData) {
        $perm = App\Models\Permission::firstOrCreate(
            ['name' => $pData['name'], 'guard_name' => 'web'],
            $pData
        );
        $this->info("Permission created/found: {$perm->name} (ID: {$perm->id})");
    }

    $roles = App\Models\Role::all();
    foreach ($roles as $role) {
        $this->info("Role: {$role->name} (guard: {$role->guard_name})");
        if (in_array(strtolower($role->name), ['company', 'admin', 'superadmin', 'super admin', 'super-admin'])) {
            $role->givePermissionTo(['manage-user-performance', 'view-user-performance']);
            $this->info("  -> Assigned permissions to role {$role->name}");
        }
    }

    $perms = App\Models\Permission::all();
    file_put_contents(storage_path('logs/perms_dump.json'), json_encode([
        'total' => $perms->count(),
        'user_perf_perms' => $perms->where('module', 'user_performance')->values()->toArray(),
        'all_modules' => $perms->pluck('module')->unique()->values()->toArray()
    ], JSON_PRETTY_PRINT));
    $this->info("User performance permissions synced successfully.");
});

Artisan::command('app:diagnose-attendance-and-dashboard', function () {
    $info = [];
    $info['db'] = DB::connection()->getDatabaseName();
    $info['users_count'] = \App\Models\User::count();
    $info['leads_count'] = \App\Models\Lead::count();
    $info['opportunities_count'] = \App\Models\Opportunity::count();
    $info['tasks_count'] = \App\Models\Task::count();
    $info['calls_count'] = \App\Models\Call::count();
    $info['meetings_count'] = \App\Models\Meeting::count();
    $info['quotes_count'] = \App\Models\Quote::count();
    $info['accounts_count'] = \App\Models\Account::count();
    $info['targets_count'] = \App\Models\SalesTarget::count();
    $info['attendances_count'] = \App\Models\Attendance::count();
    $info['requests_count'] = \App\Models\AttendanceRequest::count();
    $info['time_logs_count'] = \App\Models\UserTimeLog::count();

    $users = \App\Models\User::with('roles')->get();
    $info['users'] = $users->map(fn($u) => [
        'id' => $u->id,
        'name' => $u->name,
        'email' => $u->email,
        'type' => $u->type,
        'created_by' => $u->created_by,
        'roles' => $u->roles->pluck('name'),
    ]);

    // Ensure permissions for all attendance
    $permissions = [
        'manage-attendance',
        'view-attendance',
        'view-all-attendance',
        'create-attendance',
        'edit-attendance',
        'delete-attendance',
        'approve-attendance-requests',
        'export-attendance',
        'view-admin-dashboard',
        'view-manager-dashboard',
        'view-salesperson-dashboard',
    ];

    foreach ($permissions as $pName) {
        \App\Models\Permission::firstOrCreate(['name' => $pName, 'guard_name' => 'web'], [
            'label' => ucwords(str_replace('-', ' ', $pName)),
            'module' => 'attendance',
            'guard_name' => 'web',
        ]);
    }

    $allRoles = \App\Models\Role::all();
    foreach ($allRoles as $r) {
        $rName = strtolower($r->name);
        if (in_array($rName, ['company', 'admin', 'superadmin', 'super admin', 'director', 'founder', 'sales director'])) {
            $r->givePermissionTo($permissions);
        } elseif (in_array($rName, ['manager', 'sales-manager', 'sales manager', 'team lead'])) {
            $r->givePermissionTo(['manage-attendance', 'view-attendance', 'view-all-attendance', 'create-attendance', 'edit-attendance', 'approve-attendance-requests', 'export-attendance', 'view-manager-dashboard', 'view-salesperson-dashboard']);
        } else {
            $r->givePermissionTo(['view-attendance', 'create-attendance', 'view-salesperson-dashboard']);
        }
    }

    file_put_contents(storage_path('logs/diagnose.json'), json_encode($info, JSON_PRETTY_PRINT));
    $this->info("Diagnose complete. Output in storage/logs/diagnose.json");
});

Artisan::command('users:set-passwords {password=password} {email?}', function ($password = 'password', $email = null) {
    $query = \App\Models\User::query();
    if ($email) {
        $query->where('email', $email);
    }
    $users = $query->get();
    foreach ($users as $user) {
        $user->password = $password;
        $user->save();
        $this->info("Updated password for: {$user->email} -> '{$password}'");
    }
    $this->info("Done! Updated {$users->count()} user(s).");
});



