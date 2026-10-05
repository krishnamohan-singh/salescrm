<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->boot();

$data = [
    'users' => App\Models\User::count(),
    'leads' => App\Models\Lead::count(),
    'opps' => App\Models\Opportunity::count(),
    'accounts' => App\Models\Account::count(),
    'calls' => App\Models\Call::count(),
    'meetings' => App\Models\Meeting::count(),
    'tasks' => App\Models\Task::count(),
    'quotes' => App\Models\Quote::count(),
    'targets' => App\Models\SalesTarget::count(),
    'attendances' => App\Models\Attendance::count(),
    'users_sample' => App\Models\User::take(5)->get(['id', 'name', 'email', 'type', 'created_by'])->toArray(),
];

file_put_contents(__DIR__ . '/check_db.json', json_encode($data, JSON_PRETTY_PRINT));
echo "DONE\n";
