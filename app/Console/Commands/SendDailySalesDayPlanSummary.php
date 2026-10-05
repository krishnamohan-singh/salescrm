<?php

namespace App\Console\Commands;

use App\Mail\SalesDailyReportMail;
use App\Models\SalesDayPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendDailySalesDayPlanSummary extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sales:send-daily-reports {--date= : Specific date to send reports for (YYYY-MM-DD)} {--company= : Specific company ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send daily sales plans & reports for team members to managers';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $targetDate = $this->option('date') ?: Carbon::today()->toDateString();
        $companyOption = $this->option('company');

        $this->info("Processing Sales Daily Reports for date: {$targetDate}");

        $companiesQuery = User::whereIn('type', ['company', 'admin']);
        if ($companyOption) {
            $companiesQuery->where('id', $companyOption);
        }
        $companies = $companiesQuery->get();

        $sentCount = 0;

        foreach ($companies as $company) {
            $dayPlans = SalesDayPlan::with(['user', 'creator'])
                ->where('created_by', $company->id)
                ->whereDate('plan_date', $targetDate)
                ->whereIn('status', ['submitted', 'completed', 'reviewed', 'in_progress'])
                ->get();

            if ($dayPlans->isEmpty()) {
                continue;
            }

            foreach ($dayPlans as $plan) {
                $recipientEmail = $company->email;
                if (!empty($recipientEmail)) {
                    try {
                        Mail::to($recipientEmail)->send(new SalesDailyReportMail($plan));
                        $plan->update([
                            'report_sent_at' => now(),
                            'report_sent_to' => $recipientEmail,
                        ]);
                        $sentCount++;
                        $this->line(" - Sent report of {$plan->user?->name} to {$recipientEmail}");
                    } catch (\Exception $e) {
                        $this->error(" - Error sending report for {$plan->user?->name}: " . $e->getMessage());
                    }
                }
            }
        }

        $this->info("Completed sending {$sentCount} daily report(s).");
        return 0;
    }
}
