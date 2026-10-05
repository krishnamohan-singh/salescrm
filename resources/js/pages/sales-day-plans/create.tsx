import React, { useState, useEffect, useMemo } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, useForm, router, Link } from '@inertiajs/react';
import { 
    Calendar, User, Phone, Users, TrendingUp, CheckCircle, 
    ArrowLeft, Target, Sparkles, Send, FileText, ClipboardList,
    Mail, Briefcase, ChevronRight, CheckCircle2, AlertTriangle,
    AlertCircle, RefreshCw, ShieldAlert, ArrowUpRight, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { getCurrencySymbol, formatCurrency } from '@/utils/helper';

export default function SalesDayPlanCreate() {
    const { t } = useTranslation();
    const { auth, teamUsers = [], canViewAll = false, defaultDate } = usePage().props as any;

    const [recommendation, setRecommendation] = useState<any>(null);
    const [isLoadingRec, setIsLoadingRec] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        plan_date: defaultDate || new Date().toISOString().slice(0, 10),
        user_id: String(auth?.user?.id || ''),
        sales_target_id: '',
        title: '',
        target_calls: 15,
        target_meetings: 2,
        target_demos: 1,
        target_outreach: 10,
        target_emails: 25,
        target_leads: 3,
        target_followups: 8,
        target_proposals: 1,
        target_sales_amount: 50000,
        planned_activities: '',
        planned_accounts: '',
        shortage_reason: '',
        status: 'submitted',
        send_email_now: false,
    });

    const fetchRecommendation = async (userId: string, date: string) => {
        if (!userId) return;
        setIsLoadingRec(true);
        try {
            const url = route('targets.recommend-daily', { user_id: userId, date });
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (res.ok) {
                const json = await res.json();
                setRecommendation(json);
                if (json.monthly_target_id && !data.sales_target_id) {
                    setData((prev) => ({ ...prev, sales_target_id: String(json.monthly_target_id) }));
                }
            }
        } catch (err) {
            console.error('Failed to load daily recommendation', err);
        } finally {
            setIsLoadingRec(false);
        }
    };

    useEffect(() => {
        if (data.user_id && data.plan_date) {
            fetchRecommendation(data.user_id, data.plan_date);
        }
    }, [data.user_id, data.plan_date]);

    // Apply Recommended Required Numbers to Inputs
    const handleApplyRecommendation = () => {
        if (!recommendation) return;
        const p = recommendation.required_daily_pace || recommendation.suggested_plan || {};
        const mins = recommendation.daily_minimums || {};
        
        const rev = mins.min_revenue || p.revenue || p.target_sales_amount || 50000;
        const calls = mins.min_calls || p.calls || p.target_calls || 15;
        const emails = mins.min_emails || p.emails || p.target_emails || 25;
        const meetings = mins.min_meetings || p.meetings || p.target_meetings || 2;
        const demos = mins.min_demos !== undefined ? mins.min_demos : (p.demos || p.target_demos || 1);
        const followups = mins.min_followups || p.followups || p.target_followups || 10;
        const outreach = mins.min_outreach || p.outreach || p.target_outreach || 10;

        setData((prev) => {
            let oppsSummary = prev.planned_accounts;
            if (recommendation.priority_opportunities && recommendation.priority_opportunities.length > 0 && !oppsSummary) {
                const list = recommendation.priority_opportunities.map((o: any, idx: number) => 
                    `${idx + 1}. ${o.name} (${o.account_name}) - ${formatCurrency(o.amount)} - ${o.stage}`
                ).join('\n');
                oppsSummary = list;
            }

            return {
                ...prev,
                sales_target_id: recommendation.monthly_target?.id ? String(recommendation.monthly_target.id) : prev.sales_target_id,
                target_sales_amount: rev,
                target_calls: calls,
                target_emails: emails,
                target_meetings: meetings,
                target_demos: demos,
                target_followups: followups,
                target_outreach: outreach,
                planned_accounts: oppsSummary,
            };
        });
        toast.success(t('Your daily plan has been aligned with your manager\'s required quota pace!'));
    };

    // Live Gap Intelligence Calculation
    const liveAnalysis = useMemo(() => {
        const pace = recommendation?.required_daily_pace || {
            revenue: 50000,
            calls: 15,
            emails: 25,
            meetings: 2,
            demos: 1,
            followups: 10,
            outreach: 10,
        };

        const revenueGap = Number(data.target_sales_amount || 0) - Number(pace.revenue || 0);
        const callsGap = Number(data.target_calls || 0) - Number(pace.calls || 0);
        const emailsGap = Number(data.target_emails || 0) - Number(pace.emails || 0);
        const meetingsGap = Number(data.target_meetings || 0) - Number(pace.meetings || 0);
        const demosGap = Number(data.target_demos || 0) - Number(pace.demos || 0);
        const followupsGap = Number(data.target_followups || 0) - Number(pace.followups || 0);

        const shortItems: string[] = [];
        if (revenueGap < 0) shortItems.push(`${formatCurrency(Math.abs(revenueGap))} expected revenue`);
        if (callsGap < 0) shortItems.push(`${Math.abs(callsGap)} calls`);
        if (emailsGap < 0) shortItems.push(`${Math.abs(emailsGap)} emails`);
        if (meetingsGap < 0) shortItems.push(`${Math.abs(meetingsGap)} meetings`);
        if (demosGap < 0) shortItems.push(`${Math.abs(demosGap)} demos`);
        if (followupsGap < 0) shortItems.push(`${Math.abs(followupsGap)} follow-ups`);

        const isShort = shortItems.length > 0;
        
        let status: 'on_track' | 'at_risk' | 'behind' = 'on_track';
        if (
            (Number(data.target_sales_amount || 0) < Number(pace.revenue || 0) * 0.6) ||
            (Number(data.target_calls || 0) < Number(pace.calls || 0) * 0.6)
        ) {
            status = 'behind';
        } else if (isShort) {
            status = 'at_risk';
        }

        return {
            pace,
            revenueGap,
            callsGap,
            emailsGap,
            meetingsGap,
            demosGap,
            followupsGap,
            shortItems,
            isShort,
            status,
        };
    }, [data, recommendation]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('sales-day-plans.store'), {
            onSuccess: () => {
                toast.success(t('Morning Sales Day Plan submitted successfully!'));
            },
            onError: () => {
                toast.error(t('Please review the errors in the form.'));
            }
        });
    };

    const formatMoney = (val: number | string) => {
        return formatCurrency(val);
    };

    const targetInfo = recommendation?.monthly_target;

    return (
        <PageTemplate
            title={t('☀️ My Daily Sales Plan')}
            description={t('Plan daily activities against your manager-assigned quota, detect performance gaps, and commit goals.')}
            url={route('sales-day-plans.create')}
            breadcrumbs={[
                { title: t('Targets & Day Plans'), href: route('targets.index') },
                { title: t('Daily Sales Plans'), href: route('sales-day-plans.index') },
                { title: t('My Plan'), href: route('sales-day-plans.create') },
            ]}
        >
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => router.get(route('sales-day-plans.index'))}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1.5" />
                        {t('Back to Day Plans')}
                    </Button>

                    <div className="flex items-center gap-2">
                        {isLoadingRec && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <RefreshCw className="h-3 w-3 animate-spin" /> {t('Calculating pace...')}
                            </span>
                        )}
                    </div>
                </div>

                {/* 1. Target Status & Required Daily Pace Banner */}
                {targetInfo && (
                    <Card className="shadow-sm border-l-4 border-l-indigo-600 bg-gradient-to-r from-indigo-50/50 via-background to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/20">
                        <CardHeader className="pb-3 border-b border-indigo-100/60 dark:border-indigo-900/40">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-sm">
                                        <Target className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base font-bold text-foreground">
                                                {targetInfo.title}
                                            </CardTitle>
                                            <Badge variant="outline" className="text-[10px] bg-background">
                                                {t('Source:')} {targetInfo.assigned_by_name || t('Sales Manager')}
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-xs">
                                            {targetInfo.days_remaining} {t('working days remaining in month')} • {t('Required Pace:')} <strong className="text-indigo-700 dark:text-indigo-300">{formatMoney(liveAnalysis.pace.revenue)}/day</strong>
                                        </CardDescription>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {liveAnalysis.status === 'on_track' && (
                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs px-3 py-1 flex items-center gap-1">
                                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                            {t('🟢 On Track')}
                                        </Badge>
                                    )}
                                    {liveAnalysis.status === 'at_risk' && (
                                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-bold text-xs px-3 py-1 flex items-center gap-1">
                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                            {t('🟡 At Risk')}
                                        </Badge>
                                    )}
                                    {liveAnalysis.status === 'behind' && (
                                        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-bold text-xs px-3 py-1 flex items-center gap-1">
                                            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                                            {t('🔴 Behind Pace')}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div className="p-2.5 rounded-lg bg-background border">
                                <span className="text-muted-foreground">{t('Monthly Target')}</span>
                                <p className="text-base font-bold text-foreground mt-0.5">{formatMoney(targetInfo.total_revenue)}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-background border">
                                <span className="text-muted-foreground">{t('Already Achieved')}</span>
                                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatMoney(targetInfo.achieved_revenue)}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-background border">
                                <span className="text-muted-foreground">{t('Remaining Quota')}</span>
                                <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{formatMoney(targetInfo.remaining_revenue)}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                                <span className="text-indigo-900 dark:text-indigo-300 font-medium">{t('Required Pace / Day')}</span>
                                <p className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 mt-0.5">{formatMoney(liveAnalysis.pace.revenue)}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 2. Smart Warning / Target Risk Alert */}
                {liveAnalysis.isShort ? (
                    <Card className="shadow-sm border-l-4 border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/20">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                                            {t('⚠️ Your daily plan is below today\'s assigned target pace')}
                                        </h4>
                                        <p className="text-xs text-amber-900/90 dark:text-amber-300/90 mt-0.5">
                                            {liveAnalysis.revenueGap < 0 && (
                                                <span>
                                                    {t('Your current daily plan is')} <strong>{formatMoney(data.target_sales_amount)}</strong>, {t('but you need approximately')} <strong>{formatMoney(liveAnalysis.pace.revenue)}/day</strong> {t('to reach your monthly target.')}
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                                            💡 {t('System Recommendation:')} {t('Increase your plan by')} <strong>{liveAnalysis.shortItems.join(', ')}</strong> {t('to stay aligned with today\'s target.')}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
                                    onClick={handleApplyRecommendation}
                                >
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                    {t('Align Plan with Target')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20">
                        <CardContent className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                <div>
                                    <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                                        {t('🟢 Great Commitment! Your daily plan is fully aligned with quota pace.')}
                                    </h4>
                                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                                        {t('Your planned activities meet or exceed manager targets across all metrics.')}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information Card */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-primary" />
                                <div>
                                    <CardTitle className="text-base">{t('Plan Information & Date')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('Select plan date and your sales representative profile.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="plan_date" className="text-xs font-semibold">
                                        {t('Plan Date')} *
                                    </Label>
                                    <Input
                                        id="plan_date"
                                        type="date"
                                        required
                                        value={data.plan_date}
                                        onChange={(e) => setData('plan_date', e.target.value)}
                                        className="text-xs"
                                    />
                                    {errors.plan_date && <p className="text-xs text-destructive">{errors.plan_date}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="user_id" className="text-xs font-semibold">
                                        {t('Sales Representative')} *
                                    </Label>
                                    {canViewAll ? (
                                        <Select
                                            value={String(data.user_id)}
                                            onValueChange={(val) => setData('user_id', val)}
                                        >
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue placeholder={t('Select Sales Representative')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teamUsers.map((u: any) => (
                                                    <SelectItem key={u.id} value={String(u.id)}>
                                                        {u.name} ({u.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input disabled value={auth?.user?.name || ''} className="text-xs bg-muted" />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="title" className="text-xs font-semibold">
                                    {t('Primary Goal / Focus Theme of the Day')}
                                </Label>
                                <Input
                                    id="title"
                                    placeholder={t('e.g., Enterprise Demo for ABC Corp, Invoicing follow-ups, and Q3 Prospecting batch')}
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    className="text-xs"
                                />
                                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. Manager Target vs My Plan Real-time Matrix */}
                    <Card className="shadow-sm border-l-4 border-l-primary">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
                                    <div>
                                        <CardTitle className="text-base">{t('Manager\'s Target vs My Plan Comparison')}</CardTitle>
                                        <CardDescription className="text-xs">
                                            {t('Live gap detection comparing manager required pace with your planned daily commitment.')}
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold"
                                    onClick={handleApplyRecommendation}
                                >
                                    <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                                    {t('Auto-Fill Recommended Pace')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="text-xs font-semibold">{t('Metric / Activity')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Manager Required Pace')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Your Planned Commitment')}</TableHead>
                                        <TableHead className="text-xs font-semibold text-center">{t('Live Gap')}</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">{t('Pace Status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Revenue */}
                                    <TableRow className="hover:bg-muted/20">
                                        <TableCell className="font-semibold text-xs flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                                            {t('Target Revenue')} ({getCurrencySymbol()})
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-muted-foreground">
                                            {formatMoney(liveAnalysis.pace.revenue)}
                                        </TableCell>
                                        <TableCell className="max-w-[160px]">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.target_sales_amount}
                                                onChange={(e) => setData('target_sales_amount', parseFloat(e.target.value) || 0)}
                                                className="text-xs font-bold h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`text-xs font-bold ${liveAnalysis.revenueGap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {liveAnalysis.revenueGap >= 0 ? `+${formatMoney(liveAnalysis.revenueGap)}` : `-${formatMoney(Math.abs(liveAnalysis.revenueGap))}`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={liveAnalysis.revenueGap >= 0 ? 'default' : 'destructive'} className="text-[10px]">
                                                {liveAnalysis.revenueGap >= 0 ? t('On Track') : t('Short')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>

                                    {/* Calls */}
                                    <TableRow className="hover:bg-muted/20">
                                        <TableCell className="font-semibold text-xs flex items-center gap-2">
                                            <Phone className="h-4 w-4 text-blue-600" />
                                            {t('Calls')}
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-muted-foreground">
                                            {liveAnalysis.pace.calls} {t('calls')}
                                        </TableCell>
                                        <TableCell className="max-w-[160px]">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.target_calls}
                                                onChange={(e) => setData('target_calls', parseInt(e.target.value) || 0)}
                                                className="text-xs font-bold h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`text-xs font-bold ${liveAnalysis.callsGap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {liveAnalysis.callsGap >= 0 ? `+${liveAnalysis.callsGap}` : `${liveAnalysis.callsGap}`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={liveAnalysis.callsGap >= 0 ? 'default' : 'destructive'} className="text-[10px]">
                                                {liveAnalysis.callsGap >= 0 ? t('On Track') : t('Short')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>

                                    {/* Emails */}
                                    <TableRow className="hover:bg-muted/20">
                                        <TableCell className="font-semibold text-xs flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-purple-600" />
                                            {t('Cold Emails')}
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-muted-foreground">
                                            {liveAnalysis.pace.emails} {t('emails')}
                                        </TableCell>
                                        <TableCell className="max-w-[160px]">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.target_emails}
                                                onChange={(e) => setData('target_emails', parseInt(e.target.value) || 0)}
                                                className="text-xs font-bold h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`text-xs font-bold ${liveAnalysis.emailsGap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {liveAnalysis.emailsGap >= 0 ? `+${liveAnalysis.emailsGap}` : `${liveAnalysis.emailsGap}`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={liveAnalysis.emailsGap >= 0 ? 'default' : 'destructive'} className="text-[10px]">
                                                {liveAnalysis.emailsGap >= 0 ? t('On Track') : t('Short')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>

                                    {/* Meetings */}
                                    <TableRow className="hover:bg-muted/20">
                                        <TableCell className="font-semibold text-xs flex items-center gap-2">
                                            <Users className="h-4 w-4 text-indigo-600" />
                                            {t('Meetings')}
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-muted-foreground">
                                            {liveAnalysis.pace.meetings} {t('meetings')}
                                        </TableCell>
                                        <TableCell className="max-w-[160px]">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.target_meetings}
                                                onChange={(e) => setData('target_meetings', parseInt(e.target.value) || 0)}
                                                className="text-xs font-bold h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`text-xs font-bold ${liveAnalysis.meetingsGap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {liveAnalysis.meetingsGap >= 0 ? `+${liveAnalysis.meetingsGap}` : `${liveAnalysis.meetingsGap}`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={liveAnalysis.meetingsGap >= 0 ? 'default' : 'destructive'} className="text-[10px]">
                                                {liveAnalysis.meetingsGap >= 0 ? t('On Track') : t('Short')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>

                                    {/* Demos */}
                                    <TableRow className="hover:bg-muted/20">
                                        <TableCell className="font-semibold text-xs flex items-center gap-2">
                                            <Briefcase className="h-4 w-4 text-amber-600" />
                                            {t('Demos')}
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-muted-foreground">
                                            {liveAnalysis.pace.demos} {t('demos')}
                                        </TableCell>
                                        <TableCell className="max-w-[160px]">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.target_demos}
                                                onChange={(e) => setData('target_demos', parseInt(e.target.value) || 0)}
                                                className="text-xs font-bold h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`text-xs font-bold ${liveAnalysis.demosGap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {liveAnalysis.demosGap >= 0 ? `+${liveAnalysis.demosGap}` : `${liveAnalysis.demosGap}`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={liveAnalysis.demosGap >= 0 ? 'default' : 'destructive'} className="text-[10px]">
                                                {liveAnalysis.demosGap >= 0 ? t('On Track') : t('Short')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>

                                    {/* Follow-ups */}
                                    <TableRow className="hover:bg-muted/20">
                                        <TableCell className="font-semibold text-xs flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-rose-600" />
                                            {t('Follow-ups')}
                                        </TableCell>
                                        <TableCell className="text-xs font-bold text-muted-foreground">
                                            {liveAnalysis.pace.followups} {t('follow-ups')}
                                        </TableCell>
                                        <TableCell className="max-w-[160px]">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={data.target_followups}
                                                onChange={(e) => setData('target_followups', parseInt(e.target.value) || 0)}
                                                className="text-xs font-bold h-8"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`text-xs font-bold ${liveAnalysis.followupsGap < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {liveAnalysis.followupsGap >= 0 ? `+${liveAnalysis.followupsGap}` : `${liveAnalysis.followupsGap}`}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={liveAnalysis.followupsGap >= 0 ? 'default' : 'destructive'} className="text-[10px]">
                                                {liveAnalysis.followupsGap >= 0 ? t('On Track') : t('Short')}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Shortage Justification (Visible when plan is short of target) */}
                    {liveAnalysis.isShort && (
                        <Card className="shadow-sm border-l-4 border-l-amber-500">
                            <CardHeader className="pb-3 border-b bg-muted/20">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-5 w-5 text-amber-600" />
                                    <div>
                                        <CardTitle className="text-base">{t('Reason for Committing Below Target')}</CardTitle>
                                        <CardDescription className="text-xs">
                                            {t('Provide context for your manager (e.g., "Full-day client on-site workshops", "Quarterly pricing approvals", etc.).')}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="shortage_reason" className="text-xs font-semibold">
                                        {t('Explanation / Reason for Lower Daily Plan')}
                                    </Label>
                                    <Textarea
                                        id="shortage_reason"
                                        rows={2}
                                        placeholder={t('e.g., Conducting 3 in-depth RFP solution demonstrations today, which reduces prospecting bandwidth.')}
                                        value={data.shortage_reason}
                                        onChange={(e) => setData('shortage_reason', e.target.value)}
                                        className="text-xs"
                                    />
                                    {errors.shortage_reason && <p className="text-xs text-destructive">{errors.shortage_reason}</p>}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Planned Schedule & Focus Accounts Card */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <div>
                                    <CardTitle className="text-base">{t('Planned Schedule & Priority Focus Accounts')}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {t('List specific high-value accounts, meetings, and tactical action items.')}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="planned_accounts" className="text-xs font-semibold">
                                    {t('Today\'s Priority Focus Accounts & Opportunities')}
                                </Label>
                                <Textarea
                                    id="planned_accounts"
                                    rows={3}
                                    placeholder={t('1. Priority Client A - Proposal follow-up\n2. Priority Client B - Demo\n3. Target Client C - Decision-maker outreach')}
                                    value={data.planned_accounts}
                                    onChange={(e) => setData('planned_accounts', e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="planned_activities" className="text-xs font-semibold">
                                    {t('Morning Schedule & Action Plan')}
                                </Label>
                                <Textarea
                                    id="planned_activities"
                                    rows={3}
                                    placeholder={t('09:30 AM - Pipeline review & email follow-ups\n11:00 AM - Discovery call with Pearl Hotels\n02:30 PM - Kommify SaaS Demo with ABC School\n04:30 PM - Prospecting & outreach batch')}
                                    value={data.planned_activities}
                                    onChange={(e) => setData('planned_activities', e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Options & Submission Bar */}
                    <Card className="shadow-sm bg-muted/10">
                        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="send_email_now"
                                    checked={data.send_email_now}
                                    onCheckedChange={(checked) => setData('send_email_now', Boolean(checked))}
                                />
                                <Label htmlFor="send_email_now" className="text-xs font-medium cursor-pointer">
                                    {t('Notify manager immediately upon submission')}
                                </Label>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.get(route('sales-day-plans.index'))}
                                    disabled={processing}
                                >
                                    {t('Cancel')}
                                </Button>
                                {liveAnalysis.isShort && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="text-xs font-semibold"
                                        onClick={handleApplyRecommendation}
                                    >
                                        <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-600" />
                                        {t('Adjust My Plan')}
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-primary text-primary-foreground font-semibold"
                                >
                                    <Send className="h-4 w-4 mr-1.5" />
                                    {processing ? t('Saving...') : (liveAnalysis.isShort ? t('Submit Plan Anyway') : t('Commit Morning Plan'))}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </PageTemplate>
    );
}
