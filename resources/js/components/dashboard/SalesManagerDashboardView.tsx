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
    Users,
    AlertCircle,
    CheckCircle2,
    Clock,
    UserCheck,
    AlertTriangle,
    ShieldAlert,
    FileText,
    ChevronRight,
    Sparkles,
    CalendarCheck,
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import UserInitials from '@/components/user-initials';

interface SalesManagerDashboardProps {
    data: any;
    attendance: any;
    userProfile: any;
    period: string;
    isCheckedIn: boolean;
    onToggleCheckInOut: () => void;
}

export function SalesManagerDashboardView({
    data,
    attendance,
    userProfile,
    period,
    isCheckedIn,
    onToggleCheckInOut,
}: SalesManagerDashboardProps) {
    const { t } = useTranslation();
    const [managerTab, setManagerTab] = useState<'my_business' | 'my_team'>('my_business');

    const salesPerformance = data?.salesPerformance || {
        target: 0,
        won: 0,
        pipeline: 0,
        forecast: 0,
        pipelineCount: 0,
        growth: '0%',
    };

    const teamPerformance = data?.teamPerformance || {
        target: 0,
        won: 0,
        pipeline: 0,
        forecast: 0,
        pipelineCount: 0,
        growth: '0%',
        achievedPercent: 0,
    };

    const teamMembers = data?.teamMembers || [];
    const teamSalesFunnel = data?.teamSalesFunnel || [];
    const teamAttendance = data?.teamAttendance || [];
    const requiresAttention = data?.requiresAttention || [];
    const keyOpportunities = data?.keyOpportunities || [];
    const pipelineBreakdown = data?.pipelineBreakdown || [];

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

    return (
        <div className="space-y-5">
            
            {/* Top Greeting & Tab Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {t('Good Morning')}, {userProfile?.name || 'Sales Manager'}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {todayDateStr} • {t('Sales Performance & Team Pipeline')}
                    </p>
                </div>

                {/* My Business / My Team Tab Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setManagerTab('my_business')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            managerTab === 'my_business'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                        }`}
                    >
                        {t('My Business')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setManagerTab('my_team')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            managerTab === 'my_team'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                        }`}
                    >
                        {t('My Team')}
                    </button>
                </div>
            </div>

            {/* Manager Personal Sales Performance 4 Cards */}
            <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {t('My Sales Performance')} ({periodLabel})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    
                    {/* Target */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                <span className="font-medium">{t('My Target')}</span>
                                <Target className="w-4 h-4 text-emerald-500" />
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
            </div>

            {/* Key Opportunities & Pipeline Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* My Key Opportunities */}
                <Card className="lg:col-span-7 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {t('My Key Opportunities')}
                        </CardTitle>
                        <Link href={route('opportunities.index')} className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
                            {t('View all')}
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="py-2.5 px-3.5">{t('Client')}</th>
                                    <th className="py-2.5 px-3.5">{t('Opportunity')}</th>
                                    <th className="py-2.5 px-3.5 text-right">{t('Value')}</th>
                                    <th className="py-2.5 px-3.5 text-center">{t('Stage')}</th>
                                    <th className="py-2.5 px-3.5 text-center">{t('Next Action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {keyOpportunities.length > 0 ? (
                                    keyOpportunities.map((opp: any) => (
                                        <tr key={opp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-100">
                                                {opp.name}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-slate-500">
                                                {opp.opportunity}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                                                {formatINR(opp.value)}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${opp.stageColor || 'bg-emerald-100 text-emerald-800'}`}>
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
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            <Briefcase className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                                            <p className="text-xs font-medium">{t('No opportunities found')}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* My Pipeline Visual Bar Breakdown */}
                <Card className="lg:col-span-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {t('My Pipeline')} ({formatCompactINR(salesPerformance.pipeline)})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {pipelineBreakdown.map((row: any) => {
                            const maxVal = Math.max(...pipelineBreakdown.map((r: any) => r.value), 1);
                            const widthPct = Math.round((row.value / maxVal) * 100);

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
                                                {formatINR(row.value)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${widthPct}%`,
                                                backgroundColor: row.color,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

            </div>

            {/* Team Performance Header & Cards */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {t('Team Performance')} ({periodLabel})
                    </div>
                    <Link href={route('users.index')} className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
                        {t('View details')}
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    
                    {/* Team Target */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                <span className="font-medium">{t('Team Target')}</span>
                                <Users className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {formatINR(teamPerformance.target)}
                            </div>
                            <div className="mt-3 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className={`font-semibold ${
                                        teamPerformance.achievedPercent >= 100
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : teamPerformance.achievedPercent >= 50
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-amber-600 dark:text-amber-400'
                                    }`}>
                                        {teamPerformance.achievedPercent}% {t('Target Achieved')}
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                                        {formatINR(teamPerformance.won)} {t('won')}
                                    </span>
                                </div>
                                <Progress
                                    value={Math.min(100, Math.max(0, teamPerformance.achievedPercent))}
                                    className="h-2 bg-slate-100 dark:bg-slate-800"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team Won */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                <span className="font-medium">{t('Team Won')}</span>
                                <Award className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {formatINR(teamPerformance.won)}
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 text-xs">
                                <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[11px]">
                                    <TrendingUp className="w-3 h-3" />
                                    {teamPerformance.growth}
                                </span>
                                <span className="text-slate-400 text-[11px]">{t('vs last month')}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team Pipeline */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                <span className="font-medium">{t('Team Pipeline')}</span>
                                <Briefcase className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {formatINR(teamPerformance.pipeline)}
                            </div>
                            <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                {teamPerformance.pipelineCount} {t('opportunities')}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Team Forecast */}
                    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                        <CardContent className="p-4 sm:p-5">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                                <span className="font-medium">{t('Team Forecast')}</span>
                                <Sparkles className="w-4 h-4 text-purple-500" />
                            </div>
                            <div className="text-xl sm:text-2xl font-black text-purple-700 dark:text-purple-300 tracking-tight">
                                {formatINR(teamPerformance.forecast)}
                            </div>
                            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {t('Likely to close')}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>

            {/* Team Target vs Achievement & Team Sales Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Team Target vs Achievement Table */}
                <Card className="lg:col-span-8 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {t('Team Target vs Achievement')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="py-2.5 px-3.5">{t('Team Member')}</th>
                                    <th className="py-2.5 px-3.5 text-right">{t('Target')}</th>
                                    <th className="py-2.5 px-3.5 text-right">{t('Won')}</th>
                                    <th className="py-2.5 px-3.5 text-center w-36">{t('%')}</th>
                                    <th className="py-2.5 px-3.5 text-right">{t('Pipeline')}</th>
                                    <th className="py-2.5 px-3.5 text-right">{t('Forecast')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {teamMembers.length > 0 ? (
                                    teamMembers.map((member: any) => (
                                        <tr key={member.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2.5 px-3.5 flex items-center gap-2">
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt={member.name} className="w-6 h-6 rounded-full" />
                                                ) : (
                                                    <UserInitials name={member.name} className="w-6 h-6 text-[10px] font-bold" />
                                                )}
                                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                                    {member.name}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-600 dark:text-slate-400">
                                                {formatCompactINR(member.target)}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCompactINR(member.won)}
                                            </td>
                                            <td className="py-2.5 px-3.5">
                                                <div className="flex items-center gap-2">
                                                    <Progress value={member.achievedPercent} className="h-2 flex-1 bg-slate-100 dark:bg-slate-800" />
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 w-8 text-right">
                                                        {member.achievedPercent}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3.5 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                                {formatCompactINR(member.pipeline)}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-right font-mono font-semibold text-purple-700 dark:text-purple-300">
                                                {formatCompactINR(member.forecast)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            <Users className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                                            <p className="text-xs font-medium">{t('No team members found')}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Team Sales Funnel */}
                <Card className="lg:col-span-4 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {t('Team Sales Funnel')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-6 gap-1.5 items-end h-40 pt-4">
                            {teamSalesFunnel.map((stage: any) => {
                                const maxCount = Math.max(...teamSalesFunnel.map((s: any) => s.count), 1);
                                const heightPercent = Math.max(15, Math.round((stage.count / maxCount) * 100));

                                return (
                                    <div key={stage.stage} className="flex flex-col items-center gap-1.5 h-full justify-end group">
                                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 font-mono">
                                            {stage.count}
                                        </span>
                                        <div
                                            className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-110 shadow-xs"
                                            style={{
                                                height: `${heightPercent}%`,
                                                backgroundColor: stage.color,
                                            }}
                                        />
                                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 text-center truncate w-full">
                                            {stage.stage}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Bottom Row: Team Attendance & Requires My Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Team Attendance (Today) */}
                <Card className="lg:col-span-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {t('Team Attendance (Today)')}
                        </CardTitle>
                        <Link href={route('attendance.index')} className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold">
                            {t('View all')}
                        </Link>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                <tr>
                                    <th className="py-2.5 px-3.5">{t('Name')}</th>
                                    <th className="py-2.5 px-3.5 text-center">{t('Status')}</th>
                                    <th className="py-2.5 px-3.5 text-center">{t('At Work')}</th>
                                    <th className="py-2.5 px-3.5 text-center">{t('Focus')}</th>
                                    <th className="py-2.5 px-3.5 text-right">{t('Activity')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {teamAttendance.length > 0 ? (
                                    teamAttendance.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2.5 px-3.5 font-bold text-slate-800 dark:text-slate-100">
                                                {row.name}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    row.statusType === 'working'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                        : row.statusType === 'late'
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                                }`}>
                                                    ● {row.status}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center font-mono font-medium text-slate-600 dark:text-slate-300">
                                                {row.atWork}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-center font-mono font-medium text-slate-600 dark:text-slate-300">
                                                {row.focus}
                                            </td>
                                            <td className="py-2.5 px-3.5 text-right font-bold text-slate-800 dark:text-slate-100">
                                                {row.activity}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            <CalendarCheck className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                                            <p className="text-xs font-medium">{t('No attendance logs for today')}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Requires My Attention Alerts */}
                <Card className="lg:col-span-6 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                    <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {t('Requires My Attention')}
                        </CardTitle>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            {t('Actionable Alerts')}
                        </span>
                    </CardHeader>
                    <CardContent className="p-3.5 space-y-2">
                        {requiresAttention.map((alert: any) => (
                            <div
                                key={alert.id}
                                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                    alert.severity === 'danger'
                                        ? 'bg-red-500'
                                        : alert.severity === 'warning'
                                        ? 'bg-amber-500'
                                        : alert.severity === 'success'
                                        ? 'bg-emerald-500'
                                        : 'bg-blue-500'
                                }`} />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1">
                                    {alert.text}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

            </div>

        </div>
    );
}
