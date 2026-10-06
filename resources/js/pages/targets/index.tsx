import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { 
    Target, TrendingUp, Users, DollarSign, Calendar, Activity, 
    CheckCircle2, AlertTriangle, AlertCircle, Phone, Mail, 
    Layers, Plus, ArrowUpRight, BarChart3, Filter, Sparkles,
    Briefcase, Award, ChevronRight, Eye, RefreshCw, Send, CheckSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';

export default function TargetOverview() {
    const { t } = useTranslation();
    const { 
        auth,
        kpis = {}, 
        activityRollup = {}, 
        healthCounts = {}, 
        teamPerformance = [], 
        todayPlans = [], 
        teamUsers = [], 
        canViewAll = false, 
        filters = {} 
    } = usePage().props as any;

    const permissions = auth?.permissions || [];
    const isCompanyOrAdmin = ['company', 'admin', 'superadmin'].includes((auth?.user?.type || '').toLowerCase());
    const canAllocate = isCompanyOrAdmin || hasPermission(permissions, 'allocate-targets') || hasPermission(permissions, 'create-targets');

    const [financialYear, setFinancialYear] = useState(filters.financial_year || '2026-27');
    const [periodType, setPeriodType] = useState(filters.period_type || 'monthly');
    const [selectedMonth, setSelectedMonth] = useState(String(filters.month || new Date().getMonth() + 1));
    const [selectedQuarter, setSelectedQuarter] = useState(filters.quarter || 'Q2');
    const [userId, setUserId] = useState(filters.user_id || 'all');
    const [businessType, setBusinessType] = useState(filters.business_type || 'all');

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = {
            financial_year: key === 'financial_year' ? value : financialYear,
            period_type: key === 'period_type' ? value : periodType,
            month: key === 'month' ? value : selectedMonth,
            quarter: key === 'quarter' ? value : selectedQuarter,
            user_id: key === 'user_id' ? value : userId,
            business_type: key === 'business_type' ? value : businessType,
        };

        if (key === 'financial_year') setFinancialYear(value);
        if (key === 'period_type') setPeriodType(value);
        if (key === 'month') setSelectedMonth(value);
        if (key === 'quarter') setSelectedQuarter(value);
        if (key === 'user_id') setUserId(value);
        if (key === 'business_type') setBusinessType(value);

        router.get(route('targets.index'), newFilters, { preserveState: true, preserveScroll: true });
    };

    const formatMoney = (val: number | string) => {
        return formatCurrency(val);
    };

    const getHealthBadge = (health: string) => {
        switch (health) {
            case 'on_track':
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        {t('On Track')}
                    </Badge>
                );
            case 'at_risk':
                return (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        {t('At Risk')}
                    </Badge>
                );
            case 'critical':
                return (
                    <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {t('Critical')}
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{health || 'Active'}</Badge>;
        }
    };

    const monthsList = [
        { id: '1', name: 'January' }, { id: '2', name: 'February' }, { id: '3', name: 'March' },
        { id: '4', name: 'April' }, { id: '5', name: 'May' }, { id: '6', name: 'June' },
        { id: '7', name: 'July' }, { id: '8', name: 'August' }, { id: '9', name: 'September' },
        { id: '10', name: 'October' }, { id: '11', name: 'November' }, { id: '12', name: 'December' },
    ];

    const quartersList = ['Q1', 'Q2', 'Q3', 'Q4'];

    const getInitials = (name?: string) => {
        if (!name) return 'SR';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <PageTemplate
            title={t('Target Management & Performance')}
            description={t('B2B Revenue Goals, Sales Activity Engine, Morning Plans & Quota Forecasts')}
            url={route('targets.index')}
            breadcrumbs={[
                { title: t('Targets & Day Plans'), href: route('targets.index') },
                { title: t('Overview'), href: route('targets.index') },
            ]}
        >
            <div className="space-y-6">
                {/* Header Actions & Quick Navigation Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Financial Year */}
                        <div className="w-36">
                            <Select value={financialYear} onValueChange={(val) => handleFilterChange('financial_year', val)}>
                                <SelectTrigger className="h-9 text-xs font-semibold">
                                    <SelectValue placeholder="FY" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2025-26">FY 2025–26</SelectItem>
                                    <SelectItem value="2026-27">FY 2026–27</SelectItem>
                                    <SelectItem value="2027-28">FY 2027–28</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Period Type */}
                        <div className="w-36">
                            <Select value={periodType} onValueChange={(val) => handleFilterChange('period_type', val)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">{t('Daily')}</SelectItem>
                                    <SelectItem value="weekly">{t('Weekly')}</SelectItem>
                                    <SelectItem value="bi_weekly">{t('Bi-Weekly')}</SelectItem>
                                    <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                                    <SelectItem value="quarterly">{t('Quarterly')}</SelectItem>
                                    <SelectItem value="annual">{t('Annual')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Sub Period (Month / Quarter) */}
                        {periodType === 'monthly' && (
                            <div className="w-36">
                                <Select value={selectedMonth} onValueChange={(val) => handleFilterChange('month', val)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {monthsList.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {periodType === 'quarterly' && (
                            <div className="w-32">
                                <Select value={selectedQuarter} onValueChange={(val) => handleFilterChange('quarter', val)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Quarter" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {quartersList.map((q) => (
                                            <SelectItem key={q} value={q}>{q}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Business Category Filter */}
                        <div className="w-36">
                            <Select value={businessType} onValueChange={(val) => handleFilterChange('business_type', val)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Business Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Business Types')}</SelectItem>
                                    <SelectItem value="services">{t('Services')}</SelectItem>
                                    <SelectItem value="solutions">{t('Solutions')}</SelectItem>
                                    <SelectItem value="saas">{t('SaaS')}</SelectItem>
                                    <SelectItem value="custom">{t('Custom Consulting')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Team Member Filter */}
                        {canViewAll && (
                            <div className="w-48">
                                <Select value={userId} onValueChange={(val) => handleFilterChange('user_id', val)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Sales Representative" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('Entire Sales Team')}</SelectItem>
                                        {teamUsers.map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs font-medium"
                            onClick={() => router.get(route('targets.analytics'))}
                        >
                            <BarChart3 className="h-4 w-4 mr-1.5 text-primary" />
                            {t('Sales Funnel')}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs font-medium"
                            onClick={() => router.get(route('sales-day-plans.create'))}
                        >
                            <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
                            {t('Morning Plan')}
                        </Button>

                        {canAllocate && (
                            <Button
                                size="sm"
                                className="h-9 text-xs font-semibold bg-primary text-primary-foreground shadow-sm"
                                onClick={() => router.get(route('targets.create'))}
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                {t('Allocate Target')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* 1. High-Level Revenue & Variance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Target Revenue */}
                    <Card className="shadow-sm border-l-4 border-l-indigo-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium flex items-center justify-between">
                                <span>{t('Revenue Target')}</span>
                                <Target className="h-4 w-4 text-indigo-500" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-foreground">
                                {formatMoney(kpis.target_revenue || 0)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground capitalize">
                                {periodType} {t('target allocation')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Actual Won Revenue */}
                    <Card className="shadow-sm border-l-4 border-l-emerald-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium flex items-center justify-between">
                                <span>{t('Achieved Won')}</span>
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(kpis.actual_revenue || 0)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-semibold text-muted-foreground">{t('Attainment')}</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{kpis.revenue_achievement || 0}%</span>
                            </div>
                            <Progress value={Math.min(100, kpis.revenue_achievement || 0)} className="h-1.5" />
                        </CardContent>
                    </Card>

                    {/* Active Pipeline */}
                    <Card className="shadow-sm border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium flex items-center justify-between">
                                <span>{t('Active Pipeline')}</span>
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {formatMoney(kpis.pipeline_amount || 0)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground">
                                {t('Deals in active stages')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Revenue Forecast */}
                    <Card className="shadow-sm border-l-4 border-l-purple-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium flex items-center justify-between">
                                <span>{t('Period Forecast')}</span>
                                <Activity className="h-4 w-4 text-purple-500" />
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {formatMoney(kpis.forecast_revenue || 0)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground">
                                {t('Won + 35% Weighted Pipe')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Target Health Status */}
                    <Card className="shadow-sm border-l-4 border-l-amber-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium flex items-center justify-between">
                                <span>{t('Target Health')}</span>
                                <Award className="h-4 w-4 text-amber-500" />
                            </CardDescription>
                            <div className="flex items-center gap-2 pt-1">
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
                                    🟢 {healthCounts.on_track || 0}
                                </Badge>
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
                                    🟡 {healthCounts.at_risk || 0}
                                </Badge>
                                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-xs">
                                    🔴 {healthCounts.critical || 0}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <p className="text-xs text-muted-foreground">
                                {kpis.variance_revenue >= 0 
                                    ? `+${formatMoney(kpis.variance_revenue)} ${t('ahead of target')}` 
                                    : `${formatMoney(Math.abs(kpis.variance_revenue))} ${t('behind target')}`
                                }
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Leading Indicator Activity Engine Rollup */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-primary" />
                                    {t('Sales Activity Engine (Leading Indicators)')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Revenue is the outcome; meetings, demos, outreach and calls are the activities creating the outcome.')}
                                </CardDescription>
                            </div>
                            <Link href={route('targets.analytics')} className="text-xs text-primary hover:underline font-semibold flex items-center gap-1">
                                {t('View Velocity Funnel')} <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                            {/* Outreach */}
                            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border text-center">
                                <p className="text-xs text-muted-foreground font-medium">{t('Outreach')}</p>
                                <p className="text-lg font-bold">
                                    {activityRollup.outreach?.act || 0} <span className="text-xs font-normal text-muted-foreground">/ {activityRollup.outreach?.tgt || 0}</span>
                                </p>
                                <Progress 
                                    value={activityRollup.outreach?.tgt > 0 ? (activityRollup.outreach.act / activityRollup.outreach.tgt) * 100 : 0} 
                                    className="h-1" 
                                />
                            </div>

                            {/* Cold Calls */}
                            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border text-center">
                                <p className="text-xs text-muted-foreground font-medium">{t('Calls')}</p>
                                <p className="text-lg font-bold">
                                    {activityRollup.cold_calls?.act || 0} <span className="text-xs font-normal text-muted-foreground">/ {activityRollup.cold_calls?.tgt || 0}</span>
                                </p>
                                <Progress 
                                    value={activityRollup.cold_calls?.tgt > 0 ? (activityRollup.cold_calls.act / activityRollup.cold_calls.tgt) * 100 : 0} 
                                    className="h-1" 
                                />
                            </div>

                            {/* Cold Emails */}
                            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border text-center">
                                <p className="text-xs text-muted-foreground font-medium">{t('Emails')}</p>
                                <p className="text-lg font-bold">
                                    {activityRollup.cold_emails?.act || 0} <span className="text-xs font-normal text-muted-foreground">/ {activityRollup.cold_emails?.tgt || 0}</span>
                                </p>
                                <Progress 
                                    value={activityRollup.cold_emails?.tgt > 0 ? (activityRollup.cold_emails.act / activityRollup.cold_emails.tgt) * 100 : 0} 
                                    className="h-1" 
                                />
                            </div>

                            {/* Meetings */}
                            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border text-center">
                                <p className="text-xs text-muted-foreground font-medium">{t('Meetings')}</p>
                                <p className="text-lg font-bold">
                                    {activityRollup.meetings?.act || 0} <span className="text-xs font-normal text-muted-foreground">/ {activityRollup.meetings?.tgt || 0}</span>
                                </p>
                                <Progress 
                                    value={activityRollup.meetings?.tgt > 0 ? (activityRollup.meetings.act / activityRollup.meetings.tgt) * 100 : 0} 
                                    className="h-1" 
                                />
                            </div>

                            {/* Demos */}
                            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border text-center">
                                <p className="text-xs text-muted-foreground font-medium">{t('Demos')}</p>
                                <p className="text-lg font-bold">
                                    {activityRollup.demos?.act || 0} <span className="text-xs font-normal text-muted-foreground">/ {activityRollup.demos?.tgt || 0}</span>
                                </p>
                                <Progress 
                                    value={activityRollup.demos?.tgt > 0 ? (activityRollup.demos.act / activityRollup.demos.tgt) * 100 : 0} 
                                    className="h-1" 
                                />
                            </div>

                            {/* Opportunities */}
                            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border text-center">
                                <p className="text-xs text-muted-foreground font-medium">{t('Opportunities')}</p>
                                <p className="text-lg font-bold">
                                    {activityRollup.opportunities?.act || 0} <span className="text-xs font-normal text-muted-foreground">/ {activityRollup.opportunities?.tgt || 0}</span>
                                </p>
                                <Progress 
                                    value={activityRollup.opportunities?.tgt > 0 ? (activityRollup.opportunities.act / activityRollup.opportunities.tgt) * 100 : 0} 
                                    className="h-1" 
                                />
                            </div>

                            {/* Proposals */}
                            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border text-center">
                                <p className="text-xs text-muted-foreground font-medium">{t('Proposals')}</p>
                                <p className="text-lg font-bold">
                                    {activityRollup.proposals?.act || 0} <span className="text-xs font-normal text-muted-foreground">/ {activityRollup.proposals?.tgt || 0}</span>
                                </p>
                                <Progress 
                                    value={activityRollup.proposals?.tgt > 0 ? (activityRollup.proposals.act / activityRollup.proposals.tgt) * 100 : 0} 
                                    className="h-1" 
                                />
                            </div>

                            {/* Won Deals */}
                            <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 text-center">
                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">{t('Won Deals')}</p>
                                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                    {activityRollup.new_accounts?.act || 0} <span className="text-xs font-normal text-muted-foreground">/ {activityRollup.new_accounts?.tgt || 0}</span>
                                </p>
                                <Progress 
                                    value={activityRollup.new_accounts?.tgt > 0 ? (activityRollup.new_accounts.act / activityRollup.new_accounts.tgt) * 100 : 0} 
                                    className="h-1" 
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Team Quota & Target Attainment Table */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
                                    {t('Sales Representatives & Quota Performance')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Individual salesperson tracking against Revenue Quota, Activity Goals and Target Health.')}
                                </CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs h-8"
                                onClick={() => router.get(route('targets.list'))}
                            >
                                {t('View All Target Allocations')} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="text-xs font-semibold">{t('Salesperson')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Target Revenue')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Won Revenue')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Revenue %')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Activity %')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Pipeline')}</TableHead>
                                        <TableHead className="text-xs font-semibold">{t('Forecast')}</TableHead>
                                        <TableHead className="text-xs font-semibold text-center">{t('Health')}</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">{t('Action')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {teamPerformance.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                                                {t('No active targets found for the selected period.')}{' '}
                                                {canAllocate && (
                                                    <Link href={route('targets.create')} className="text-primary underline font-medium">
                                                        {t('Allocate Target Now')}
                                                    </Link>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        teamPerformance.map((item: any) => (
                                            <TableRow
                                                key={item.id}
                                                className="hover:bg-muted/30 cursor-pointer"
                                                onClick={(e) => {
                                                    const target = e.target as HTMLElement;
                                                    if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-radix-collection-item]')) {
                                                        return;
                                                    }
                                                    const selection = window.getSelection();
                                                    if (selection && selection.toString().trim().length > 0) {
                                                        return;
                                                    }
                                                    router.get(route('targets.show', item.id));
                                                }}
                                            >
                                                <TableCell className="font-medium text-xs">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar className="h-7 w-7 text-xs">
                                                            <AvatarImage src={item.user?.avatar} />
                                                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                                                {getInitials(item.user?.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-semibold text-foreground">{item.user?.name || item.title}</p>
                                                            <p className="text-[10px] text-muted-foreground">{item.business_type} • {item.period_type}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">{formatMoney(item.target_revenue)}</TableCell>
                                                <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatMoney(item.actual_revenue)}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold">{item.revenue_achievement_rate}%</span>
                                                        <Progress value={Math.min(100, item.revenue_achievement_rate)} className="h-1.5 w-12" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-muted-foreground">{item.activity_achievement_rate}%</span>
                                                        <Progress value={Math.min(100, item.activity_achievement_rate)} className="h-1.5 w-12" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{formatMoney(item.pipeline_amount)}</TableCell>
                                                <TableCell className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                                    {formatMoney(item.forecast_revenue)}
                                                </TableCell>
                                                <TableCell className="text-center">{getHealthBadge(item.health_status)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => router.get(route('targets.show', item.id))}
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Today's Day Plans & EOD Submissions Live Tracker */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-primary" />
                                    {t("Today's Morning Plans & EOD Reports")}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t("Daily sales plans execution feeding live progress into monthly quota.")}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-medium"
                                    onClick={() => router.get(route('sales-day-plans.index'))}
                                >
                                    {t('All Day Plans')} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        {todayPlans.length === 0 ? (
                            <div className="text-center py-6 space-y-3">
                                <p className="text-xs text-muted-foreground">
                                    {t("No morning plans recorded yet for today.")}
                                </p>
                                <Button
                                    size="sm"
                                    className="bg-primary text-primary-foreground text-xs"
                                    onClick={() => router.get(route('sales-day-plans.create'))}
                                >
                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                    {t('Start Today\'s Morning Plan')}
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {todayPlans.map((dp: any) => (
                                    <div key={dp.id} className="p-4 rounded-xl border bg-card/60 hover:border-primary/40 transition-colors space-y-3 shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-7 w-7 text-xs">
                                                    <AvatarImage src={dp.user?.avatar} />
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                                        {getInitials(dp.user?.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-xs font-bold text-foreground">{dp.user?.name}</p>
                                                    <p className="text-[10px] text-muted-foreground">{dp.title || t('Sales Focus')}</p>
                                                </div>
                                            </div>
                                            <Badge variant={dp.is_eod_submitted ? 'default' : 'outline'} className="text-[10px]">
                                                {dp.is_eod_submitted ? t('EOD Completed') : t('Morning Active')}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center text-xs py-1.5 bg-muted/30 rounded-lg">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">{t('Calls')}</p>
                                                <p className="font-bold">{dp.actual_calls || 0}/{dp.target_calls || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">{t('Meetings')}</p>
                                                <p className="font-bold">{dp.actual_meetings || 0}/{dp.target_meetings || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">{t('Sales')}</p>
                                                <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(dp.actual_sales_amount || 0)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[11px] text-muted-foreground">
                                                {dp.overall_completion_rate || 0}% {t('achieved')}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 text-xs px-2 text-primary hover:text-primary"
                                                onClick={() => router.get(route('sales-day-plans.show', dp.id))}
                                            >
                                                {t('View / EOD')} <ChevronRight className="h-3 w-3 ml-0.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageTemplate>
    );
}
