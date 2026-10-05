import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import {
    Plus,
    CheckCircle2,
    Clock,
    AlertCircle,
    Calendar,
    CalendarDays,
    CalendarCheck,
    ListTodo,
    Search,
    Filter,
    X,
    Edit,
    Trash2,
    User,
    Building2,
    Phone,
    Mail,
    Users,
    Video,
    CheckSquare,
    MoreHorizontal,
    ArrowUpDown,
    Check,
    AlertTriangle,
    FileText
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { useInitials } from '@/hooks/use-initials';

interface Task {
    id: number;
    title: string;
    description?: string;
    lead_id: number;
    lead?: {
        id: number;
        name: string;
        email?: string;
        phone?: string;
        company?: string;
    };
    assigned_to?: number;
    assigned_user?: {
        id: number;
        name: string;
        email: string;
        avatar?: string;
    };
    creator?: {
        id: number;
        name: string;
    };
    type: 'task' | 'call' | 'meeting' | 'email' | 'followup' | 'demo';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    due_date: string;
    due_time?: string;
    completed_at?: string;
    created_at: string;
}

export default function LeadTasksIndex() {
    const { t } = useTranslation();
    const {
        tasks,
        stats = { all: 0, today: 0, overdue: 0, upcoming: 0, this_week: 0, completed: 0 },
        leads = [],
        users = [],
        isAdmin = false,
        filters = {},
        flash = {},
    } = usePage().props as any;

    const getInitials = useInitials();

    // Flash messages
    useEffect(() => {
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
    }, [flash]);

    // Local filters state
    const [activeTab, setActiveTab] = useState(filters.tab || 'all');
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [priorityFilter, setPriorityFilter] = useState(filters.priority || 'all');
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
    const [leadFilter, setLeadFilter] = useState(filters.lead_id || 'all');
    const [assigneeFilter, setAssigneeFilter] = useState(filters.assigned_to || 'all');

    // Modal state
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form inputs state
    const [formData, setFormData] = useState({
        title: '',
        lead_id: '',
        assigned_to: '',
        type: 'followup',
        priority: 'medium',
        status: 'pending',
        due_date: new Date().toISOString().split('T')[0],
        due_time: '10:00',
        description: '',
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Lead Management') },
        { title: t('Tasks & Follow-ups') },
    ];

    // Trigger URL query params change
    const applyFilters = (overrides: Record<string, any> = {}) => {
        const queryParams: Record<string, any> = {
            tab: overrides.tab !== undefined ? overrides.tab : (activeTab !== 'all' ? activeTab : undefined),
            search: overrides.search !== undefined ? (overrides.search || undefined) : (search || undefined),
            status: overrides.status !== undefined ? (overrides.status !== 'all' ? overrides.status : undefined) : (statusFilter !== 'all' ? statusFilter : undefined),
            priority: overrides.priority !== undefined ? (overrides.priority !== 'all' ? overrides.priority : undefined) : (priorityFilter !== 'all' ? priorityFilter : undefined),
            type: overrides.type !== undefined ? (overrides.type !== 'all' ? overrides.type : undefined) : (typeFilter !== 'all' ? typeFilter : undefined),
            lead_id: overrides.lead_id !== undefined ? (overrides.lead_id !== 'all' ? overrides.lead_id : undefined) : (leadFilter !== 'all' ? leadFilter : undefined),
            assigned_to: overrides.assigned_to !== undefined ? (overrides.assigned_to !== 'all' ? overrides.assigned_to : undefined) : (assigneeFilter !== 'all' ? assigneeFilter : undefined),
            page: 1,
        };

        router.get(route('lead-tasks.index'), queryParams, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        applyFilters({ tab: tab === 'all' ? undefined : tab });
    };

    const handleClearFilters = () => {
        setActiveTab('all');
        setSearch('');
        setStatusFilter('all');
        setPriorityFilter('all');
        setTypeFilter('all');
        setLeadFilter('all');
        setAssigneeFilter('all');
        router.get(route('lead-tasks.index'), {}, { preserveState: true, preserveScroll: true });
    };

    // Open Modal for Create
    const handleOpenCreate = () => {
        setEditingTask(null);
        setFormData({
            title: '',
            lead_id: leads[0]?.id ? String(leads[0].id) : '',
            assigned_to: users[0]?.id ? String(users[0].id) : '',
            type: 'followup',
            priority: 'medium',
            status: 'pending',
            due_date: new Date().toISOString().split('T')[0],
            due_time: '10:00',
            description: '',
        });
        setFormErrors({});
        setIsFormModalOpen(true);
    };

    // Open Modal for Edit
    const handleOpenEdit = (task: Task) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            lead_id: String(task.lead_id),
            assigned_to: task.assigned_to ? String(task.assigned_to) : '',
            type: task.type,
            priority: task.priority,
            status: task.status,
            due_date: task.due_date ? String(task.due_date).split('T')[0] : '',
            due_time: task.due_time ? task.due_time.substring(0, 5) : '',
            description: task.description || '',
        });
        setFormErrors({});
        setIsFormModalOpen(true);
    };

    // Form Submit
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};

        if (!formData.title.trim()) errors.title = t('Title is required');
        if (!formData.lead_id) errors.lead_id = t('Lead is required');
        if (!formData.due_date) errors.due_date = t('Due date is required');

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        if (editingTask) {
            router.put(route('lead-tasks.update', editingTask.id), formData, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    setSubmitting(false);
                },
                onError: (err: any) => {
                    setFormErrors(err);
                    setSubmitting(false);
                },
            });
        } else {
            router.post(route('lead-tasks.store'), formData, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    setSubmitting(false);
                },
                onError: (err: any) => {
                    setFormErrors(err);
                    setSubmitting(false);
                },
            });
        }
    };

    // Quick Status Toggle
    const handleToggleStatus = (task: Task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        router.post(route('lead-tasks.update-status', task.id), { status: newStatus }, {
            preserveScroll: true,
        });
    };

    // Delete Task
    const handleConfirmDelete = () => {
        if (!taskToDelete) return;
        router.delete(route('lead-tasks.destroy', taskToDelete.id), {
            onSuccess: () => setIsDeleteModalOpen(false),
            preserveScroll: true,
        });
    };

    // Helpers for badges and icons
    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'call':
                return { label: t('Call'), icon: Phone, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800' };
            case 'meeting':
                return { label: t('Meeting'), icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' };
            case 'email':
                return { label: t('Email'), icon: Mail, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' };
            case 'demo':
                return { label: t('Demo'), icon: Video, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' };
            case 'followup':
                return { label: t('Follow-up'), icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' };
            default:
                return { label: t('Task'), icon: CheckSquare, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' };
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800">{t('Urgent')}</span>;
            case 'high':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800">{t('High')}</span>;
            case 'medium':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">{t('Medium')}</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{t('Low')}</span>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><Check className="h-3 w-3" /> {t('Completed')}</span>;
            case 'in_progress':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">{t('In Progress')}</span>;
            case 'cancelled':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">{t('Cancelled')}</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">{t('Pending')}</span>;
        }
    };

    // Check if task is overdue
    const isOverdue = (dueDate: string, status: string) => {
        if (status === 'completed' || status === 'cancelled') return false;
        const today = new Date().toISOString().split('T')[0];
        return dueDate < today;
    };

    return (
        <PageTemplate
            title={t('Tasks & Follow-ups')}
            description={t('Track, organize, and execute your lead follow-up activities')}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Create Task'),
                    icon: <Plus className="h-4 w-4 mr-2" />,
                    variant: 'default',
                    onClick: handleOpenCreate,
                },
            ]}
            noPadding
        >
            <div className="space-y-6">

                {/* ── 1. KPI STATS DASHBOARD CARDS ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* All Tasks */}
                    <button
                        type="button"
                        onClick={() => handleTabChange('all')}
                        className={`text-left transition-all p-4 rounded-xl border ${
                            activeTab === 'all'
                                ? 'bg-indigo-50/80 border-indigo-400 shadow-sm dark:bg-indigo-950/40 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('All Tasks')}</span>
                            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                <ListTodo className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white font-mono">{stats.all}</p>
                    </button>

                    {/* Today */}
                    <button
                        type="button"
                        onClick={() => handleTabChange('today')}
                        className={`text-left transition-all p-4 rounded-xl border ${
                            activeTab === 'today'
                                ? 'bg-emerald-50/80 border-emerald-400 shadow-sm dark:bg-emerald-950/40 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Due Today')}</span>
                            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                <Clock className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{stats.today}</p>
                    </button>

                    {/* Overdue */}
                    <button
                        type="button"
                        onClick={() => handleTabChange('overdue')}
                        className={`text-left transition-all p-4 rounded-xl border ${
                            activeTab === 'overdue'
                                ? 'bg-red-50/80 border-red-400 shadow-sm dark:bg-red-950/40 dark:border-red-600 ring-2 ring-red-500/20'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Overdue')}</span>
                            <div className="p-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                <AlertCircle className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400 font-mono">{stats.overdue}</p>
                    </button>

                    {/* Upcoming */}
                    <button
                        type="button"
                        onClick={() => handleTabChange('upcoming')}
                        className={`text-left transition-all p-4 rounded-xl border ${
                            activeTab === 'upcoming'
                                ? 'bg-sky-50/80 border-sky-400 shadow-sm dark:bg-sky-950/40 dark:border-sky-600 ring-2 ring-sky-500/20'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Upcoming')}</span>
                            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                                <CalendarCheck className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400 font-mono">{stats.upcoming}</p>
                    </button>

                    {/* This Week */}
                    <button
                        type="button"
                        onClick={() => handleTabChange('this_week')}
                        className={`text-left transition-all p-4 rounded-xl border ${
                            activeTab === 'this_week'
                                ? 'bg-purple-50/80 border-purple-400 shadow-sm dark:bg-purple-950/40 dark:border-purple-600 ring-2 ring-purple-500/20'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('This Week')}</span>
                            <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                                <CalendarDays className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">{stats.this_week}</p>
                    </button>

                    {/* Completed */}
                    <button
                        type="button"
                        onClick={() => handleTabChange('completed')}
                        className={`text-left transition-all p-4 rounded-xl border ${
                            activeTab === 'completed'
                                ? 'bg-teal-50/80 border-teal-400 shadow-sm dark:bg-teal-950/40 dark:border-teal-600 ring-2 ring-teal-500/20'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm dark:bg-gray-800 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('Completed')}</span>
                            <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-teal-600 dark:text-teal-400 font-mono">{stats.completed}</p>
                    </button>
                </div>

                {/* ── 2. SEARCH & FILTER BAR ── */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-4">
                    <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder={t('Search by task title, description, or lead name...')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                                className="pl-9 bg-gray-50/50 dark:bg-gray-900/50"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => { setSearch(''); applyFilters({ search: '' }); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter Selects */}
                        <div className="flex flex-wrap gap-2 items-center">
                            {/* Type Filter */}
                            <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); applyFilters({ type: val }); }}>
                                <SelectTrigger className="w-[130px] h-9 text-xs">
                                    <SelectValue placeholder={t('Type')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Types')}</SelectItem>
                                    <SelectItem value="followup">{t('Follow-up')}</SelectItem>
                                    <SelectItem value="call">{t('Call')}</SelectItem>
                                    <SelectItem value="meeting">{t('Meeting')}</SelectItem>
                                    <SelectItem value="email">{t('Email')}</SelectItem>
                                    <SelectItem value="demo">{t('Demo')}</SelectItem>
                                    <SelectItem value="task">{t('Task')}</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Priority Filter */}
                            <Select value={priorityFilter} onValueChange={(val) => { setPriorityFilter(val); applyFilters({ priority: val }); }}>
                                <SelectTrigger className="w-[130px] h-9 text-xs">
                                    <SelectValue placeholder={t('Priority')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Priorities')}</SelectItem>
                                    <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                                    <SelectItem value="high">{t('High')}</SelectItem>
                                    <SelectItem value="medium">{t('Medium')}</SelectItem>
                                    <SelectItem value="low">{t('Low')}</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Status Filter */}
                            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); applyFilters({ status: val }); }}>
                                <SelectTrigger className="w-[130px] h-9 text-xs">
                                    <SelectValue placeholder={t('Status')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                                    <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                    <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Assignee Filter (Admin only) */}
                            {isAdmin && (
                                <Select value={assigneeFilter} onValueChange={(val) => { setAssigneeFilter(val); applyFilters({ assigned_to: val }); }}>
                                    <SelectTrigger className="w-[150px] h-9 text-xs">
                                        <SelectValue placeholder={t('Assigned To')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Team Members')}</SelectItem>
                                        {users.map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Reset Button */}
                            <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs text-gray-500 hover:text-gray-900">
                                {t('Reset')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── 3. TASKS TABLE ── */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/75 dark:border-gray-700 dark:bg-gray-700/50 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    <th className="py-3.5 pl-6 pr-3 w-10"></th>
                                    <th className="py-3.5 px-3">{t('Task & Activity')}</th>
                                    <th className="py-3.5 px-3">{t('Related Lead')}</th>
                                    <th className="py-3.5 px-3">{t('Due Date')}</th>
                                    <th className="py-3.5 px-3">{t('Priority')}</th>
                                    <th className="py-3.5 px-3">{t('Status')}</th>
                                    <th className="py-3.5 px-3">{t('Assigned To')}</th>
                                    <th className="py-3.5 pl-3 pr-6 text-right">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {tasks?.data?.length > 0 ? (
                                    tasks.data.map((task: Task) => {
                                        const typeConfig = getTypeConfig(task.type);
                                        const TypeIcon = typeConfig.icon;
                                        const overdue = isOverdue(task.due_date, task.status);

                                        return (
                                            <tr
                                                key={task.id}
                                                className={`hover:bg-gray-50/75 dark:hover:bg-gray-700/30 transition-colors ${
                                                    task.status === 'completed' ? 'opacity-70 bg-gray-50/30 dark:bg-gray-900/10' : ''
                                                }`}
                                            >
                                                {/* Complete checkbox */}
                                                <td className="py-4 pl-6 pr-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(task)}
                                                        className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                                                            task.status === 'completed'
                                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500 text-transparent'
                                                        }`}
                                                    >
                                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                                    </button>
                                                </td>

                                                {/* Task Title & Details */}
                                                <td className="py-4 px-3 min-w-[220px]">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className={`p-1.5 rounded-lg border flex-shrink-0 mt-0.5 ${typeConfig.color}`}>
                                                            <TypeIcon className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className={`font-medium text-gray-900 dark:text-white ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                                                {task.title}
                                                            </p>
                                                            {task.description && (
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                                                    {task.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Related Lead */}
                                                <td className="py-4 px-3 min-w-[180px]">
                                                    {task.lead ? (
                                                        <Link
                                                            href={route('leads.show', task.lead.id)}
                                                            className="group inline-flex items-center gap-2 hover:text-primary transition-colors"
                                                        >
                                                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                                                {getInitials(task.lead.name)}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900 dark:text-white group-hover:text-primary text-xs">
                                                                    {task.lead.name}
                                                                </p>
                                                                {task.lead.company && (
                                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                        {task.lead.company}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </Link>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Due Date & Time */}
                                                <td className="py-4 px-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className={`text-xs font-medium flex items-center gap-1.5 ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-900 dark:text-gray-200'}`}>
                                                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                            {task.due_date}
                                                            {overdue && (
                                                                <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-1.5 py-0.2 rounded font-bold">
                                                                    {t('Overdue')}
                                                                </span>
                                                            )}
                                                        </span>
                                                        {task.due_time && (
                                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 pl-5">
                                                                {task.due_time}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Priority */}
                                                <td className="py-4 px-3 whitespace-nowrap">
                                                    {getPriorityBadge(task.priority)}
                                                </td>

                                                {/* Status */}
                                                <td className="py-4 px-3 whitespace-nowrap">
                                                    {getStatusBadge(task.status)}
                                                </td>

                                                {/* Assigned To */}
                                                <td className="py-4 px-3 whitespace-nowrap">
                                                    {task.assigned_user ? (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                {task.assigned_user.avatar && <AvatarImage src={task.assigned_user.avatar} />}
                                                                <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                                                                    {getInitials(task.assigned_user.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                                                                {task.assigned_user.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                                                        onClick={() => handleOpenEdit(task)}
                                                                    >
                                                                        <Edit className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{t('Edit Task')}</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                                        onClick={() => { setTaskToDelete(task); setIsDeleteModalOpen(true); }}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{t('Delete Task')}</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center">
                                            <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 mb-4">
                                                    <CheckCircle2 className="h-7 w-7" />
                                                </div>
                                                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                                                    {t('No tasks found')}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                                                    {t('All caught up! You do not have any pending tasks or follow-ups for this filter.')}
                                                </p>
                                                <Button type="button" onClick={handleOpenCreate} size="sm">
                                                    <Plus className="h-4 w-4 mr-1.5" />
                                                    {t('Create Task')}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {tasks?.links && tasks.links.length > 3 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                {t('Showing')} {tasks.from || 1} {t('to')} {tasks.to || tasks.total} {t('of')} {tasks.total} {t('tasks')}
                            </span>
                            <div className="flex gap-1">
                                {tasks.links.map((link: any, idx: number) => (
                                    <Button
                                        key={idx}
                                        type="button"
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                        className="h-8 px-3 text-xs"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── 4. CREATE / EDIT TASK MODAL ── */}
                <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingTask ? t('Edit Task / Follow-up') : t('Schedule Lead Task / Follow-up')}
                            </DialogTitle>
                            <DialogDescription>
                                {t('Set up a scheduled call, meeting, demo, or task for this lead.')}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                            {/* Task Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="title" required>
                                    {t('Task Title')}
                                </Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={t('e.g. Call client for contract review')}
                                    className={formErrors.title ? 'border-red-500' : ''}
                                />
                                {formErrors.title && <p className="text-xs text-red-500">{formErrors.title}</p>}
                            </div>

                            {/* Related Lead */}
                            <div className="space-y-1.5">
                                <Label htmlFor="lead_id" required>
                                    {t('Related Lead')}
                                </Label>
                                <Select value={formData.lead_id} onValueChange={(val) => setFormData({ ...formData, lead_id: val })}>
                                    <SelectTrigger className={formErrors.lead_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select lead')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {leads.map((l: any) => (
                                            <SelectItem key={l.id} value={String(l.id)}>
                                                {l.name} {l.company ? `(${l.company})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formErrors.lead_id && <p className="text-xs text-red-500">{formErrors.lead_id}</p>}
                            </div>

                            {/* Type & Priority */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="type" required>
                                        {t('Activity Type')}
                                    </Label>
                                    <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="followup">{t('Follow-up')}</SelectItem>
                                            <SelectItem value="call">{t('Phone Call')}</SelectItem>
                                            <SelectItem value="meeting">{t('Meeting')}</SelectItem>
                                            <SelectItem value="email">{t('Email')}</SelectItem>
                                            <SelectItem value="demo">{t('Product Demo')}</SelectItem>
                                            <SelectItem value="task">{t('Task / Todo')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="priority" required>
                                        {t('Priority')}
                                    </Label>
                                    <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">{t('Low')}</SelectItem>
                                            <SelectItem value="medium">{t('Medium')}</SelectItem>
                                            <SelectItem value="high">{t('High')}</SelectItem>
                                            <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Due Date & Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="due_date" required>
                                        {t('Due Date')}
                                    </Label>
                                    <Input
                                        id="due_date"
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className={formErrors.due_date ? 'border-red-500' : ''}
                                    />
                                    {formErrors.due_date && <p className="text-xs text-red-500">{formErrors.due_date}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="due_time">
                                        {t('Time (Optional)')}
                                    </Label>
                                    <Input
                                        id="due_time"
                                        type="time"
                                        value={formData.due_time}
                                        onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Assigned To & Status */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="assigned_to">
                                        {t('Assign To')}
                                    </Label>
                                    <Select value={formData.assigned_to} onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={t('Assignee')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            {users.map((u: any) => (
                                                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="status">
                                        {t('Status')}
                                    </Label>
                                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">{t('Pending')}</SelectItem>
                                            <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                            <SelectItem value="completed">{t('Completed')}</SelectItem>
                                            <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="description">
                                    {t('Notes / Agenda')}
                                </Label>
                                <Textarea
                                    id="description"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('Add key discussion points, agenda, or background details...')}
                                />
                            </div>

                            <DialogFooter className="pt-3">
                                <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? t('Saving...') : (editingTask ? t('Update Task') : t('Create Task'))}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ── 5. DELETE MODAL ── */}
                <CrudDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    itemName={taskToDelete?.title || ''}
                    entityName={t('Task')}
                />
            </div>
        </PageTemplate>
    );
}
