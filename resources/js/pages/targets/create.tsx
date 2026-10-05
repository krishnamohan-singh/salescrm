import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, useForm, router } from '@inertiajs/react';
import { 
    Target, ArrowLeft, Send, Sparkles, Layers, DollarSign, 
    Activity, CheckSquare, Calendar, Users, Info, ShieldAlert,
    Clock, ListChecks, ArrowRight, Zap, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { getCurrencySymbol, formatCurrency } from '@/utils/helper';

export default function TargetCreate() {
    const { t } = useTranslation();
    const { auth, teamUsers = [], parentTargets = [], canViewAll = false } = usePage().props as any;
    const currencySymbol = getCurrencySymbol();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const defaultStartDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).getDate();
    const defaultEndDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${lastDayOfMonth}`;

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        user_id: canViewAll ? '' : String(auth?.user?.id || ''),
        parent_id: '',
        period_type: 'monthly',
        financial_year: '2026-27',
        quarter: 'Q2',
        month: currentMonth,
        week_number: 1,
        start_date: defaultStartDate,
        end_date: defaultEndDate,
        business_type: 'services',
        source_type: 'manager_assigned',
        assigned_by: String(auth?.user?.id || ''),
        
        // Business Outcome Targets (Revenue)
        target_revenue: 1000000,
        target_new_business_revenue: 600000,
        target_upsell_revenue: 200000,
        target_renewal_revenue: 200000,
        target_mrr: 0,
        target_arr: 0,
        target_new_accounts: 20,

        // Sales Activity Engine Targets (Leading Indicators)
        target_outreach: 400,
        target_cold_calls: 300,
        target_cold_emails: 500,
        target_linkedin_outreach: 150,
        target_meetings: 40,
        target_demos: 20,
        target_proposals: 15,
        target_followups: 200,
        target_opportunities: 25,

        // Manager Daily Minimums Thresholds (Required for Daily Sales Plan)
        daily_minimums_json: {
            min_revenue: 50000,
            min_calls: 15,
            min_emails: 25,
            min_meetings: 2,
            min_demos: 1,
            min_followups: 10,
            min_opportunities: 1,
        },

        // Weekly Breakdown Allocation (for Monthly targets)
        weekly_breakdown_json: [
            { week: 'Week 1', revenue: 200000, meetings: 10, demos: 5, calls: 75 },
            { week: 'Week 2', revenue: 250000, meetings: 10, demos: 5, calls: 75 },
            { week: 'Week 3', revenue: 250000, meetings: 10, demos: 5, calls: 75 },
            { week: 'Week 4', revenue: 300000, meetings: 10, demos: 5, calls: 75 },
        ],

        notes: '',
        auto_generate_children: false,
    });

    // Auto-update dates when period type changes
    const handlePeriodChange = (period: string) => {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth() + 1;
        const pad = (n: number) => String(n).padStart(2, '0');

        let start = `${y}-${pad(m)}-01`;
        let end = `${y}-${pad(m)}-${new Date(y, m, 0).getDate()}`;
        let autoChildren = false;

        if (period === 'annual') {
            start = `${y}-04-01`;
            end = `${y + 1}-03-31`;
            autoChildren = true;
        } else if (period === 'quarterly') {
            const q = Math.ceil(m / 3);
            const qStartMonth = (q - 1) * 3 + 1;
            const qEndMonth = q * 3;
            start = `${y}-${pad(qStartMonth)}-01`;
            end = `${y}-${pad(qEndMonth)}-${new Date(y, qEndMonth, 0).getDate()}`;
        } else if (period === 'monthly') {
            start = `${y}-${pad(m)}-01`;
            end = `${y}-${pad(m)}-${new Date(y, m, 0).getDate()}`;
        } else if (period === 'bi_weekly') {
            const startDateObj = new Date();
            const endDateObj = new Date();
            endDateObj.setDate(startDateObj.getDate() + 13);
            start = `${startDateObj.getFullYear()}-${pad(startDateObj.getMonth() + 1)}-${pad(startDateObj.getDate())}`;
            end = `${endDateObj.getFullYear()}-${pad(endDateObj.getMonth() + 1)}-${pad(endDateObj.getDate())}`;
        } else if (period === 'weekly') {
            const startDateObj = new Date();
            const endDateObj = new Date();
            endDateObj.setDate(startDateObj.getDate() + 6);
            start = `${startDateObj.getFullYear()}-${pad(startDateObj.getMonth() + 1)}-${pad(startDateObj.getDate())}`;
            end = `${endDateObj.getFullYear()}-${pad(endDateObj.getMonth() + 1)}-${pad(endDateObj.getDate())}`;
        } else if (period === 'daily') {
            const todayStr = `${y}-${pad(m)}-${pad(today.getDate())}`;
            start = todayStr;
            end = todayStr;
        }

        setData((prev) => ({
            ...prev,
            period_type: period,
            start_date: start,
            end_date: end,
            auto_generate_children: autoChildren,
        }));
    };

    // Auto-calculate daily minimums from current period target assuming 22 working days
    const autoComputeDailyMinimums = () => {
        let workingDays = 22;
        if (data.period_type === 'weekly') workingDays = 5;
        else if (data.period_type === 'bi_weekly') workingDays = 10;
        else if (data.period_type === 'daily') workingDays = 1;
        else if (data.period_type === 'quarterly') workingDays = 66;
        else if (data.period_type === 'annual') workingDays = 250;

        const minRev = Math.round(Number(data.target_revenue || 0) / workingDays);
        const minCalls = Math.max(1, Math.round(Number(data.target_cold_calls || 0) / workingDays));
        const minEmails = Math.max(1, Math.round(Number(data.target_cold_emails || 0) / workingDays));
        const minMeetings = Math.max(1, Math.round(Number(data.target_meetings || 0) / workingDays));
        const minDemos = Math.max(1, Math.round(Number(data.target_demos || 0) / workingDays));
        const minFollowups = Math.max(1, Math.round(Number(data.target_followups || 0) / workingDays));
        const minOpp = Math.max(1, Math.round(Number(data.target_opportunities || 0) / workingDays));

        setData('daily_minimums_json', {
            min_revenue: minRev,
            min_calls: minCalls,
            min_emails: minEmails,
            min_meetings: minMeetings,
            min_demos: minDemos,
            min_followups: minFollowups,
            min_opportunities: minOpp,
        });
        toast.info(t('Daily minimums calculated based on working days pace.'));
    };

    // Distribute monthly target equally across 4 weeks
    const distributeWeeksEvenly = () => {
        const rev = Math.round(Number(data.target_revenue || 0) / 4);
        const meetings = Math.round(Number(data.target_meetings || 0) / 4);
        const demos = Math.round(Number(data.target_demos || 0) / 4);
        const calls = Math.round(Number(data.target_cold_calls || 0) / 4);

        setData('weekly_breakdown_json', [
            { week: 'Week 1', revenue: rev, meetings, demos, calls },
            { week: 'Week 2', revenue: rev, meetings, demos, calls },
            { week: 'Week 3', revenue: rev, meetings, demos, calls },
            { week: 'Week 4', revenue: Number(data.target_revenue || 0) - rev * 3, meetings, demos, calls },
        ]);
        toast.info(t('Weekly breakdown distributed across 4 weeks.'));
    };

    const handleWeeklyChange = (index: number, field: string, val: number) => {
        const updated = [...(data.weekly_breakdown_json || [])];
        updated[index] = {
            ...updated[index],
            [field]: val,
        };
        setData('weekly_breakdown_json', updated);
    };

    const totalWeeklyAllocatedRev = (data.weekly_breakdown_json || []).reduce((sum: number, w: any) => sum + Number(w.revenue || 0), 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('targets.store'), {
            onSuccess: () => {
                toast.success(t('Sales target allocated and hierarchy generated successfully!'));
            },
            onError: () => {
                toast.error(t('Please review the form for validation errors.'));
            }
        });
    };

    return (
        <PageTemplate
            title={t('Manager Target Assignment & Quota Setup')}
            description={t('Assign multi-period quotas, leading activity minimums, and daily commitment pace to sales reps.')}
            url={route('targets.create')}
            breadcrumbs={[
                { title: t('Targets & Day Plans'), href: route('targets.index') },
                { title: t('Sales Targets'), href: route('targets.list') },
                { title: t('Allocate Target'), href: route('targets.create') },
            ]}
        >
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => router.get(route('targets.list'))}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        {t('Back to Target List')}
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 1. Target Scope & Hierarchy Configuration */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-primary" />
                                <div>
                                    <CardTitle className="text-base">{t('1. Target Assignment & Period Horizon')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Select salesperson, timeframe (Monthly, 2 Weeks, Weekly, Daily, Custom), and target source.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Title */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label htmlFor="title" className="text-xs font-semibold">
                                        {t('Target Title / Goal Name')} *
                                    </Label>
                                    <Input
                                        id="title"
                                        placeholder={t('e.g., September 2026 Sales Target — Rahul')}
                                        required
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="text-xs font-medium"
                                    />
                                    {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                                </div>

                                {/* Financial Year */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="financial_year" className="text-xs font-semibold">
                                        {t('Financial Year')} *
                                    </Label>
                                    <Select
                                        value={data.financial_year}
                                        onValueChange={(val) => setData('financial_year', val)}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2025-26">FY 2025–26</SelectItem>
                                            <SelectItem value="2026-27">FY 2026–27</SelectItem>
                                            <SelectItem value="2027-28">FY 2027–28</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                                {/* Period Type */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('Target Period')} *</Label>
                                    <Select
                                        value={data.period_type}
                                        onValueChange={handlePeriodChange}
                                    >
                                        <SelectTrigger className="h-9 text-xs font-medium">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">{t('Daily')}</SelectItem>
                                            <SelectItem value="weekly">{t('1 Week (Weekly)')}</SelectItem>
                                            <SelectItem value="bi_weekly">{t('2 Weeks (Bi-Weekly)')}</SelectItem>
                                            <SelectItem value="monthly">{t('1 Month (Monthly)')}</SelectItem>
                                            <SelectItem value="quarterly">{t('Quarterly (Q1–Q4)')}</SelectItem>
                                            <SelectItem value="annual">{t('Annual (Full Year)')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Sales Representative */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('Assigned Salesperson')} *</Label>
                                    {canViewAll ? (
                                        <Select
                                            value={data.user_id ? String(data.user_id) : 'all_team'}
                                            onValueChange={(val) => setData('user_id', val === 'all_team' ? '' : val)}
                                        >
                                            <SelectTrigger className="h-9 text-xs font-medium">
                                                <SelectValue placeholder={t('Entire Organization / Team')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all_team">{t('Entire Company / Team')}</SelectItem>
                                                {teamUsers.map((u: any) => (
                                                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input disabled value={auth?.user?.name || ''} className="text-xs bg-muted" />
                                    )}
                                </div>

                                {/* Business Type */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('Business Offering Type')}</Label>
                                    <Select
                                        value={data.business_type}
                                        onValueChange={(val) => setData('business_type', val)}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="services">{t('Services (Web, SEO, Dev)')}</SelectItem>
                                            <SelectItem value="solutions">{t('Solutions (Kommify, CRM)')}</SelectItem>
                                            <SelectItem value="saas">{t('SaaS (Subscription MRR/ARR)')}</SelectItem>
                                            <SelectItem value="custom">{t('Custom Consulting')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Target Source */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('Target Source / Type')}</Label>
                                    <Select
                                        value={data.source_type}
                                        onValueChange={(val) => setData('source_type', val)}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="manager_assigned">{t('Manager Assigned')}</SelectItem>
                                            <SelectItem value="derived_monthly">{t('Derived from Monthly Target')}</SelectItem>
                                            <SelectItem value="org_goal">{t('Organizational Goal')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Date Ranges */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="start_date" className="text-xs font-semibold">{t('Start Date')} *</Label>
                                    <Input
                                        id="start_date"
                                        type="date"
                                        required
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        className="text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="end_date" className="text-xs font-semibold">{t('End Date')} *</Label>
                                    <Input
                                        id="end_date"
                                        type="date"
                                        required
                                        value={data.end_date}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Business & Revenue Outcome Targets */}
                    <Card className="shadow-sm border-l-4 border-l-emerald-500">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <CardTitle className="text-base">{t('2. Revenue & Outcome Targets (Quota)')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Set the period revenue quota, new business revenue, expansions, and accounts target.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Total Revenue */}
                                <div className="space-y-1.5 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200/80 dark:border-emerald-800/40">
                                    <Label className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                        {t('Total Revenue Target')} ({currencySymbol}) *
                                    </Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        required
                                        value={data.target_revenue}
                                        onChange={(e) => setData('target_revenue', parseFloat(e.target.value) || 0)}
                                        className="text-sm font-bold h-9"
                                    />
                                </div>

                                {/* New Business Revenue */}
                                <div className="space-y-1.5 p-3 rounded-lg bg-card border">
                                    <Label className="text-xs font-semibold">{t('New Business Revenue')} ({currencySymbol})</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_new_business_revenue}
                                        onChange={(e) => setData('target_new_business_revenue', parseFloat(e.target.value) || 0)}
                                        className="text-xs font-medium h-9"
                                    />
                                </div>

                                {/* Upsell / Cross-sell */}
                                <div className="space-y-1.5 p-3 rounded-lg bg-card border">
                                    <Label className="text-xs font-semibold">{t('Upsell / Renewal')} ({currencySymbol})</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_upsell_revenue}
                                        onChange={(e) => setData('target_upsell_revenue', parseFloat(e.target.value) || 0)}
                                        className="text-xs font-medium h-9"
                                    />
                                </div>

                                {/* Target New Accounts */}
                                <div className="space-y-1.5 p-3 rounded-lg bg-card border">
                                    <Label className="text-xs font-semibold">{t('New Accounts / Clients')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_new_accounts}
                                        onChange={(e) => setData('target_new_accounts', parseInt(e.target.value) || 0)}
                                        className="text-xs font-medium h-9"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Sales Activity Engine Targets (Leading Indicators) */}
                    <Card className="shadow-sm border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600" />
                                <div>
                                    <CardTitle className="text-base">{t('3. Period Sales Activity Targets (Leading Indicators)')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Effort required across calls, meetings, demos, emails and pipeline opportunities.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {/* Cold Calls */}
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Calls Target')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_cold_calls}
                                        onChange={(e) => setData('target_cold_calls', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                {/* Cold Emails */}
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Emails Target')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_cold_emails}
                                        onChange={(e) => setData('target_cold_emails', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                {/* Discovery Meetings */}
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Meetings Target')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_meetings}
                                        onChange={(e) => setData('target_meetings', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                {/* Demo Calls */}
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Demos Target')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_demos}
                                        onChange={(e) => setData('target_demos', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                {/* Proposals Sent */}
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Proposals Target')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_proposals}
                                        onChange={(e) => setData('target_proposals', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                {/* Follow-ups */}
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Follow-ups Target')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_followups}
                                        onChange={(e) => setData('target_followups', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                {/* Opportunities Created */}
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Opportunities Target')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_opportunities}
                                        onChange={(e) => setData('target_opportunities', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                {/* Account Outreach */}
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Account Outreach')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_outreach}
                                        onChange={(e) => setData('target_outreach', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 4. Manager Daily Minimums Thresholds (Required Targets for Daily Plan) */}
                    <Card className="shadow-sm border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10">
                        <CardHeader className="pb-3 border-b bg-amber-100/30 dark:bg-amber-900/20">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <ListChecks className="h-5 w-5 text-amber-600" />
                                    <div>
                                        <CardTitle className="text-base">{t('4. Daily Minimum Thresholds (Daily Commitment Requirements)')}</CardTitle>
                                        <CardDescription className="text-xs">
                                            {t('These values become the manager’s required daily minimums evaluated when the salesperson creates their morning plan.')}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={autoComputeDailyMinimums}
                                    className="h-8 text-xs border-amber-300 text-amber-900 dark:text-amber-300 bg-background"
                                >
                                    <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-600" />
                                    {t('Auto-Calculate Pace')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {/* Min Daily Revenue */}
                                <div className="space-y-1 p-3 rounded-lg bg-card border border-amber-200 dark:border-amber-800/40">
                                    <Label className="text-xs font-semibold text-amber-900 dark:text-amber-400">{t('Min Revenue')} ({currencySymbol})</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.daily_minimums_json?.min_revenue ?? 50000}
                                        onChange={(e) => setData('daily_minimums_json', {
                                            ...data.daily_minimums_json,
                                            min_revenue: parseFloat(e.target.value) || 0
                                        })}
                                        className="text-xs font-bold h-8"
                                    />
                                </div>

                                {/* Min Calls */}
                                <div className="space-y-1 p-3 rounded-lg bg-card border border-amber-200 dark:border-amber-800/40">
                                    <Label className="text-xs font-semibold">{t('Min Calls')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.daily_minimums_json?.min_calls ?? 15}
                                        onChange={(e) => setData('daily_minimums_json', {
                                            ...data.daily_minimums_json,
                                            min_calls: parseInt(e.target.value) || 0
                                        })}
                                        className="text-xs font-bold h-8"
                                    />
                                </div>

                                {/* Min Emails */}
                                <div className="space-y-1 p-3 rounded-lg bg-card border border-amber-200 dark:border-amber-800/40">
                                    <Label className="text-xs font-semibold">{t('Min Emails')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.daily_minimums_json?.min_emails ?? 25}
                                        onChange={(e) => setData('daily_minimums_json', {
                                            ...data.daily_minimums_json,
                                            min_emails: parseInt(e.target.value) || 0
                                        })}
                                        className="text-xs font-bold h-8"
                                    />
                                </div>

                                {/* Min Meetings */}
                                <div className="space-y-1 p-3 rounded-lg bg-card border border-amber-200 dark:border-amber-800/40">
                                    <Label className="text-xs font-semibold">{t('Min Meetings')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.daily_minimums_json?.min_meetings ?? 2}
                                        onChange={(e) => setData('daily_minimums_json', {
                                            ...data.daily_minimums_json,
                                            min_meetings: parseInt(e.target.value) || 0
                                        })}
                                        className="text-xs font-bold h-8"
                                    />
                                </div>

                                {/* Min Demos */}
                                <div className="space-y-1 p-3 rounded-lg bg-card border border-amber-200 dark:border-amber-800/40">
                                    <Label className="text-xs font-semibold">{t('Min Demos')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.daily_minimums_json?.min_demos ?? 1}
                                        onChange={(e) => setData('daily_minimums_json', {
                                            ...data.daily_minimums_json,
                                            min_demos: parseInt(e.target.value) || 0
                                        })}
                                        className="text-xs font-bold h-8"
                                    />
                                </div>

                                {/* Min Follow-ups */}
                                <div className="space-y-1 p-3 rounded-lg bg-card border border-amber-200 dark:border-amber-800/40">
                                    <Label className="text-xs font-semibold">{t('Min Follow-ups')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.daily_minimums_json?.min_followups ?? 10}
                                        onChange={(e) => setData('daily_minimums_json', {
                                            ...data.daily_minimums_json,
                                            min_followups: parseInt(e.target.value) || 0
                                        })}
                                        className="text-xs font-bold h-8"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 5. Weekly Target Allocation Breakdown (if Monthly Target) */}
                    {data.period_type === 'monthly' && (
                        <Card className="shadow-sm border-l-4 border-l-purple-500">
                            <CardHeader className="pb-3 border-b bg-muted/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-purple-600" />
                                        <div>
                                            <CardTitle className="text-base">{t('5. Weekly Target Allocation (Manager Controlled Breakdown)')}</CardTitle>
                                            <CardDescription className="text-xs">
                                                {t('Allocate monthly targets into custom weekly milestones.')}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={distributeWeeksEvenly}
                                        className="h-8 text-xs"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                        {t('Distribute Evenly')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="text-xs font-semibold">{t('Period')}</TableHead>
                                            <TableHead className="text-xs font-semibold">{t('Revenue Target')} ({currencySymbol})</TableHead>
                                            <TableHead className="text-xs font-semibold">{t('Meetings')}</TableHead>
                                            <TableHead className="text-xs font-semibold">{t('Demos')}</TableHead>
                                            <TableHead className="text-xs font-semibold">{t('Calls')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(data.weekly_breakdown_json || []).map((w: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-bold text-xs">{w.week}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={w.revenue}
                                                        onChange={(e) => handleWeeklyChange(idx, 'revenue', parseFloat(e.target.value) || 0)}
                                                        className="h-8 text-xs font-semibold w-36"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={w.meetings}
                                                        onChange={(e) => handleWeeklyChange(idx, 'meetings', parseInt(e.target.value) || 0)}
                                                        className="h-8 text-xs w-24"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={w.demos}
                                                        onChange={(e) => handleWeeklyChange(idx, 'demos', parseInt(e.target.value) || 0)}
                                                        className="h-8 text-xs w-24"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={w.calls}
                                                        onChange={(e) => handleWeeklyChange(idx, 'calls', parseInt(e.target.value) || 0)}
                                                        className="h-8 text-xs w-24"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="p-3 bg-muted/20 border-t flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">
                                        {t('Allocated Total:')} <strong>{formatCurrency(totalWeeklyAllocatedRev)}</strong> / {formatCurrency(data.target_revenue || 0)}
                                    </span>
                                    {totalWeeklyAllocatedRev !== Number(data.target_revenue || 0) && (
                                        <Badge variant="outline" className="text-amber-600 border-amber-400 gap-1 text-[11px]">
                                            <AlertTriangle className="h-3 w-3" />
                                            {t('Sum difference:')} {formatCurrency(Math.abs(Number(data.target_revenue || 0) - totalWeeklyAllocatedRev))}
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Auto Cascade Option for Annual Goals */}
                    {data.period_type === 'annual' && (
                        <Card className="shadow-sm bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/40">
                            <CardContent className="p-4 flex items-start space-x-3">
                                <Checkbox
                                    id="auto_generate_children"
                                    checked={data.auto_generate_children}
                                    onCheckedChange={(checked) => setData('auto_generate_children', Boolean(checked))}
                                    className="mt-0.5"
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="auto_generate_children" className="text-xs font-bold text-indigo-900 dark:text-indigo-300 cursor-pointer">
                                        {t('Automatically cascade into Q1–Q4 Quarterly and 12 Monthly Sub-Targets')}
                                    </Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        {t('The system will auto-generate child quarterly targets and divide activity targets across working periods.')}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Notes & Submission Bar */}
                    <Card className="shadow-sm">
                        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="w-full sm:w-1/2">
                                <Input
                                    placeholder={t('Optional notes, strategy or manager allocation commentary...')}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="text-xs h-9"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.get(route('targets.list'))}
                                    disabled={processing}
                                >
                                    {t('Cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-primary text-primary-foreground font-semibold"
                                >
                                    <Send className="h-4 w-4 mr-1.5" />
                                    {processing ? t('Allocating...') : t('Save & Allocate Target')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </PageTemplate>
    );
}
