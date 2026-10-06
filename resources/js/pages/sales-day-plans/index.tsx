import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { 
    Plus, Eye, Edit, Trash2, MoreHorizontal, Send, CheckCircle2, 
    Calendar, User, Users, Phone, MessageSquare, TrendingUp, 
    Search, RefreshCw, LayoutGrid, AlignJustify, Award, AlertCircle,
    CalendarCheck, Clock, MailCheck, MessageCircleQuestion, CheckCheck, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { hasPermission } from '@/utils/authorization';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { formatCurrency, getCurrencySymbol } from '@/utils/helper';

interface SalesDayPlanItem {
    id: number;
    plan_date: string;
    user_id: number;
    title: string | null;
    target_calls: number;
    target_meetings: number;
    target_leads: number;
    target_sales_amount: number | string;
    planned_activities: string | null;
    planned_accounts: string | null;
    actual_calls: number;
    actual_meetings: number;
    actual_leads: number;
    actual_sales_amount: number | string;
    achievements_summary: string | null;
    challenges_notes: string | null;
    next_day_plan: string | null;
    status: 'draft' | 'submitted' | 'in_progress' | 'completed' | 'reviewed';
    report_sent_at: string | null;
    report_sent_to: string | null;
    manager_feedback: string | null;
    reviewed_at: string | null;
    completion_rate: number;
    calls_completion_rate: number;
    meetings_completion_rate: number;
    sales_completion_rate: number;
    user?: {
        id: number;
        name: string;
        email: string;
        avatar?: string;
    };
    reviewer?: {
        id: number;
        name: string;
    };
}

const statusConfig: Record<string, { label: string; className: string; bg: string }> = {
    draft:       { label: 'Draft',       className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300', bg: 'bg-slate-500' },
    in_progress: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400', bg: 'bg-amber-500' },
    submitted:   { label: 'Submitted',   className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400', bg: 'bg-blue-500' },
    completed:   { label: 'Completed',   className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400', bg: 'bg-emerald-500' },
    reviewed:    { label: 'Reviewed',    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400', bg: 'bg-purple-500' },
};

function UserAvatar({ name, src }: { name: string; src?: string }) {
    const [hasError, setHasError] = useState(false);
    if (src && !hasError) {
        return <img src={src} alt={name} onError={() => setHasError(true)} className="h-7 w-7 rounded-full object-cover border border-border" />;
    }
    return (
        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center border border-primary/20 uppercase">
            {name ? name.charAt(0) : 'U'}
        </div>
    );
}

export default function SalesDayPlansIndex() {
    const { t } = useTranslation();
    const { auth, dayPlans, stats = {}, teamUsers = [], canViewAll = false, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedPeriod, setSelectedPeriod] = useState(pageFilters.period || 'today');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedUser, setSelectedUser] = useState(pageFilters.user_id || pageFilters.assigned_to || 'all');
    const [customDate, setCustomDate] = useState(pageFilters.date || '');

    // Action modals
    const [deleteItem, setDeleteItem] = useState<SalesDayPlanItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const [sendEmailItem, setSendEmailItem] = useState<SalesDayPlanItem | null>(null);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const [reviewItem, setReviewItem] = useState<SalesDayPlanItem | null>(null);
    const [managerFeedback, setManagerFeedback] = useState('');
    const [reviewStatus, setReviewStatus] = useState('reviewed');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const isViewingMyData = canViewAll && (selectedUser === String(auth?.user?.id));

    const handleToggleMyData = () => {
        const newUser = isViewingMyData ? 'all' : String(auth?.user?.id);
        setSelectedUser(newUser);
        router.get(route('sales-day-plans.index'), {
            period: selectedPeriod,
            date: customDate || undefined,
            user_id: newUser !== 'all' ? newUser : undefined,
            assigned_to: newUser !== 'all' ? newUser : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            search: searchTerm || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const applyFilters = (overrides: Record<string, any> = {}) => {
        const params = {
            period: selectedPeriod,
            date: customDate || undefined,
            user_id: selectedUser !== 'all' ? selectedUser : undefined,
            assigned_to: selectedUser !== 'all' ? selectedUser : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            search: searchTerm || undefined,
            ...overrides,
        };
        router.get(route('sales-day-plans.index'), params, { preserveState: true, preserveScroll: true });
    };

    const handlePeriodChange = (period: string) => {
        setSelectedPeriod(period);
        if (period !== 'custom') {
            setCustomDate('');
            applyFilters({ period, date: undefined, page: 1 });
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ search: searchTerm, page: 1 });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedPeriod('today');
        setSelectedStatus('all');
        setSelectedUser('all');
        setCustomDate('');
        router.get(route('sales-day-plans.index'), { period: 'today' }, { preserveState: true });
    };

    const handleSendReport = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sendEmailItem) return;
        setIsSendingEmail(true);
        router.post(route('sales-day-plans.send-report', sendEmailItem.id), {
            recipient_email: recipientEmail || undefined,
        }, {
            onSuccess: () => {
                setSendEmailItem(null);
                setRecipientEmail('');
                setIsSendingEmail(false);
                toast.success(t('Daily Sales Report email sent successfully!'));
            },
            onError: () => {
                setIsSendingEmail(false);
                toast.error(t('Failed to send email. Please check configuration.'));
            }
        });
    };

    const handleReviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewItem) return;
        setIsSubmittingReview(true);
        router.post(route('sales-day-plans.review', reviewItem.id), {
            manager_feedback: managerFeedback,
            status: reviewStatus,
        }, {
            onSuccess: () => {
                setReviewItem(null);
                setManagerFeedback('');
                setIsSubmittingReview(false);
                toast.success(t('Manager feedback recorded successfully.'));
            },
            onError: () => {
                setIsSubmittingReview(false);
                toast.error(t('Failed to record review.'));
            }
        });
    };

    const handleDeleteConfirm = () => {
        if (!deleteItem) return;
        router.delete(route('sales-day-plans.destroy', deleteItem.id), {
            onSuccess: () => {
                setIsDeleteOpen(false);
                setDeleteItem(null);
                toast.success(t('Day Plan deleted successfully.'));
            },
            onError: () => {
                toast.error(t('Failed to delete Day Plan.'));
            }
        });
    };

    const isCompanyOrAdmin = ['company', 'admin', 'superadmin'].includes((auth?.user?.type || '').toLowerCase());
    const canCreate = hasPermission(permissions, 'create-sales-day-plans');
    const canEdit = hasPermission(permissions, 'edit-sales-day-plans');
    const canDelete = isCompanyOrAdmin || hasPermission(permissions, 'delete-sales-day-plans');
    const canSendReport = hasPermission(permissions, 'send-sales-day-plans');
    const canApprove = isCompanyOrAdmin || hasPermission(permissions, 'approve-sales-day-plans') || hasPermission(permissions, 'review-sales-day-plans');
    const canReview = isCompanyOrAdmin || hasPermission(permissions, 'review-sales-day-plans') || hasPermission(permissions, 'approve-sales-day-plans');
    const canAllocate = isCompanyOrAdmin || hasPermission(permissions, 'allocate-targets') || hasPermission(permissions, 'create-targets');
    const canViewTargets = isCompanyOrAdmin || hasPermission(permissions, 'view-targets') || hasPermission(permissions, 'manage-targets');

    const pageActions: any[] = [];

    if (canViewTargets) {
        pageActions.push({
            label: t('Target Overview'),
            icon: <Target className="h-4 w-4 text-primary" />,
            variant: 'outline' as const,
            onClick: () => router.get(route('targets.index')),
            tooltip: t('View B2B Target Management Overview'),
        });
    }

    if (canAllocate) {
        pageActions.push({
            label: t('Allocate Target'),
            icon: <Plus className="h-4 w-4 text-emerald-600" />,
            variant: 'outline' as const,
            onClick: () => router.get(route('targets.create')),
            tooltip: t('Assign new targets to sales team'),
        });
    }

    if (canViewAll) {
        pageActions.push({
            label: isViewingMyData ? t('All Day Plans') : t('My Day Plans'),
            icon: isViewingMyData ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />,
            variant: 'outline' as const,
            onClick: handleToggleMyData,
            tooltip: isViewingMyData ? t('Switch to All Team Plans') : t('Switch to My Day Plans'),
        });
    }

    if (canCreate) {
        pageActions.push({
            label: t('New Day Plan'),
            icon: <Plus className="h-4 w-4" />,
            variant: 'default' as const,
            onClick: () => router.get(route('sales-day-plans.create')),
        });
    }

    return (
        <PageTemplate
            title={t('Sales Day Plans & Daily Reports')}
            description={t('Plan daily sales targets, record end-of-day achievements, and dispatch executive daily reports.')}
            url={route('sales-day-plans.index')}
            actions={pageActions}
        >
            <div className="space-y-5">
                {/* ── KPI Summary Cards ───────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <Card className="border-l-4 border-l-blue-500 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Total Day Plans')}</p>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold">{stats.total_plans || 0}</span>
                                    <span className="text-xs text-muted-foreground font-medium">({stats.submitted_plans || 0} {t('Submitted')})</span>
                                </div>
                            </div>
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400">
                                <CalendarCheck className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Calls (Act / Tgt)')}</p>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.total_actual_calls || 0}</span>
                                    <span className="text-xs text-muted-foreground">/ {stats.total_target_calls || 0}</span>
                                </div>
                            </div>
                            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                                <Phone className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-purple-500 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Meetings (Act / Tgt)')}</p>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.total_actual_meetings || 0}</span>
                                    <span className="text-xs text-muted-foreground">/ {stats.total_target_meetings || 0}</span>
                                </div>
                            </div>
                            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600 dark:text-purple-400">
                                <Users className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-amber-500 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Sales Closed / Tgt')}</p>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.total_actual_sales || 0)}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">Target: {formatCurrency(stats.total_target_sales || 0)}</p>
                            </div>
                            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-indigo-500 shadow-sm transition-all hover:shadow-md">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Avg Achievement')}</p>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.average_completion_rate || 0}%</span>
                                </div>
                            </div>
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Award className="h-5 w-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Filters & Controls Bar ─────────────────────────────── */}
                <Card className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            {/* Date Presets */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { key: 'today', label: t('Today') },
                                    { key: 'yesterday', label: t('Yesterday') },
                                    { key: 'this_week', label: t('This Week') },
                                    { key: 'this_month', label: t('This Month') },
                                    { key: 'custom', label: t('Custom Date') },
                                ].map((p) => (
                                    <Button
                                        key={p.key}
                                        type="button"
                                        size="sm"
                                        variant={selectedPeriod === p.key ? 'default' : 'outline'}
                                        className="h-8 text-xs font-medium"
                                        onClick={() => handlePeriodChange(p.key)}
                                    >
                                        {p.label}
                                    </Button>
                                ))}

                                {selectedPeriod === 'custom' && (
                                    <div className="flex items-center gap-2 ml-1">
                                        <Input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => {
                                                setCustomDate(e.target.value);
                                                applyFilters({ period: 'custom', date: e.target.value, page: 1 });
                                            }}
                                            className="h-8 w-40 text-xs"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* View Switcher & Action Controls */}
                            <div className="flex items-center gap-2">
                                <div className="border rounded-lg p-0.5 flex bg-muted/30">
                                    <Button
                                        type="button"
                                        variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="h-7 px-2"
                                        onClick={() => setViewMode('table')}
                                    >
                                        <AlignJustify className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="h-7 px-2"
                                        onClick={() => setViewMode('grid')}
                                    >
                                        <LayoutGrid className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={handleResetFilters}
                                >
                                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                    {t('Reset')}
                                </Button>
                            </div>
                        </div>

                        {/* Search, Status & Team Filter row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t">
                            {/* Search */}
                            <form onSubmit={handleSearchSubmit} className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder={t('Search plan, achievements, user...')}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 h-9 text-xs"
                                />
                            </form>

                            {/* Status Filter */}
                            <Select
                                value={selectedStatus}
                                onValueChange={(val) => {
                                    setSelectedStatus(val);
                                    applyFilters({ status: val, page: 1 });
                                }}
                            >
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder={t('Filter Status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                    <SelectItem value="draft">{t('Draft')}</SelectItem>
                                    <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                    <SelectItem value="submitted">{t('Submitted')}</SelectItem>
                                    <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    <SelectItem value="reviewed">{t('Reviewed')}</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Team Member Filter */}
                            {canViewAll && (
                                <Select
                                    value={selectedUser}
                                    onValueChange={(val) => {
                                        setSelectedUser(val);
                                        applyFilters({ user_id: val, assigned_to: val, page: 1 });
                                    }}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder={t('Filter Sales Rep')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Sales Representatives')}</SelectItem>
                                        {teamUsers.map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>
                                                {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Quick Submit button if typing search */}
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-9 text-xs font-medium"
                                onClick={() => applyFilters({ search: searchTerm, page: 1 })}
                            >
                                <Search className="h-3.5 w-3.5 mr-1" />
                                {t('Apply Search')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Main Data View ──────────────────────────────────────── */}
                {dayPlans?.data?.length === 0 ? (
                    <Card className="p-12 text-center shadow-sm">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                            <div className="p-4 bg-muted/60 rounded-full text-muted-foreground">
                                <CalendarCheck className="h-10 w-10 stroke-1" />
                            </div>
                            <h3 className="text-lg font-semibold">{t('No Sales Day Plans Found')}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('Start each morning by defining daily calls, meetings, and revenue targets. Complete your EOD summary before leaving.')}
                            </p>
                            {canCreate && (
                                <Button
                                    type="button"
                                    onClick={() => router.get(route('sales-day-plans.create'))}
                                    className="mt-2"
                                >
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    {t('Create First Day Plan')}
                                </Button>
                            )}
                        </div>
                    </Card>
                ) : viewMode === 'table' ? (
                    /* Table View */
                    <Card className="shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-muted/40 text-muted-foreground border-b uppercase text-[11px] font-semibold tracking-wider">
                                    <tr>
                                        <th className="py-3 px-4">{t('Plan Date')}</th>
                                        <th className="py-3 px-4">{t('Sales Rep')}</th>
                                        <th className="py-3 px-4">{t('Goal / Title')}</th>
                                        <th className="py-3 px-4">{t('Calls (Act/Tgt)')}</th>
                                        <th className="py-3 px-4">{t('Meetings (Act/Tgt)')}</th>
                                        <th className="py-3 px-4">{t('Sales')} ({getCurrencySymbol()})</th>
                                        <th className="py-3 px-4">{t('Achievement')}</th>
                                        <th className="py-3 px-4">{t('Status')}</th>
                                        <th className="py-3 px-4">{t('Report Sent')}</th>
                                        <th className="py-3 px-4 text-right">{t('Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {dayPlans.data.map((plan: SalesDayPlanItem) => {
                                        const badge = statusConfig[plan.status] || statusConfig.draft;
                                        const isOwner = Number(plan.user_id) === Number(auth?.user?.id);
                                        const canEditThisPlan = canEdit || isOwner;
                                        const canSendThisReport = canSendReport || isOwner;
                                        const canReviewThisPlan = canReview && (canViewAll || isCompanyOrAdmin || !isOwner);
                                        const canDeleteThisPlan = canDelete && (canViewAll || isOwner);
                                        return (
                                            <tr
                                                key={plan.id}
                                                className="hover:bg-muted/20 transition-colors cursor-pointer"
                                                onClick={(e) => {
                                                    const target = e.target as HTMLElement;
                                                    if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-radix-collection-item]')) {
                                                        return;
                                                    }
                                                    const selection = window.getSelection();
                                                    if (selection && selection.toString().trim().length > 0) {
                                                        return;
                                                    }
                                                    router.get(route('sales-day-plans.show', plan.id));
                                                }}
                                            >
                                                <td className="py-3 px-4 font-semibold whitespace-nowrap">
                                                    <Link
                                                        href={route('sales-day-plans.show', plan.id)}
                                                        className="hover:text-primary hover:underline flex items-center gap-1.5"
                                                    >
                                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {plan.plan_date}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <UserAvatar name={plan.user?.name || 'User'} src={plan.user?.avatar} />
                                                        <div>
                                                            <div className="font-medium">{plan.user?.name || 'Unknown'}</div>
                                                            <div className="text-[10px] text-muted-foreground">{plan.user?.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 max-w-[200px] truncate font-medium">
                                                    {plan.title || (
                                                        <span className="text-muted-foreground italic">{t('Daily Routine Sales Plan')}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-emerald-600">{plan.actual_calls}</span>
                                                        <span className="text-muted-foreground">/ {plan.target_calls}</span>
                                                    </div>
                                                    <div className="w-16 bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div
                                                            className="bg-emerald-500 h-full rounded-full"
                                                            style={{ width: `${Math.min(100, plan.calls_completion_rate)}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-purple-600">{plan.actual_meetings}</span>
                                                        <span className="text-muted-foreground">/ {plan.target_meetings}</span>
                                                    </div>
                                                    <div className="w-16 bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div
                                                            className="bg-purple-500 h-full rounded-full"
                                                            style={{ width: `${Math.min(100, plan.meetings_completion_rate)}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="font-semibold text-amber-600">
                                                        {formatCurrency(plan.actual_sales_amount)}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Tgt: {formatCurrency(plan.target_sales_amount)}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold">{plan.completion_rate}%</span>
                                                    </div>
                                                    <div className="w-16 bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                plan.completion_rate >= 80
                                                                    ? 'bg-emerald-500'
                                                                    : plan.completion_rate >= 50
                                                                    ? 'bg-blue-500'
                                                                    : 'bg-amber-500'
                                                            }`}
                                                            style={{ width: `${Math.min(100, plan.completion_rate)}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    {plan.report_sent_at ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                                                            <MailCheck className="h-3.5 w-3.5" />
                                                            {t('Sent')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-[11px] italic">
                                                            {t('Pending')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => router.get(route('sales-day-plans.show', plan.id))}>
                                                                <Eye className="h-4 w-4 mr-2 text-blue-600" />
                                                                {t('View Full Report')}
                                                            </DropdownMenuItem>
                                                            {canEditThisPlan && (
                                                                <DropdownMenuItem onClick={() => router.get(route('sales-day-plans.edit', plan.id))}>
                                                                    <Edit className="h-4 w-4 mr-2 text-amber-600" />
                                                                    {t('Edit / Update EOD')}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canSendThisReport && (
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setSendEmailItem(plan);
                                                                        setRecipientEmail('');
                                                                    }}
                                                                >
                                                                    <Send className="h-4 w-4 mr-2 text-emerald-600" />
                                                                    {t('Send Daily Email Report')}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canReviewThisPlan && (
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        setReviewItem(plan);
                                                                        setManagerFeedback(plan.manager_feedback || '');
                                                                        setReviewStatus(plan.status === 'reviewed' ? 'reviewed' : 'completed');
                                                                    }}
                                                                >
                                                                    <CheckCheck className="h-4 w-4 mr-2 text-purple-600" />
                                                                    {t('Manager Review & Feedback')}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canDeleteThisPlan && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setDeleteItem(plan);
                                                                            setIsDeleteOpen(true);
                                                                        }}
                                                                        className="text-red-600 focus:text-red-600"
                                                                    >
                                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                                        {t('Delete Plan')}
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    /* Grid View */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dayPlans.data.map((plan: SalesDayPlanItem) => {
                            const badge = statusConfig[plan.status] || statusConfig.draft;
                            const isOwner = plan.user_id === auth?.user?.id;
                            const canEditThisPlan = canEdit || isOwner;
                            return (
                                <Card
                                    key={plan.id}
                                    className="shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                                    onClick={(e) => {
                                        const target = e.target as HTMLElement;
                                        if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-radix-collection-item]')) {
                                            return;
                                        }
                                        const selection = window.getSelection();
                                        if (selection && selection.toString().trim().length > 0) {
                                            return;
                                        }
                                        router.get(route('sales-day-plans.show', plan.id));
                                    }}
                                >
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {plan.plan_date}
                                                </div>
                                                <h4 className="font-semibold text-sm mt-1 hover:text-primary">
                                                    <Link href={route('sales-day-plans.show', plan.id)}>
                                                        {plan.title || t('Sales Day Plan')}
                                                    </Link>
                                                </h4>
                                            </div>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        </div>

                                        {/* Sales rep row */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <UserAvatar name={plan.user?.name || 'User'} src={plan.user?.avatar} />
                                            <div className="text-xs">
                                                <span className="font-medium">{plan.user?.name}</span>
                                            </div>
                                        </div>

                                        {/* Metric Bars */}
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                                            <div className="bg-muted/40 p-2 rounded-lg">
                                                <div className="text-muted-foreground text-[10px] uppercase font-semibold">{t('Calls')}</div>
                                                <div className="font-bold text-emerald-600 mt-0.5">
                                                    {plan.actual_calls} <span className="text-muted-foreground font-normal">/ {plan.target_calls}</span>
                                                </div>
                                            </div>
                                            <div className="bg-muted/40 p-2 rounded-lg">
                                                <div className="text-muted-foreground text-[10px] uppercase font-semibold">{t('Meetings')}</div>
                                                <div className="font-bold text-purple-600 mt-0.5">
                                                    {plan.actual_meetings} <span className="text-muted-foreground font-normal">/ {plan.target_meetings}</span>
                                                </div>
                                            </div>
                                            <div className="bg-muted/40 p-2 rounded-lg col-span-2">
                                                <div className="text-muted-foreground text-[10px] uppercase font-semibold">{t('Sales Closed')}</div>
                                                <div className="font-bold text-amber-600 mt-0.5">
                                                    {formatCurrency(plan.actual_sales_amount)} <span className="text-muted-foreground text-[11px] font-normal">(Tgt: {formatCurrency(plan.target_sales_amount)})</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Completion Bar */}
                                        <div className="space-y-1 pt-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">{t('Overall Achievement')}</span>
                                                <span className="font-bold">{plan.completion_rate}%</span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${
                                                        plan.completion_rate >= 80
                                                            ? 'bg-emerald-500'
                                                            : plan.completion_rate >= 50
                                                            ? 'bg-blue-500'
                                                            : 'bg-amber-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, plan.completion_rate)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Achievements Snippet */}
                                        {plan.achievements_summary && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border">
                                                {plan.achievements_summary}
                                            </p>
                                        )}

                                        {/* Card Footer Actions */}
                                        <div className="flex items-center justify-between pt-3 border-t">
                                            <div className="text-[11px] text-muted-foreground">
                                                {plan.report_sent_at ? (
                                                    <span className="text-emerald-600 flex items-center gap-1 font-medium">
                                                        <MailCheck className="h-3.5 w-3.5" />
                                                        {t('Emailed')}
                                                    </span>
                                                ) : (
                                                    <span>{t('Email Pending')}</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => router.get(route('sales-day-plans.show', plan.id))}
                                                >
                                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                                    {t('View')}
                                                </Button>
                                                {canEditThisPlan && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => router.get(route('sales-day-plans.edit', plan.id))}
                                                    >
                                                        <Edit className="h-3.5 w-3.5 mr-1" />
                                                        {t('Update')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {dayPlans?.links && <Pagination links={dayPlans.links} />}
            </div>

            {/* ── Dialog: Send Email Report ──────────────────────────────── */}
            <Dialog open={!!sendEmailItem} onOpenChange={(open) => !open && setSendEmailItem(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-emerald-600" />
                            {t('Send Daily Sales Report Email')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Dispatch an executive HTML daily report containing planned vs. actual performance, accomplishments, and roadblocks.')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSendReport} className="space-y-4 py-2">
                        <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                            <div><strong className="text-foreground">{t('Sales Rep')}:</strong> {sendEmailItem?.user?.name}</div>
                            <div><strong className="text-foreground">{t('Date')}:</strong> {sendEmailItem?.plan_date}</div>
                            <div><strong className="text-foreground">{t('Achievement')}:</strong> {sendEmailItem?.completion_rate}%</div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="recipientEmail" className="text-xs font-semibold">
                                {t('Recipient Email')} <span className="text-muted-foreground font-normal">({t('leave blank for company default')})</span>
                            </Label>
                            <Input
                                id="recipientEmail"
                                type="email"
                                placeholder={t('manager@example.com')}
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSendEmailItem(null)}
                                disabled={isSendingEmail}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSendingEmail}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Send className="h-4 w-4 mr-1.5" />
                                {isSendingEmail ? t('Sending...') : t('Send Report Now')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── Dialog: Manager Review & Feedback ──────────────────────── */}
            <Dialog open={!!reviewItem} onOpenChange={(open) => !open && setReviewItem(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCheck className="h-5 w-5 text-purple-600" />
                            {t('Manager Review & Feedback')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Review daily metrics and provide coaching feedback for')} {reviewItem?.user?.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleReviewSubmit} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="feedback" className="text-xs font-semibold">
                                {t('Manager Comments & Coaching Feedback')} *
                            </Label>
                            <Textarea
                                id="feedback"
                                rows={4}
                                required
                                placeholder={t('Great effort on qualifying accounts today. Let us focus on closing the pipeline deals tomorrow...')}
                                value={managerFeedback}
                                onChange={(e) => setManagerFeedback(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="reviewStatus" className="text-xs font-semibold">
                                {t('Update Plan Status')}
                            </Label>
                            <Select value={reviewStatus} onValueChange={setReviewStatus}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="reviewed">{t('Reviewed & Approved')}</SelectItem>
                                    <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    <SelectItem value="submitted">{t('Submitted (Needs further update)')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setReviewItem(null)}
                                disabled={isSubmittingReview}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmittingReview}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {isSubmittingReview ? t('Saving...') : t('Save Feedback')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteOpen}
                onClose={() => {
                    setIsDeleteOpen(false);
                    setDeleteItem(null);
                }}
                onConfirm={handleDeleteConfirm}
                itemName={deleteItem ? `${t('Day Plan for')} ${deleteItem.plan_date}` : t('Day Plan')}
                entityName={t('Day Plan')}
            />
        </PageTemplate>
    );
}
