<?php

namespace App\Http\Controllers;

use App\Models\Call;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Meeting;
use App\Models\Opportunity;
use App\Models\Quote;
use App\Models\SalesDayPlan;
use App\Models\SalesOrder;
use App\Models\SalesTarget;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SalesTargetController extends Controller
{
    /**
     * Target Management Overview Dashboard
     */
    public function index(Request $request): Response
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('targets', $currentUser);

        $currentYear = $request->input('financial_year', '2026-27');
        $selectedPeriodType = $request->input('period_type', 'monthly');
        $selectedMonth = (int) $request->input('month', Carbon::now()->month);
        $selectedQuarter = $request->input('quarter', 'Q' . ceil(Carbon::now()->month / 3));

        // Base Query
        $query = SalesTarget::with(['user:id,name,email,avatar', 'children'])
            ->where('created_by', $tenantId)
            ->where('financial_year', $currentYear);

        if (!$canViewAll) {
            $query->where('user_id', $currentUser->id);
        } elseif ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('business_type') && $request->business_type !== 'all') {
            $query->where('business_type', $request->business_type);
        }

        // Active monthly / quarterly targets for KPI rollup
        $activeTargets = (clone $query)
            ->where('period_type', $selectedPeriodType)
            ->when($selectedPeriodType === 'monthly', fn($q) => $q->where('month', $selectedMonth))
            ->when($selectedPeriodType === 'quarterly', fn($q) => $q->where('quarter', $selectedQuarter))
            ->get();

        // Calculate KPI rollups
        $totalTargetRevenue = (float) $activeTargets->sum('target_revenue');
        $totalActualRevenue = (float) $activeTargets->sum('actual_revenue');
        $totalPipeline = (float) $activeTargets->sum('pipeline_amount');
        $totalForecast = (float) $activeTargets->sum('forecast_revenue');

        $revenueAchievement = $totalTargetRevenue > 0
            ? (int) round(($totalActualRevenue / $totalTargetRevenue) * 100)
            : ($totalActualRevenue > 0 ? 100 : 0);

        // Activity metrics rollup
        $activityRollup = [
            'outreach'      => ['tgt' => $activeTargets->sum('target_outreach'), 'act' => $activeTargets->sum('actual_outreach')],
            'cold_calls'    => ['tgt' => $activeTargets->sum('target_cold_calls'), 'act' => $activeTargets->sum('actual_cold_calls')],
            'cold_emails'   => ['tgt' => $activeTargets->sum('target_cold_emails'), 'act' => $activeTargets->sum('actual_cold_emails')],
            'meetings'      => ['tgt' => $activeTargets->sum('target_meetings'), 'act' => $activeTargets->sum('actual_meetings')],
            'demos'         => ['tgt' => $activeTargets->sum('target_demos'), 'act' => $activeTargets->sum('actual_demos')],
            'proposals'     => ['tgt' => $activeTargets->sum('target_proposals'), 'act' => $activeTargets->sum('actual_proposals')],
            'opportunities' => ['tgt' => $activeTargets->sum('target_opportunities'), 'act' => $activeTargets->sum('actual_opportunities')],
            'new_accounts'  => ['tgt' => $activeTargets->sum('target_new_accounts'), 'act' => $activeTargets->sum('actual_new_accounts')],
        ];

        // Health Status counts
        $healthCounts = [
            'on_track' => $activeTargets->where('computed_health', 'on_track')->count(),
            'at_risk'  => $activeTargets->where('computed_health', 'at_risk')->count(),
            'critical' => $activeTargets->where('computed_health', 'critical')->count(),
        ];

        // Team targets list
        $teamPerformance = $activeTargets->map(function ($target) {
            return [
                'id' => $target->id,
                'title' => $target->title,
                'user' => $target->user ? [
                    'id' => $target->user->id,
                    'name' => $target->user->name,
                    'email' => $target->user->email,
                    'avatar' => $target->user->avatar,
                ] : null,
                'target_revenue' => (float) $target->target_revenue,
                'actual_revenue' => (float) $target->actual_revenue,
                'revenue_achievement_rate' => $target->revenue_achievement_rate,
                'activity_achievement_rate' => $target->activity_achievement_rate,
                'overall_achievement_rate' => $target->overall_achievement_rate,
                'pipeline_amount' => (float) $target->pipeline_amount,
                'forecast_revenue' => (float) $target->forecast_revenue,
                'health_status' => $target->computed_health,
                'period_type' => $target->period_type,
                'business_type' => $target->business_type,
            ];
        });

        // Today's Day Plans summary
        $todayPlans = SalesDayPlan::with('user:id,name,email,avatar')
            ->where('created_by', $tenantId)
            ->whereDate('plan_date', Carbon::today())
            ->when(!$canViewAll, fn($q) => $q->where('user_id', $currentUser->id))
            ->get();

        // Team dropdown
        $teamUsers = User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'avatar')
            ->orderBy('name')
            ->get();

        return Inertia::render('targets/index', [
            'kpis' => [
                'target_revenue' => $totalTargetRevenue,
                'actual_revenue' => $totalActualRevenue,
                'revenue_achievement' => $revenueAchievement,
                'pipeline_amount' => $totalPipeline,
                'forecast_revenue' => $totalForecast,
                'variance_revenue' => $totalActualRevenue - $totalTargetRevenue,
            ],
            'activityRollup' => $activityRollup,
            'healthCounts' => $healthCounts,
            'teamPerformance' => $teamPerformance,
            'todayPlans' => $todayPlans,
            'teamUsers' => $teamUsers,
            'canViewAll' => $canViewAll,
            'filters' => [
                'financial_year' => $currentYear,
                'period_type' => $selectedPeriodType,
                'month' => $selectedMonth,
                'quarter' => $selectedQuarter,
                'user_id' => $request->input('user_id', 'all'),
                'business_type' => $request->input('business_type', 'all'),
            ],
        ]);
    }

    /**
     * Target List View with Period Hierarchy
     */
    public function list(Request $request): Response
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('targets', $currentUser);

        $query = SalesTarget::with(['user:id,name,email,avatar', 'parent:id,title'])
            ->where('created_by', $tenantId);

        if (!$canViewAll) {
            $query->where('user_id', $currentUser->id);
        } elseif ($request->filled('user_id') && $request->user_id !== 'all') {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('period_type') && $request->period_type !== 'all') {
            $query->where('period_type', $request->period_type);
        }

        if ($request->filled('financial_year') && $request->financial_year !== 'all') {
            $query->where('financial_year', $request->financial_year);
        }

        if ($request->filled('business_type') && $request->business_type !== 'all') {
            $query->where('business_type', $request->business_type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhereHas('user', fn($sq) => $sq->where('name', 'like', "%{$search}%"));
            });
        }

        $sortField = $request->input('sort_field', 'start_date');
        $sortDirection = $request->input('sort_direction', 'desc');
        $allowedSorts = ['id', 'title', 'start_date', 'target_revenue', 'actual_revenue', 'period_type'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('start_date', 'desc');
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 15)));
        $targets = $query->paginate($perPage)->withQueryString();

        $teamUsers = User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'avatar')
            ->orderBy('name')
            ->get();

        return Inertia::render('targets/list', [
            'targets' => $targets,
            'teamUsers' => $teamUsers,
            'canViewAll' => $canViewAll,
            'filters' => $request->all(['search', 'financial_year', 'period_type', 'business_type', 'user_id', 'sort_field', 'sort_direction', 'per_page', 'page']),
        ]);
    }

    /**
     * Create Target & Allocation Wizard Form
     */
    public function create(Request $request): Response
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('targets', $currentUser);

        $teamUsers = User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'avatar')
            ->orderBy('name')
            ->get();

        // Potential parent targets (e.g. Annual Targets to attach Quarterly to)
        $parentTargets = SalesTarget::where('created_by', $tenantId)
            ->whereIn('period_type', ['annual', 'quarterly'])
            ->select('id', 'title', 'period_type', 'financial_year', 'user_id')
            ->orderBy('start_date', 'desc')
            ->get();

        return Inertia::render('targets/create', [
            'teamUsers' => $teamUsers,
            'parentTargets' => $parentTargets,
            'canViewAll' => $canViewAll,
        ]);
    }

    /**
     * Store Target & optional Child breakdown
     */
    public function store(Request $request)
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'user_id' => 'nullable|exists:users,id',
            'parent_id' => 'nullable|exists:sales_targets,id',
            'period_type' => 'required|string|in:annual,quarterly,monthly,bi_weekly,weekly,daily',
            'financial_year' => 'required|string|max:20',
            'quarter' => 'nullable|string|in:Q1,Q2,Q3,Q4',
            'month' => 'nullable|integer|min:1|max:12',
            'week_number' => 'nullable|integer|min:1|max:53',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'business_type' => 'nullable|string|max:50',
            'source_type' => 'nullable|string|max:50',
            'assigned_by' => 'nullable|exists:users,id',
            
            // Revenue Targets
            'target_revenue' => 'nullable|numeric|min:0',
            'target_new_business_revenue' => 'nullable|numeric|min:0',
            'target_upsell_revenue' => 'nullable|numeric|min:0',
            'target_renewal_revenue' => 'nullable|numeric|min:0',
            'target_mrr' => 'nullable|numeric|min:0',
            'target_arr' => 'nullable|numeric|min:0',
            'target_new_accounts' => 'nullable|integer|min:0',

            // Activity Targets
            'target_outreach' => 'nullable|integer|min:0',
            'target_cold_calls' => 'nullable|integer|min:0',
            'target_cold_emails' => 'nullable|integer|min:0',
            'target_linkedin_outreach' => 'nullable|integer|min:0',
            'target_meetings' => 'nullable|integer|min:0',
            'target_demos' => 'nullable|integer|min:0',
            'target_proposals' => 'nullable|integer|min:0',
            'target_followups' => 'nullable|integer|min:0',
            'target_opportunities' => 'nullable|integer|min:0',

            'daily_minimums_json' => 'nullable|array',
            'weekly_breakdown_json' => 'nullable|array',
            'notes' => 'nullable|string|max:65535',
            'auto_generate_children' => 'nullable|boolean',
        ]);

        $validated['created_by'] = $tenantId;
        $validated['assigned_by'] = $validated['assigned_by'] ?? $currentUser->id;
        $validated['source_type'] = $validated['source_type'] ?? 'manager_assigned';
        $validated['status'] = 'active';
        $validated['business_type'] = $validated['business_type'] ?? 'all';

        // Initialize target revision history
        $validated['target_history_json'] = [
            [
                'date' => Carbon::now()->toDateTimeString(),
                'updated_by' => $currentUser->name,
                'reason' => 'Initial target assignment',
                'target_revenue' => $validated['target_revenue'] ?? 0,
                'target_calls' => $validated['target_cold_calls'] ?? 0,
                'target_meetings' => $validated['target_meetings'] ?? 0,
            ]
        ];

        $target = SalesTarget::create($validated);

        // Auto-generate quarterly/monthly targets if requested
        if ($request->boolean('auto_generate_children') && $target->period_type === 'annual') {
            $this->generateQuarterlyAndMonthlyChildren($target);
        }

        // Run initial actuals sync
        $this->syncTargetActuals($target);

        return redirect()->route('targets.show', $target->id)->with('success', __('Sales Target created and allocated successfully.'));
    }

    /**
     * Show Target Detail View
     */
    public function show(Request $request, $id): Response
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('targets', $currentUser);

        $target = SalesTarget::with([
            'user:id,name,email,avatar',
            'assignedBy:id,name,email',
            'creator:id,name',
            'parent',
            'children.user:id,name,email,avatar',
            'dayPlans' => fn($q) => $q->orderBy('plan_date', 'desc')->take(30)->with('user:id,name,email,avatar')
        ])->where('created_by', $tenantId)->findOrFail($id);

        if (!$canViewAll && $target->user_id !== $currentUser->id) {
            abort(403, __('Unauthorized access to this target.'));
        }

        // Live refresh actuals from CRM
        $this->syncTargetActuals($target);
        $target->refresh();

        return Inertia::render('targets/show', [
            'target' => $target,
            'canViewAll' => $canViewAll,
        ]);
    }

    /**
     * Edit Target Form
     */
    public function edit($id): Response
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('targets', $currentUser);

        $target = SalesTarget::where('created_by', $tenantId)->findOrFail($id);

        if (!$canViewAll && $target->user_id !== $currentUser->id) {
            abort(403, __('Unauthorized access.'));
        }

        $teamUsers = User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'avatar')
            ->orderBy('name')
            ->get();

        $parentTargets = SalesTarget::where('created_by', $tenantId)
            ->where('id', '!=', $target->id)
            ->whereIn('period_type', ['annual', 'quarterly'])
            ->select('id', 'title', 'period_type', 'financial_year')
            ->get();

        return Inertia::render('targets/edit', [
            'target' => $target,
            'teamUsers' => $teamUsers,
            'parentTargets' => $parentTargets,
            'canViewAll' => $canViewAll,
        ]);
    }

    /**
     * Update Target with Audit History
     */
    public function update(Request $request, $id)
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('targets', $currentUser);

        $target = SalesTarget::where('created_by', $tenantId)->findOrFail($id);

        if (!$canViewAll && $target->user_id !== $currentUser->id) {
            abort(403, __('Unauthorized access.'));
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'user_id' => 'nullable|exists:users,id',
            'parent_id' => 'nullable|exists:sales_targets,id',
            'period_type' => 'required|string|in:annual,quarterly,monthly,bi_weekly,weekly,daily',
            'financial_year' => 'required|string|max:20',
            'quarter' => 'nullable|string|in:Q1,Q2,Q3,Q4',
            'month' => 'nullable|integer|min:1|max:12',
            'week_number' => 'nullable|integer|min:1|max:53',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'business_type' => 'nullable|string|max:50',
            'source_type' => 'nullable|string|max:50',
            
            'target_revenue' => 'nullable|numeric|min:0',
            'target_new_business_revenue' => 'nullable|numeric|min:0',
            'target_upsell_revenue' => 'nullable|numeric|min:0',
            'target_renewal_revenue' => 'nullable|numeric|min:0',
            'target_mrr' => 'nullable|numeric|min:0',
            'target_arr' => 'nullable|numeric|min:0',
            'target_new_accounts' => 'nullable|integer|min:0',

            'target_outreach' => 'nullable|integer|min:0',
            'target_cold_calls' => 'nullable|integer|min:0',
            'target_cold_emails' => 'nullable|integer|min:0',
            'target_linkedin_outreach' => 'nullable|integer|min:0',
            'target_meetings' => 'nullable|integer|min:0',
            'target_demos' => 'nullable|integer|min:0',
            'target_proposals' => 'nullable|integer|min:0',
            'target_followups' => 'nullable|integer|min:0',
            'target_opportunities' => 'nullable|integer|min:0',

            'daily_minimums_json' => 'nullable|array',
            'weekly_breakdown_json' => 'nullable|array',
            'notes' => 'nullable|string|max:65535',
            'manager_feedback' => 'nullable|string|max:65535',
            'revision_reason' => 'nullable|string|max:255',
            'status' => 'nullable|string|in:draft,active,achieved,behind,closed',
        ]);

        $oldValues = $target->only([
            'target_revenue', 'target_cold_calls', 'target_cold_emails', 
            'target_meetings', 'target_demos', 'target_proposals', 'target_outreach'
        ]);

        $revisionReason = $request->input('revision_reason', 'Manager revised target allocations');

        // Check if any metric value changed to append to history
        $hasChanged = (float)($validated['target_revenue'] ?? 0) != (float)$target->target_revenue ||
                      (int)($validated['target_cold_calls'] ?? 0) != (int)$target->target_cold_calls ||
                      (int)($validated['target_meetings'] ?? 0) != (int)$target->target_meetings;

        if ($hasChanged || $request->filled('revision_reason')) {
            $history = $target->target_history_json ?? [];
            $history[] = [
                'date' => Carbon::now()->toDateTimeString(),
                'updated_by' => $currentUser->name,
                'reason' => $revisionReason,
                'target_revenue' => (float)($validated['target_revenue'] ?? $target->target_revenue),
                'target_calls' => (int)($validated['target_cold_calls'] ?? $target->target_cold_calls),
                'target_meetings' => (int)($validated['target_meetings'] ?? $target->target_meetings),
            ];
            $validated['target_history_json'] = $history;
        }

        $target->update($validated);
        $this->syncTargetActuals($target);

        return redirect()->route('targets.show', $target->id)->with('success', __('Target updated and revision history recorded.'));
    }

    /**
     * Delete Target
     */
    public function destroy($id)
    {
        $tenantId = createdBy();
        $target = SalesTarget::where('created_by', $tenantId)->findOrFail($id);
        $target->delete();

        return redirect()->route('targets.list')->with('success', __('Target deleted successfully.'));
    }

    /**
     * Funnel & Sales Velocity Analytics
     */
    public function analytics(Request $request): Response
    {
        $tenantId = createdBy();
        $currentUser = Auth::user();
        $canViewAll = hasFullModuleAccess('targets', $currentUser);

        $financialYear = $request->input('financial_year', '2026-27');
        $selectedUserId = $request->input('user_id');

        $targetsQuery = SalesTarget::where('created_by', $tenantId)
            ->where('financial_year', $financialYear);

        if (!$canViewAll) {
            $targetsQuery->where('user_id', $currentUser->id);
        } elseif ($selectedUserId && $selectedUserId !== 'all') {
            $targetsQuery->where('user_id', $selectedUserId);
        }

        $allTargets = $targetsQuery->get();

        // Funnel Stages Aggregation (Activity -> Pipeline -> Conversion -> Won)
        $funnelData = [
            ['stage' => 'Accounts Outreach',     'target' => $allTargets->sum('target_outreach'),      'actual' => $allTargets->sum('actual_outreach')],
            ['stage' => 'Cold Calls & Emails',   'target' => $allTargets->sum('target_cold_calls') + $allTargets->sum('target_cold_emails'), 'actual' => $allTargets->sum('actual_cold_calls') + $allTargets->sum('actual_cold_emails')],
            ['stage' => 'Discovery Meetings',    'target' => $allTargets->sum('target_meetings'),      'actual' => $allTargets->sum('actual_meetings')],
            ['stage' => 'Demos & Solutions',     'target' => $allTargets->sum('target_demos'),         'actual' => $allTargets->sum('actual_demos')],
            ['stage' => 'Opportunities Created', 'target' => $allTargets->sum('target_opportunities'), 'actual' => $allTargets->sum('actual_opportunities')],
            ['stage' => 'Proposals Submitted',   'target' => $allTargets->sum('target_proposals'),     'actual' => $allTargets->sum('actual_proposals')],
            ['stage' => 'Deals / Accounts Won',  'target' => $allTargets->sum('target_new_accounts'),  'actual' => $allTargets->sum('actual_new_accounts')],
        ];

        // Revenue Breakdown
        $revenueBreakdown = [
            'new_business' => ['target' => (float)$allTargets->sum('target_new_business_revenue'), 'actual' => (float)$allTargets->sum('actual_new_business_revenue')],
            'upsell'       => ['target' => (float)$allTargets->sum('target_upsell_revenue'),       'actual' => (float)$allTargets->sum('actual_upsell_revenue')],
            'renewal'      => ['target' => (float)$allTargets->sum('target_renewal_revenue'),      'actual' => (float)$allTargets->sum('actual_renewal_revenue')],
            'mrr'          => ['target' => (float)$allTargets->sum('target_mrr'),                  'actual' => (float)$allTargets->sum('actual_mrr')],
        ];

        $teamUsers = User::where('created_by', $tenantId)
            ->where('status', 'active')
            ->select('id', 'name', 'email', 'avatar')
            ->orderBy('name')
            ->get();

        return Inertia::render('targets/analytics', [
            'funnelData' => $funnelData,
            'revenueBreakdown' => $revenueBreakdown,
            'teamUsers' => $teamUsers,
            'canViewAll' => $canViewAll,
            'filters' => [
                'financial_year' => $financialYear,
                'user_id' => $selectedUserId ?? 'all',
            ],
        ]);
    }

    /**
     * API: Smart Morning Plan Recommendation, Gap Intelligence & CRM auto-sync
     */
    public function recommendDailyPlan(Request $request)
    {
        $tenantId = createdBy();
        $user = Auth::user();
        $targetUserId = $request->input('user_id', $user->id);
        $date = $request->input('date', Carbon::today()->toDateString());

        // Find active monthly or weekly/daily target for this salesperson
        $currentMonth = Carbon::parse($date)->month;
        $monthlyTarget = SalesTarget::with('assignedBy:id,name,email')
            ->where('created_by', $tenantId)
            ->where('user_id', $targetUserId)
            ->where('period_type', 'monthly')
            ->where('month', $currentMonth)
            ->first();

        // Calculate working days remaining in month (excluding weekends)
        $endOfMonth = Carbon::parse($date)->endOfMonth();
        $startOfToday = Carbon::parse($date);
        $daysRemaining = max(1, $startOfToday->diffInDaysFiltered(fn(Carbon $d) => !$d->isWeekend(), $endOfMonth));

        $totalRevenue = $monthlyTarget ? (float)$monthlyTarget->target_revenue : 1000000;
        $achievedRevenue = $monthlyTarget ? (float)$monthlyTarget->actual_revenue : 0;
        $remainingRevenue = max(0, $totalRevenue - $achievedRevenue);

        $totalCalls = $monthlyTarget ? $monthlyTarget->target_cold_calls : 300;
        $achievedCalls = $monthlyTarget ? $monthlyTarget->actual_cold_calls : 0;
        $remainingCalls = max(0, $totalCalls - $achievedCalls);

        $totalMeetings = $monthlyTarget ? $monthlyTarget->target_meetings : 40;
        $achievedMeetings = $monthlyTarget ? $monthlyTarget->actual_meetings : 0;
        $remainingMeetings = max(0, $totalMeetings - $achievedMeetings);

        $totalDemos = $monthlyTarget ? $monthlyTarget->target_demos : 20;
        $achievedDemos = $monthlyTarget ? $monthlyTarget->actual_demos : 0;
        $remainingDemos = max(0, $totalDemos - $achievedDemos);

        $totalOutreach = $monthlyTarget ? $monthlyTarget->target_outreach : 200;
        $achievedOutreach = $monthlyTarget ? $monthlyTarget->actual_outreach : 0;
        $remainingOutreach = max(0, $totalOutreach - $achievedOutreach);

        $totalEmails = $monthlyTarget ? $monthlyTarget->target_cold_emails : 500;
        $achievedEmails = $monthlyTarget ? $monthlyTarget->actual_cold_emails : 0;
        $remainingEmails = max(0, $totalEmails - $achievedEmails);

        $totalFollowups = $monthlyTarget ? $monthlyTarget->target_followups : 200;
        $achievedFollowups = $monthlyTarget ? $monthlyTarget->actual_followups : 0;
        $remainingFollowups = max(0, $totalFollowups - $achievedFollowups);

        // Required Daily Pace needed to stay on track for monthly target
        $requiredDailyPace = [
            'revenue'   => round($remainingRevenue / $daysRemaining, 2),
            'calls'     => max(5, (int) ceil($remainingCalls / $daysRemaining)),
            'meetings'  => max(1, (int) ceil($remainingMeetings / $daysRemaining)),
            'demos'     => max(0, (int) ceil($remainingDemos / $daysRemaining)),
            'outreach'  => max(5, (int) ceil($remainingOutreach / $daysRemaining)),
            'emails'    => max(15, (int) ceil($remainingEmails / $daysRemaining)),
            'followups' => max(5, (int) ceil($remainingFollowups / $daysRemaining)),
            'leads'     => 3,
        ];

        // Manager Enforced Daily Minimums (if custom set or defaults)
        $dailyMinimums = $monthlyTarget?->daily_minimums_json ?? [
            'min_revenue'   => $requiredDailyPace['revenue'],
            'min_calls'     => max(15, $requiredDailyPace['calls']),
            'min_emails'    => max(25, $requiredDailyPace['emails']),
            'min_meetings'  => max(2, $requiredDailyPace['meetings']),
            'min_demos'     => max(1, $requiredDailyPace['demos']),
            'min_followups' => max(10, $requiredDailyPace['followups']),
            'min_outreach'  => max(10, $requiredDailyPace['outreach']),
        ];

        // Active High Priority Opportunities & Accounts for today's focus
        $priorityOpportunities = Opportunity::with(['account:id,name', 'opportunityStage:id,name'])
            ->where('created_by', $tenantId)
            ->where('assigned_to', $targetUserId)
            ->whereNotIn('status', ['won', 'lost', 'closed'])
            ->orderBy('amount', 'desc')
            ->take(5)
            ->get()
            ->map(fn($opp) => [
                'opportunity_id' => $opp->id,
                'name' => $opp->name,
                'account_name' => $opp->account?->name ?? 'Direct Opportunity',
                'amount' => (float)$opp->amount,
                'stage' => $opp->opportunityStage?->name ?? 'In Progress',
                'action_needed' => 'Demo follow-up & requirement confirmation',
            ]);

        // Auto-pull today's CRM actuals already recorded in database
        $crmActuals = $this->pullTodayCrmActuals($tenantId, $targetUserId, $date);

        $suggestedDaily = [
            'target_sales_amount' => $requiredDailyPace['revenue'],
            'target_calls'        => $requiredDailyPace['calls'],
            'target_meetings'     => $requiredDailyPace['meetings'],
            'target_demos'        => $requiredDailyPace['demos'],
            'target_outreach'     => $requiredDailyPace['outreach'],
            'target_emails'       => $requiredDailyPace['emails'],
            'target_followups'    => $requiredDailyPace['followups'],
            'target_leads'        => $requiredDailyPace['leads'],
        ];

        return response()->json([
            'monthly_target_id'     => $monthlyTarget?->id,
            'monthly_target_title'  => $monthlyTarget?->title ?? 'September Monthly Target',
            'days_remaining'        => $daysRemaining,
            'monthly_target'        => [
                'id' => $monthlyTarget?->id,
                'title' => $monthlyTarget?->title ?? 'Monthly Target',
                'source_type' => $monthlyTarget?->source_type ?? 'manager_assigned',
                'assigned_by_name' => $monthlyTarget?->assignedBy?->name ?? 'Sales Manager',
                'total_revenue' => $totalRevenue,
                'achieved_revenue' => $achievedRevenue,
                'remaining_revenue' => $remainingRevenue,
                'days_remaining' => $daysRemaining,
                'total_calls' => $totalCalls,
                'achieved_calls' => $achievedCalls,
                'total_meetings' => $totalMeetings,
                'achieved_meetings' => $achievedMeetings,
                'total_demos' => $totalDemos,
                'achieved_demos' => $achievedDemos,
            ],
            'required_daily_pace'   => $requiredDailyPace,
            'daily_minimums'        => $dailyMinimums,
            'suggested_plan'        => $suggestedDaily,
            'priority_opportunities'=> $priorityOpportunities,
            'crm_actuals'           => $crmActuals,
        ]);
    }

    /**
     * Auto-sync actuals from CRM database (Calls, Meetings, Leads, Invoices, Opportunities)
     */
    private function syncTargetActuals(SalesTarget $target): void
    {
        $tenantId = $target->created_by;
        $userId = $target->user_id;
        $start = $target->start_date;
        $end = $target->end_date;

        // Actual Revenue won from paid invoices / won opportunities
        $actualRevenue = (float) Invoice::where('created_by', $tenantId)
            ->when($userId, fn($q) => $q->where('assigned_to', $userId))
            ->whereBetween('created_at', [$start, $end])
            ->whereIn('status', ['paid', 'partially_paid'])
            ->sum('total_amount');

        // Active Pipeline Amount
        $pipelineAmount = (float) Opportunity::where('created_by', $tenantId)
            ->when($userId, fn($q) => $q->where('assigned_to', $userId))
            ->whereNotIn('status', ['won', 'lost'])
            ->sum('amount');

        // Calls made
        $actualCalls = Call::where('created_by', $tenantId)
            ->when($userId, fn($q) => $q->where('assigned_to', $userId))
            ->whereBetween('start_date', [$start, $end])
            ->count();

        // Meetings held
        $actualMeetings = Meeting::where('created_by', $tenantId)
            ->when($userId, fn($q) => $q->where('assigned_to', $userId))
            ->whereBetween('start_date', [$start, $end])
            ->count();

        // Opportunities created
        $actualOpportunities = Opportunity::where('created_by', $tenantId)
            ->when($userId, fn($q) => $q->where('assigned_to', $userId))
            ->whereBetween('created_at', [$start, $end])
            ->count();

        // Proposals sent (Quotes)
        $actualProposals = Quote::where('created_by', $tenantId)
            ->when($userId, fn($q) => $q->where('assigned_to', $userId))
            ->whereBetween('created_at', [$start, $end])
            ->count();

        // Day plan activities sum
        $dayPlans = SalesDayPlan::where('created_by', $tenantId)
            ->when($userId, fn($q) => $q->where('user_id', $userId))
            ->whereBetween('plan_date', [$start, $end])
            ->get();

        $actualOutreach = max($dayPlans->sum('actual_outreach'), Lead::where('created_by', $tenantId)->when($userId, fn($q) => $q->where('assigned_to', $userId))->whereBetween('created_at', [$start, $end])->count());
        $actualColdEmails = $dayPlans->sum('actual_emails');
        $actualDemos = $dayPlans->sum('actual_demos');
        $actualFollowups = $dayPlans->sum('actual_followups');

        // Forecast calculation = Won + (Weighted Pipeline 35%)
        $forecastRevenue = $actualRevenue + ($pipelineAmount * 0.35);

        $target->update([
            'actual_revenue'       => $actualRevenue,
            'pipeline_amount'      => $pipelineAmount,
            'forecast_revenue'     => $forecastRevenue,
            'actual_cold_calls'    => $actualCalls,
            'actual_meetings'      => $actualMeetings,
            'actual_proposals'     => $actualProposals,
            'actual_opportunities' => $actualOpportunities,
            'actual_outreach'      => $actualOutreach,
            'actual_cold_emails'   => $actualColdEmails,
            'actual_demos'         => $actualDemos,
            'actual_followups'     => $actualFollowups,
        ]);
    }

    /**
     * Auto-pull today's CRM actuals
     */
    private function pullTodayCrmActuals(int $tenantId, int $userId, string $date): array
    {
        $callsCount = Call::where('created_by', $tenantId)
            ->where('assigned_to', $userId)
            ->whereDate('start_date', $date)
            ->count();

        $meetingsCount = Meeting::where('created_by', $tenantId)
            ->where('assigned_to', $userId)
            ->whereDate('start_date', $date)
            ->count();

        $leadsCount = Lead::where('created_by', $tenantId)
            ->where('assigned_to', $userId)
            ->whereDate('created_at', $date)
            ->count();

        $proposalsCount = Quote::where('created_by', $tenantId)
            ->where('assigned_to', $userId)
            ->whereDate('created_at', $date)
            ->count();

        $pipelineCreated = (float) Opportunity::where('created_by', $tenantId)
            ->where('assigned_to', $userId)
            ->whereDate('created_at', $date)
            ->sum('amount');

        $salesClosed = (float) Invoice::where('created_by', $tenantId)
            ->where('assigned_to', $userId)
            ->whereDate('created_at', $date)
            ->whereIn('status', ['paid', 'partially_paid'])
            ->sum('total_amount');

        return [
            'actual_calls' => $callsCount,
            'actual_meetings' => $meetingsCount,
            'actual_leads' => $leadsCount,
            'actual_proposals' => $proposalsCount,
            'new_pipeline_created' => $pipelineCreated,
            'actual_sales_amount' => $salesClosed,
        ];
    }

    /**
     * Generate Quarterly & Monthly child targets from Annual Goal
     */
    private function generateQuarterlyAndMonthlyChildren(SalesTarget $annualTarget): void
    {
        $annualRev = (float) $annualTarget->target_revenue;
        $qRatios = ['Q1' => 0.20, 'Q2' => 0.25, 'Q3' => 0.25, 'Q4' => 0.30];

        $qMonths = [
            'Q1' => [4, 5, 6],
            'Q2' => [7, 8, 9],
            'Q3' => [10, 11, 12],
            'Q4' => [1, 2, 3],
        ];

        foreach ($qRatios as $qKey => $ratio) {
            $qRev = round($annualRev * $ratio, 2);
            $months = $qMonths[$qKey];
            $startDate = Carbon::createFromDate(null, $months[0], 1)->startOfMonth();
            $endDate = Carbon::createFromDate(null, $months[2], 1)->endOfMonth();

            $qTarget = SalesTarget::create([
                'created_by' => $annualTarget->created_by,
                'user_id' => $annualTarget->user_id,
                'parent_id' => $annualTarget->id,
                'title' => "{$annualTarget->title} - {$qKey}",
                'period_type' => 'quarterly',
                'financial_year' => $annualTarget->financial_year,
                'quarter' => $qKey,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'business_type' => $annualTarget->business_type,
                'target_revenue' => $qRev,
                'target_cold_calls' => (int) round($annualTarget->target_cold_calls * $ratio),
                'target_outreach' => (int) round($annualTarget->target_outreach * $ratio),
                'target_meetings' => (int) round($annualTarget->target_meetings * $ratio),
                'target_demos' => (int) round($annualTarget->target_demos * $ratio),
                'target_proposals' => (int) round($annualTarget->target_proposals * $ratio),
                'target_opportunities' => (int) round($annualTarget->target_opportunities * $ratio),
                'status' => 'active',
            ]);

            // Monthly breakdown under Quarter
            foreach ($months as $m) {
                $mRev = round($qRev / 3, 2);
                $mStart = Carbon::createFromDate(null, $m, 1)->startOfMonth();
                $mEnd = Carbon::createFromDate(null, $m, 1)->endOfMonth();
                $monthName = $mStart->format('F');

                SalesTarget::create([
                    'created_by' => $annualTarget->created_by,
                    'user_id' => $annualTarget->user_id,
                    'parent_id' => $qTarget->id,
                    'title' => "{$monthName} Target ({$qKey})",
                    'period_type' => 'monthly',
                    'financial_year' => $annualTarget->financial_year,
                    'quarter' => $qKey,
                    'month' => $m,
                    'start_date' => $mStart->toDateString(),
                    'end_date' => $mEnd->toDateString(),
                    'business_type' => $annualTarget->business_type,
                    'target_revenue' => $mRev,
                    'target_cold_calls' => (int) round($qTarget->target_cold_calls / 3),
                    'target_outreach' => (int) round($qTarget->target_outreach / 3),
                    'target_meetings' => (int) round($qTarget->target_meetings / 3),
                    'target_demos' => (int) round($qTarget->target_demos / 3),
                    'target_proposals' => (int) round($qTarget->target_proposals / 3),
                    'target_opportunities' => (int) round($qTarget->target_opportunities / 3),
                    'status' => 'active',
                ]);
            }
        }
    }
}
