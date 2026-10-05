import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { PageTemplate } from '@/components/page-template';
import { Pagination } from '@/components/ui/pagination';
import { useTranslation } from 'react-i18next';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import {
    Timer,
    Zap,
    Moon,
    Users,
    CheckCircle2,
    TrendingUp,
    Download,
    RefreshCw,
    Calendar,
    Activity,
    Clock,
    PhoneCall,
    Award,
    Shield,
    Flame,
    Eye,
    Search,
    AlertCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserItem {
    id: number;
    name: string;
    email: string;
    avatar: string;
    type: string;
}

interface LiveStaffItem {
    id: number;
    name: string;
    email: string;
    avatar: string;
    role: string;
    status: 'active' | 'idle' | 'offline';
    current_page: string;
    last_activity_human: string;
    is_checked_in?: boolean;
    is_on_break?: boolean;
    clock_in_time?: string | null;
    total_seconds: number;
    active_seconds: number;
    idle_seconds: number;
    formatted_total: string;
    formatted_active: string;
    formatted_idle: string;
    active_percentage: number;
}

interface SummaryData {
    total_seconds: number;
    active_seconds: number;
    idle_seconds: number;
    formatted_total: string;
    formatted_active: string;
    formatted_idle: string;
    active_ratio: number;
    online_staff_count: number;
    active_staff_count: number;
    idle_staff_count: number;
    offline_staff_count: number;
    total_tasks: number;
    completed_tasks: number;
    task_completion_rate: number;
    total_leads: number;
    converted_leads: number;
    total_opportunities: number;
    won_opportunities: number;
    won_revenue: number;
    meetings_count: number;
    calls_count: number;
}

interface TrendItem {
    date: string;
    label: string;
    active_hours: number;
    idle_hours: number;
    total_hours: number;
    active_percentage: number;
}

interface LeaderboardItem {
    id: number;
    name: string;
    email: string;
    avatar: string;
    role: string;
    active_seconds: number;
    idle_seconds: number;
    total_seconds: number;
    formatted_active: string;
    active_percentage: number;
    completed_tasks: number;
    converted_leads: number;
    won_opportunities?: number;
    productivity_score: number;
}

interface TimeLogItem {
    id: number;
    user_id: number;
    date: string;
    first_login_at: string | null;
    last_activity_at: string | null;
    total_seconds: number;
    active_seconds: number;
    idle_seconds: number;
    formatted_total_time: string;
    formatted_active_time: string;
    formatted_idle_time: string;
    active_percentage: number;
    status: string;
    last_active_url: string | null;
    ip_address: string | null;
    user?: UserItem;
}

interface PageProps {
    isAdmin: boolean;
    teamUsers: UserItem[];
    selectedUserId?: string | number | null;
    period: string;
    startDate: string;
    endDate: string;
    liveStaff: LiveStaffItem[];
    summary: SummaryData;
    trendData: TrendItem[];
    leaderboard: LeaderboardItem[];
    timeLogs: {
        data: TimeLogItem[];
        links: any[];
        current_page: number;
        last_page: number;
        from?: number;
        to?: number;
        total: number;
    };
}

export default function UserPerformanceDashboard() {
    const { t } = useTranslation();
    const {
        isAdmin,
        teamUsers,
        selectedUserId,
        period,
        startDate,
        endDate,
        liveStaff,
        summary,
        trendData,
        leaderboard,
        timeLogs,
    } = usePage().props as unknown as PageProps;

    const [selectedPeriod, setSelectedPeriod] = useState(period || 'today');
    const [selectedUser, setSelectedUser] = useState(selectedUserId ? String(selectedUserId) : 'all');
    const [customStart, setCustomStart] = useState(startDate);
    const [customEnd, setCustomEnd] = useState(endDate);
    const [searchTableQuery, setSearchTableQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'idle' | 'offline'>('all');

    // Auto-poll live presence & summary every 8 seconds for responsive real-time monitor
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['liveStaff', 'summary'], preserveScroll: true, preserveState: true });
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const handleFilterApply = (newPeriod?: string, newUser?: string) => {
        const periodVal = newPeriod ?? selectedPeriod;
        const userVal = newUser ?? selectedUser;

        router.get(
            route('user-performance.index'),
            {
                period: periodVal,
                user_id: userVal === 'all' ? '' : userVal,
                start_date: periodVal === 'custom' ? customStart : undefined,
                end_date: periodVal === 'custom' ? customEnd : undefined,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleExport = () => {
        const url = new URL(route('user-performance.export'), window.location.origin);
        url.searchParams.set('period', selectedPeriod);
        if (selectedUser !== 'all') url.searchParams.set('user_id', selectedUser);
        if (selectedPeriod === 'custom') {
            url.searchParams.set('start_date', customStart);
            url.searchParams.set('end_date', customEnd);
        }
        window.location.href = url.toString();
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('User Performance') },
    ];

    const filteredLiveStaff = liveStaff.filter(s => {
        if (statusFilter === 'all') return true;
        return s.status === statusFilter;
    });

    const filteredTimeLogs = timeLogs.data.filter(log => {
        if (!searchTableQuery) return true;
        const q = searchTableQuery.toLowerCase();
        return (
            log.user?.name.toLowerCase().includes(q) ||
            log.user?.email.toLowerCase().includes(q) ||
            log.status.toLowerCase().includes(q) ||
            (log.last_active_url && log.last_active_url.toLowerCase().includes(q))
        );
    });

    const pageProps = usePage().props as any;
    const auth = pageProps?.auth;
    const isMyCheckedIn = Boolean(auth?.attendance?.isCheckedIn);

    return (
        <PageTemplate
            title={t('User Performance & Activity Dashboard')}
            description={t('Real-time tracking of staff timing, active vs idle states, and team CRM productivity.')}
            url="/user-performance"
            breadcrumbs={breadcrumbs}
        >
            <div className="space-y-6">
                {/* Check In Requirement Notification Banner */}
                {!isMyCheckedIn && (
                    <div className="p-3.5 rounded-xl border border-amber-300/80 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
                            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>
                                <strong>{t('You are currently Not Checked In.')}</strong>{' '}
                                {t('Active working time tracking will only operate and accumulate on your performance card when you check in.')}
                            </span>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => router.post(route('attendance.check-in'), {}, { preserveScroll: true })}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            {t('Check In Now')}
                        </Button>
                    </div>
                )}

                {/* 1. Filter Bar */}
                <Card className="border-border/60 shadow-sm bg-card/70 backdrop-blur">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Period Filter */}
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <Select
                                        value={selectedPeriod}
                                        onValueChange={(val) => {
                                            setSelectedPeriod(val);
                                            handleFilterApply(val, undefined);
                                        }}
                                    >
                                        <SelectTrigger className="w-36 h-9">
                                            <SelectValue placeholder={t('Select Period')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="today">{t('Today')}</SelectItem>
                                            <SelectItem value="yesterday">{t('Yesterday')}</SelectItem>
                                            <SelectItem value="this_week">{t('This Week')}</SelectItem>
                                            <SelectItem value="last_7_days">{t('Last 7 Days')}</SelectItem>
                                            <SelectItem value="this_month">{t('This Month')}</SelectItem>
                                            <SelectItem value="last_month">{t('Last Month')}</SelectItem>
                                            <SelectItem value="custom">{t('Custom Range')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedPeriod === 'custom' && (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="w-36 h-9"
                                        />
                                        <span className="text-muted-foreground text-xs">{t('to')}</span>
                                        <Input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="w-36 h-9"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => handleFilterApply('custom', undefined)}
                                        >
                                            {t('Apply')}
                                        </Button>
                                    </div>
                                )}

                                {/* User Selector Filter (if Admin) */}
                                {isAdmin && (
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <Select
                                            value={selectedUser}
                                            onValueChange={(val) => {
                                                setSelectedUser(val);
                                                handleFilterApply(undefined, val);
                                            }}
                                        >
                                            <SelectTrigger className="w-48 h-9">
                                                <SelectValue placeholder={t('All Staff Members')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Team Members')}</SelectItem>
                                                {teamUsers.map((u) => (
                                                    <SelectItem key={u.id} value={String(u.id)}>
                                                        {u.name}
                                                    </SelectItem>
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
                                    onClick={() => handleFilterApply()}
                                    className="gap-1.5 h-9"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>{t('Refresh')}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleExport}
                                    className="gap-1.5 h-9"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>{t('Export CSV')}</span>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Top Summary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Total Working Hours */}
                    <Card className="border-border/60 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t('Total Working Time')}
                            </CardTitle>
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                                <Timer className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-mono tracking-tight">
                                {summary.formatted_total}
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                <span>{t('Active Ratio')}:</span>
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                                    {summary.active_ratio}% {t('Efficiency')}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Active vs Idle Time */}
                    <Card className="border-border/60 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t('Active vs Idle Time')}
                            </CardTitle>
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                                <Zap className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                    {summary.formatted_active}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    / {summary.formatted_idle} {t('idle')}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex mt-3">
                                <div
                                    className="bg-emerald-500"
                                    style={{ width: `${summary.active_ratio}%` }}
                                    title={`Active: ${summary.active_ratio}%`}
                                />
                                <div
                                    className="bg-amber-400"
                                    style={{ width: `${100 - summary.active_ratio}%` }}
                                    title={`Idle: ${100 - summary.active_ratio}%`}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Live Staff Presence */}
                    <Card className="border-border/60 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t('Live Team Presence')}
                            </CardTitle>
                            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                                <Activity className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                <span className="text-emerald-600 dark:text-emerald-400">
                                    {summary.active_staff_count} {t('Active')}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                    {summary.idle_staff_count} {t('Idle')}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                                    {summary.offline_staff_count} {t('Offline')}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 4: CRM Velocity */}
                    <Card className="border-border/60 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t('Tasks & Leads Converted')}
                            </CardTitle>
                            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {summary.completed_tasks} / {summary.total_tasks}{' '}
                                <span className="text-xs font-normal text-muted-foreground">{t('Tasks')}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                <span>{summary.converted_leads} {t('Leads Converted')}</span>
                                <Badge variant="outline" className="text-[10px]">
                                    {summary.won_opportunities} {t('Deals Won')}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Real-Time Staff Activity & Presence Monitor */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Users className="h-4 w-4 text-primary" />
                                    {t('Real-Time Staff Activity Monitor')}
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    {t('Live active/idle state detection based on mouse movement, clicks, and page interactions.')}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg text-xs">
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'all' ? 'default' : 'ghost'}
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setStatusFilter('all')}
                                >
                                    {t('All')} ({liveStaff.length})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'active' ? 'default' : 'ghost'}
                                    className="h-7 text-xs px-2.5 text-emerald-600"
                                    onClick={() => setStatusFilter('active')}
                                >
                                    🟢 {t('Active')} ({summary.active_staff_count})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'idle' ? 'default' : 'ghost'}
                                    className="h-7 text-xs px-2.5 text-amber-600"
                                    onClick={() => setStatusFilter('idle')}
                                >
                                    🟡 {t('Idle')} ({summary.idle_staff_count})
                                </Button>
                                <Button
                                    size="sm"
                                    variant={statusFilter === 'offline' ? 'default' : 'ghost'}
                                    className="h-7 text-xs px-2.5 text-gray-500"
                                    onClick={() => setStatusFilter('offline')}
                                >
                                    ⚪ {t('Offline')} ({summary.offline_staff_count})
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {filteredLiveStaff.map((staff) => (
                                <div
                                    key={staff.id}
                                    className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all hover:shadow-md space-y-3"
                                >
                                    {/* User Info & Live Status Badge */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="relative">
                                                <Avatar className="h-10 w-10 border">
                                                    <AvatarImage src={staff.avatar} alt={staff.name} />
                                                    <AvatarFallback>{staff.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span
                                                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                                                        staff.status === 'active'
                                                            ? 'bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse'
                                                            : staff.status === 'idle'
                                                            ? 'bg-amber-500 ring-2 ring-amber-500/20'
                                                            : 'bg-gray-400'
                                                    }`}
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-semibold text-sm truncate">{staff.name}</div>
                                                <div className="text-[11px] text-muted-foreground truncate">{staff.email}</div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <Badge
                                                variant="outline"
                                                className={`text-[10px] font-bold uppercase tracking-wider ${
                                                    staff.status === 'active'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                                        : staff.status === 'idle'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                                                        : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-neutral-900 dark:text-gray-400'
                                                }`}
                                            >
                                                {staff.status === 'active'
                                                    ? t('Active')
                                                    : staff.status === 'idle'
                                                    ? t('Away / Idle')
                                                    : t('Offline')}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                {staff.is_checked_in
                                                    ? (staff.clock_in_time ? `In: ${staff.clock_in_time}` : t('Checked In'))
                                                    : t('Not Checked In')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Current Screen & Last Seen */}
                                    <div className="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 text-xs space-y-1">
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Eye className="h-3 w-3 opacity-70" />
                                                {t('Current Page')}:
                                            </span>
                                            <span className="font-mono font-medium text-foreground truncate max-w-[140px]">
                                                {staff.current_page}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3 opacity-70" />
                                                {t('Last Activity')}:
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {staff.last_activity_human}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Today's Active vs Idle Breakdown */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">{t('Today')}</span>
                                            <span className="font-mono font-semibold">
                                                <span className="text-emerald-600">{staff.formatted_active}</span> / {staff.formatted_total}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                                            <div
                                                className="bg-emerald-500"
                                                style={{ width: `${staff.active_percentage}%` }}
                                            />
                                            <div
                                                className="bg-amber-400"
                                                style={{ width: `${100 - staff.active_percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Analytics & Leaderboard Tabs */}
                <Tabs defaultValue="trend" className="space-y-4">
                    <TabsList className="bg-neutral-100 dark:bg-neutral-800 p-1">
                        <TabsTrigger value="trend" className="gap-1.5">
                            <TrendingUp className="h-4 w-4" />
                            <span>{t('Working Hours Trend')}</span>
                        </TabsTrigger>
                        <TabsTrigger value="leaderboard" className="gap-1.5">
                            <Award className="h-4 w-4" />
                            <span>{t('Productivity Leaderboard')}</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Trend Chart */}
                    <TabsContent value="trend">
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{t('Active vs. Idle Hours Overview')}</CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Visual breakdown of total active working time versus idle time across days.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-72 w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                                            <XAxis dataKey="label" stroke="#888888" fontSize={12} tickLine={false} />
                                            <YAxis
                                                stroke="#888888"
                                                fontSize={12}
                                                tickLine={false}
                                                unit="h"
                                            />
                                            <RechartsTooltip
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(0,0,0,0.1)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                }}
                                            />
                                            <Legend />
                                            <Bar dataKey="active_hours" name={t('Active Hours')} fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" />
                                            <Bar dataKey="idle_hours" name={t('Idle Hours')} fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 2: Leaderboard */}
                    <TabsContent value="leaderboard">
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Flame className="h-4 w-4 text-orange-500" />
                                    {t('Top Performing Staff Members')}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Ranked by active working hours, completed tasks, and converted leads.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-border/60">
                                    {leaderboard.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className="p-4 flex items-center justify-between gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-3.5">
                                                <span className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                                                    index === 0
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                                        : index === 1
                                                        ? 'bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-900 dark:text-slate-300'
                                                        : index === 2
                                                        ? 'bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950 dark:text-orange-300'
                                                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                                }`}>
                                                    #{index + 1}
                                                </span>

                                                <Avatar className="h-9 w-9 border">
                                                    <AvatarImage src={item.avatar} alt={item.name} />
                                                    <AvatarFallback>{item.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>

                                                <div>
                                                    <div className="font-semibold text-sm">{item.name}</div>
                                                    <div className="text-xs text-muted-foreground">{item.email}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden sm:block">
                                                    <div className="text-xs text-muted-foreground">{t('Active Time')}</div>
                                                    <div className="font-mono font-bold text-sm text-emerald-600">
                                                        {item.formatted_active}
                                                    </div>
                                                </div>

                                                <div className="text-right hidden sm:block">
                                                    <div className="text-xs text-muted-foreground">{t('Tasks Done')}</div>
                                                    <div className="font-bold text-sm text-foreground">
                                                        {item.completed_tasks}
                                                    </div>
                                                </div>

                                                <div className="text-right hidden md:block">
                                                    <div className="text-xs text-muted-foreground">{t('Leads Won')}</div>
                                                    <div className="font-bold text-sm text-foreground">
                                                        {item.converted_leads}
                                                    </div>
                                                </div>

                                                {item.won_opportunities !== undefined && item.won_opportunities > 0 && (
                                                    <div className="text-right hidden lg:block">
                                                        <div className="text-xs text-muted-foreground">{t('Deals Won')}</div>
                                                        <div className="font-bold text-sm text-emerald-600">
                                                            {item.won_opportunities}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="text-right min-w-[70px]">
                                                    <div className="text-xs text-muted-foreground">{t('Score')}</div>
                                                    <Badge className="bg-primary text-primary-foreground font-bold text-xs">
                                                        {item.productivity_score} pts
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* 5. Detailed Time Logs & Session History */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base">{t('Daily Activity & Time Logs')}</CardTitle>
                                <CardDescription className="text-xs">
                                    {t('Detailed session logs with login timestamp, active duration, and idle tracking.')}
                                </CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('Search logs...')}
                                    value={searchTableQuery}
                                    onChange={(e) => setSearchTableQuery(e.target.value)}
                                    className="pl-8 h-9 text-xs"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-neutral-50 dark:bg-neutral-900/60 border-b text-muted-foreground uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="py-3 px-4">{t('User')}</th>
                                        <th className="py-3 px-4">{t('Date')}</th>
                                        <th className="py-3 px-4">{t('First Login')}</th>
                                        <th className="py-3 px-4">{t('Active Time')}</th>
                                        <th className="py-3 px-4">{t('Idle Time')}</th>
                                        <th className="py-3 px-4">{t('Total Time')}</th>
                                        <th className="py-3 px-4">{t('Efficiency')}</th>
                                        <th className="py-3 px-4">{t('Status')}</th>
                                        <th className="py-3 px-4">{t('Last URL')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {filteredTimeLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-8 text-muted-foreground">
                                                {t('No activity time logs found for the selected filter.')}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredTimeLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-7 w-7 border">
                                                            <AvatarImage src={log.user?.avatar} alt={log.user?.name} />
                                                            <AvatarFallback>{log.user?.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-semibold">{log.user?.name || 'Unknown User'}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 font-mono">{log.date}</td>
                                                <td className="py-3 px-4 text-muted-foreground">
                                                    {log.first_login_at
                                                        ? new Date(log.first_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                        : '--:--'}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                                                    {log.formatted_active_time}
                                                </td>
                                                <td className="py-3 px-4 font-mono text-amber-600">
                                                    {log.formatted_idle_time}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-bold text-foreground">
                                                    {log.formatted_total_time}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold">{log.active_percentage}%</span>
                                                        <div className="w-12 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500"
                                                                style={{ width: `${log.active_percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] ${
                                                            log.status === 'active'
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}
                                                    >
                                                        {log.status}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-muted-foreground truncate max-w-[160px]" title={log.last_active_url || ''}>
                                                    {log.last_active_url || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {timeLogs && timeLogs.total > 0 && (
                            <Pagination
                                from={timeLogs.from || ((timeLogs.current_page - 1) * 15 + 1)}
                                to={timeLogs.to || Math.min(timeLogs.current_page * 15, timeLogs.total)}
                                total={timeLogs.total}
                                links={timeLogs.links || []}
                                currentPage={timeLogs.current_page}
                                lastPage={timeLogs.last_page}
                                currentPerPage="15"
                                hidePerPage={true}
                                onPageChange={(url) => {
                                    if (url) {
                                        router.get(url, {}, { preserveState: true, preserveScroll: true });
                                    }
                                }}
                                onPerPageChange={() => {}}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageTemplate>
    );
}
