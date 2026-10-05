<?php

namespace App\Http\Controllers;

use App\Mail\SalesDailyReportMail;
use App\Models\SalesDayPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class SalesDayPlanController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $tenantId = createdBy();
        $canViewAll = hasFullModuleAccess('sales-day-plans', $user) || hasFullModuleAccess('sales_day_plans', $user);

        $query = SalesDayPlan::with(['user:id,name,email,avatar', 'reviewer:id,name'])
            ->where('created_by', $tenantId);

        // Visibility scoping
        if (!$canViewAll) {
            $query->where('user_id', $user->id);
        } else {
            if ($request->filled('assigned_to') && $request->assigned_to !== 'all') {
                $query->where('user_id', $request->assigned_to);
            } elseif ($request->filled('user_id') && $request->user_id !== 'all') {
                $query->where('user_id', $request->user_id);
            }
        }

        // Date Filtering
        $period = $request->input('period', 'today');
        $customDate = $request->input('date');
        $customStart = $request->input('start_date');
        $customEnd = $request->input('end_date');

        if ($customDate) {
            $query->whereDate('plan_date', $customDate);
        } elseif ($customStart && $customEnd) {
            $query->whereBetween('plan_date', [$customStart, $customEnd]);
        } elseif ($period === 'today') {
            $query->whereDate('plan_date', Carbon::today());
        } elseif ($period === 'yesterday') {
            $query->whereDate('plan_date', Carbon::yesterday());
        } elseif ($period === 'this_week') {
            $query->whereBetween('plan_date', [Carbon::now()->startOfWeek()->toDateString(), Carbon::now()->endOfWeek()->toDateString()]);
        } elseif ($period === 'this_month') {
            $query->whereMonth('plan_date', Carbon::now()->month)->whereYear('plan_date', Carbon::now()->year);
        }

        // Search Filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('planned_activities', 'like', "%{$search}%")
                  ->orWhere('achievements_summary', 'like', "%{$search}%")
                  ->orWhereHas('user', fn($sub) => $sub->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
            });
        }

        // Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Sorting
        $sortField = $request->input('sort_field', 'plan_date');
        $sortDirection = $request->input('sort_direction', 'desc');
        $allowedSorts = ['id', 'plan_date', 'status', 'target_sales_amount', 'actual_sales_amount', 'created_at'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('plan_date', 'desc')->orderBy('id', 'desc');
        }

        // Compute summary KPIs for filtered dataset
        $statsQuery = clone $query;
        $allMatchingPlans = $statsQuery->get();

        $stats = [
            'total_plans' => $allMatchingPlans->count(),
            'submitted_plans' => $allMatchingPlans->whereIn('status', ['submitted', 'completed', 'reviewed'])->count(),
            'completed_plans' => $allMatchingPlans->whereIn('status', ['completed', 'reviewed'])->count(),
            'total_target_calls' => $allMatchingPlans->sum('target_calls'),
            'total_actual_calls' => $allMatchingPlans->sum('actual_calls'),
            'total_target_meetings' => $allMatchingPlans->sum('target_meetings'),
            'total_actual_meetings' => $allMatchingPlans->sum('actual_meetings'),
            'total_target_leads' => $allMatchingPlans->sum('target_leads'),
            'total_actual_leads' => $allMatchingPlans->sum('actual_leads'),
            'total_target_sales' => (float) $allMatchingPlans->sum('target_sales_amount'),
            'total_actual_sales' => (float) $allMatchingPlans->sum('actual_sales_amount'),
            'average_completion_rate' => $allMatchingPlans->count() > 0 
                ? (int) round($allMatchingPlans->avg('completion_rate'))
                : 0,
        ];

        $perPage = max(1, min(100, (int) $request->input('per_page', 15)));
        $dayPlans = $query->paginate($perPage)->withQueryString();

        // Team Users for filter and assignment
        $userQuery = User::where('created_by', $tenantId);
        $teamUsers = $userQuery->where('status', 'active')
            ->select('id', 'name', 'email', 'avatar')
            ->orderBy('name')
            ->get();

        return Inertia::render('sales-day-plans/index', [
            'dayPlans' => $dayPlans,
            'stats' => $stats,
            'teamUsers' => $teamUsers,
            'canViewAll' => $canViewAll,
            'filters' => $request->all([
                'search', 'period', 'date', 'start_date', 'end_date', 'user_id', 'assigned_to', 'status', 'sort_field', 'sort_direction', 'per_page', 'page'
            ]),
        ]);
    }

    public function create(Request $request): Response
    {
        $tenantId = createdBy();
        $user = Auth::user();
        $canViewAll = hasFullModuleAccess('sales-day-plans', $user) || hasFullModuleAccess('sales_day_plans', $user);

        $teamUsers = User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'avatar')
            ->orderBy('name')
            ->get();

        $defaultDate = $request->input('date', Carbon::today()->toDateString());

        return Inertia::render('sales-day-plans/create', [
            'teamUsers' => $teamUsers,
            'canViewAll' => $canViewAll,
            'defaultDate' => $defaultDate,
        ]);
    }

    public function store(Request $request)
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('sales-day-plans', $currentUser) || hasFullModuleAccess('sales_day_plans', $currentUser);

        $validated = $request->validate([
            'plan_date' => 'required|date',
            'user_id' => 'nullable|exists:users,id',
            'sales_target_id' => 'nullable|exists:sales_targets,id',
            'title' => 'nullable|string|max:255',
            'target_calls' => 'nullable|integer|min:0',
            'target_outreach' => 'nullable|integer|min:0',
            'target_emails' => 'nullable|integer|min:0',
            'target_meetings' => 'nullable|integer|min:0',
            'target_demos' => 'nullable|integer|min:0',
            'target_leads' => 'nullable|integer|min:0',
            'target_followups' => 'nullable|integer|min:0',
            'target_proposals' => 'nullable|integer|min:0',
            'target_sales_amount' => 'nullable|numeric|min:0',
            'planned_activities' => 'nullable|string|max:65535',
            'planned_accounts' => 'nullable|string|max:65535',
            'shortage_reason' => 'nullable|string|max:65535',
            
            'actual_calls' => 'nullable|integer|min:0',
            'actual_outreach' => 'nullable|integer|min:0',
            'actual_emails' => 'nullable|integer|min:0',
            'actual_meetings' => 'nullable|integer|min:0',
            'actual_demos' => 'nullable|integer|min:0',
            'actual_leads' => 'nullable|integer|min:0',
            'actual_followups' => 'nullable|integer|min:0',
            'actual_proposals' => 'nullable|integer|min:0',
            'actual_sales_amount' => 'nullable|numeric|min:0',
            'new_pipeline_created' => 'nullable|numeric|min:0',
            'proposal_value' => 'nullable|numeric|min:0',

            'achievements_summary' => 'nullable|string|max:65535',
            'key_wins' => 'nullable|string|max:65535',
            'challenges_notes' => 'nullable|string|max:65535',
            'client_feedback' => 'nullable|string|max:65535',
            'support_needed' => 'nullable|string|max:65535',
            'next_day_plan' => 'nullable|string|max:65535',
            'status' => 'nullable|string|in:draft,submitted,in_progress,completed,reviewed,approved',
        ]);

        $validated['created_by'] = $tenantId;
        if (!$canViewAll || empty($validated['user_id'])) {
            $validated['user_id'] = $currentUser->id;
        }
        $validated['status'] = $validated['status'] ?? 'submitted';

        // Calculate Target Gaps & Reachability
        $this->evaluatePlanAgainstTargets($validated);

        $dayPlan = SalesDayPlan::create($validated);

        if ($request->boolean('send_email_now')) {
            $this->dispatchReportEmail($dayPlan);
        }

        return redirect()->route('sales-day-plans.index')->with('success', __('Morning Sales Day Plan submitted successfully.'));
    }

    public function show($id): Response
    {
        $tenantId = createdBy();
        $user = Auth::user();
        $canViewAll = hasFullModuleAccess('sales-day-plans', $user) || hasFullModuleAccess('sales_day_plans', $user);

        $dayPlan = SalesDayPlan::with(['user', 'creator', 'reviewer', 'salesTarget'])
            ->where('created_by', $tenantId)
            ->findOrFail($id);

        if (!$canViewAll && $dayPlan->user_id !== $user->id) {
            abort(403, __('Unauthorized access to this day plan.'));
        }

        return Inertia::render('sales-day-plans/show', [
            'dayPlan' => $dayPlan,
            'canViewAll' => $canViewAll,
        ]);
    }

    public function edit($id): Response
    {
        $tenantId = createdBy();
        $user = Auth::user();
        $canViewAll = hasFullModuleAccess('sales-day-plans', $user) || hasFullModuleAccess('sales_day_plans', $user);

        $dayPlan = SalesDayPlan::with(['user', 'salesTarget'])
            ->where('created_by', $tenantId)
            ->findOrFail($id);

        if (!$canViewAll && $dayPlan->user_id !== $user->id) {
            abort(403, __('Unauthorized access to this day plan.'));
        }

        $teamUsers = User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'avatar')
            ->orderBy('name')
            ->get();

        return Inertia::render('sales-day-plans/edit', [
            'dayPlan' => $dayPlan,
            'teamUsers' => $teamUsers,
            'canViewAll' => $canViewAll,
        ]);
    }

    public function update(Request $request, $id)
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('sales-day-plans', $currentUser) || hasFullModuleAccess('sales_day_plans', $currentUser);

        $dayPlan = SalesDayPlan::where('created_by', $tenantId)->findOrFail($id);

        if (!$canViewAll && $dayPlan->user_id !== $currentUser->id) {
            abort(403, __('Unauthorized access to this day plan.'));
        }

        $validated = $request->validate([
            'plan_date' => 'required|date',
            'user_id' => 'nullable|exists:users,id',
            'sales_target_id' => 'nullable|exists:sales_targets,id',
            'title' => 'nullable|string|max:255',
            'target_calls' => 'nullable|integer|min:0',
            'target_outreach' => 'nullable|integer|min:0',
            'target_emails' => 'nullable|integer|min:0',
            'target_meetings' => 'nullable|integer|min:0',
            'target_demos' => 'nullable|integer|min:0',
            'target_leads' => 'nullable|integer|min:0',
            'target_followups' => 'nullable|integer|min:0',
            'target_proposals' => 'nullable|integer|min:0',
            'target_sales_amount' => 'nullable|numeric|min:0',
            'planned_activities' => 'nullable|string|max:65535',
            'planned_accounts' => 'nullable|string|max:65535',
            'shortage_reason' => 'nullable|string|max:65535',
            
            'actual_calls' => 'nullable|integer|min:0',
            'actual_outreach' => 'nullable|integer|min:0',
            'actual_emails' => 'nullable|integer|min:0',
            'actual_meetings' => 'nullable|integer|min:0',
            'actual_demos' => 'nullable|integer|min:0',
            'actual_leads' => 'nullable|integer|min:0',
            'actual_followups' => 'nullable|integer|min:0',
            'actual_proposals' => 'nullable|integer|min:0',
            'actual_sales_amount' => 'nullable|numeric|min:0',
            'new_pipeline_created' => 'nullable|numeric|min:0',
            'proposal_value' => 'nullable|numeric|min:0',

            'achievements_summary' => 'nullable|string|max:65535',
            'key_wins' => 'nullable|string|max:65535',
            'challenges_notes' => 'nullable|string|max:65535',
            'client_feedback' => 'nullable|string|max:65535',
            'support_needed' => 'nullable|string|max:65535',
            'next_day_plan' => 'nullable|string|max:65535',
            'status' => 'nullable|string|in:draft,submitted,in_progress,completed,reviewed,approved',
        ]);

        if (!$canViewAll) {
            unset($validated['user_id']);
        }

        // Re-evaluate Plan Gaps
        $this->evaluatePlanAgainstTargets($validated);

        $dayPlan->update($validated);

        if ($request->boolean('send_email_now')) {
            $this->dispatchReportEmail($dayPlan);
        }

        return redirect()->route('sales-day-plans.index')->with('success', __('Daily Sales Report updated successfully.'));
    }

    /**
     * Manager Action: Approve Daily Plan below target with reason
     */
    public function approvePlan(Request $request, $id)
    {
        $tenantId = createdBy();
        $user = Auth::user();

        $isAuthorized = in_array(strtolower($user->type ?? ''), ['company', 'admin', 'superadmin']) || 
                        $user->can('approve-sales-day-plans') || 
                        $user->can('review-sales-day-plans');

        if (!$isAuthorized) {
            abort(403, __('Unauthorized: Manager approval permission required.'));
        }

        $dayPlan = SalesDayPlan::where('created_by', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'manager_approval_reason' => 'nullable|string|max:255',
            'manager_feedback' => 'nullable|string|max:65535',
        ]);

        $dayPlan->update([
            'manager_approved' => true,
            'manager_approval_reason' => $validated['manager_approval_reason'] ?? 'Approved lower plan commitment by manager',
            'manager_feedback' => $validated['manager_feedback'] ?? $dayPlan->manager_feedback,
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'status' => 'approved',
        ]);

        return redirect()->back()->with('success', __('Sales Day Plan approved by manager.'));
    }

    /**
     * Manager Action: Request Plan Revision from Salesperson
     */
    public function requestRevision(Request $request, $id)
    {
        $tenantId = createdBy();
        $user = Auth::user();

        $isAuthorized = in_array(strtolower($user->type ?? ''), ['company', 'admin', 'superadmin']) || 
                        $user->can('approve-sales-day-plans') || 
                        $user->can('review-sales-day-plans');

        if (!$isAuthorized) {
            abort(403, __('Unauthorized: Manager revision request permission required.'));
        }

        $dayPlan = SalesDayPlan::where('created_by', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'revision_comments' => 'required|string|max:65535',
        ]);

        $dayPlan->update([
            'revision_requested' => true,
            'revision_comments' => $validated['revision_comments'],
            'status' => 'draft',
        ]);

        return redirect()->back()->with('success', __('Revision requested from salesperson.'));
    }

    public function destroy($id)
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('sales-day-plans', $currentUser) || hasFullModuleAccess('sales_day_plans', $currentUser);

        $dayPlan = SalesDayPlan::where('created_by', $tenantId)->findOrFail($id);

        if (!$canViewAll && $dayPlan->user_id !== $currentUser->id) {
            abort(403, __('Unauthorized access.'));
        }

        $dayPlan->delete();

        return redirect()->back()->with('success', __('Day Plan deleted successfully.'));
    }

    public function updateStatus(Request $request, $id)
    {
        $tenantId = createdBy();
        $dayPlan = SalesDayPlan::where('created_by', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:draft,submitted,in_progress,completed,reviewed,approved',
        ]);

        $dayPlan->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', __('Status updated successfully.'));
    }

    public function sendReport(Request $request, $id)
    {
        $tenantId = createdBy();
        $dayPlan = SalesDayPlan::with(['user', 'creator'])->where('created_by', $tenantId)->findOrFail($id);

        $recipientEmail = $request->input('recipient_email');
        $success = $this->dispatchReportEmail($dayPlan, $recipientEmail);

        if ($success) {
            return redirect()->back()->with('success', __('Daily Report emailed successfully.'));
        }

        return redirect()->back()->with('error', __('Could not send email. Please check mail settings.'));
    }

    public function review(Request $request, $id)
    {
        $tenantId = createdBy();
        $user = Auth::user();

        $isAuthorized = in_array(strtolower($user->type ?? ''), ['company', 'admin', 'superadmin']) || 
                        $user->can('review-sales-day-plans') || 
                        $user->can('approve-sales-day-plans');

        if (!$isAuthorized) {
            abort(403, __('Unauthorized: Manager review permission required.'));
        }

        $dayPlan = SalesDayPlan::where('created_by', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'manager_feedback' => 'required|string|max:65535',
            'status' => 'nullable|string|in:submitted,completed,reviewed,approved',
        ]);

        $dayPlan->update([
            'manager_feedback' => $validated['manager_feedback'],
            'reviewed_by' => $user->id,
            'reviewed_at' => now(),
            'status' => $validated['status'] ?? 'reviewed',
        ]);

        return redirect()->back()->with('success', __('Manager review recorded successfully.'));
    }

    /**
     * Compute Gaps & Target Reachability Status
     */
    private function evaluatePlanAgainstTargets(array &$data): void
    {
        $tenantId = $data['created_by'];
        $userId = $data['user_id'];
        $date = $data['plan_date'];

        $target = null;
        if (!empty($data['sales_target_id'])) {
            $target = \App\Models\SalesTarget::find($data['sales_target_id']);
        }

        if (!$target) {
            $month = Carbon::parse($date)->month;
            $target = \App\Models\SalesTarget::where('created_by', $tenantId)
                ->where('user_id', $userId)
                ->where('period_type', 'monthly')
                ->where('month', $month)
                ->first();
        }

        if (!$target) {
            $data['is_below_target'] = false;
            $data['reachability_status'] = 'on_track';
            $data['target_gap_json'] = [];
            return;
        }

        $data['sales_target_id'] = $target->id;

        // Working days remaining
        $endOfMonth = Carbon::parse($date)->endOfMonth();
        $startOfToday = Carbon::parse($date);
        $daysRemaining = max(1, $startOfToday->diffInDaysFiltered(fn(Carbon $d) => !$d->isWeekend(), $endOfMonth));

        $remainingRevenue = max(0, $target->target_revenue - $target->actual_revenue);
        $requiredDailyRev = round($remainingRevenue / $daysRemaining, 2);

        $remainingCalls = max(0, $target->target_cold_calls - $target->actual_cold_calls);
        $requiredDailyCalls = max(5, (int) ceil($remainingCalls / $daysRemaining));

        $remainingMeetings = max(0, $target->target_meetings - $target->actual_meetings);
        $requiredDailyMeetings = max(1, (int) ceil($remainingMeetings / $daysRemaining));

        $remainingDemos = max(0, $target->target_demos - $target->actual_demos);
        $requiredDailyDemos = max(0, (int) ceil($remainingDemos / $daysRemaining));

        $planRevenue = (float) ($data['target_sales_amount'] ?? 0);
        $planCalls = (int) ($data['target_calls'] ?? 0);
        $planMeetings = (int) ($data['target_meetings'] ?? 0);
        $planDemos = (int) ($data['target_demos'] ?? 0);

        $gaps = [
            'revenue_gap' => $planRevenue - $requiredDailyRev,
            'calls_gap' => $planCalls - $requiredDailyCalls,
            'meetings_gap' => $planMeetings - $requiredDailyMeetings,
            'demos_gap' => $planDemos - $requiredDailyDemos,
            'required_revenue' => $requiredDailyRev,
            'required_calls' => $requiredDailyCalls,
            'required_meetings' => $requiredDailyMeetings,
            'required_demos' => $requiredDailyDemos,
            'days_remaining' => $daysRemaining,
            'remaining_monthly_revenue' => $remainingRevenue,
        ];

        $isShort = ($gaps['revenue_gap'] < 0) || ($gaps['calls_gap'] < 0) || ($gaps['meetings_gap'] < 0);
        $data['is_below_target'] = $isShort;
        $data['target_gap_json'] = $gaps;

        if ($planRevenue < ($requiredDailyRev * 0.6) || $planCalls < ($requiredDailyCalls * 0.6)) {
            $data['reachability_status'] = 'behind';
        } elseif ($isShort) {
            $data['reachability_status'] = 'at_risk';
        } else {
            $data['reachability_status'] = 'on_track';
        }
    }

    private function dispatchReportEmail(SalesDayPlan $dayPlan, ?string $overrideEmail = null): bool
    {
        $tenantId = createdBy();
        $company = User::find($tenantId);

        $targetEmail = $overrideEmail ?: ($company->email ?? null);
        if (!$targetEmail) {
            return false;
        }

        try {
            Mail::to($targetEmail)->send(new SalesDailyReportMail($dayPlan));
            $dayPlan->update([
                'report_sent_at' => now(),
                'report_sent_to' => $targetEmail,
                'status' => in_array($dayPlan->status, ['draft', 'in_progress']) ? 'submitted' : $dayPlan->status,
            ]);
            return true;
        } catch (\Exception $e) {
            \Log::error("SalesDailyReportMail error: " . $e->getMessage());
            return false;
        }
    }
}

