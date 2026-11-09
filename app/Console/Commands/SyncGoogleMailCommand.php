<?php

namespace App\Console\Commands;

use App\Models\Setting;
use App\Models\User;
use App\Services\GoogleMailService;
use Illuminate\Console\Command;

class SyncGoogleMailCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'gmail:sync {--tenant= : Specific tenant/company user ID} {--limit=300 : Max messages to inspect per account}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync emails from connected Google Mail accounts and automatically capture into CRM timeline';

    /**
     * Execute the console command.
     */
    public function handle(GoogleMailService $service)
    {
        $tenantOption = $this->option('tenant');
        $limit = (int) $this->option('limit');

        if ($tenantOption) {
            $tenants = User::where('id', $tenantOption)->get();
        } else {
            // Find all users (admins and team members) with connected Google Mail accounts
            $connectedUserIds = Setting::whereIn('key', ['googleMailConnected', 'googleMailConnectedEmail'])
                ->whereNotNull('value')
                ->where('value', '!=', '')
                ->where('value', '!=', '0')
                ->pluck('user_id')
                ->unique();

            $tenants = User::whereIn('id', $connectedUserIds)->get();
        }

        if ($tenants->isEmpty()) {
            $this->info('No connected Google Mail accounts found to sync.');
            return 0;
        }

        $this->info("Found {$tenants->count()} connected user account(s) to sync.");

        foreach ($tenants as $tenant) {
            $this->line("Syncing Google Mail for user #{$tenant->id} ({$tenant->name} - {$tenant->email})...");

            try {
                $result = $service->syncEmails($tenant->id, $limit);
                if ($result['success']) {
                    $this->info("User #{$tenant->id}: Captured {$result['captured']} new emails into CRM.");
                } else {
                    $this->warn("Tenant #{$tenant->id}: {$result['message']}");
                }
            } catch (\Exception $e) {
                $this->error("Tenant #{$tenant->id} sync error: " . $e->getMessage());
            }
        }

        $this->info('Google Mail synchronization completed.');
        return 0;
    }
}
