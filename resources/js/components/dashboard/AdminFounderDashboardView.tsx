import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    TrendingUp,
    Target,
    Award,
    Briefcase,
    Building2,
    Users,
    Crown,
    Sparkles,
    PieChart as PieChartIcon,
    BarChart3,
    ArrowUpRight,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Flame,
    Zap,
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

interface AdminDashboardProps {
    data: any;
    attendance: any;
    userProfile: any;
    period: string;
    isCheckedIn: boolean;
    onToggleCheckInOut: () => void;
}

export function AdminFounderDashboardView({
    data,
    attendance,
    userProfile,
    period,
    isCheckedIn,
    onToggleCheckInOut,
}: AdminDashboardProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'my_business' | 'company_performance' | 'managers' | 'analytics'>('my_business');

    const salesPerformance = data?.salesPerformance || {
        target: 0,
        won: 0,
        pipeline: 0,
        forecast: 0,
        pipelineCount: 0,
        growth: '0%',
    };

    const strategicAccounts = data?.strategicAccounts || [];
    const adminPipeline = data?.adminPipeline || [];

    const companyPerformance = data?.companyPerformance || {
        target: 0,
        won: 0,
        pipeline: 0,
        forecast: 0,
        pipelineCount: 0,
        growth: '0%',
    };

    const revenueTrend = data?.revenueTrend || [];
    const revenueByService = data?.revenueByService || [];
    const revenueByIndustry = data?.revenueByIndustry || [];
    const leadSourceRevenue = data?.leadSourceRevenue || [];
    const managersPerformance = data?.managersPerformance || [];
    const companyAttendance = data?.companyAttendance || {
        working: 0,
        late: 0,
        onLeave: 0,
        absent: 0,
        avgWorkHours: '0h 00m',
        avgFocus: '0h 00m',
        activityPercent: 0,
    };
    const keyInsights = data?.keyInsights || [];

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

    const myAchievedPercent = salesPerformance.target > 0
        ? Math.round((salesPerformance.won / salesPerformance.target) * 100)
        : 0;

    const companyAchievedPercent = companyPerformance.target > 0
        ? Math.round((companyPerformance.won / companyPerformance.target) * 100)
        : 0;

    return (
        <div className="space-y-5">
            
            {/* Top Greeting & Navigation Tabs Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {t('Good Morning')}, {userProfile?.name || 'Ajay'}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {todayDateStr}
                    </p>
                </div>

                {/* Navigation Tabs (My Business | Company Performance | Managers | Sales Analytics) */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto overflow-x-auto max-w-full">
                    <button
                        type="button"
                        onClick={() => setActiveTab('my_business')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'my_business'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                        }`}
                    >
                        {t('My Business')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('company_performance')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'company_performance'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                        }`}
                    >
                        {t('Company Performance')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('managers')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'managers'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                        }`}
                    >
                        {t('Managers')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('analytics')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'analytics'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                        }`}
                    >
                        {t('Sales Analytics')}
                    </button>
                </div>
            </div>

            {/* Founder Personal Sales Performance (Shown on my_business) */}
            {(activeTab === 'my_business') && (
                <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('My Sales Performance')} ({periodLabel})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        
                        {/* Target */}
                        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span className="font-medium">{t('My Target')}</span>
                                    <Target className="w-4 h-4 text-amber-500" />
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {formatINR(salesPerformance.target)}
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className={`font-semibold ${
                                            myAchievedPercent >= 100
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : myAchievedPercent >= 50
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-amber-600 dark:text-amber-400'
                                        }`}>
                                            {myAchievedPercent}% {t('achieved')}
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                                            {formatINR(salesPerformance.won)} {t('won')}
                                        </span>
                                    </div>
                                    <Progress
                                        value={Math.min(100, Math.max(0, myAchievedPercent))}
                                        className="h-2 bg-slate-100 dark:bg-slate-800"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Revenue Won */}
                        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span className="font-medium">{t('Revenue Won')}</span>
                                    <Award className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                    {formatINR(salesPerformance.won)}
                                </div>
                                <div className="mt-3 flex items-center gap-1.5 text-xs">
                                    <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[11px]">
                                        <TrendingUp className="w-3 h-3" />
                                        {salesPerformance.growth}
                                    </span>
                                    <span className="text-slate-400 text-[11px]">{t('vs last month')}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Open Pipeline */}
                        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span className="font-medium">{t('Open Pipeline')}</span>
                                    <Briefcase className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {formatINR(salesPerformance.pipeline)}
                                </div>
                                <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                    {salesPerformance.pipelineCount} {t('opportunities')}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Forecast */}
                        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span className="font-medium">{t('Forecast')}</span>
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 tracking-tight">
                                    {formatINR(salesPerformance.forecast)}
                                </div>
                                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {t('Likely to close')}
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Strategic Accounts & Executive Pipeline */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        
                        {/* My Strategic Accounts */}
                        <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {t('My Strategic Accounts')}
                                </CardTitle>
                                <Link href={route('accounts.index')} className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold">
                                    {t('View all')}
                                </Link>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="py-2.5 px-3.5">{t('Client')}</th>
                                            <th className="py-2.5 px-3.5 text-right">{t('Value')}</th>
                                            <th className="py-2.5 px-3.5 text-center">{t('Relationship')}</th>
                                            <th className="py-2.5 px-3.5 text-center">{t('Next Action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {strategicAccounts.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                                                    {t('No strategic accounts found')}
                                                </td>
                                            </tr>
                                        ) : (
                                            strategicAccounts.map((account: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-100">
                                                        {account.name}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                        {formatINR(account.value || 0)}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${account.statusColor || 'bg-slate-100 text-slate-700'}`}>
                                                            {account.relationship || t('Prospect')}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-center">
                                                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                            {account.nextAction || t('Follow up')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* My Pipeline */}
                        <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {t('My Pipeline')} ({formatCompactINR(salesPerformance.pipeline)})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {adminPipeline.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-xs">
                                        {t('No pipeline opportunities available')}
                                    </div>
                                ) : (
                                    adminPipeline.map((row: any) => {
                                        const colors: Record<string, string> = {
                                            New: '#3b82f6',
                                            Qualified: '#06b6d4',
                                            Meeting: '#f59e0b',
                                            Proposal: '#f97316',
                                            Negotiation: '#ec4899',
                                        };
                                        const maxVal = Math.max(...adminPipeline.map((r: any) => r.value), 1);
                                        const widthPct = Math.round(((row.value || 0) / maxVal) * 100);

                                        return (
                                            <div key={row.stage} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {row.stage}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] text-slate-400 font-bold">
                                                            {row.count} {t('deals')}
                                                        </span>
                                                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                            {formatINR(row.value || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${widthPct}%`,
                                                            backgroundColor: colors[row.stage] || '#3b82f6',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </CardContent>
                        </Card>

                    </div>
                </div>
            )}

            {/* Company Performance Tab */}
            {(activeTab === 'company_performance') && (
                <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('Company Sales Performance')} ({periodLabel})
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        
                        {/* Company Target */}
                        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span className="font-medium">{t('Company Target')}</span>
                                    <Building2 className="w-4 h-4 text-amber-500" />
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {formatINR(companyPerformance.target)}
                                </div>
                                <div className="mt-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className={`font-semibold ${
                                            companyAchievedPercent >= 100
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : companyAchievedPercent >= 50
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-amber-600 dark:text-amber-400'
                                        }`}>
                                            {companyAchievedPercent}% {t('achieved')}
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                                            {formatINR(companyPerformance.won)} {t('won')}
                                        </span>
                                    </div>
                                    <Progress
                                        value={Math.min(100, Math.max(0, companyAchievedPercent))}
                                        className="h-2 bg-slate-100 dark:bg-slate-800"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Revenue Won */}
                        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span className="font-medium">{t('Revenue Won')}</span>
                                    <Award className="w-4 h-4 text-emerald-500" />
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                    {formatINR(companyPerformance.won)}
                                </div>
                                <div className="mt-3 flex items-center gap-1.5 text-xs">
                                    <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[11px]">
                                        <TrendingUp className="w-3 h-3" />
                                        {companyPerformance.growth}
                                    </span>
                                    <span className="text-slate-400 text-[11px]">{t('vs last month')}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Open Pipeline */}
                        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span className="font-medium">{t('Open Pipeline')}</span>
                                    <Briefcase className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {formatINR(companyPerformance.pipeline)}
                                </div>
                                <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                    {companyPerformance.pipelineCount} {t('opportunities')}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Forecast */}
                        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardContent className="p-4 sm:p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                    <span className="font-medium">{t('Forecast')}</span>
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                </div>
                                <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 tracking-tight">
                                    {formatINR(companyPerformance.forecast)}
                                </div>
                                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {t('Likely to close')}
                                </div>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Company Attendance & Key Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        
                        {/* Company Attendance */}
                        <Card className="lg:col-span-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {t('Company Attendance (Today)')}
                                </CardTitle>
                                <Link href={route('attendance.index')} className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold">
                                    {t('View all')}
                                </Link>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                                        {companyAttendance.working} {t('Working')}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200">
                                        {companyAttendance.late} {t('Late')}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200">
                                        {companyAttendance.onLeave} {t('On Leave')}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200">
                                        {companyAttendance.absent} {t('Absent')}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                                    <span>{t('Avg Work Hours')}: <b className="text-slate-800 dark:text-slate-200">{companyAttendance.avgWorkHours}</b></span>
                                    <span>{t('Avg Focus')}: <b className="text-slate-800 dark:text-slate-200">{companyAttendance.avgFocus}</b></span>
                                    <span>{t('Activity')}: <b className="text-slate-800 dark:text-slate-200">{companyAttendance.activityPercent}%</b></span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Key Insights & AI Alerts */}
                        <Card className="lg:col-span-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    {t('Key Insights & Alerts')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3.5 space-y-2">
                                {keyInsights.length === 0 ? (
                                    <div className="py-6 text-center text-slate-400 text-xs">
                                        {t('No active alerts or key insights')}
                                    </div>
                                ) : (
                                    keyInsights.map((insight: any) => (
                                        <div
                                            key={insight.id}
                                            className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50"
                                        >
                                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                insight.type === 'danger'
                                                    ? 'bg-red-500'
                                                    : insight.type === 'success'
                                                    ? 'bg-emerald-500'
                                                    : insight.type === 'purple'
                                                    ? 'bg-purple-500'
                                                    : 'bg-blue-500'
                                            }`} />
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1">
                                                {insight.text}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                    </div>
                </div>
            )}

            {/* Managers Tab */}
            {(activeTab === 'managers') && (
                <div className="space-y-4">
                    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                        <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                {t('Managers Performance')}
                            </CardTitle>
                            <Link href={route('users.index')} className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold">
                                {t('View all')}
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0 overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="py-2.5 px-3.5">{t('Manager')}</th>
                                        <th className="py-2.5 px-3.5 text-right">{t('Target')}</th>
                                        <th className="py-2.5 px-3.5 text-right">{t('Won')}</th>
                                        <th className="py-2.5 px-3.5 text-center">{t('%')}</th>
                                        <th className="py-2.5 px-3.5 text-right">{t('Pipeline')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {managersPerformance.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                                                {t('No managers performance data available')}
                                            </td>
                                        </tr>
                                    ) : (
                                        managersPerformance.map((mgr: any) => (
                                            <tr key={mgr.name} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-100">
                                                    {mgr.name}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                                                    {formatCompactINR(mgr.target || 0)}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatCompactINR(mgr.won || 0)}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                                                    {mgr.achievedPercent || 0}%
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                    {formatCompactINR(mgr.pipeline || 0)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Sales Analytics Tab */}
            {(activeTab === 'analytics') && (
                <div className="space-y-4">
                    {/* Revenue Trend & Revenue By Service */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        
                        {/* Revenue Trend (6 Months Chart) */}
                        <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {t('Revenue Trend')}
                                </CardTitle>
                                <span className="text-xs text-slate-400 font-medium">
                                    {t('Last 6 Months')}
                                </span>
                            </CardHeader>
                            <CardContent className="p-4">
                                {revenueTrend.length === 0 ? (
                                    <div className="py-16 text-center text-slate-400 text-xs">
                                        {t('No revenue trend data available')}
                                    </div>
                                ) : (
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v / 100000}L`} />
                                                <Tooltip
                                                    formatter={(value: any) => formatINR(Number(value))}
                                                    contentStyle={{ borderRadius: '8px', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                                <Bar dataKey="won" name={t('Won Revenue')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                                                <Line type="monotone" dataKey="target" name={t('Target')} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                                                <Line type="monotone" dataKey="forecast" name={t('Forecast')} stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Revenue by Service (Donut Chart) */}
                        <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {t('Revenue by Service')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                                {revenueByService.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 text-xs w-full">
                                        {t('No service revenue data')}
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={revenueByService}
                                                        innerRadius={42}
                                                        outerRadius={64}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {revenueByService.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                                                <span className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                                    {formatCompactINR(companyPerformance.won || 0)}
                                                </span>
                                                <span className="text-[9px] text-slate-400">
                                                    {t('Won Revenue')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-1.5 text-xs w-full">
                                            {revenueByService.map((item: any) => (
                                                <div key={item.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                        <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate">{item.name}</span>
                                                    </div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] font-mono shrink-0 ml-2">
                                                        {item.value}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                    </div>

                    {/* Revenue by Industry & Lead Source -> Revenue */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        
                        {/* Revenue by Industry */}
                        <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {t('Revenue by Industry')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {revenueByIndustry.length === 0 ? (
                                    <div className="py-8 text-center text-slate-400 text-xs">
                                        {t('No industry revenue data')}
                                    </div>
                                ) : (
                                    revenueByIndustry.map((ind: any) => (
                                        <div key={ind.name} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {ind.name}
                                                </span>
                                                <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
                                                    {ind.percent}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${ind.percent}%`,
                                                        backgroundColor: ind.color || '#3b82f6',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Lead Source -> Revenue Table */}
                        <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                            <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {t('Lead Source')} &rarr; {t('Revenue')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="py-2.5 px-3.5">{t('Source')}</th>
                                            <th className="py-2.5 px-3.5 text-center">{t('Leads')}</th>
                                            <th className="py-2.5 px-3.5 text-center">{t('Opps')}</th>
                                            <th className="py-2.5 px-3.5 text-center">{t('Won')}</th>
                                            <th className="py-2.5 px-3.5 text-right">{t('Revenue')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {leadSourceRevenue.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                                                    {t('No lead source revenue data')}
                                                </td>
                                            </tr>
                                        ) : (
                                            leadSourceRevenue.map((row: any) => (
                                                <tr key={row.source} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-200">
                                                        {row.source}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-center text-slate-600 dark:text-slate-400 font-mono">
                                                        {row.leads}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-center text-slate-600 dark:text-slate-400 font-mono">
                                                        {row.opps}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                        {row.won}
                                                    </td>
                                                    <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                                                        {formatCompactINR(row.revenue || 0)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                    </div>
                </div>
            )}

        </div>
    );
}
