import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Calendar,
    Clock,
    UserCheck,
    Coffee,
    FileEdit,
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    LogIn,
    LogOut,
    Plus,
    Flame,
    History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/custom-toast';
import { AttendanceRequestModal } from '@/components/attendance/AttendanceRequestModal';
import { BreakModal } from '@/components/attendance/BreakModal';

export default function MyAttendance() {
    const { t } = useTranslation();
    const {
        attendances = [],
        stats = {},
        month = new Date().toISOString().substring(0, 7),
        monthName = '',
        todayAttendance,
        requests = [],
        user,
    } = usePage().props as any;

    const [currentMonth, setCurrentMonth] = useState<string>(month);
    const [requestModalOpen, setRequestModalOpen] = useState<boolean>(false);
    const [selectedRequestDate, setSelectedRequestDate] = useState<string>('');
    const [breakModalOpen, setBreakModalOpen] = useState<boolean>(false);
    const [isPunching, setIsPunching] = useState<boolean>(false);

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
        router.get(route('attendance.my-attendance'), { month: newMonth }, { preserveState: true, preserveScroll: true });
    };

    const handleQuickCheckIn = () => {
        setIsPunching(true);
        router.post(route('attendance.check-in'), {}, {
            onSuccess: () => toast.success(t('Checked in successfully!')),
            onError: () => toast.error(t('Check-in failed.')),
            onFinish: () => setIsPunching(false),
        });
    };

    const handleQuickCheckOut = () => {
        setIsPunching(true);
        router.post(route('attendance.check-out'), {}, {
            onSuccess: () => toast.success(t('Checked out successfully!')),
            onError: () => toast.error(t('Check-out failed.')),
            onFinish: () => setIsPunching(false),
        });
    };

    const isCheckedIn = todayAttendance && todayAttendance.clock_in && !todayAttendance.clock_out;
    const isOnBreak = !!todayAttendance?.is_on_break;

    const pageActions = [
        {
            label: t('Request Regularization'),
            icon: <FileEdit className="h-4 w-4 mr-1.5" />,
            variant: 'default' as const,
            onClick: () => {
                setSelectedRequestDate('');
                setRequestModalOpen(true);
            },
        },
    ];

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Attendance'), href: route('attendance.index') },
        { title: t('My Attendance') },
    ];

    return (
        <PageTemplate
            title={t('My Attendance & Work Log')}
            description={t('Your personal attendance records, work hours, breaks, and regularization requests.')}
            url={route('attendance.my-attendance')}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-6">

                {/* Header Punch Status Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-5 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
                        <div className="flex items-center gap-3.5">
                            {user?.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white/30" />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg border border-white/30">
                                    {user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}
                                </div>
                            )}
                            <div>
                                <h3 className="text-base font-bold">{user?.name}</h3>
                                <p className="text-xs text-blue-100">{user?.role} • {user?.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] font-medium bg-black/20 backdrop-blur-md px-2.5 py-0.5 rounded-md border border-white/20">
                                        {t('Today')}: {todayAttendance?.formatted_clock_in ? `${t('In')} ${todayAttendance.formatted_clock_in}` : t('Not Checked In')}
                                    </span>
                                    {todayAttendance?.is_late && (
                                        <span className="text-[11px] font-bold bg-amber-500/80 text-white px-2 py-0.5 rounded-md">
                                            {t('Late')} (+{todayAttendance.late_minutes}m)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                            {isCheckedIn && (
                                <Button
                                    type="button"
                                    onClick={() => setBreakModalOpen(true)}
                                    variant="outline"
                                    className={`text-xs font-bold ${
                                        isOnBreak ? 'bg-amber-400 text-slate-900' : 'bg-white/10 hover:bg-white/20 text-white border-white/30'
                                    }`}
                                >
                                    <Coffee className="w-3.5 h-3.5 mr-1.5" />
                                    {isOnBreak ? t('End Break') : t('Take Break')}
                                </Button>
                            )}

                            {!isCheckedIn ? (
                                <Button
                                    type="button"
                                    onClick={handleQuickCheckIn}
                                    disabled={isPunching}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 shadow-md"
                                >
                                    <LogIn className="w-4 h-4 mr-1.5" />
                                    {isPunching ? t('Processing...') : t('Check In Now')}
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleQuickCheckOut}
                                    disabled={isPunching}
                                    className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 shadow-md"
                                >
                                    <LogOut className="w-4 h-4 mr-1.5" />
                                    {isPunching ? t('Processing...') : t('Check Out')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Monthly Personal Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                                <UserCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Present Days')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.presentDays ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Late Days')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.lateDays ?? 0}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center shrink-0">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Total Work Hours')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.totalHours ?? '0h'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
                                <Flame className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Overtime')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.overtimeHours ?? '0h'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardContent className="p-3.5 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0">
                                <History className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('Avg Focus')}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{stats?.avgFocus ?? '85%'}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
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
                        <span className="text-xs font-bold text-slate-900 dark:text-white px-2">
                            {monthName || currentMonth}
                        </span>
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

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            setSelectedRequestDate('');
                            setRequestModalOpen(true);
                        }}
                        className="text-xs font-semibold"
                    >
                        <FileEdit className="w-3.5 h-3.5 mr-1.5" />
                        {t('Request Regularization')}
                    </Button>
                </div>

                {/* Detailed Attendance Log Table */}
                <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                    <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800">
                        <CardTitle className="text-sm font-bold">{t('Daily Attendance History')}</CardTitle>
                        <CardDescription className="text-xs">{t('Your punch timings, hours worked, and break records.')}</CardDescription>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-2.5 px-4">{t('Date')}</th>
                                    <th className="py-2.5 px-3">{t('Status')}</th>
                                    <th className="py-2.5 px-3">{t('Clock In')}</th>
                                    <th className="py-2.5 px-3">{t('Clock Out')}</th>
                                    <th className="py-2.5 px-3">{t('Work Hours')}</th>
                                    <th className="py-2.5 px-3">{t('Active / Idle')}</th>
                                    <th className="py-2.5 px-3">{t('Focus %')}</th>
                                    <th className="py-2.5 px-3">{t('Breaks')}</th>
                                    <th className="py-2.5 px-4 text-right">{t('Action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {attendances.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-8 text-slate-400">
                                            {t('No attendance records logged for this month.')}
                                        </td>
                                    </tr>
                                ) : (
                                    attendances.map((att: any) => (
                                        <tr key={att.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                {att.date}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${att.status_color}`}>
                                                    {ucfirst(att.status)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                                                {att.formatted_clock_in || '--:--'}
                                                {att.is_late && (
                                                    <span className="block text-[10px] text-amber-600 font-bold">
                                                        +{att.late_minutes}m {t('Late')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                                                {att.formatted_clock_out || (att.clock_in ? t('In Progress') : '--:--')}
                                            </td>
                                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                                                {att.formatted_total_time}
                                            </td>
                                            <td className="py-3 px-3 text-slate-500">
                                                <span className="text-emerald-600 font-semibold">{att.formatted_active_time}</span> /{' '}
                                                <span className="text-amber-600">{att.formatted_idle_time}</span>
                                            </td>
                                            <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">
                                                {att.focus_percentage}%
                                            </td>
                                            <td className="py-3 px-3 text-slate-500">
                                                {att.breaks && att.breaks.length > 0 ? (
                                                    <span>{att.breaks.length} ({att.formatted_break_time})</span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSelectedRequestDate(att.date);
                                                        setRequestModalOpen(true);
                                                    }}
                                                    className="h-7 text-xs text-blue-600 hover:text-blue-700"
                                                >
                                                    {t('Regularize')}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* My Requests Section */}
                {requests.length > 0 && (
                    <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
                        <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800">
                            <CardTitle className="text-sm font-bold">{t('My Regularization Requests')}</CardTitle>
                        </CardHeader>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {requests.map((req: any) => (
                                <div key={req.id} className="p-3.5 flex items-center justify-between text-xs">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-white">{req.date}</span>
                                            <span className="text-slate-500 capitalize">({req.type.replace(/_/g, ' ')})</span>
                                        </div>
                                        <p className="text-slate-500 mt-0.5">{req.reason}</p>
                                    </div>
                                    <div>
                                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                            req.status === 'approved'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : req.status === 'rejected'
                                                ? 'bg-rose-100 text-rose-800'
                                                : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {ucfirst(req.status)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

            </div>

            {/* Request Modal */}
            <AttendanceRequestModal
                isOpen={requestModalOpen}
                onClose={() => setRequestModalOpen(false)}
                defaultDate={selectedRequestDate}
            />

            {/* Break Modal */}
            <BreakModal
                isOpen={breakModalOpen}
                onClose={() => setBreakModalOpen(false)}
                isOnBreak={isOnBreak}
                currentBreakReason={todayAttendance?.current_break_reason}
            />
        </PageTemplate>
    );
}

function ucfirst(str: string) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
