import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Search,
    Download,
    Calendar,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DayHeader {
    day: number;
    date: string;
    dayOfWeek: string;
    isWeekend: boolean;
    isToday: boolean;
}

interface TimesheetRow {
    user_id: number;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
    days: Record<
        number,
        {
            status: string;
            code: string;
            clock_in?: string | null;
            clock_out?: string | null;
            hours: number;
            is_late: boolean;
        }
    >;
    summary: {
        present: number;
        late: number;
        half_day: number;
        leave: number;
        absent: number;
        totalHours: number;
        overtimeHours: number;
        attendancePercentage: number;
    };
}

export default function AttendanceTimesheet() {
    const { t } = useTranslation();
    const {
        timesheet = [],
        daysHeader = [],
        monthYear = new Date().toISOString().substring(0, 7),
        monthName = '',
        availableRoles = [],
        canViewAll = false,
        filters = {},
    } = usePage().props as any;

    const [currentMonth, setCurrentMonth] = useState<string>(monthYear);
    const [search, setSearch] = useState<string>(filters?.search || '');
    const [role, setRole] = useState<string>(filters?.role || 'all');

    const handleMonthChange = (direction: 'prev' | 'next' | string) => {
        let newMonth = currentMonth;
        if (direction === 'prev') {
            const [y, m] = currentMonth.split('-').map(Number);
            const d = new Date(y, m - 2, 1);
            newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else if (direction === 'next') {
            const [y, m] = currentMonth.split('-').map(Number);
            const d = new Date(y, m, 1);
            newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else {
            newMonth = direction;
        }

        setCurrentMonth(newMonth);
        router.get(
            route('attendance.timesheet'),
            { month: newMonth, search, role },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleFilter = (newSearch?: string, newRole?: string) => {
        router.get(
            route('attendance.timesheet'),
            {
                month: currentMonth,
                search: newSearch !== undefined ? newSearch : search,
                role: newRole !== undefined ? newRole : role,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const pageActions = [
        {
            label: t('Daily Attendance'),
            icon: <Calendar className="h-4 w-4 mr-1.5" />,
            variant: 'outline' as const,
            onClick: () => router.get(route('attendance.index')),
        },
        {
            label: t('Export Timesheet'),
            icon: <Download className="h-4 w-4 mr-1.5" />,
            variant: 'outline' as const,
            onClick: () => {
                window.location.href = route('attendance.export', { date: `${currentMonth}-01` });
            },
        },
    ];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Attendance'), href: route('attendance.index') },
        { title: t('Monthly Timesheet') },
    ];

    const getStatusCodeStyle = (code: string) => {
        switch (code) {
            case 'P':
                return 'bg-emerald-500 text-white font-bold';
            case 'L':
                return 'bg-amber-500 text-white font-bold';
            case 'HD':
                return 'bg-orange-500 text-white font-bold';
            case 'A':
                return 'bg-rose-500 text-white font-bold';
            case 'LV':
                return 'bg-purple-600 text-white font-bold';
            case 'H':
                return 'bg-blue-600 text-white font-bold';
            case 'WO':
                return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
            default:
                return 'text-slate-300 dark:text-slate-600';
        }
    };

    return (
        <PageTemplate
            title={t('Monthly Timesheet Matrix')}
            description={t('Comprehensive attendance matrix, punch hours, and monthly timesheets.')}
            url={route('attendance.timesheet')}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-5">
                
                {/* Month Navigator & Filters */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    
                    {/* Left: Month Navigator */}
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleMonthChange('prev')}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <CalendarDays className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {monthName || currentMonth}
                            </span>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleMonthChange('next')}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Middle: Legend */}
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-[9px]">P</span>
                            {t('Present')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded bg-amber-500 text-white flex items-center justify-center font-bold text-[9px]">L</span>
                            {t('Late')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded bg-orange-500 text-white flex items-center justify-center font-bold text-[9px]">HD</span>
                            {t('Half Day')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded bg-rose-500 text-white flex items-center justify-center font-bold text-[9px]">A</span>
                            {t('Absent')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded bg-purple-600 text-white flex items-center justify-center font-bold text-[9px]">LV</span>
                            {t('Leave')}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[9px]">WO</span>
                            {t('Weekend')}
                        </span>
                    </div>

                    {/* Right: Search & Role Filter */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="relative w-44">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder={t('Search employee...')}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    handleFilter(e.target.value);
                                }}
                                className="pl-8 text-xs h-8 bg-slate-50 dark:bg-slate-800"
                            />
                        </div>

                        <div className="w-36">
                            <Select
                                value={role}
                                onValueChange={(val) => {
                                    setRole(val);
                                    handleFilter(undefined, val);
                                }}
                            >
                                <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-800">
                                    <SelectValue placeholder={t('All Roles')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Roles')}</SelectItem>
                                    {availableRoles.map((r: any) => (
                                        <SelectItem key={r.id} value={r.name}>
                                            {r.label || r.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                </div>

                {/* Matrix Timesheet Grid */}
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto max-w-full">
                        <table className="w-full text-xs text-center border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                    <th className="py-2.5 px-3 text-left sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 min-w-[180px] shadow-xs">
                                        {t('Employee')}
                                    </th>
                                    {daysHeader.map((dh: DayHeader) => (
                                        <th
                                            key={dh.day}
                                            className={`py-2 px-1 text-[11px] min-w-[32px] border-l border-slate-200 dark:border-slate-700/60 ${
                                                dh.isWeekend
                                                    ? 'bg-slate-100/80 dark:bg-slate-800/40 text-slate-400'
                                                    : dh.isToday
                                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-black ring-1 ring-blue-400/50'
                                                    : ''
                                            }`}
                                        >
                                            <div>{dh.day}</div>
                                            <div className="text-[9px] font-normal uppercase text-slate-400">{dh.dayOfWeek}</div>
                                        </th>
                                    ))}
                                    <th className="py-2.5 px-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border-l border-slate-200 dark:border-slate-700 min-w-[50px]">
                                        {t('P')}
                                    </th>
                                    <th className="py-2.5 px-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border-l border-slate-200 dark:border-slate-700 min-w-[50px]">
                                        {t('L')}
                                    </th>
                                    <th className="py-2.5 px-2 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold border-l border-slate-200 dark:border-slate-700 min-w-[50px]">
                                        {t('A')}
                                    </th>
                                    <th className="py-2.5 px-2 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-bold border-l border-slate-200 dark:border-slate-700 min-w-[60px]">
                                        {t('Hours')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {timesheet.length === 0 ? (
                                    <tr>
                                        <td colSpan={daysHeader.length + 5} className="py-10 text-center text-slate-400">
                                            {t('No timesheet data available.')}
                                        </td>
                                    </tr>
                                ) : (
                                    timesheet.map((row: TimesheetRow) => (
                                        <tr key={row.user_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                            {/* Sticky Employee Name */}
                                            <td className="py-2 px-3 text-left sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xs">
                                                <div className="flex items-center gap-2">
                                                    {row.avatar ? (
                                                        <img
                                                            src={row.avatar}
                                                            alt={row.name}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                                                            {row.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px] leading-tight">
                                                            {row.name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                                            {row.role}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Daily Badges 1..31 */}
                                            {daysHeader.map((dh: DayHeader) => {
                                                const dayData = row.days[dh.day];
                                                const code = dayData ? dayData.code : '-';
                                                return (
                                                    <td
                                                        key={dh.day}
                                                        className={`py-1.5 px-0.5 border-l border-slate-100 dark:border-slate-800 ${
                                                            dh.isWeekend ? 'bg-slate-50/60 dark:bg-slate-800/20' : ''
                                                        }`}
                                                        title={
                                                            dayData && dayData.clock_in
                                                                ? `${dh.date}: ${dayData.status.toUpperCase()} (${dayData.clock_in} - ${dayData.clock_out || 'Active'})`
                                                                : `${dh.date}: ${dayData?.status || 'Off'}`
                                                        }
                                                    >
                                                        <span
                                                            className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] ${getStatusCodeStyle(
                                                                code
                                                            )}`}
                                                        >
                                                            {code}
                                                        </span>
                                                    </td>
                                                );
                                            })}

                                            {/* Summary Columns */}
                                            <td className="py-2 px-2 font-bold text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 border-l border-slate-200 dark:border-slate-800">
                                                {row.summary.present}
                                            </td>
                                            <td className="py-2 px-2 font-bold text-amber-600 bg-amber-50/40 dark:bg-amber-950/20 border-l border-slate-200 dark:border-slate-800">
                                                {row.summary.late}
                                            </td>
                                            <td className="py-2 px-2 font-bold text-rose-600 bg-rose-50/40 dark:bg-rose-950/20 border-l border-slate-200 dark:border-slate-800">
                                                {row.summary.absent}
                                            </td>
                                            <td className="py-2 px-2 font-bold text-slate-900 dark:text-white bg-blue-50/40 dark:bg-blue-950/20 border-l border-slate-200 dark:border-slate-800">
                                                {row.summary.totalHours}h
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

            </div>
        </PageTemplate>
    );
}
