import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    TrendingUp,
    Target,
    Award,
    DollarSign,
    Briefcase,
    Calendar,
    Phone,
    PhoneCall,
    Users,
    User,
    CalendarCheck,
    FileText,
    Trophy,
    ArrowUpRight,
    Video,
    ExternalLink,
    Clock,
    AlertCircle,
    ChevronRight,
    Sparkles,
    Layers,
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface SalespersonDashboardProps {
    data: any;
    attendance: any;
    userProfile: any;
    period: string;
    isCheckedIn: boolean;
    onToggleCheckInOut: () => void;
    viewScope?: 'my' | 'all';
    canViewAllSalesData?: boolean;
}

export function SalespersonDashboardView({
    data,
    attendance,
    userProfile,
    period,
    isCheckedIn,
    onToggleCheckInOut,
    viewScope = 'my',
    canViewAllSalesData = false,
}: SalespersonDashboardProps) {
    const { t } = useTranslation();

    const isAllScope = viewScope === 'all';

    const metrics = data?.metrics || {
        myTarget: 0,
        revenueWon: 0,
        achievedPercent: 0,
        openPipeline: 0,
        opportunitiesCount: 0,
        forecast: 0,
        revenueGrowth: '0%',
    };

    const priorities = data?.priorities || [];
    const funnel = data?.funnel || [];
    const pipelineBreakdown = data?.pipelineBreakdown || [];
    const topOpportunities = data?.topOpportunities || [];
    const clientsDonut = data?.clientsDonut || {
        total: 0,
        breakdown: [
            { name: 'Active Clients', count: 0, color: '#10b981' },
            { name: 'Prospects', count: 0, color: '#3b82f6' },
            { name: 'With Opportunities', count: 0, color: '#f59e0b' },
            { name: 'Renewal Due', count: 0, color: '#ef4444' },
        ],
    };
    const activities = data?.activities || [];
    const recentLeads = data?.recentLeads || [];
    const todayMeetings = data?.todayMeetings || [];

    const formatINR = (val: number) => {
        return `₹${val.toLocaleString('en-IN')}`;
    };

    const formatCompactINR = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
        return `₹${val.toLocaleString('en-IN')}`;
    };

    const todayDateStr = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date());

    const periodLabel = period === 'today'
        ? t('Today')
        : period === 'this_week'
            ? t('This Week')
            : period === 'this_quarter'
                ? t('This Quarter')
                : period === 'this_year'
                    ? t('This Year')
                    : t('This Month');

    return (
        <div className="space-y-5">
            
            {/* Top Greeting Section with Active Scope Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {t('Good Morning')}, {userProfile?.name || 'Sales Professional'}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {todayDateStr}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {isAllScope ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-xs">
                            <Users className="w-3.5 h-3.5" />
                            <span>{t('Viewing: All Salespersons Data')}</span>
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            <span>{t('Viewing: Personal Data')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* 4 Sales KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                
                {/* 1. Target */}
                <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                            <span className="font-medium">
                                {isAllScope ? t('Team Target') : t('My Target')}
                            </span>
                            <Target className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {formatINR(metrics.myTarget)}
                        </div>
                        <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className={`font-semibold ${
                                    metrics.achievedPercent >= 100
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : metrics.achievedPercent >= 50
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-amber-600 dark:text-amber-400'
                                }`}>
                                    {metrics.achievedPercent}% {t('achieved')}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                                    {formatINR(metrics.revenueWon)} {t('won')}
                                </span>
                            </div>
                            <Progress
                                value={Math.min(100, Math.max(0, metrics.achievedPercent))}
                                className="h-2 bg-slate-100 dark:bg-slate-800"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Revenue Won */}
                <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                            <span className="font-medium">
                                {isAllScope ? t('Total Revenue Won') : t('Revenue Won')}
                            </span>
                            <Award className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {formatINR(metrics.revenueWon)}
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs">
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[11px]">
                                <TrendingUp className="w-3 h-3" />
                                {metrics.revenueGrowth}
                            </span>
                            <span className="text-slate-400 text-[11px]">{t('vs last month')}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Open Pipeline */}
                <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                            <span className="font-medium">
                                {isAllScope ? t('Total Open Pipeline') : t('Open Pipeline')}
                            </span>
                            <Briefcase className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {formatINR(metrics.openPipeline)}
                        </div>
                        <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                            <span>{metrics.opportunitiesCount} {t('opportunities')}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Forecast */}
                <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all">
                    <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                            <span className="font-medium">
                                {isAllScope ? t('Team Forecast') : `${t('Forecast')} (${periodLabel})`}
                            </span>
                            <Sparkles className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 tracking-tight">
                            {formatINR(metrics.forecast)}
                        </div>
                        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {t('Likely to close')}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Row: Priorities & Sales Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Priorities */}
                <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {isAllScope ? t("Team Priorities") : t("Today's Priorities")}
                        </CardTitle>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {t('Action Items')}
                        </span>
                    </CardHeader>
                    <CardContent className="p-3.5 space-y-2.5">
                        {priorities.map((item: any) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/50 dark:border-slate-700/50"
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                                        item.type === 'danger' ? 'bg-red-500' : item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                    }`}>
                                        {item.count}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                        {item.title}
                                    </span>
                                </div>
                                <Link
                                    href={item.link || route('leads.index')}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-0.5 hover:underline"
                                >
                                    {t('View')}
                                    <ChevronRight className="w-3 h-3" />
                                </Link>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Sales Funnel */}
                <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {isAllScope ? t('Team Sales Funnel') : t('My Sales Funnel')}
                        </CardTitle>
                        <span className="text-xs text-slate-400 font-medium">
                            {periodLabel}
                        </span>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-40 pt-4">
                            {funnel.map((stage: any) => {
                                const maxCount = Math.max(...funnel.map((s: any) => s.count), 1);
                                const heightPercent = Math.max(15, Math.round((stage.count / maxCount) * 100));

                                return (
                                    <div key={stage.stage} className="flex flex-col items-center gap-2 h-full justify-end group">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">
                                            {stage.count}
                                        </span>
                                        <div
                                            className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs"
                                            style={{
                                                height: `${heightPercent}%`,
                                                backgroundColor: stage.color,
                                            }}
                                        />
                                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center truncate w-full">
                                            {stage.stage}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Row: Pipeline Breakdown & Top Opportunities */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Pipeline Breakdown Table */}
                <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {isAllScope ? t('Team Pipeline') : t('My Pipeline')} ({formatCompactINR(metrics.openPipeline)})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="py-2.5 px-3.5">{t('Stage')}</th>
                                    <th className="py-2.5 px-3.5 text-center">{t('Count')}</th>
                                    <th className="py-2.5 px-3.5 text-right">{t('Value')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {pipelineBreakdown.map((row: any) => (
                                    <tr key={row.stage} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="py-2.5 px-3.5 font-medium text-slate-800 dark:text-slate-200">
                                            {row.stage}
                                        </td>
                                        <td className="py-2.5 px-3.5 text-center font-bold text-slate-600 dark:text-slate-400">
                                            {row.count}
                                        </td>
                                        <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                                            {formatINR(row.value)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Top Opportunities Table */}
                <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {t('Top Opportunities')}
                        </CardTitle>
                        <Link href={route('opportunities.index')} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold">
                            {t('View all')}
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="py-2.5 px-3.5">{t('Opportunity')}</th>
                                    {isAllScope && <th className="py-2.5 px-3.5">{t('Assigned To')}</th>}
                                    <th className="py-2.5 px-3.5 text-right">{t('Value')}</th>
                                    <th className="py-2.5 px-3.5 text-center">{t('Stage')}</th>
                                    <th className="py-2.5 px-3.5 text-center">{t('Next Action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {topOpportunities.length > 0 ? (
                                    topOpportunities.map((opp: any) => (
                                        <tr key={opp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2.5 px-3.5">
                                                <div className="font-bold text-slate-800 dark:text-slate-100">
                                                    {opp.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {opp.opportunity}
                                                </div>
                                            </td>
                                            {isAllScope && (
                                                <td className="py-2.5 px-3.5 font-medium text-slate-600 dark:text-slate-300 text-xs">
                                                    {opp.salespersonName || '-'}
                                                </td>
                                            )}
                                            <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                                                {formatINR(opp.value)}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${opp.stageColor || 'bg-blue-100 text-blue-800'}`}>
                                                    {opp.stage}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    opp.isUrgent
                                                        ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'
                                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                }`}>
                                                    {opp.nextAction}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={isAllScope ? 5 : 4} className="py-8 text-center text-slate-400">
                                            <Briefcase className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                                            <p className="text-xs font-medium">{t('No opportunities found')}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

            </div>

            {/* Row: Clients & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Clients Donut Chart */}
                <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {isAllScope ? t('All Clients') : t('My Clients')}
                        </CardTitle>
                        <Link href={route('accounts.index')} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold">
                            {t('View all')}
                        </Link>
                    </CardHeader>
                    <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={clientsDonut.total > 0 ? clientsDonut.breakdown : [{ name: 'No Data', count: 1, color: '#e2e8f0' }]}
                                        innerRadius={36}
                                        outerRadius={54}
                                        paddingAngle={3}
                                        dataKey="count"
                                    >
                                        {(clientsDonut.total > 0 ? clientsDonut.breakdown : [{ name: 'No Data', count: 1, color: '#e2e8f0' }]).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                                <span className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                    {clientsDonut.total}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                    {t('Total Clients')}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-2 text-xs w-full">
                            {clientsDonut.breakdown.map((item: any) => (
                                <div key={item.name} className="flex items-center gap-1.5 p-1.5 rounded bg-slate-50 dark:bg-slate-800/40">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{item.name}</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-100 ml-auto">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Activity 6 Grid */}
                <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {isAllScope ? t('Team Activity') : t('My Activity')} ({periodLabel})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {activities.map((act: any, idx: number) => {
                                const icons: Record<string, any> = {
                                    Phone: Phone,
                                    PhoneCall: PhoneCall,
                                    Users: Users,
                                    CalendarCheck: CalendarCheck,
                                    FileText: FileText,
                                    Trophy: Trophy,
                                };
                                const IconComponent = icons[act.icon] || Award;
                                const themeStyles = [
                                    { bg: 'bg-blue-50/60 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900/40', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500' },
                                    { bg: 'bg-emerald-50/60 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
                                    { bg: 'bg-purple-50/60 dark:bg-purple-950/30', border: 'border-purple-100 dark:border-purple-900/40', text: 'text-purple-600 dark:text-purple-400', icon: 'text-purple-500' },
                                    { bg: 'bg-amber-50/60 dark:bg-amber-950/30', border: 'border-amber-100 dark:border-amber-900/40', text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500' },
                                    { bg: 'bg-indigo-50/60 dark:bg-indigo-950/30', border: 'border-indigo-100 dark:border-indigo-900/40', text: 'text-indigo-600 dark:text-indigo-400', icon: 'text-indigo-500' },
                                    { bg: 'bg-emerald-50/60 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900/40', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
                                ][idx % 6];

                                return (
                                    <div key={act.label || idx} className={`p-3 rounded-lg ${themeStyles.bg} border ${themeStyles.border} flex items-center justify-between`}>
                                        <div>
                                            <div className={`text-[11px] ${themeStyles.text} font-semibold`}>{t(act.label)}</div>
                                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{act.value}</div>
                                        </div>
                                        <IconComponent className={`w-5 h-5 ${themeStyles.icon} opacity-80`} />
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Bottom Row: Recent Leads & Today's Meetings */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Recent Leads */}
                <Card className="lg:col-span-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {isAllScope ? t('All Recent Leads') : t('Recent Leads')}
                        </CardTitle>
                        <Link href={route('leads.index')} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold">
                            {t('View all')}
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="py-2.5 px-3.5">{t('Name')}</th>
                                    <th className="py-2.5 px-3.5">{t('Source')}</th>
                                    <th className="py-2.5 px-3.5">{t('Date')}</th>
                                    <th className="py-2.5 px-3.5 text-center">{t('Status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {recentLeads.length > 0 ? (
                                    recentLeads.map((lead: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-200">
                                                {lead.name}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-slate-500">
                                                {lead.source}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                                                {lead.date}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lead.statusColor || 'bg-blue-100 text-blue-800'}`}>
                                                    {lead.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-slate-400">
                                            <Users className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                                            <p className="text-xs font-medium">{t('No recent leads found')}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Today's Meetings with Join Action */}
                <Card className="lg:col-span-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {isAllScope ? t("Team Today's Meetings") : t("Today's Meetings")}
                        </CardTitle>
                        <Link href={route('meetings.index')} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold">
                            {t('View all')}
                        </Link>
                    </CardHeader>
                    <CardContent className="p-3.5 space-y-2.5">
                        {todayMeetings.length > 0 ? (
                            todayMeetings.map((meeting: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold shrink-0">
                                            {meeting.time}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                                {meeting.title}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                {meeting.subtitle}
                                            </div>
                                        </div>
                                    </div>

                                    {meeting.joinable ? (
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2.5 shadow-xs cursor-pointer"
                                            onClick={() => window.open('https://meet.google.com', '_blank')}
                                        >
                                            <Video className="w-3 h-3" />
                                            {t('Join')}
                                        </Button>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 italic">
                                            {meeting.type === 'phone' ? t('Phone Call') : t('In Person')}
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-slate-400">
                                <CalendarCheck className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                                <p className="text-xs font-medium">{t('No meetings scheduled for today')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

        </div>
    );
}
