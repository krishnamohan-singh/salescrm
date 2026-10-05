<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->boot();

try {
    $out = [];
    $out[] = "Database: " . \Illuminate\Support\Facades\DB::connection()->getDatabaseName();
    $out[] = "Total Users: " . \App\Models\User::count();
    $out[] = "Total Leads: " . \App\Models\Lead::count();
    $out[] = "Total Opportunities: " . \App\Models\Opportunity::count();
    $out[] = "Total Tasks: " . \App\Models\Task::count();
    $out[] = "Total Calls: " . \App\Models\Call::count();
    $out[] = "Total Meetings: " . \App\Models\Meeting::count();
    $out[] = "Total Quotes: " . \App\Models\Quote::count();
    $out[] = "Total Accounts: " . \App\Models\Account::count();
    $out[] = "Total Sales Targets: " . \App\Models\SalesTarget::count();
    $out[] = "Total Attendances: " . \App\Models\Attendance::count();
    $out[] = "Total Attendance Requests: " . \App\Models\AttendanceRequest::count();
    $out[] = "Total User Time Logs: " . \App\Models\UserTimeLog::count();

    $u = \App\Models\User::first();
    if ($u) {
        $out[] = "First user: {$u->id} - {$u->name} ({$u->type})";
    }

    file_put_contents(__DIR__ . '/out.txt', implode("\n", $out));
} catch (\Throwable $e) {
    file_put_contents(__DIR__ . '/out.txt', "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString());
}
