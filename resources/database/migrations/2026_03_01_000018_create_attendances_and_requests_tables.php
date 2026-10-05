<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\Permission;
use App\Models\Role;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create attendances table
        if (!Schema::hasTable('attendances')) {
            Schema::create('attendances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->unsignedBigInteger('created_by')->default(0)->index();
                $table->date('date')->index();
                
                $table->dateTime('clock_in')->nullable();
                $table->dateTime('clock_out')->nullable();
                
                // Status: present, late, half_day, absent, on_leave, holiday, week_off
                $table->string('status', 30)->default('present');
                
                // Durations
                $table->decimal('total_hours', 5, 2)->default(0);
                $table->decimal('active_hours', 5, 2)->default(0);
                $table->decimal('idle_hours', 5, 2)->default(0);
                $table->decimal('break_hours', 5, 2)->default(0);
                $table->decimal('overtime_hours', 5, 2)->default(0);
                
                // Seconds for precision
                $table->unsignedInteger('total_seconds')->default(0);
                $table->unsignedInteger('active_seconds')->default(0);
                $table->unsignedInteger('idle_seconds')->default(0);
                $table->unsignedInteger('break_seconds')->default(0);
                
                // Details & Flags
                $table->boolean('is_late')->default(false);
                $table->unsignedInteger('late_minutes')->default(0);
                $table->boolean('is_half_day')->default(false);
                $table->boolean('is_overtime')->default(false);
                $table->unsignedInteger('overtime_minutes')->default(0);
                
                // Network & Location info
                $table->string('clock_in_ip', 45)->nullable();
                $table->string('clock_out_ip', 45)->nullable();
                $table->string('clock_in_location')->nullable();
                $table->string('clock_out_location')->nullable();
                $table->text('clock_in_note')->nullable();
                $table->text('clock_out_note')->nullable();
                
                // Break details stored as JSON [{start, end, reason, duration}]
                $table->json('breaks')->nullable();
                $table->boolean('is_on_break')->default(false);
                $table->dateTime('current_break_start')->nullable();
                $table->string('current_break_reason')->nullable();
                
                // Approval
                $table->string('approval_status', 20)->default('approved'); // approved, pending, rejected
                $table->unsignedBigInteger('approved_by')->nullable();
                
                $table->timestamps();

                $table->unique(['user_id', 'date']);
            });
        }

        // 2. Create attendance_requests table
        if (!Schema::hasTable('attendance_requests')) {
            Schema::create('attendance_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->unsignedBigInteger('created_by')->default(0)->index();
                $table->date('date')->index();
                
                // Request Type: punch_regularization, manual_punch, leave, half_day, overtime
                $table->string('type', 40)->default('punch_regularization');
                $table->dateTime('clock_in')->nullable();
                $table->dateTime('clock_out')->nullable();
                $table->text('reason')->nullable();
                
                // Status: pending, approved, rejected
                $table->string('status', 20)->default('pending')->index();
                $table->unsignedBigInteger('reviewed_by')->nullable();
                $table->dateTime('reviewed_at')->nullable();
                $table->text('admin_notes')->nullable();
                
                $table->timestamps();
            });
        }

        // 3. Create Attendance Permissions
        $permissions = [
            [
                'name' => 'manage-attendance',
                'module' => 'attendance',
                'label' => 'Manage Attendance',
                'description' => 'Can manage full attendance module and settings',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-attendance',
                'module' => 'attendance',
                'label' => 'View Attendance',
                'description' => 'Can view attendance dashboard and timesheets',
                'guard_name' => 'web',
            ],
            [
                'name' => 'view-all-attendance',
                'module' => 'attendance',
                'label' => 'View All Attendance',
                'description' => 'Can view company-wide attendance and all employee logs',
                'guard_name' => 'web',
            ],
            [
                'name' => 'create-attendance',
                'module' => 'attendance',
                'label' => 'Create Attendance',
                'description' => 'Can manually record or punch attendance',
                'guard_name' => 'web',
            ],
            [
                'name' => 'edit-attendance',
                'module' => 'attendance',
                'label' => 'Edit Attendance',
                'description' => 'Can edit attendance punches and records',
                'guard_name' => 'web',
            ],
            [
                'name' => 'delete-attendance',
                'module' => 'attendance',
                'label' => 'Delete Attendance',
                'description' => 'Can delete attendance logs',
                'guard_name' => 'web',
            ],
            [
                'name' => 'approve-attendance-requests',
                'module' => 'attendance',
                'label' => 'Approve Attendance Requests',
                'description' => 'Can approve or reject attendance regularization requests',
                'guard_name' => 'web',
            ],
            [
                'name' => 'export-attendance',
                'module' => 'attendance',
                'label' => 'Export Attendance',
                'description' => 'Can export attendance reports and timesheets',
                'guard_name' => 'web',
            ],
        ];

        foreach ($permissions as $permData) {
            Permission::firstOrCreate(
                ['name' => $permData['name'], 'guard_name' => $permData['guard_name']],
                $permData
            );
        }

        // Assign to Admin & Company roles
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

        // Assign to Manager roles
        $managerRoles = Role::whereIn('name', ['manager', 'sales-manager', 'sales manager', 'Team Lead'])->get();
        foreach ($managerRoles as $role) {
            $mgrPerms = ['manage-attendance', 'view-attendance', 'view-all-attendance', 'create-attendance', 'edit-attendance', 'approve-attendance-requests', 'export-attendance'];
            foreach ($mgrPerms as $permName) {
                try {
                    if (!$role->hasPermissionTo($permName)) {
                        $role->givePermissionTo($permName);
                    }
                } catch (\Exception $e) {}
            }
        }

        // Assign to Salesperson & Staff roles
        $salesRoles = Role::whereIn('name', ['salesperson', 'sales-executive', 'sales executive', 'staff', 'employee'])->get();
        foreach ($salesRoles as $role) {
            $salesPerms = ['view-attendance', 'create-attendance'];
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
        Schema::dropIfExists('attendance_requests');
        Schema::dropIfExists('attendances');

        $permissionNames = [
            'manage-attendance',
            'view-attendance',
            'view-all-attendance',
            'create-attendance',
            'edit-attendance',
            'delete-attendance',
            'approve-attendance-requests',
            'export-attendance',
        ];

        Permission::whereIn('name', $permissionNames)->delete();
    }
};
