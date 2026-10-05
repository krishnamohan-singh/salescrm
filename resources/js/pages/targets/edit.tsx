import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, useForm, router, Link } from '@inertiajs/react';
import { 
    Target, ArrowLeft, Send, Layers, DollarSign, 
    Activity, Calendar, Users, Edit, ListChecks, History, 
    Sparkles, AlertCircle, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { getCurrencySymbol } from '@/utils/helper';

export default function TargetEdit() {
    const { t } = useTranslation();
    const { target = {}, teamUsers = [], parentTargets = [], canViewAll = false } = usePage().props as any;
    const currencySymbol = getCurrencySymbol();

    const { data, setData, put, processing, errors } = useForm({
        title: target.title || '',
        user_id: target.user_id ? String(target.user_id) : '',
        parent_id: target.parent_id ? String(target.parent_id) : '',
        period_type: target.period_type || 'monthly',
        financial_year: target.financial_year || '2026-27',
        quarter: target.quarter || 'Q1',
        month: target.month || 1,
        week_number: target.week_number || 1,
        start_date: target.start_date || '',
        end_date: target.end_date || '',
        business_type: target.business_type || 'services',
        source_type: target.source_type || 'manager_assigned',
        status: target.status || 'active',

        // Business Revenue Targets
        target_revenue: target.target_revenue || 0,
        target_new_business_revenue: target.target_new_business_revenue || 0,
        target_upsell_revenue: target.target_upsell_revenue || 0,
        target_renewal_revenue: target.target_renewal_revenue || 0,
        target_mrr: target.target_mrr || 0,
        target_arr: target.target_arr || 0,
        target_new_accounts: target.target_new_accounts || 0,

        // Sales Activity Engine Targets
        target_outreach: target.target_outreach || 0,
        target_cold_calls: target.target_cold_calls || 0,
        target_cold_emails: target.target_cold_emails || 0,
        target_linkedin_outreach: target.target_linkedin_outreach || 0,
        target_meetings: target.target_meetings || 0,
        target_demos: target.target_demos || 0,
        target_proposals: target.target_proposals || 0,
        target_followups: target.target_followups || 0,
        target_opportunities: target.target_opportunities || 0,

        // Daily Minimums
        daily_minimums_json: target.daily_minimums_json || {
            min_revenue: 50000,
            min_calls: 15,
            min_emails: 25,
            min_meetings: 2,
            min_demos: 1,
            min_followups: 10,
            min_opportunities: 1,
        },

        // Weekly Breakdown
        weekly_breakdown_json: target.weekly_breakdown_json || [
            { week: 'Week 1', revenue: 200000, meetings: 10, demos: 5, calls: 75 },
            { week: 'Week 2', revenue: 250000, meetings: 10, demos: 5, calls: 75 },
            { week: 'Week 3', revenue: 250000, meetings: 10, demos: 5, calls: 75 },
            { week: 'Week 4', revenue: 300000, meetings: 10, demos: 5, calls: 75 },
        ],

        revision_reason: '',
        notes: target.notes || '',
        manager_feedback: target.manager_feedback || '',
    });

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
        put(route('targets.update', target.id), {
            onSuccess: () => {
                toast.success(t('Sales target updated and revision audit logged!'));
            },
            onError: () => {
                toast.error(t('Please review the errors in the form.'));
            }
        });
    };

    return (
        <PageTemplate
            title={t('Edit Sales Target & Quota Allocation')}
            description={`${target.title} (${target.financial_year}) — ${t('Revising target updates history audit log.')}`}
            url={route('targets.edit', target.id)}
            breadcrumbs={[
                { title: t('Targets & Day Plans'), href: route('targets.index') },
                { title: t('Sales Targets'), href: route('targets.list') },
                { title: target.title, href: route('targets.show', target.id) },
                { title: t('Edit'), href: route('targets.edit', target.id) },
            ]}
        >
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => router.get(route('targets.show', target.id))}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        {t('Back to Target Details')}
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Reason for Target Revision (Auditable history) */}
                    <Card className="shadow-sm border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10">
                        <CardHeader className="pb-2 bg-amber-100/30 dark:bg-amber-900/20">
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5 text-amber-600" />
                                <div>
                                    <CardTitle className="text-base text-amber-950 dark:text-amber-200">{t('Target Revision & Change Audit')}</CardTitle>
                                    <CardDescription className="text-xs text-amber-800/80 dark:text-amber-400">
                                        {t('Document why this quota or activity target is being revised (e.g. "New enterprise account allocation" or "Mid-month territory change").')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            <Label htmlFor="revision_reason" className="text-xs font-semibold">
                                {t('Revision Reason / Commentary')}
                            </Label>
                            <Input
                                id="revision_reason"
                                placeholder={t('e.g., Target revised due to new territory and account additions')}
                                value={data.revision_reason}
                                onChange={(e) => setData('revision_reason', e.target.value)}
                                className="text-xs font-medium"
                            />
                        </CardContent>
                    </Card>

                    {/* 1. Target Scope & Hierarchy Configuration */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-primary" />
                                <div>
                                    <CardTitle className="text-base">{t('Target Scope & Period Hierarchy')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Update period dates, financial year, and rep assignment.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label htmlFor="title" className="text-xs font-semibold">
                                        {t('Target Title / Goal Name')} *
                                    </Label>
                                    <Input
                                        id="title"
                                        required
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        className="text-xs font-medium"
                                    />
                                    {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                                </div>

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
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('Period Type')} *</Label>
                                    <Select
                                        value={data.period_type}
                                        onValueChange={(val) => setData('period_type', val)}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
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

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('Assigned Sales Rep')}</Label>
                                    {canViewAll ? (
                                        <Select
                                            value={data.user_id ? String(data.user_id) : 'all_team'}
                                            onValueChange={(val) => setData('user_id', val === 'all_team' ? '' : val)}
                                        >
                                            <SelectTrigger className="h-9 text-xs">
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
                                        <Input disabled value={target.user?.name || ''} className="text-xs bg-muted" />
                                    )}
                                </div>

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
                                            <SelectItem value="solutions">{t('Solutions (CRM, AI)')}</SelectItem>
                                            <SelectItem value="saas">{t('SaaS (Subscription)')}</SelectItem>
                                            <SelectItem value="custom">{t('Custom Consulting')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('Status')}</Label>
                                    <Select
                                        value={data.status}
                                        onValueChange={(val) => setData('status', val)}
                                    >
                                        <SelectTrigger className="h-9 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="achieved">{t('Achieved')}</SelectItem>
                                            <SelectItem value="behind">{t('Behind')}</SelectItem>
                                            <SelectItem value="closed">{t('Closed')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

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
                                    <CardTitle className="text-base">{t('Business & Revenue Targets (Outcomes)')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Revenue quota, new business and accounts target.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

                                <div className="space-y-1.5 p-3 rounded-lg bg-card border">
                                    <Label className="text-xs font-semibold">{t('New Accounts / Logos Won')}</Label>
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
                                    <CardTitle className="text-base">{t('Sales Activity Targets (Leading Indicators)')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Effort and volume required to hit quota.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Cold Calls')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_cold_calls}
                                        onChange={(e) => setData('target_cold_calls', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Cold Emails')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_cold_emails}
                                        onChange={(e) => setData('target_cold_emails', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Meetings')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_meetings}
                                        onChange={(e) => setData('target_meetings', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Demos')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_demos}
                                        onChange={(e) => setData('target_demos', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Proposals')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_proposals}
                                        onChange={(e) => setData('target_proposals', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Follow-ups')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_followups}
                                        onChange={(e) => setData('target_followups', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/20 border">
                                    <Label className="text-xs font-medium">{t('Opportunities')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.target_opportunities}
                                        onChange={(e) => setData('target_opportunities', parseInt(e.target.value) || 0)}
                                        className="text-xs font-semibold h-8"
                                    />
                                </div>

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

                    {/* 4. Daily Minimum Thresholds */}
                    <Card className="shadow-sm border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10">
                        <CardHeader className="pb-3 border-b bg-amber-100/30 dark:bg-amber-900/20">
                            <div className="flex items-center gap-2">
                                <ListChecks className="h-5 w-5 text-amber-600" />
                                <div>
                                    <CardTitle className="text-base">{t('Daily Minimums Thresholds (Required Targets for Daily Plan)')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Values enforced in salesperson morning plan.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <div className="space-y-1 p-3 rounded-lg bg-card border">
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

                                <div className="space-y-1 p-3 rounded-lg bg-card border">
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

                                <div className="space-y-1 p-3 rounded-lg bg-card border">
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

                                <div className="space-y-1 p-3 rounded-lg bg-card border">
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

                                <div className="space-y-1 p-3 rounded-lg bg-card border">
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

                                <div className="space-y-1 p-3 rounded-lg bg-card border">
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
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-purple-600" />
                                    {t('Weekly Target Breakdown')}
                                </CardTitle>
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
                            </CardContent>
                        </Card>
                    )}

                    {/* Notes & Submission Bar */}
                    <Card className="shadow-sm">
                        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="w-full sm:w-1/2">
                                <Input
                                    placeholder={t('Notes or manager feedback...')}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    className="text-xs h-9"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.get(route('targets.show', target.id))}
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
                                    {processing ? t('Updating...') : t('Save Target Changes')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </PageTemplate>
    );
}
