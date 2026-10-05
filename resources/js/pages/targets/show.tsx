import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, useForm, router, Link } from '@inertiajs/react';
import { 
    Target, ArrowLeft, Edit, DollarSign, Activity, CheckCircle2, 
    AlertTriangle, AlertCircle, Calendar, Users, Layers, TrendingUp, 
    Sparkles, RefreshCw, Send, MessageSquare, ChevronRight, Eye, Phone, 
    Mail, Award, ListChecks, History, Clock, ShieldCheck, Flame
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';

export default function TargetShow() {
    const { t } = useTranslation();
    const { auth, target = {}, canViewAll = false } = usePage().props as any;

    const permissions = auth?.permissions || [];
    const isCompanyOrAdmin = ['company', 'admin', 'superadmin'].includes((auth?.user?.type || '').toLowerCase());
    const canEditTarget = isCompanyOrAdmin || (canViewAll && hasPermission(permissions, 'edit-targets'));
    const canReviewCoaching = isCompanyOrAdmin || (canViewAll && (hasPermission(permissions, 'edit-targets') || hasPermission(permissions, 'manage-targets')));

    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data: feedbackData, setData: setFeedbackData, put, processing } = useForm({
        manager_feedback: target.manager_feedback || '',
    });

    const handleSaveFeedback = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('targets.update', target.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Manager coaching feedback saved successfully')),
        });
    };

    const formatMoney = (val: number | string) => {
        return formatCurrency(val);
    };

    const getHealthBadge = (health: string) => {
        switch (health) {
            case 'on_track':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('On Track')}
                    </Badge>
                );
            case 'at_risk':
                return (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('At Risk')}
                    </Badge>
                );
            case 'critical':
                return (
                    <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 flex items-center gap-1 font-semibold text-xs px-2.5 py-0.5">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {t('Behind Target')}
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{health || 'Active'}</Badge>;
        }
    };

    // Remaining calculations
    const remainingRevenue = Math.max(0, Number(target.target_revenue || 0) - Number(target.actual_revenue || 0));
    
    // Remaining working days calculation
    const calculateRemainingWorkingDays = () => {
        if (!target.end_date) return 1;
        const today = new Date();
        const end = new Date(target.end_date);
        if (today > end) return 0;
        
        let count = 0;
        const cur = new Date(today);
        while (cur <= end) {
            const dayOfWeek = cur.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                count++;
            }
            cur.setDate(cur.getDate() + 1);
        }
        return Math.max(1, count);
    };

    const workingDaysRemaining = calculateRemainingWorkingDays();
    const requiredDailyRevenuePace = workingDaysRemaining > 0 ? Math.round(remainingRevenue / workingDaysRemaining) : 0;

    const activityMetrics = [
        { label: t('Cold Calls'),          tgt: target.target_cold_calls,     act: target.actual_cold_calls,     unit: 'calls' },
        { label: t('Cold Emails'),         tgt: target.target_cold_emails,    act: target.actual_cold_emails,    unit: 'emails' },
        { label: t('Discovery Meetings'),  tgt: target.target_meetings,       act: target.actual_meetings,       unit: 'meetings' },
        { label: t('Demo Calls'),          tgt: target.target_demos,          act: target.actual_demos,          unit: 'demos' },
        { label: t('Proposals Sent'),      tgt: target.target_proposals,      act: target.actual_proposals,      unit: 'proposals' },
        { label: t('Follow-ups'),          tgt: target.target_followups,      act: target.actual_followups,      unit: 'followups' },
        { label: t('Opportunities'),       tgt: target.target_opportunities,  act: target.actual_opportunities,  unit: 'opps' },
        { label: t('Account Outreach'),    tgt: target.target_outreach,      act: target.actual_outreach,      unit: 'accounts' },
    ];

    const dailyMinimums = target.daily_minimums_json || {};
    const targetHistory = target.target_history_json || [];
    const weeklyBreakdown = target.weekly_breakdown_json || [];

    return (
        <PageTemplate
            title={target.title || t('Target Details')}
            description={`${target.financial_year} • ${target.period_type?.toUpperCase()} Target • ${target.business_type?.toUpperCase()}`}
            url={route('targets.show', target.id)}
            breadcrumbs={[
                { title: t('Targets & Day Plans'), href: route('targets.index') },
                { title: t('Sales Targets'), href: route('targets.list') },
                { title: target.title || t('Details'), href: route('targets.show', target.id) },
            ]}
        >
            <div className="space-y-6">
                {/* Header Banner with Source Attribution & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-xl border shadow-sm">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h2 className="text-xl font-bold text-foreground">{target.title}</h2>
                            {getHealthBadge(target.computed_health)}
                            <Badge variant="outline" className="capitalize text-xs font-semibold">
                                {target.period_type}
                            </Badge>
                            {target.source_type && (
                                <Badge variant="secondary" className="text-[11px] capitalize bg-muted flex items-center gap-1">
                                    <ShieldCheck className="h-3 w-3 text-primary" />
                                    {target.source_type.replace('_', ' ')}
                                </Badge>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Calendar className="h-3.5 w-3.5" />
                                {target.start_date} → {target.end_date}
                            </span>
                            {target.user && (
                                <span className="flex items-center gap-1.5 font-medium">
                                    <Users className="h-3.5 w-3.5" />
                                    {t('Sales Rep:')} <strong className="text-foreground">{target.user.name}</strong>
                                </span>
                            )}
                            {target.assigned_by_user && (
                                <span className="flex items-center gap-1.5 text-muted-foreground">
                                    {t('Assigned by:')} <strong className="text-foreground">{target.assigned_by_user.name}</strong>
                                </span>
                            )}
                            {target.parent && (
                                <span className="flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5" />
                                    {t('Derived From:')} <Link href={route('targets.show', target.parent.id)} className="text-primary hover:underline font-semibold">{target.parent.title}</Link>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs"
                            onClick={() => router.get(route('targets.show', target.id))}
                        >
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            {t('Sync CRM Actuals')}
                        </Button>

                        {canEditTarget && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-xs"
                                onClick={() => router.get(route('targets.edit', target.id))}
                            >
                                <Edit className="h-3.5 w-3.5 mr-1.5" />
                                {t('Edit / Revise Target')}
                            </Button>
                        )}

                        <Button
                            size="sm"
                            className="h-9 text-xs bg-primary text-primary-foreground font-semibold"
                            onClick={() => router.get(route('sales-day-plans.create'))}
                        >
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            {t('Create Day Plan')}
                        </Button>
                    </div>
                </div>

                {/* Target Reachability Intelligence Card */}
                <Card className="shadow-sm border-l-4 border-l-indigo-600 bg-gradient-to-r from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/10">
                    <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
                        <div className="flex items-center gap-2">
                            <Flame className="h-5 w-5 text-indigo-600" />
                            <div>
                                <CardTitle className="text-base text-indigo-950 dark:text-indigo-200">
                                    {t('Target Reachability & Required Daily Pace Intelligence')}
                                </CardTitle>
                                <CardDescription className="text-xs text-indigo-900/70 dark:text-indigo-400">
                                    {t('Dynamic velocity calculation based on remaining gap and working days left in the period.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                            <div className="p-3 bg-card rounded-lg border shadow-xs">
                                <span className="text-xs text-muted-foreground font-medium">{t('Monthly / Period Target')}</span>
                                <div className="text-lg font-bold text-foreground mt-1">{formatMoney(target.target_revenue)}</div>
                            </div>

                            <div className="p-3 bg-card rounded-lg border shadow-xs">
                                <span className="text-xs text-muted-foreground font-medium">{t('Achieved Won')}</span>
                                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                    {formatMoney(target.actual_revenue)} ({target.revenue_achievement_rate || 0}%)
                                </div>
                            </div>

                            <div className="p-3 bg-card rounded-lg border shadow-xs">
                                <span className="text-xs text-muted-foreground font-medium">{t('Remaining Quota Gap')}</span>
                                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                                    {formatMoney(remainingRevenue)}
                                </div>
                            </div>

                            <div className="p-3 bg-card rounded-lg border shadow-xs">
                                <span className="text-xs text-muted-foreground font-medium">{t('Working Days Left')}</span>
                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                                    {workingDaysRemaining} {t('days')}
                                </div>
                            </div>

                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-xs col-span-2 sm:col-span-1">
                                <span className="text-xs text-indigo-900 dark:text-indigo-300 font-bold">{t('Required Daily Pace')}</span>
                                <div className="text-lg font-extrabold text-indigo-700 dark:text-indigo-300 mt-1">
                                    {formatMoney(requiredDailyRevenuePace)}/day
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 1. Revenue & Quota Progress Scorecard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Target Revenue */}
                    <Card className="shadow-sm border-l-4 border-l-indigo-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium flex items-center justify-between">
                                <span>{t('Quota Revenue Target')}</span>
                                <Target className="h-4 w-4 text-indigo-500" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold">
                                {formatMoney(target.target_revenue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-xs text-muted-foreground">
                            {t('Committed period quota')}
                        </CardContent>
                    </Card>

                    {/* Won Revenue & Attainment */}
                    <Card className="shadow-sm border-l-4 border-l-emerald-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium flex items-center justify-between">
                                <span>{t('Won Closed Revenue')}</span>
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(target.actual_revenue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-muted-foreground">{t('Attainment')}</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{target.revenue_achievement_rate}%</span>
                            </div>
                            <Progress value={Math.min(100, target.revenue_achievement_rate)} className="h-1.5" />
                        </CardContent>
                    </Card>

                    {/* Active Pipeline */}
                    <Card className="shadow-sm border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium flex items-center justify-between">
                                <span>{t('Active Pipeline Amount')}</span>
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {formatMoney(target.pipeline_amount)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-xs text-muted-foreground">
                            {t('Open qualified opportunities')}
                        </CardContent>
                    </Card>

                    {/* Forecast Revenue */}
                    <Card className="shadow-sm border-l-4 border-l-purple-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium flex items-center justify-between">
                                <span>{t('Weighted Forecast')}</span>
                                <Activity className="h-4 w-4 text-purple-500" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatMoney(target.forecast_revenue)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 text-xs text-muted-foreground">
                            {t('Won + 35% Weighted Pipeline')}
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Manager Daily Minimums Thresholds (Requirements) */}
                {Object.keys(dailyMinimums).length > 0 && (
                    <Card className="shadow-sm border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10">
                        <CardHeader className="pb-3 border-b bg-amber-100/30 dark:bg-amber-900/20">
                            <div className="flex items-center gap-2">
                                <ListChecks className="h-5 w-5 text-amber-600" />
                                <div>
                                    <CardTitle className="text-base">{t('Manager Daily Minimum Targets (Required Commitments)')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Every morning plan created by the salesperson is benchmarked against these daily requirements.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                <div className="p-3 bg-card rounded-lg border text-center">
                                    <span className="text-[11px] text-muted-foreground block font-medium">{t('Daily Revenue Target')}</span>
                                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatMoney(dailyMinimums.min_revenue || 0)}
                                    </span>
                                </div>
                                <div className="p-3 bg-card rounded-lg border text-center">
                                    <span className="text-[11px] text-muted-foreground block font-medium">{t('Calls / Day')}</span>
                                    <span className="text-base font-bold text-foreground">{dailyMinimums.min_calls || 0}</span>
                                </div>
                                <div className="p-3 bg-card rounded-lg border text-center">
                                    <span className="text-[11px] text-muted-foreground block font-medium">{t('Emails / Day')}</span>
                                    <span className="text-base font-bold text-foreground">{dailyMinimums.min_emails || 0}</span>
                                </div>
                                <div className="p-3 bg-card rounded-lg border text-center">
                                    <span className="text-[11px] text-muted-foreground block font-medium">{t('Meetings / Day')}</span>
                                    <span className="text-base font-bold text-foreground">{dailyMinimums.min_meetings || 0}</span>
                                </div>
                                <div className="p-3 bg-card rounded-lg border text-center">
                                    <span className="text-[11px] text-muted-foreground block font-medium">{t('Demos / Day')}</span>
                                    <span className="text-base font-bold text-foreground">{dailyMinimums.min_demos || 0}</span>
                                </div>
                                <div className="p-3 bg-card rounded-lg border text-center">
                                    <span className="text-[11px] text-muted-foreground block font-medium">{t('Follow-ups / Day')}</span>
                                    <span className="text-base font-bold text-foreground">{dailyMinimums.min_followups || 0}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 3. Sales Activity Engine Breakdown (Leading Indicators) */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    {t('Sales Activity Engine — Target vs Actuals')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Leading indicators synced from calls, meetings, leads, and day plan EOD reports.')}
                                </CardDescription>
                            </div>
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
                                {t('Overall Activity Attainment:')} {target.activity_achievement_rate}%
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {activityMetrics.map((m, idx) => {
                                const rate = m.tgt > 0 ? Math.round((m.act / m.tgt) * 100) : (m.act > 0 ? 100 : 0);
                                return (
                                    <div key={idx} className="p-3.5 rounded-xl border bg-card/60 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-muted-foreground">{m.label}</span>
                                            <span className={`font-bold ${rate >= 100 ? 'text-emerald-600' : rate >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>
                                                {rate}%
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-xl font-bold text-foreground">{m.act || 0}</span>
                                            <span className="text-xs text-muted-foreground">/ {m.tgt || 0} {m.unit}</span>
                                        </div>
                                        <Progress value={Math.min(100, rate)} className="h-1.5" />
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Weekly Breakdown Allocation Table (if available) */}
                {weeklyBreakdown && weeklyBreakdown.length > 0 && (
                    <Card className="shadow-sm border-l-4 border-l-purple-500">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-purple-600" />
                                {t('Manager Weekly Breakdown Allocation')}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {t('Custom week-by-week targets configured by the manager.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="text-xs font-semibold">{t('Week')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Allocated Revenue')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Meetings Target')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Demos Target')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Calls Target')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {weeklyBreakdown.map((w: any, idx: number) => (
                                        <TableRow key={idx} className="hover:bg-muted/20">
                                            <TableCell className="font-bold text-xs">{w.week}</TableCell>
                                            <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatMoney(w.revenue)}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">{w.meetings} {t('meetings')}</TableCell>
                                            <TableCell className="text-xs font-medium">{w.demos} {t('demos')}</TableCell>
                                            <TableCell className="text-xs font-medium">{w.calls} {t('calls')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* 5. Target Revision & Audit History Timeline */}
                {targetHistory && targetHistory.length > 0 && (
                    <Card className="shadow-sm border-l-4 border-l-amber-500">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-base flex items-center gap-2">
                                <History className="h-5 w-5 text-amber-600" />
                                {t('Target Revision History & Audit Trail')}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                {t('Record of all target allocations and manager revisions over time.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="text-xs font-semibold">{t('Date')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Updated By')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Revenue Target')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Calls')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Meetings')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Revision Reason / Note')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {targetHistory.map((h: any, idx: number) => (
                                        <TableRow key={idx} className="hover:bg-muted/20">
                                            <TableCell className="text-xs font-medium whitespace-nowrap">{h.date}</TableCell>
                                            <TableCell className="text-xs font-semibold text-foreground">{h.updated_by}</TableCell>
                                            <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatMoney(h.target_revenue)}
                                            </TableCell>
                                            <TableCell className="text-xs">{h.target_calls || 0}</TableCell>
                                            <TableCell className="text-xs">{h.target_meetings || 0}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-xs">{h.reason || t('Target revision')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* 6. Linked Sales Day Plans Contributing to this Target */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    {t('Linked Morning Plans & EOD Reports')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Daily execution records for this salesperson during this target timeframe.')}
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-semibold"
                                onClick={() => router.get(route('sales-day-plans.create'))}
                            >
                                <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                                {t('New Morning Plan')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {(!target.day_plans || target.day_plans.length === 0) ? (
                            <div className="text-center py-8 text-xs text-muted-foreground">
                                {t('No day plans recorded under this target period yet.')}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="text-xs font-semibold">{t('Date')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Salesperson')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Plan Reachability')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Calls (Act/Tgt)')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Meetings (Act/Tgt)')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Day Sales')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Status')}</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">{t('Action')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {target.day_plans.map((dp: any) => (
                                        <TableRow key={dp.id} className="hover:bg-muted/30">
                                            <TableCell className="font-semibold text-xs">{dp.plan_date}</TableCell>
                                            <TableCell className="text-xs">{dp.user?.name || '-'}</TableCell>
                                            <TableCell>
                                                {dp.reachability_status === 'on_track' && (
                                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px]">
                                                        🟢 {t('On Track')}
                                                    </Badge>
                                                )}
                                                {dp.reachability_status === 'at_risk' && (
                                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px]">
                                                        🟡 {t('At Risk')}
                                                    </Badge>
                                                )}
                                                {dp.reachability_status === 'behind' && (
                                                    <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 text-[10px]">
                                                        🔴 {t('Behind')}
                                                    </Badge>
                                                )}
                                                {!dp.reachability_status && (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">{dp.actual_calls || 0} / {dp.target_calls || 0}</TableCell>
                                            <TableCell className="text-xs">{dp.actual_meetings || 0} / {dp.target_meetings || 0}</TableCell>
                                            <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatMoney(dp.actual_sales_amount || 0)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={dp.is_eod_submitted ? 'default' : 'outline'} className="text-[10px]">
                                                    {dp.is_eod_submitted ? t('EOD Done') : t('In Progress')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    onClick={() => router.get(route('sales-day-plans.show', dp.id))}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* 7. Manager Coaching, Blocker Mitigation & Action Plan */}
                <Card className="shadow-sm border-l-4 border-l-amber-500">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-amber-600" />
                            <div>
                                <CardTitle className="text-base">{t('Manager Coaching & Target Action Plan')}</CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Management review, coaching tips on pipeline bottlenecks, and next steps.')}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        {canReviewCoaching ? (
                            <form onSubmit={handleSaveFeedback} className="space-y-4">
                                <Textarea
                                    rows={4}
                                    placeholder={t('Enter coaching notes, deal intervention recommendations, or manager feedback for this target period...')}
                                    value={feedbackData.manager_feedback}
                                    onChange={(e) => setFeedbackData('manager_feedback', e.target.value)}
                                    className="text-xs"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={processing}
                                        className="bg-primary text-primary-foreground text-xs font-semibold"
                                    >
                                        <Send className="h-3.5 w-3.5 mr-1.5" />
                                        {processing ? t('Saving...') : t('Update Coaching Notes')}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div>
                                {target.manager_feedback ? (
                                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 dark:border-amber-800/40 text-xs leading-relaxed">
                                        <p className="font-medium text-foreground whitespace-pre-line">{target.manager_feedback}</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic">{t('No manager coaching notes recorded for this target yet.')}</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageTemplate>
    );
}
