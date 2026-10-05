import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Moon, Zap, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AttendanceWidgetProps {
    focusPercentage?: number;
    atWorkFormatted?: string;
    idleFormatted?: string;
    clockInTime?: string;
    clockOutTime?: string;
    timelineSegments?: Array<{
        time: string;
        status: 'active' | 'idle' | 'meeting' | 'break';
        color: string;
        label: string;
    }>;
    isCheckedIn?: boolean;
    onToggleCheckInOut?: () => void;
    themeColor?: 'blue' | 'emerald' | 'amber';
}

export function AttendanceTimeWidget({
    focusPercentage = 0,
    atWorkFormatted = '00h 00m',
    idleFormatted = '00h 00m',
    clockInTime = '--:--',
    clockOutTime = '--:--',
    timelineSegments = [],
    isCheckedIn = false,
    themeColor = 'blue',
}: AttendanceWidgetProps) {
    const { t } = useTranslation();

    // SVG Radial progress calculations
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (focusPercentage / 100) * circumference;

    const ringColor =
        themeColor === 'emerald'
            ? '#10b981'
            : themeColor === 'amber'
            ? '#f59e0b'
            : '#3b82f6';

    const segments = timelineSegments;

    return (
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-xs backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    
                    {/* Left: Focus Circle Gauge */}
                    <div className="md:col-span-3 flex items-center gap-3.5 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
                        <div className="relative flex items-center justify-center shrink-0">
                            <svg className="w-20 h-20 transform -rotate-90">
                                <circle
                                    cx="40"
                                    cy="40"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    fill="transparent"
                                    className="text-slate-100 dark:text-slate-800"
                                />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r={radius}
                                    stroke={ringColor}
                                    strokeWidth="6"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    fill="transparent"
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center text-center">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                    {focusPercentage}%
                                </span>
                                <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
                                    {t('Focused')}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-xs text-slate-500 dark:text-slate-400">{t('At Work')}</span>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 ml-auto">
                                    {atWorkFormatted}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                <span className="text-xs text-slate-500 dark:text-slate-400">{t('Idle')}</span>
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 ml-auto">
                                    {idleFormatted}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Clock In & Clock Out */}
                    <div className="md:col-span-3 flex items-center justify-around border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                                <Clock className="w-3 h-3 text-emerald-500" />
                                {t('Clock In')}
                            </div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                                {clockInTime}
                            </div>
                        </div>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                                <Moon className="w-3 h-3 text-slate-400" />
                                {t('Clock Out')}
                            </div>
                            <div className="text-sm font-bold text-slate-600 dark:text-slate-400 font-mono">
                                {clockOutTime}
                            </div>
                        </div>
                    </div>

                    {/* Right: Interactive 9 AM - 7 PM Timeline Bar */}
                    <div className="md:col-span-6 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1 font-mono">
                            <span>9 AM</span>
                            <span>11 AM</span>
                            <span>1 PM</span>
                            <span>3 PM</span>
                            <span>5 PM</span>
                            <span>7 PM</span>
                        </div>

                        {/* Multi-segment Timeline Strip */}
                        {segments && segments.length > 0 ? (
                            <div className="h-6 w-full rounded-md bg-slate-100 dark:bg-slate-800 p-0.5 flex gap-1 items-center overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
                                {segments.map((seg, idx) => (
                                    <div
                                        key={idx}
                                        className="h-full rounded-xs transition-colors cursor-pointer group relative"
                                        style={{ width: `${100 / segments.length}%`, backgroundColor: seg.color || '#10b981' }}
                                        title={seg.label}
                                    >
                                        <span className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 text-[9px] bg-slate-900 text-white rounded whitespace-nowrap pointer-events-none transition-opacity z-10 shadow-sm">
                                            {seg.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : isCheckedIn ? (
                            <div className="h-6 w-full rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-1 flex items-center justify-between px-3 border border-emerald-200/60 dark:border-emerald-800/60">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                        {t('Active Session')} • {t('Clocked in at')} {clockInTime}
                                    </span>
                                </div>
                                <span className="text-[11px] font-mono font-medium text-emerald-800 dark:text-emerald-200">
                                    {atWorkFormatted}
                                </span>
                            </div>
                        ) : (
                            <div className="h-6 w-full rounded-md bg-slate-100 dark:bg-slate-800/60 p-1 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60">
                                <span className="text-[11px] font-medium text-slate-400">
                                    {clockInTime !== '--:--' && clockOutTime !== '--:--'
                                        ? `${t('Completed Shift')}: ${clockInTime} - ${clockOutTime} (${atWorkFormatted})`
                                        : t('No attendance activity recorded for today')}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {t('Working Focus')}
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                {t('Idle / Break')}
                            </span>
                            <span className="text-slate-400">
                                {t('Live timeline synced')}
                            </span>
                        </div>
                    </div>

                </div>
            </CardContent>
        </Card>
    );
}
