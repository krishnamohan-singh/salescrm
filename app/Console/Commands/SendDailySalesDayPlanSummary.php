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
            $dayPlans = SalesDayPlan::with(['user', 'creator', 'reviewer'])
                ->where('created_by', $company->id)
                ->whereDate('plan_date', $targetDate)
                ->whereIn('status', ['submitted', 'completed', 'reviewed', 'in_progress'])
                ->get();

            if ($dayPlans->isEmpty()) {
                continue;
            }

            // Resolve company managers once per company
            $baseManagerEmails = User::where('created_by', $company->id)
                ->where(function ($q) {
                    $q->whereIn('type', ['sales-manager', 'manager', 'admin', 'company'])
                      ->orWhereHas('roles', function ($rq) {
                          $rq->whereIn('name', ['sales-manager', 'manager', 'sales manager', 'Team Lead', 'Sales Director', 'Director']);
                      });
                })
                ->pluck('email')
                ->filter()
                ->toArray();

            if (!empty($company->email)) {
                $baseManagerEmails[] = $company->email;
            }

            foreach ($dayPlans as $plan) {
                // Primary recipient: user/sales representative
                $recipientEmail = $plan->user?->email ?: $company->email;
                if (empty($recipientEmail) || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
                    continue;
                }

                // Collect manager CCs for this plan
                $managerEmails = $baseManagerEmails;
                if ($plan->reviewer && !empty($plan->reviewer->email)) {
                    $managerEmails[] = $plan->reviewer->email;
                }

                $cleanRecipient = strtolower(trim($recipientEmail));
                $managerCcList = array_values(array_unique(array_filter($managerEmails, function ($em) use ($cleanRecipient) {
                    $clean = strtolower(trim($em));
                    return filter_var($clean, FILTER_VALIDATE_EMAIL) && $clean !== $cleanRecipient;
                })));

                try {
                    $mail = Mail::to($recipientEmail);
                    if (!empty($managerCcList)) {
                        $mail->cc($managerCcList);
                    }
                    $mail->send(new SalesDailyReportMail($plan, null, $managerCcList));

                    $sentSummary = $recipientEmail;
                    if (!empty($managerCcList)) {
                        $sentSummary .= ' [CC: ' . implode(', ', $managerCcList) . ']';
                    }

                    $plan->update([
                        'report_sent_at' => now(),
                        'report_sent_to' => \Illuminate\Support\Str::limit($sentSummary, 250),
                    ]);
                    $sentCount++;
                    $ccNote = !empty($managerCcList) ? " (CC: " . implode(', ', $managerCcList) . ")" : "";
                    $this->line(" - Sent report of {$plan->user?->name} to {$recipientEmail}{$ccNote}");
                } catch (\Exception $e) {
                    $this->error(" - Error sending report for {$plan->user?->name}: " . $e->getMessage());
                }
            }
        }

        $this->info("Completed sending {$sentCount} daily report(s).");
        return 0;
    }
}
