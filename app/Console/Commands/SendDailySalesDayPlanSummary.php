<?php

namespace App\Console\Commands;

use App\Models\SalesDayPlan;
use App\Models\User;
use App\Services\MailConfigService;
use App\Services\SalesDailyReportService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendDailySalesDayPlanSummary extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sales:send-daily-reports 
                            {--date= : Specific date to send reports for (YYYY-MM-DD)} 
                            {--company= : Specific company ID}
                            {--user= : Specific user ID}
                            {--force : Force send even if no activity logged}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send automated individual daily sales work reports to sales representatives with managers & admin in CC';

    /**
     * Execute the console command.
     */
    public function handle(SalesDailyReportService $reportService)
    {
        $targetDate = $this->option('date') ?: Carbon::today()->toDateString();
        $companyOption = $this->option('company');
        $userOption = $this->option('user');
        $force = (bool) $this->option('force');

        $this->info("Processing automated daily sales work reports for date: {$targetDate}");

        $companiesQuery = User::whereIn('type', ['company', 'admin']);
        if ($companyOption) {
            $companiesQuery->where('id', $companyOption);
        }
        $companies = $companiesQuery->get();

        $totalSent = 0;
        $totalSkipped = 0;

        foreach ($companies as $company) {
            $this->line("\n[Company #{$company->id}] {$company->name}");

            // Load company settings
            $companySettings = settings($company->id);
            $timezone = $companySettings['defaultTimezone'] ?? $companySettings['timezone'] ?? config('app.timezone', 'UTC');
            $nowInTz = Carbon::now($timezone);
            $todayInTz = $nowInTz->toDateString();

            // Automatic scheduling validation (when run without explicit --force or --date override)
            if (!$force && empty($this->option('date'))) {
                // Check if enabled
                if (($companySettings['daily_report_enabled'] ?? 'on') === 'off') {
                    $this->line(" - Daily reports disabled in settings. Skipping.");
                    continue;
                }

                // Check active days (weekdays vs everyday)
                $scheduleDays = $companySettings['daily_report_days'] ?? 'weekdays';
                if ($scheduleDays === 'weekdays' && $nowInTz->isWeekend()) {
                    $this->line(" - Weekend skipping (configured for weekdays only).");
                    continue;
                }

                // Check if already sent today
                if (($companySettings['daily_report_last_sent_date'] ?? null) === $todayInTz) {
                    $this->line(" - Daily reports already sent today ({$todayInTz}). Skipping.");
                    continue;
                }

                // Check configured send time
                $sendTime = $companySettings['daily_report_send_time'] ?? '19:00';
                $scheduledDateTime = Carbon::parse("{$todayInTz} {$sendTime}", $timezone);
                if ($nowInTz->lt($scheduledDateTime)) {
                    $this->line(" - Scheduled send time is {$sendTime} ({$timezone}). Current time is {$nowInTz->format('H:i')}. Will dispatch later.");
                    continue;
                }
            }

            // Configure dynamic SMTP mail settings for this company
            MailConfigService::setDynamicConfigForCompany($company);

            $forceIncludeIdle = $force || (($companySettings['daily_report_include_idle'] ?? 'off') === 'on');

            // Fetch active sales team members for this company (strictly exclude dummy example accounts)
            $usersQuery = User::where('created_by', $company->id)
                ->where('status', 'active')
                ->whereNotIn('type', ['client', 'customer'])
                ->where('email', 'not like', '%@example.%')
                ->where('email', 'not like', '%@test.%');

            if ($userOption) {
                $usersQuery->where('id', $userOption);
            }

            $users = $usersQuery->get();

            if ($users->isEmpty()) {
                $this->line(" - No team members found for this company.");
                continue;
            }

            foreach ($users as $user) {
                // Find existing plan if already created
                $existingPlan = SalesDayPlan::where('created_by', $company->id)
                    ->where('user_id', $user->id)
                    ->whereDate('plan_date', $targetDate)
                    ->first();

                $result = $reportService->sendDailyReport($user, $targetDate, $company, $existingPlan, $forceIncludeIdle);

                if ($result['success']) {
                    $totalSent++;
                    $this->info(" ✓ " . $result['message']);
                } elseif (!empty($result['skipped'])) {
                    $totalSkipped++;
                    $this->line(" - " . $result['message']);
                } else {
                    $this->warn(" ✗ " . $result['message']);
                }
            }

            // Mark date as dispatched for this company
            if (empty($this->option('date'))) {
                updateSetting('daily_report_last_sent_date', $todayInTz, $company->id);
            }
        }

        $this->info("\nDaily sales reporting completed: {$totalSent} sent, {$totalSkipped} skipped (idle/no activity).");
        return 0;
    }
}
