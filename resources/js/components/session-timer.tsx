import React, { useState, useEffect } from 'react';
import { usePage, router, Link } from '@inertiajs/react';
import { useActivityTracker } from '@/contexts/ActivityTrackerContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
    Timer,
    Activity,
    Moon,
    Clock,
    ArrowUpRight,
    Zap,
    LogOut,
    CheckCircle2,
    Coffee,
    Calendar,
    RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

export function SessionTimer() {
    const { t } = useTranslation();
    const page = usePage();
    const auth = (page.props as any)?.auth;
    const userAttendance = auth?.attendance;

    const {
        isActive,
        formattedSessionTime,
        formattedActiveTime,
        formattedIdleTime,
        activePercentage,
        firstLoginAt,
    } = useActivityTracker();

    const [isPunching, setIsPunching] = useState<boolean>(false);

    // Determine check-in state (from shared attendance prop or local fallback)
    const isCheckedIn = Boolean(userAttendance?.isCheckedIn);
    const isOnBreak = Boolean(userAttendance?.isOnBreak);
    const rawClockIn = userAttendance?.rawClockIn;

    // Live seconds calculator synced with clock_in timestamp
    const [liveSeconds, setLiveSeconds] = useState<number>(() => {
        if (rawClockIn && isCheckedIn) {
            return Math.max(0, Math.floor((Date.now() - new Date(rawClockIn).getTime()) / 1000));
        }
        return userAttendance?.activeSeconds || 0;
    });

    useEffect(() => {
        if (rawClockIn && isCheckedIn) {
            const diff = Math.max(0, Math.floor((Date.now() - new Date(rawClockIn).getTime()) / 1000));
            setLiveSeconds(diff);
        } else if (userAttendance?.activeSeconds !== undefined) {
            setLiveSeconds(userAttendance.activeSeconds);
        }
    }, [isCheckedIn, userAttendance?.activeSeconds, rawClockIn]);

    useEffect(() => {
        if (!isCheckedIn || isOnBreak) return;

        const interval = setInterval(() => {
            setLiveSeconds((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isCheckedIn, isOnBreak]);

    const formatLiveStopwatch = (totalSec: number) => {
        const sec = Math.max(0, totalSec);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    };

    const handleCheckIn = () => {
        setIsPunching(true);
        toast.loading(t('Checking in...'));
        router.post(
            route('attendance.check-in'),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.dismiss();
                    toast.success(t('Checked in successfully!'));
                },
                onError: () => {
                    toast.dismiss();
                    toast.error(t('Failed to check in.'));
                },
                onFinish: () => setIsPunching(false),
            }
        );
    };

    const handleCheckOut = () => {
        setIsPunching(true);
        toast.loading(t('Checking out...'));
        router.post(
            route('attendance.check-out'),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.dismiss();
                    toast.success(t('Checked out successfully!'));
                },
                onError: () => {
                    toast.dismiss();
                    toast.error(t('Failed to check out.'));
                },
                onFinish: () => setIsPunching(false),
            }
        );
    };

    const handleToggleBreak = () => {
        setIsPunching(true);
        toast.loading(isOnBreak ? t('Resuming work...') : t('Starting break...'));
        router.post(
            route('attendance.break.toggle'),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.dismiss();
                    toast.success(isOnBreak ? t('Work resumed!') : t('Break started!'));
                },
                onError: () => {
                    toast.dismiss();
                    toast.error(t('Failed to update break status.'));
                },
                onFinish: () => setIsPunching(false),
            }
        );
    };

    const displayClockIn = userAttendance?.formattedClockIn || firstLoginAt || '--:--';
    const displayFocusPercent = userAttendance?.focusPercentage || activePercentage || (isCheckedIn ? 85 : 0);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 select-none ${
                        isOnBreak
                            ? 'bg-amber-50/90 border-amber-300 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300'
                            : isCheckedIn
                            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-100/90 border-slate-300 text-slate-700 hover:bg-slate-200 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300'
                    }`}
                >
                    <span className="relative flex h-2 w-2">
                        <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                isOnBreak ? 'bg-amber-400' : isCheckedIn ? 'bg-emerald-400' : 'bg-slate-400'
                            }`}
                        />
                        <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                                isOnBreak ? 'bg-amber-500' : isCheckedIn ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                        />
                    </span>

                    <Timer className="h-3.5 w-3.5 opacity-75 shrink-0" />
                    <span className="font-mono font-bold tracking-tight text-[13px]">
                        {isCheckedIn ? formatLiveStopwatch(liveSeconds) : t('Check In')}
                    </span>

                    <span className="hidden sm:inline-block text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-white/80 dark:bg-black/40 border border-black/5 dark:border-white/5">
                        {isOnBreak ? t('Break') : isCheckedIn ? t('Active') : t('Offline')}
                    </span>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-84 p-4 shadow-xl border-border/80 bg-popover text-popover-foreground z-50 rounded-xl"
            >
                <div className="space-y-3.5">
                    {/* Header with Live Status */}
                    <div className="flex items-center justify-between border-b pb-2.5">
                        <div className="flex items-center gap-1.5">
                            <Activity className="h-4 w-4 text-primary" />
                            <span className="font-bold text-sm">{t("Attendance & Performance")}</span>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                isOnBreak
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : isCheckedIn
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    isOnBreak ? 'bg-amber-500' : isCheckedIn ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                            />
                            {isOnBreak ? t('On Break') : isCheckedIn ? t('Clocked In') : t('Offline')}
                        </span>
                    </div>

                    {/* Quick Punch / Check In / Check Out Action Buttons */}
                    <div className="space-y-2">
                        {!isCheckedIn ? (
                            <Button
                                type="button"
                                disabled={isPunching}
                                onClick={handleCheckIn}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 shadow-sm cursor-pointer flex items-center justify-center gap-2"
                            >
                                {isPunching ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span>{t('Check In (Start Day)')}</span>
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isPunching}
                                    onClick={handleToggleBreak}
                                    className={`flex-1 text-xs font-semibold cursor-pointer border ${
                                        isOnBreak
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/30'
                                            : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/30'
                                    }`}
                                >
                                    <Coffee className="h-3.5 w-3.5 mr-1" />
                                    <span>{isOnBreak ? t('Resume Work') : t('Take Break')}</span>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={isPunching}
                                    onClick={handleCheckOut}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                                >
                                    {isPunching ? (
                                        <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    ) : (
                                        <LogOut className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    <span>{t('Check Out')}</span>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Productivity Ratio Progress */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-muted-foreground">{t('Productivity / Focus')}</span>
                            <span className="font-bold text-primary">{displayFocusPercent}%</span>
                        </div>
                        <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                            <div
                                className="bg-emerald-500 transition-all duration-500"
                                style={{ width: `${displayFocusPercent}%` }}
                            />
                            <div
                                className="bg-amber-400 transition-all duration-500"
                                style={{ width: `${100 - displayFocusPercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] mb-0.5">
                                <Zap className="h-3 w-3" />
                                {t('Active Work')}
                            </div>
                            <div className="font-mono font-bold text-sm text-foreground">
                                {isCheckedIn ? formatLiveStopwatch(liveSeconds) : formattedActiveTime}
                            </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                            <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-[11px] mb-0.5">
                                <Moon className="h-3 w-3" />
                                {t('Idle / Break')}
                            </div>
                            <div className="font-mono font-bold text-sm text-foreground">
                                {formattedIdleTime || '00m 00s'}
                            </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t">
                        <div className="flex justify-between">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t('Clock In')}:
                            </span>
                            <span className="font-medium text-foreground">{displayClockIn}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{t('Total Session')}:</span>
                            <span className="font-mono font-medium text-foreground">
                                {userAttendance?.formattedTotal || formattedSessionTime}
                            </span>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                            href={typeof route !== 'undefined' ? route('attendance.index') : '/attendance'}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-semibold rounded-md border border-border/80 bg-background hover:bg-accent transition-all text-foreground"
                        >
                            <Calendar className="h-3 w-3" />
                            <span>{t('Timesheet')}</span>
                        </Link>
                        <Link
                            href={typeof route !== 'undefined' ? route('user-performance.index') : '/user-performance'}
                            className="flex items-center justify-center gap-1 py-1.5 px-2 text-[11px] font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                        >
                            <span>{t('Performance')}</span>
                            <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
