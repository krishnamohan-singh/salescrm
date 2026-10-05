import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { 
    BarChart3, TrendingUp, Activity, Filter, ArrowDown, 
    ArrowRight, CheckCircle2, AlertTriangle, HelpCircle, 
    DollarSign, Users, Target, Sparkles, Layers, ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';

export default function TargetAnalytics() {
    const { t } = useTranslation();
    const { 
        auth,
        funnelData = [], 
        revenueBreakdown = {}, 
        teamUsers = [], 
        canViewAll = false, 
        filters = {} 
    } = usePage().props as any;

    const permissions = auth?.permissions || [];
    const isCompanyOrAdmin = ['company', 'admin', 'superadmin'].includes((auth?.user?.type || '').toLowerCase());
    const canAllocate = isCompanyOrAdmin || (canViewAll && (hasPermission(permissions, 'allocate-targets') || hasPermission(permissions, 'create-targets')));

    const [financialYear, setFinancialYear] = useState(filters.financial_year || '2026-27');
    const [userId, setUserId] = useState(filters.user_id || 'all');

    const handleFilterChange = (key: string, val: string) => {
        const queryParams = {
            financial_year: key === 'financial_year' ? val : financialYear,
            user_id: key === 'user_id' ? val : userId,
        };
        if (key === 'financial_year') setFinancialYear(val);
        if (key === 'user_id') setUserId(val);

        router.get(route('targets.analytics'), queryParams, { preserveState: true, preserveScroll: true });
    };

    const formatMoney = (val: number | string) => {
        return formatCurrency(val);
    };

    return (
        <PageTemplate
            title={t('Sales Velocity Funnel & Target Analytics')}
            description={t('End-to-end B2B pipeline conversion from cold outreach down to won revenue.')}
            url={route('targets.analytics')}
            breadcrumbs={[
                { title: t('Targets & Day Plans'), href: route('targets.index') },
                { title: t('Funnel & Analytics'), href: route('targets.analytics') },
            ]}
        >
            <div className="space-y-6">
                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-40">
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
                            className="h-9 text-xs"
                            onClick={() => router.get(route('targets.index'))}
                        >
                            <Target className="h-4 w-4 mr-1.5" />
                            {t('Target Overview')}
                        </Button>
                        {canAllocate && (
                            <Button
                                size="sm"
                                className="h-9 text-xs bg-primary text-primary-foreground font-semibold"
                                onClick={() => router.get(route('targets.create'))}
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                {t('Allocate Target')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* 1. Visual Sales Conversion Funnel */}
                <Card className="shadow-sm border-t-4 border-t-primary">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            {t('B2B Sales Velocity Funnel (Activity → Pipeline → Deals Won)')}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t('Identify bottlenecks across outreach, demo qualification, proposal submission and deal closing.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4 max-w-4xl mx-auto">
                            {funnelData.map((stage: any, index: number) => {
                                const attainment = stage.target > 0 ? Math.round((stage.actual / stage.target) * 100) : (stage.actual > 0 ? 100 : 0);
                                const nextStage = funnelData[index + 1];
                                const conversionRate = nextStage && stage.actual > 0 
                                    ? Math.round((nextStage.actual / stage.actual) * 100) 
                                    : null;

                                const colors = [
                                    'from-indigo-500 to-indigo-600',
                                    'from-blue-500 to-blue-600',
                                    'from-cyan-500 to-cyan-600',
                                    'from-teal-500 to-teal-600',
                                    'from-amber-500 to-amber-600',
                                    'from-orange-500 to-orange-600',
                                    'from-emerald-500 to-emerald-600',
                                ];

                                return (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="flex items-center gap-2 text-foreground font-bold">
                                                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                                                    {index + 1}
                                                </span>
                                                {stage.stage}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {stage.actual} <span className="font-normal text-[11px]">/ {stage.target} Target</span> ({attainment}%)
                                            </span>
                                        </div>

                                        <div className="h-9 w-full bg-muted/40 rounded-lg overflow-hidden relative flex items-center p-2 border">
                                            <div 
                                                className={`h-full rounded bg-gradient-to-r ${colors[index % colors.length]} transition-all duration-500`}
                                                style={{ width: `${Math.max(8, Math.min(100, attainment))}%` }}
                                            />
                                            <span className="absolute right-3 text-xs font-bold text-foreground">
                                                {stage.actual}
                                            </span>
                                        </div>

                                        {conversionRate !== null && (
                                            <div className="flex items-center justify-center py-1">
                                                <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/30 px-3 py-0.5 rounded-full border border-dashed">
                                                    <ArrowDown className="h-3 w-3 text-primary" />
                                                    {t('Stage Conversion:')} <span className="text-primary font-bold">{conversionRate}%</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Revenue Stream Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* New Business */}
                    <Card className="shadow-sm border-l-4 border-l-emerald-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium">{t('New Business Revenue')}</CardDescription>
                            <CardTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(revenueBreakdown.new_business?.actual || 0)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground">
                                {t('Target:')} {formatMoney(revenueBreakdown.new_business?.target || 0)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Upsell / Cross-sell */}
                    <Card className="shadow-sm border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium">{t('Upsell / Expansion')}</CardDescription>
                            <CardTitle className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                {formatMoney(revenueBreakdown.upsell?.actual || 0)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground">
                                {t('Target:')} {formatMoney(revenueBreakdown.upsell?.target || 0)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Renewals */}
                    <Card className="shadow-sm border-l-4 border-l-purple-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium">{t('Renewals & Retainers')}</CardDescription>
                            <CardTitle className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                {formatMoney(revenueBreakdown.renewal?.actual || 0)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground">
                                {t('Target:')} {formatMoney(revenueBreakdown.renewal?.target || 0)}
                            </p>
                        </CardContent>
                    </Card>

                    {/* SaaS MRR */}
                    <Card className="shadow-sm border-l-4 border-l-amber-500">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-medium">{t('SaaS MRR Added')}</CardDescription>
                            <CardTitle className="text-xl font-bold text-amber-600 dark:text-amber-400">
                                {formatMoney(revenueBreakdown.mrr?.actual || 0)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <p className="text-xs text-muted-foreground">
                                {t('Target:')} {formatMoney(revenueBreakdown.mrr?.target || 0)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Diagnostic Engine Insights: Where is the Sales Engine Breaking? */}
                <Card className="shadow-sm border-l-4 border-l-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-600" />
                            {t('Sales Engine Diagnostics & Manager Action Guide')}
                        </CardTitle>
                        <CardDescription className="text-xs">
                            {t('Automated insights connecting activity, funnel drop-offs and revenue attainment.')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-lg border bg-card/80 space-y-1">
                                <p className="font-bold text-foreground flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                    {t('Low Meeting Discovery Rate?')}
                                </p>
                                <p className="text-muted-foreground">
                                    {t('Check cold email messaging, value proposition hook, or ICP database qualification.')}
                                </p>
                            </div>

                            <div className="p-3 rounded-lg border bg-card/80 space-y-1">
                                <p className="font-bold text-foreground flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                                    {t('Good Meetings but Low Demos?')}
                                </p>
                                <p className="text-muted-foreground">
                                    {t('Coach sales reps on B2B qualification criteria (BANT) and identifying active pain points.')}
                                </p>
                            </div>

                            <div className="p-3 rounded-lg border bg-card/80 space-y-1">
                                <p className="font-bold text-foreground flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                                    {t('Good Demos but Low Proposals?')}
                                </p>
                                <p className="text-muted-foreground">
                                    {t('Review solution scope fit and whether pricing ballpark was aligned before demo closing.')}
                                </p>
                            </div>

                            <div className="p-3 rounded-lg border bg-card/80 space-y-1">
                                <p className="font-bold text-foreground flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                    {t('Proposals Sent but Low Win Rate?')}
                                </p>
                                <p className="text-muted-foreground">
                                    {t('Intervene on contract negotiation, review competitor alternatives, or shorten follow-up intervals.')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageTemplate>
    );
}
