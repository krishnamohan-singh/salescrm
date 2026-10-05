import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Users,
    UserCheck,
    Clock,
    Coffee,
    AlertCircle,
    Calendar,
    Download,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    CheckCircle2,
    Pause,
    Play,
    LogOut,
    LogIn,
    Activity,
    CalendarDays,
    FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/custom-toast';
import { AttendanceModal } from '@/components/attendance/AttendanceModal';
import { BreakModal } from '@/components/attendance/BreakModal';

interface AttendanceRecordItem {
    user_id: number;
    name: string;
    email: string;
    avatar?: string | null;
    role: string;
    attendance_id?: number | null;
    date: string;
    clock_in?: string | null;
    clock_out?: string | null;
    raw_clock_in?: string | null;
    raw_clock_out?: string | null;
    status: string;
    status_color: string;
    is_clocked_in: boolean;
    is_on_break: boolean;
    current_break_reason?: string | null;
    is_late: boolean;
    late_minutes: number;
    total_hours: number;
    formatted_total_time: string;
    formatted_active_time: string;
    formatted_idle_time: string;
    formatted_break_time: string;
    focus_percentage: number;
    clock_in_location?: string | null;
    clock_in_ip?: string | null;
    clock_in_note?: string | null;
    clock_out_note?: string | null;
    approval_status: string;
    breaks?: any[];
}

interface StatsData {
    totalStaff: number;
    presentToday: number;
    workingNow: number;
    onBreak: number;
    lateToday: number;
    absentToday: number;
    onLeaveToday: number;
    attendanceRate: number;
    avgWorkHours: string;
    avgFocus: string;
}

export default function AttendanceIndex() {
    const { t } = useTranslation();
    const {
        records = [],
        stats,
        selectedDate = new Date().toISOString().split('T')[0],
        availableRoles = [],
        canViewAll = false,
        myAttendance = {},
        filters = {},
        auth,
    } = usePage().props as any;

    const [date, setDate] = useState<string>(selectedDate);
    const [search, setSearch] = useState<string>(filters?.search || '');
    const [role, setRole] = useState<string>(filters?.role || 'all');
    const [status, setStatus] = useState<string>(filters?.status || 'all');

    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [breakModalOpen, setBreakModalOpen] = useState(false);
    const [isPunching, setIsPunching] = useState(false);

    const handleFilterChange = (newDate?: string, newSearch?: string, newRole?: string, newStatus?: string) => {
        router.get(
            route('attendance.index'),
            {
                date: newDate !== undefined ? newDate : date,
                search: newSearch !== undefined ? newSearch : search,
                role: newRole !== undefined ? newRole : role,
                status: newStatus !== undefined ? newStatus : status,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleQuickCheckIn = () => {
        setIsPunching(true);
        router.post(
            route('attendance.check-in'),
            {},
            {
                onSuccess: (page) => {
                    toast.success(t('Checked in successfully!'));
                },
                onError: () => {
                    toast.error(t('Check-in failed. Please try again.'));
                },
                onFinish: () => setIsPunching(false),
            }
        );
    };

    const handleQuickCheckOut = () => {
        setIsPunching(true);
        router.post(
            route('attendance.check-out'),
            {},
            {
                onSuccess: (page) => {
                    toast.success(t('Checked out successfully!'));
                },
                onError: () => {
                    toast.error(t('Check-out failed. Please try again.'));
                },
                onFinish: () => setIsPunching(false),
            }
        );
    };

    const handleDeleteRecord = (id: number) => {
        if (!confirm(t('Are you sure you want to delete this attendance record?'))) return;
        router.delete(route('attendance.destroy', id), {
            onSuccess: () => toast.success(t('Attendance record deleted.')),
        });
    };

    const handleExport = () => {
        window.location.href = route('attendance.export', { date });
    };

    const pageActions = [
        {
            label: t('Monthly Timesheet'),
            icon: <CalendarDays className="h-4 w-4 mr-1.5" />,
            variant: 'outline' as const,
            onClick: () => router.get(route('attendance.timesheet')),
        },
        {
            label: t('Export CSV'),
            icon: <Download className="h-4 w-4 mr-1.5" />,
            variant: 'outline' as const,
            onClick: handleExport,
        },
        ...(canViewAll
            ? [
                  {
                      label: t('Add Punch Log'),
                      icon: <Plus className="h-4 w-4 mr-1.5" />,
                      variant: 'default' as const,
                      onClick: () => {
                          setSelectedRecord(null);
                          setModalOpen(true);
                      },
                  },
              ]
            : []),
    ];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Attendance & Timesheet') },
    ];

    const isUserCheckedIn = myAttendance?.isCheckedIn;
    const isUserOnBreak = myAttendance?.isOnBreak;

    return (
        <PageTemplate
            title={t('Live Attendance & Daily Board')}
            description={t('Real-time employee check-in, presence monitoring, focus scores, and timesheets.')}
            url={route('attendance.index')}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-6">

                {/* Top Personal Live Punch Bar */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-5 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${
                                isUserOnBreak
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                    : isUserCheckedIn
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                    : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>
                                {isUserOnBreak ? (
                                    <Coffee className="w-6 h-6 animate-pulse" />
                                ) : isUserCheckedIn ? (
                                    <Clock className="w-6 h-6 animate-pulse" />
                                ) : (
                                    <LogIn className="w-6 h-6" />
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-white">
                                        {auth?.user?.name}
                                    </h3>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                        isUserOnBreak
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            : isUserCheckedIn
                                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                            : 'bg-slate-800 text-slate-400 border-slate-700'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            isUserOnBreak ? 'bg-amber-400 animate-ping' : isUserCheckedIn ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                                        }`} />
                                        {isUserOnBreak ? t('ON BREAK') : isUserCheckedIn ? t('CHECKED IN') : t('NOT PUNCHED IN')}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-1">
                                    {isUserCheckedIn
                                        ? `${t('Clocked in at')}: ${myAttendance?.clockIn || '--:--'} • ${t('Total Work')}: ${myAttendance?.totalTime || '00h 00m'}`
                                        : t('Start your workday by checking in below.')}
                                </p>
                            </div>
                        </div>

                        {/* Quick Punch Controls */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            {isUserCheckedIn && (
                                <Button
                                    type="button"
                                    onClick={() => setBreakModalOpen(true)}
                                    variant="outline"
                                    className={`text-xs font-bold border shadow-xs ${
                                        isUserOnBreak
                                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-400'
                                            : 'bg-slate-800/80 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                                    }`}
                                >
                                    <Coffee className="w-3.5 h-3.5 mr-1.5" />
                                    {isUserOnBreak ? t('End Break') : t('Take Break')}
                                </Button>
                            )}

                            {!isUserCheckedIn ? (
                                <Button
                                    type="button"
                                    onClick={handleQuickCheckIn}
                                    disabled={isPunching}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 shadow-md"
                                >
                                    <LogIn className="w-4 h-4 mr-1.5" />
                                    {isPunching ? t('Punching...') : t('Check In Now')}
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleQuickCheckOut}
                                    disabled={isPunching}
                                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-4 shadow-md"
                                >
                                    <LogOut className="w-4 h-4 mr-1.5" />
                                    {isPunching ? t('Punching...') : t('Check Out')}
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.get(route('attendance.my-attendance'))}
                                className="text-xs text-slate-300 hover:text-white hover:bg-white/10"
                            >
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                {t('My History')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Overview Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Total Staff')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.totalStaff ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                                <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Present')}</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-bold text-slate-900 dark:text-white">{stats?.presentToday ?? 0}</span>
                                    <span className="text-[10px] font-bold text-emerald-600">{stats?.attendanceRate ?? 0}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Working Now')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.workingNow ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                                <Coffee className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('On Break')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.onBreak ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Late Today')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.lateToday ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Avg Focus')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.avgFocus ?? '84%'}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter & Toolbar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    
                    {/* Left: Date Selector & Search */}
                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                        <div className="relative w-40 sm:w-48">
                            <Calendar className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    handleFilterChange(e.target.value);
                                }}
                                className="pl-8 text-xs h-9 bg-slate-50 dark:bg-slate-800"
                            />
                        </div>

                        <div className="relative w-full sm:w-60">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                placeholder={t('Search employee name / email...')}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    handleFilterChange(undefined, e.target.value);
                                }}
                                className="pl-8 text-xs h-9 bg-slate-50 dark:bg-slate-800"
                            />
                        </div>
                    </div>

                    {/* Right: Role & Status Dropdowns */}
                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                        <div className="w-36">
                            <Select
                                value={role}
                                onValueChange={(val) => {
                                    setRole(val);
                                    handleFilterChange(undefined, undefined, val);
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-800">
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

                        <div className="w-36">
                            <Select
                                value={status}
                                onValueChange={(val) => {
                                    setStatus(val);
                                    handleFilterChange(undefined, undefined, undefined, val);
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-slate-800">
                                    <SelectValue placeholder={t('All Status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Status')}</SelectItem>
                                    <SelectItem value="working">{t('Working Now')}</SelectItem>
                                    <SelectItem value="on_break">{t('On Break')}</SelectItem>
                                    <SelectItem value="present">{t('Present')}</SelectItem>
                                    <SelectItem value="late">{t('Late')}</SelectItem>
                                    <SelectItem value="absent">{t('Absent')}</SelectItem>
                                    <SelectItem value="on_leave">{t('On Leave')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Main Attendance Table */}
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-3 px-4">{t('Employee')}</th>
                                    <th className="py-3 px-3">{t('Status')}</th>
                                    <th className="py-3 px-3">{t('Punch In')}</th>
                                    <th className="py-3 px-3">{t('Punch Out')}</th>
                                    <th className="py-3 px-3">{t('Work Time')}</th>
                                    <th className="py-3 px-3">{t('Active / Idle')}</th>
                                    <th className="py-3 px-3">{t('Focus Score')}</th>
                                    <th className="py-3 px-3">{t('Breaks')}</th>
                                    <th className="py-3 px-4 text-right">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-10 text-slate-400">
                                            {t('No attendance records found for this date.')}
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((rec: AttendanceRecordItem) => (
                                        <tr key={rec.user_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                                            
                                            {/* Employee Name & Avatar */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    {rec.avatar ? (
                                                        <img
                                                            src={rec.avatar}
                                                            alt={rec.name}
                                                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                                                            {rec.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                                                            {rec.name}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">{rec.role}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    {rec.is_on_break ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300">
                                                            <Coffee className="w-3 h-3 mr-1 animate-pulse text-amber-600" />
                                                            {t('Break')}
                                                        </span>
                                                    ) : rec.is_clocked_in ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                                                            {t('Working')}
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${rec.status_color}`}>
                                                            {rec.status === 'present'
                                                                ? t('Present')
                                                                : rec.status === 'late'
                                                                ? t('Late')
                                                                : rec.status === 'half_day'
                                                                ? t('Half Day')
                                                                : rec.status === 'on_leave'
                                                                ? t('On Leave')
                                                                : t('Absent')}
                                                        </span>
                                                    )}
                                                    {rec.is_late && (
                                                        <span className="text-[10px] text-amber-600 font-bold" title={`${rec.late_minutes} mins late`}>
                                                            +{rec.late_minutes}m
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Punch In */}
                                            <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                                                {rec.clock_in ? (
                                                    <div className="leading-tight">
                                                        <p>{rec.clock_in}</p>
                                                        {rec.clock_in_location && (
                                                            <p className="text-[10px] text-slate-400 truncate max-w-[100px]">
                                                                {rec.clock_in_location}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">--:--</span>
                                                )}
                                            </td>

                                            {/* Punch Out */}
                                            <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                                                {rec.clock_out ? (
                                                    <div className="leading-tight">
                                                        <p>{rec.clock_out}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">--:--</span>
                                                )}
                                            </td>

                                            {/* Work Time */}
                                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                                {rec.formatted_total_time}
                                            </td>

                                            {/* Active / Idle */}
                                            <td className="py-3 px-3 text-slate-500">
                                                <div className="leading-tight">
                                                    <span className="text-emerald-600 font-semibold">{rec.formatted_active_time}</span>
                                                    <span className="text-slate-400"> / </span>
                                                    <span className="text-amber-600">{rec.formatted_idle_time}</span>
                                                </div>
                                            </td>

                                            {/* Focus Score */}
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-14 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                rec.focus_percentage >= 80
                                                                    ? 'bg-emerald-500'
                                                                    : rec.focus_percentage >= 60
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-rose-500'
                                                            }`}
                                                            style={{ width: `${rec.focus_percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                                                        {rec.focus_percentage}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Breaks */}
                                            <td className="py-3 px-3 text-slate-500">
                                                {rec.breaks && rec.breaks.length > 0 ? (
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {rec.breaks.length} ({rec.formatted_break_time})
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">0</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canViewAll && (
                                                        <>
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setSelectedRecord(rec);
                                                                    setModalOpen(true);
                                                                }}
                                                                className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                                                                title={t('Edit Punch Record')}
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </Button>

                                                            {rec.attendance_id && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleDeleteRecord(rec.attendance_id!)}
                                                                    className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
                                                                    title={t('Delete Record')}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

            </div>

            {/* Manual Attendance Modal */}
            <AttendanceModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                record={selectedRecord}
                date={date}
                users={records.map((r: any) => ({ id: r.user_id, name: r.name, email: r.email }))}
            />

            {/* Break Tracker Modal */}
            <BreakModal
                isOpen={breakModalOpen}
                onClose={() => setBreakModalOpen(false)}
                isOnBreak={isUserOnBreak}
                currentBreakReason={myAttendance?.currentBreakReason}
            />

        </PageTemplate>
    );
}
