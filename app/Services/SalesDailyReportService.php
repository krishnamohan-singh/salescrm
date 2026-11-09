<?php

namespace App\Services;

use App\Mail\SalesDailyReportMail;
use App\Models\Attendance;
use App\Models\Call;
use App\Models\Lead;
use App\Models\Meeting;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\SalesDayPlan;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SalesDailyReportService
{
    /**
     * Gather actual daily CRM telemetry for a specific user on a given date.
     */
    public function getDailyTelemetry(User $user, string $targetDate, int $companyId): array
    {
        $userId = $user->id;
        $startOfDay = Carbon::parse($targetDate)->startOfDay();
        $endOfDay = Carbon::parse($targetDate)->endOfDay();

        // 1. Calls Made/Held Today
        $callsQuery = Call::where('created_by', $companyId)
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to', $userId)->orWhere('created_by', $userId);
            })
            ->where(function ($q) use ($targetDate, $startOfDay, $endOfDay) {
                $q->whereDate('start_date', $targetDate)
                  ->orWhereBetween('created_at', [$startOfDay, $endOfDay]);
            });

        $callsCount = (clone $callsQuery)->count();
        $callsHeld = (clone $callsQuery)->whereIn('status', ['held', 'completed'])->count();
        $callsList = (clone $callsQuery)->orderBy('id', 'desc')->limit(10)->get()->map(function ($c) {
            return [
                'title' => $c->title,
                'status' => $c->status,
                'direction' => $c->direction ?? 'outbound',
                'parent_module' => $c->parent_module,
                'duration' => $c->duration ?? null,
            ];
        })->toArray();

        // 2. Meetings Held/Scheduled Today
        $meetingsQuery = Meeting::where('created_by', $companyId)
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to', $userId)->orWhere('created_by', $userId);
            })
            ->where(function ($q) use ($targetDate, $startOfDay, $endOfDay) {
                $q->whereDate('start_date', $targetDate)
                  ->orWhereBetween('created_at', [$startOfDay, $endOfDay]);
            });

        $meetingsCount = (clone $meetingsQuery)->count();
        $meetingsList = (clone $meetingsQuery)->orderBy('id', 'desc')->limit(10)->get()->map(function ($m) {
            return [
                'title' => $m->title,
                'status' => $m->status,
                'start_time' => $m->start_time,
                'parent_module' => $m->parent_module,
            ];
        })->toArray();

        // 3. Leads Handled / Contacted Today
        $leadsContactedQuery = Lead::where('created_by', $companyId)
            ->where('assigned_to', $userId)
            ->whereDate('last_contacted_date', $targetDate);
        $leadsContactedCount = (clone $leadsContactedQuery)->count();
        $leadsContactedList = (clone $leadsContactedQuery)->limit(10)->get(['id', 'name', 'phone', 'email'])->toArray();

        $leadsCreatedCount = Lead::where('created_by', $companyId)
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to', $userId)->orWhere('created_by', $userId);
            })
            ->whereBetween('created_at', [$startOfDay, $endOfDay])
            ->count();

        $leadsConvertedCount = Lead::where('created_by', $companyId)
            ->where('assigned_to', $userId)
            ->where('is_converted', 1)
            ->whereBetween('updated_at', [$startOfDay, $endOfDay])
            ->count();

        // 4. Opportunities (Deals Won & Pipeline Created)
        $oppsCreated = Opportunity::where('created_by', $companyId)
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to', $userId)->orWhere('created_by', $userId);
            })
            ->whereBetween('created_at', [$startOfDay, $endOfDay])
            ->get();
        $oppsCreatedCount = $oppsCreated->count();
        $pipelineCreatedAmount = (float) $oppsCreated->sum('amount');

        $wonOppsQuery = Opportunity::where('created_by', $companyId)
            ->where('assigned_to', $userId)
            ->where(function ($q) {
                $q->where('status', 'Won')->orWhere('status', 'Closed Won');
            })
            ->whereBetween('updated_at', [$startOfDay, $endOfDay]);
        $wonOppsCount = (clone $wonOppsQuery)->count();
        $wonOppsAmount = (float) (clone $wonOppsQuery)->sum('amount');
        $wonOppsList = (clone $wonOppsQuery)->with('account:id,name')->limit(10)->get()->map(function ($op) {
            return [
                'name' => $op->name,
                'amount' => $op->amount,
                'account_name' => $op->account?->name ?? 'Direct',
            ];
        })->toArray();

        // 5. Tasks Completed & Pending
        $tasksCompletedCount = Task::where('created_by', $companyId)
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to', $userId)->orWhere('created_by', $userId);
            })
            ->whereIn('status', ['Completed', 'completed', 'done'])
            ->whereBetween('updated_at', [$startOfDay, $endOfDay])
            ->count();

        $tasksPendingCount = Task::where('created_by', $companyId)
            ->where('assigned_to', $userId)
            ->whereNotIn('status', ['Completed', 'completed', 'done'])
            ->whereDate('due_date', '<=', $targetDate)
            ->count();

        // 6. Quotes / Proposals Created
        $quotesCount = Quote::where('created_by', $companyId)
            ->where(function ($q) use ($userId) {
                $q->where('assigned_to', $userId)->orWhere('created_by', $userId);
            })
            ->whereBetween('created_at', [$startOfDay, $endOfDay])
            ->count();

        // 7. Attendance
        $attendance = Attendance::where('user_id', $userId)
            ->whereDate('date', $targetDate)
            ->first();

        // Format attendance times in company timezone (defaults to Asia/Kolkata for Indian CRM setups)
        $companySettings = settings($companyId);
        $timezone = $companySettings['defaultTimezone'] ?? $companySettings['timezone'] ?? 'Asia/Kolkata';

        $formattedClockIn = null;
        $formattedClockOut = null;
        if ($attendance && $attendance->clock_in) {
            try {
                $formattedClockIn = Carbon::parse($attendance->clock_in)->timezone($timezone)->format('g:i A');
            } catch (\Throwable $e) {
                $formattedClockIn = date('g:i A', strtotime($attendance->clock_in));
            }
        }
        if ($attendance && $attendance->clock_out) {
            try {
                $formattedClockOut = Carbon::parse($attendance->clock_out)->timezone($timezone)->format('g:i A');
            } catch (\Throwable $e) {
                $formattedClockOut = date('g:i A', strtotime($attendance->clock_out));
            }
        }

        $hasActivity = ($callsCount > 0)
            || ($meetingsCount > 0)
            || ($leadsContactedCount > 0)
            || ($leadsCreatedCount > 0)
            || ($oppsCreatedCount > 0)
            || ($wonOppsCount > 0)
            || ($tasksCompletedCount > 0)
            || ($quotesCount > 0)
            || ($attendance !== null);

        return [
            'target_date' => $targetDate,
            'timezone' => $timezone,
            'calls_count' => $callsCount,
            'calls_held' => $callsHeld,
            'calls_list' => $callsList,
            'meetings_count' => $meetingsCount,
            'meetings_list' => $meetingsList,
            'leads_contacted' => $leadsContactedCount,
            'leads_contacted_list' => $leadsContactedList,
            'leads_created' => $leadsCreatedCount,
            'leads_converted' => $leadsConvertedCount,
            'opportunities_created' => $oppsCreatedCount,
            'pipeline_created_amount' => $pipelineCreatedAmount,
            'opportunities_won' => $wonOppsCount,
            'opportunities_won_amount' => $wonOppsAmount,
            'deals_won_list' => $wonOppsList,
            'tasks_completed' => $tasksCompletedCount,
            'tasks_pending' => $tasksPendingCount,
            'quotes_count' => $quotesCount,
            'attendance' => $attendance ? [
                'clock_in' => $attendance->clock_in,
                'clock_out' => $attendance->clock_out,
                'formatted_clock_in' => $formattedClockIn,
                'formatted_clock_out' => $formattedClockOut,
                'active_hours' => $attendance->active_hours ?: $attendance->total_hours,
                'status' => $attendance->status,
            ] : null,
            'has_activity' => $hasActivity,
        ];
    }

    /**
     * Get an existing day plan or auto-create a populated one with today's telemetry.
     */
    public function getOrCreateDayPlanForUser(User $user, string $targetDate, int $companyId, array $telemetry): SalesDayPlan
    {
        $plan = SalesDayPlan::where('created_by', $companyId)
            ->where('user_id', $user->id)
            ->whereDate('plan_date', $targetDate)
            ->first();

        if ($plan) {
            // Update actuals if system telemetry found higher actual numbers
            $updates = [];
            if ($telemetry['calls_count'] > 0 && ($plan->actual_calls ?? 0) < $telemetry['calls_count']) {
                $updates['actual_calls'] = $telemetry['calls_count'];
            }
            if ($telemetry['meetings_count'] > 0 && ($plan->actual_meetings ?? 0) < $telemetry['meetings_count']) {
                $updates['actual_meetings'] = $telemetry['meetings_count'];
            }
            if ($telemetry['leads_contacted'] > 0 && ($plan->actual_leads ?? 0) < $telemetry['leads_contacted']) {
                $updates['actual_leads'] = $telemetry['leads_contacted'];
            }
            if ($telemetry['opportunities_won_amount'] > 0 && ($plan->actual_sales_amount ?? 0) < $telemetry['opportunities_won_amount']) {
                $updates['actual_sales_amount'] = $telemetry['opportunities_won_amount'];
            }
            if ($telemetry['tasks_completed'] > 0 && ($plan->actual_followups ?? 0) < $telemetry['tasks_completed']) {
                $updates['actual_followups'] = $telemetry['tasks_completed'];
            }
            if (!empty($updates)) {
                $plan->update($updates);
            }
            return $plan;
        }

        // Auto-create a day plan for this sales person based on system activity
        $summaryParts = [];
        if ($telemetry['calls_count'] > 0) $summaryParts[] = "{$telemetry['calls_count']} calls completed";
        if ($telemetry['meetings_count'] > 0) $summaryParts[] = "{$telemetry['meetings_count']} meetings held";
        if ($telemetry['leads_contacted'] > 0) $summaryParts[] = "{$telemetry['leads_contacted']} leads contacted";
        if ($telemetry['opportunities_won'] > 0) $summaryParts[] = "{$telemetry['opportunities_won']} won deal(s) totaling " . number_format($telemetry['opportunities_won_amount'], 2);
        if ($telemetry['tasks_completed'] > 0) $summaryParts[] = "{$telemetry['tasks_completed']} tasks completed";

        $summaryText = !empty($summaryParts)
            ? "Automated Daily Activity Summary: " . implode(', ', $summaryParts) . "."
            : "No specific CRM activities logged for this date.";

        return SalesDayPlan::create([
            'plan_date' => $targetDate,
            'user_id' => $user->id,
            'created_by' => $companyId,
            'title' => 'Daily Sales Work Report',
            'target_calls' => 0,
            'target_meetings' => 0,
            'target_leads' => 0,
            'target_sales_amount' => 0,
            'actual_calls' => $telemetry['calls_count'],
            'actual_meetings' => $telemetry['meetings_count'],
            'actual_leads' => $telemetry['leads_contacted'],
            'actual_sales_amount' => $telemetry['opportunities_won_amount'],
            'actual_followups' => $telemetry['tasks_completed'],
            'actual_proposals' => $telemetry['quotes_count'],
            'achievements_summary' => $summaryText,
            'status' => 'submitted',
        ]);
    }

    /**
     * Resolve manager and admin emails to keep in CC for this sales person's report.
     */
    public function resolveManagerEmails(User $user, User $company, ?SalesDayPlan $dayPlan = null): array
    {
        $managerEmails = [];

        // 1. Company owner / admin email
        if (!empty($company->email)) {
            $managerEmails[] = $company->email;
        }

        // 2. Reviewer assigned to this plan (if any)
        if ($dayPlan && $dayPlan->reviewer && !empty($dayPlan->reviewer->email)) {
            $managerEmails[] = $dayPlan->reviewer->email;
        }

        // 3. All company users with manager / director / admin roles or types
        $companyManagers = User::where('created_by', $company->id)
            ->where('status', 'active')
            ->where(function ($q) {
                $q->whereIn('type', ['sales-manager', 'manager', 'admin', 'company'])
                  ->orWhereHas('roles', function ($rq) {
                      $rq->whereIn('name', [
                          'sales-manager', 'manager', 'sales manager', 'Sales Manager',
                          'Team Lead', 'team lead', 'Sales Director', 'Director', 'admin', 'Admin'
                      ]);
                  });
            })
            ->pluck('email')
            ->filter()
            ->toArray();

        $managerEmails = array_merge($managerEmails, $companyManagers);

        // 4. Custom CC from Company Settings (if configured)
        $companySettings = settings($company->id);
        if (!empty($companySettings['daily_report_custom_cc'])) {
            $customCcs = array_map('trim', explode(',', $companySettings['daily_report_custom_cc']));
            $managerEmails = array_merge($managerEmails, $customCcs);
        }

        // Filter valid emails and strictly exclude the sales person's own email & dummy example domains
        $userEmailNormalized = strtolower(trim((string) $user->email));

        return array_values(array_unique(array_filter($managerEmails, function ($email) use ($userEmailNormalized) {
            $clean = strtolower(trim((string) $email));
            if (!filter_var($clean, FILTER_VALIDATE_EMAIL) || $clean === $userEmailNormalized) {
                return false;
            }

            // Exclude demo / dummy example domains
            $domain = substr(strrchr($clean, "@"), 1);
            if (in_array($domain, ['example.com', 'example.org', 'example.net', 'test.com', 'dummy.com'])) {
                return false;
            }

            return true;
        })));
    }

    /**
     * Send daily report for an individual sales user.
     */
    public function sendDailyReport(User $user, string $targetDate, User $company, ?SalesDayPlan $existingPlan = null, bool $force = false): array
    {
        $recipientEmail = trim((string) $user->email);
        if (empty($recipientEmail) || !filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            return [
                'success' => false,
                'message' => "User {$user->name} has no valid email address.",
            ];
        }

        // Never send automated reports to example/dummy demo addresses
        $domain = strtolower(substr(strrchr($recipientEmail, "@"), 1));
        if (in_array($domain, ['example.com', 'example.org', 'example.net', 'test.com', 'dummy.com'])) {
            return [
                'success' => false,
                'skipped' => true,
                'message' => "Skipped {$user->name}: Example/demo email address ({$recipientEmail}).",
            ];
        }

        // 1. Compute Telemetry
        $telemetry = $this->getDailyTelemetry($user, $targetDate, $company->id);

        // If user had zero activity and no day plan and force is not set, skip to avoid spam
        if (!$force && !$telemetry['has_activity'] && !$existingPlan) {
            return [
                'success' => false,
                'skipped' => true,
                'message' => "Skipped {$user->name}: No CRM activity or day plan recorded today.",
            ];
        }

        // 2. Get or create Day Plan
        $dayPlan = $existingPlan ?: $this->getOrCreateDayPlanForUser($user, $targetDate, $company->id, $telemetry);
        $dayPlan->loadMissing(['user', 'creator', 'reviewer']);

        // 3. Resolve Manager CC List
        $managerCcList = $this->resolveManagerEmails($user, $company, $dayPlan);

        // 4. Send Email
        try {
            \App\Services\MailConfigService::setDynamicConfigForCompany($company);
            $mail = Mail::to($recipientEmail);
            if (!empty($managerCcList)) {
                $mail->cc($managerCcList);
            }
            $mail->send(new SalesDailyReportMail($dayPlan, null, $managerCcList, $telemetry));

            $sentSummary = $recipientEmail;
            if (!empty($managerCcList)) {
                $sentSummary .= ' [CC: ' . implode(', ', $managerCcList) . ']';
            }

            $dayPlan->update([
                'report_sent_at' => now(),
                'report_sent_to' => Str::limit($sentSummary, 250),
            ]);

            return [
                'success' => true,
                'recipient' => $recipientEmail,
                'cc' => $managerCcList,
                'message' => "Successfully sent daily report of {$user->name} to {$recipientEmail}" . (!empty($managerCcList) ? " (CC: " . implode(', ', $managerCcList) . ")" : ""),
            ];
        } catch (\Throwable $e) {
            Log::error("Failed to send daily report for {$user->name}: " . $e->getMessage());
            return [
                'success' => false,
                'message' => "Error sending email: " . $e->getMessage(),
            ];
        }
    }
}
