import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Bell,
    Clock,
    CheckCircle2,
    Calendar,
    Phone,
    FileText,
    ExternalLink,
    AlertCircle,
    ChevronRight,
    Plus,
    User,
    Check,
    MessageSquare,
    Sparkles,
    Flame,
    ArrowUpRight,
    Layers,
    Building2,
    TrendingUp,
} from 'lucide-react';
import { Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

interface FollowupItem {
    id: number | string;
    callId?: number;
    title: string;
    description?: string;
    type: 'task' | 'call' | 'meeting';
    typeName: string;
    typeIcon?: string;
    priority: string;
    priorityColor?: string;
    status: string;
    urgency: 'overdue' | 'today' | 'upcoming';
    urgencyLabel: string;
    isOverdue: boolean;
    isToday: boolean;
    dueDate?: string;
    dueTime?: string;
    parentModule: string;
    parentName: string;
    parentUrl: string;
    assignedTo: string;
    assignedAvatar?: string | null;
}

interface NoteItem {
    id: string;
    content: string;
    entityType: string;
    entityName: string;
    entityUrl: string;
    authorName: string;
    authorAvatar?: string | null;
    createdAt: string;
}

interface NotificationsPayload {
    summary: {
        totalFollowups: number;
        overdueCount: number;
        todayCount: number;
        upcomingCount: number;
        notesCount: number;
    };
    followups: FollowupItem[];
    notes: NoteItem[];
}

interface NotesFollowupNotificationCardProps {
    notifications?: NotificationsPayload;
}

export function NotesFollowupNotificationCard({ notifications }: NotesFollowupNotificationCardProps) {
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<'followups' | 'notes'>('followups');
    const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
    const [completingId, setCompletingId] = useState<number | string | null>(null);

    const summary = notifications?.summary || {
        totalFollowups: 0,
        overdueCount: 0,
        todayCount: 0,
        upcomingCount: 0,
        notesCount: 0,
    };

    const allFollowups = notifications?.followups || [];
    const allNotes = notifications?.notes || [];

    const filteredFollowups = allFollowups.filter((item) => {
        if (urgencyFilter === 'all') return true;
        return item.urgency === urgencyFilter;
    });

    const handleCompleteTask = (task: FollowupItem) => {
        if (task.type === 'call') {
            router.get(task.parentUrl);
            return;
        }

        setCompletingId(task.id);
        router.post(
            route('tasks.update-status', task.id),
            { status: 'completed' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCompletingId(null);
                    toast.success(t('Follow-up marked as completed!'));
                },
                onError: () => {
                    setCompletingId(null);
                    toast.error(t('Failed to update task status'));
                },
            }
        );
    };

    const getEntityIcon = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'lead': return <User className="w-3.5 h-3.5 text-blue-500" />;
            case 'account': return <Building2 className="w-3.5 h-3.5 text-purple-500" />;
            case 'opportunity': return <TrendingUp className="w-3.5 h-3.5 text-amber-500" />;
            default: return <Layers className="w-3.5 h-3.5 text-slate-500" />;
        }
    };

    return (
        <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden mb-5">
            {/* Header with Notification Stats */}
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50/70 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/40 shadow-xs shrink-0">
                            <Bell className="w-5 h-5" />
                            {(summary.overdueCount > 0 || summary.todayCount > 0) && (
                                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 border-2 border-white dark:border-slate-900"></span>
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                    {t('Follow-ups & Notes Notifications')}
                                </CardTitle>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                                    {t('Live CRM Feed')}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                {t('Real-time reminders for lead follow-ups, calls, overdue actions, and customer notes.')}
                            </p>
                        </div>
                    </div>

                    {/* Quick Counts Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {summary.overdueCount > 0 && (
                            <button
                                type="button"
                                onClick={() => { setActiveTab('followups'); setUrgencyFilter('overdue'); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/60 transition-colors cursor-pointer"
                            >
                                <Flame className="w-3.5 h-3.5 text-rose-500" />
                                <span>{summary.overdueCount} {t('Overdue')}</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => { setActiveTab('followups'); setUrgencyFilter('today'); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/60 transition-colors cursor-pointer"
                        >
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>{summary.todayCount} {t('Due Today')}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { setActiveTab('notes'); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200/70 dark:border-purple-900/60 transition-colors cursor-pointer"
                        >
                            <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                            <span>{summary.notesCount} {t('Notes')}</span>
                        </button>
                    </div>
                </div>

                {/* Tab Switcher & Filters Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl w-fit">
                        <button
                            type="button"
                            onClick={() => setActiveTab('followups')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeTab === 'followups'
                                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            {t('Follow-up Reminders')}
                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                {summary.totalFollowups}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('notes')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                activeTab === 'notes'
                                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            {t('Recent Notes & Updates')}
                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                                {summary.notesCount}
                            </span>
                        </button>
                    </div>

                    {/* Followup Filter Pills */}
                    {activeTab === 'followups' ? (
                        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                            {[
                                { key: 'all', label: t('All') },
                                { key: 'overdue', label: t('Overdue') },
                                { key: 'today', label: t('Today') },
                                { key: 'upcoming', label: t('Upcoming') },
                            ].map((f) => (
                                <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => setUrgencyFilter(f.key as any)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                                        urgencyFilter === f.key
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                            : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}

                            <Link
                                href={route('tasks.index')}
                                className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                            >
                                {t('View All')}
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    ) : (
                        <Link
                            href={route('notes.index')}
                            className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:underline"
                        >
                            {t('Open Notes Hub')}
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* ── 1. FOLLOW-UPS TAB CONTENT ── */}
                {activeTab === 'followups' && (
                    <div>
                        {filteredFollowups.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredFollowups.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                    >
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            {/* Type Icon */}
                                            <div
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                                    item.isOverdue
                                                        ? 'bg-rose-50 text-rose-600 border-rose-200/70 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40'
                                                        : item.isToday
                                                        ? 'bg-amber-50 text-amber-600 border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40'
                                                        : 'bg-blue-50 text-blue-600 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40'
                                                }`}
                                            >
                                                {item.type === 'call' ? (
                                                    <Phone className="w-4 h-4" />
                                                ) : (
                                                    <Clock className="w-4 h-4" />
                                                )}
                                            </div>

                                            {/* Main Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Link
                                                        href={item.parentUrl}
                                                        className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    >
                                                        {item.title}
                                                    </Link>

                                                    {/* Urgency Badge */}
                                                    <span
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                            item.isOverdue
                                                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200'
                                                                : item.isToday
                                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200'
                                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        {item.urgencyLabel}
                                                    </span>

                                                    {/* Priority Badge */}
                                                    <span
                                                        className="text-[10px] font-semibold px-1.5 py-0.2 rounded border"
                                                        style={{
                                                            color: item.priorityColor || '#3b82f6',
                                                            borderColor: `${item.priorityColor || '#3b82f6'}40`,
                                                            backgroundColor: `${item.priorityColor || '#3b82f6'}10`,
                                                        }}
                                                    >
                                                        {item.priority}
                                                    </span>
                                                </div>

                                                {/* Parent Entity and Rep Info */}
                                                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                                                    <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                                        {getEntityIcon(item.parentModule)}
                                                        <Link href={item.parentUrl} className="hover:underline truncate max-w-[220px]">
                                                            {item.parentName}
                                                        </Link>
                                                    </span>

                                                    <span className="text-slate-300 dark:text-slate-700">·</span>

                                                    <span>{t('Assigned')}: <strong className="text-slate-700 dark:text-slate-200">{item.assignedTo}</strong></span>

                                                    {item.dueTime && (
                                                        <>
                                                            <span className="text-slate-300 dark:text-slate-700">·</span>
                                                            <span className="font-mono">{item.dueTime}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={completingId === item.id}
                                                            onClick={() => handleCompleteTask(item)}
                                                            className="h-8 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 gap-1.5"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            {completingId === item.id ? t('Completing...') : t('Done')}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p>{t('Mark follow-up as completed')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                                            onClick={() => router.get(item.parentUrl)}
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p>{t('Open record')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 px-4 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    {urgencyFilter === 'overdue' ? t('No Overdue Follow-ups!') : t('All Caught Up on Follow-ups!')}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                    {t('Great job! No pending reminders require immediate action under this filter.')}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 2. RECENT NOTES TAB CONTENT ── */}
                {activeTab === 'notes' && (
                    <div>
                        {allNotes.length > 0 ? (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {allNotes.map((note) => (
                                    <div
                                        key={note.id}
                                        className="p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4"
                                    >
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            {/* Note Icon */}
                                            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200/70 dark:border-purple-900/40">
                                                <MessageSquare className="w-4 h-4" />
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                                        {note.authorName}
                                                    </span>

                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        {note.entityType}
                                                    </span>

                                                    <Link
                                                        href={note.entityUrl}
                                                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[200px]"
                                                    >
                                                        {note.entityName}
                                                    </Link>

                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                                                        {note.createdAt}
                                                    </span>
                                                </div>

                                                {/* Content */}
                                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed bg-slate-50/60 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/40 dark:border-slate-700/40">
                                                    "{note.content}"
                                                </p>
                                            </div>
                                        </div>

                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0"
                                                        onClick={() => router.get(note.entityUrl)}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    <p>{t('View full discussion')}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 px-4 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('No Recent Notes')}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                    {t('Notes added across leads, deals, and accounts will automatically appear here.')}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
