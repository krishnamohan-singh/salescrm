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
    FileText,
    TrendingUp,
    Briefcase,
    Settings,
    Tag,
    Layers
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
    parent_type?: 'lead' | 'account' | 'contact' | 'opportunity' | 'none';
    parent_id?: number;
    parent_name?: string;
    lead_id?: number;
    lead?: { id: number; name: string; company?: string; email?: string; phone?: string };
    account_id?: number;
    account?: { id: number; name: string; email?: string; phone?: string };
    contact_id?: number;
    contact?: { id: number; name: string; email?: string; phone?: string };
    opportunity_id?: number;
    opportunity?: { id: number; name: string; amount?: number };
    assigned_to?: number;
    assigned_user?: { id: number; name: string; email: string; avatar?: string };
    creator?: { id: number; name: string };
    task_status_id?: number;
    task_status?: { id: number; name: string; color: string };
    task_type_id?: number;
    task_type?: { id: number; name: string; icon?: string; color: string };
    task_priority_id?: number;
    task_priority?: { id: number; name: string; color: string; level?: number };
    type: string;
    priority: string;
    status: string;
    due_date: string;
    due_time?: string;
    completed_at?: string;
    created_at: string;
}

export default function UniversalTasksIndex() {
    const { t } = useTranslation();
    const {
        auth,
        tasks,
        stats = { all: 0, today: 0, overdue: 0, upcoming: 0, this_week: 0, completed: 0 },
        leads = [],
        accounts = [],
        contacts = [],
        opportunities = [],
        users = [],
        taskStatuses = [],
        taskTypes = [],
        taskPriorities = [],
        isAdmin = false,
        canViewAll = false,
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
    const [entityType, setEntityType] = useState(filters.entity_type || 'all');
    const [activeTab, setActiveTab] = useState(filters.tab || 'all');
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [priorityFilter, setPriorityFilter] = useState(filters.priority || 'all');
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
    const [assigneeFilter, setAssigneeFilter] = useState(filters.assigned_to || 'all');

    const isViewingMyData = assigneeFilter === String(auth?.user?.id);

    const handleToggleMyData = () => {
        const newAssignee = isViewingMyData ? 'all' : String(auth?.user?.id);
        setAssigneeFilter(newAssignee);
        applyFilters({ assigned_to: newAssignee !== 'all' ? newAssignee : undefined });
    };

    // Modal state
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form inputs state
    const [formData, setFormData] = useState({
        title: '',
        parent_type: 'lead',
        parent_id: '',
        assigned_to: '',
        task_type_id: '',
        task_priority_id: '',
        task_status_id: '',
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
        { title: t('Task Management') },
        { title: t('Tasks & Follow-ups') },
    ];

    // Handle filter submission
    const applyFilters = (updates: Record<string, any> = {}) => {
        const queryParams = {
            entity_type: entityType,
            tab: activeTab,
            search,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            priority: priorityFilter !== 'all' ? priorityFilter : undefined,
            type: typeFilter !== 'all' ? typeFilter : undefined,
            assigned_to: assigneeFilter !== 'all' ? assigneeFilter : undefined,
            ...updates,
        };

        // Clean empty keys
        Object.keys(queryParams).forEach((k) => {
            if (queryParams[k] === 'all' || queryParams[k] === '' || queryParams[k] === undefined) {
                delete queryParams[k];
            }
        });

        router.get(route('tasks.index'), queryParams, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleEntityChange = (newEntityType: string) => {
        setEntityType(newEntityType);
        applyFilters({ entity_type: newEntityType, page: 1 });
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        applyFilters({ tab, page: 1 });
    };

    const handleResetFilters = () => {
        setEntityType('all');
        setActiveTab('all');
        setSearch('');
        setStatusFilter('all');
        setPriorityFilter('all');
        setTypeFilter('all');
        setAssigneeFilter('all');
        router.get(route('tasks.index'), {}, { preserveState: true, preserveScroll: true });
    };

    // Open Create Modal
    const handleOpenCreate = () => {
        setEditingTask(null);
        setFormData({
            title: '',
            parent_type: entityType !== 'all' ? entityType : 'lead',
            parent_id: '',
            assigned_to: users[0]?.id ? String(users[0].id) : '',
            task_type_id: taskTypes[0]?.id ? String(taskTypes[0].id) : '',
            task_priority_id: taskPriorities[0]?.id ? String(taskPriorities[0].id) : '',
            task_status_id: taskStatuses[0]?.id ? String(taskStatuses[0].id) : '',
            type: taskTypes[0]?.name ? taskTypes[0].name.toLowerCase().replace(/[\s\/-]+/g, '_') : 'followup',
            priority: taskPriorities[0]?.name ? taskPriorities[0].name.toLowerCase().replace(/[\s\/-]+/g, '_') : 'medium',
            status: taskStatuses[0]?.name ? taskStatuses[0].name.toLowerCase().replace(/[\s\/-]+/g, '_') : 'pending',
            due_date: new Date().toISOString().split('T')[0],
            due_time: '10:00',
            description: '',
        });
        setFormErrors({});
        setIsFormModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (task: Task) => {
        setEditingTask(task);
        let parentType: any = task.parent_type || 'none';
        let parentId = '';

        if (task.lead_id) {
            parentType = 'lead';
            parentId = String(task.lead_id);
        } else if (task.account_id) {
            parentType = 'account';
            parentId = String(task.account_id);
        } else if (task.contact_id) {
            parentType = 'contact';
            parentId = String(task.contact_id);
        } else if (task.opportunity_id) {
            parentType = 'opportunity';
            parentId = String(task.opportunity_id);
        }

        setFormData({
            title: task.title,
            parent_type: parentType,
            parent_id: parentId,
            assigned_to: task.assigned_to ? String(task.assigned_to) : '',
            task_type_id: task.task_type_id ? String(task.task_type_id) : (task.task_type?.id ? String(task.task_type.id) : ''),
            task_priority_id: task.task_priority_id ? String(task.task_priority_id) : (task.task_priority?.id ? String(task.task_priority.id) : ''),
            task_status_id: task.task_status_id ? String(task.task_status_id) : (task.task_status?.id ? String(task.task_status.id) : ''),
            type: task.type || 'followup',
            priority: task.priority || 'medium',
            status: task.status || 'pending',
            due_date: task.due_date ? String(task.due_date).split('T')[0] : '',
            due_time: task.due_time ? task.due_time.substring(0, 5) : '',
            description: task.description || '',
        });
        setFormErrors({});
        setIsFormModalOpen(true);
    };

    // Submit Task Create / Edit
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};

        if (!formData.title.trim()) errors.title = t('Task title is required');
        if (formData.parent_type !== 'none' && !formData.parent_id) {
            errors.parent_id = t('Please select a related record');
        }
        if (!formData.due_date) errors.due_date = t('Due date is required');

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setSubmitting(true);
        if (editingTask) {
            router.put(route('tasks.update', editingTask.id), formData, {
                preserveScroll: true,
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
            router.post(route('tasks.store'), formData, {
                preserveScroll: true,
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

    // Toggle Task Status (Pending <-> Completed)
    const handleToggleStatus = (task: Task) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        router.post(route('tasks.update-status', task.id), { status: newStatus }, {
            preserveScroll: true,
        });
    };

    // Delete Task
    const handleConfirmDelete = () => {
        if (taskToDelete) {
            router.delete(route('tasks.destroy', taskToDelete.id), {
                preserveScroll: true,
                onSuccess: () => setIsDeleteModalOpen(false),
            });
        }
    };

    // Render Entity Link Badge
    const renderEntityBadge = (task: Task) => {
        if (task.lead) {
            return (
                <Link
                    href={route('leads.show', task.lead.id)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 transition-colors"
                >
                    <User className="h-3 w-3 text-blue-500" />
                    <span>{task.lead.name}</span>
                    <span className="text-[10px] text-blue-400">({t('Lead')})</span>
                </Link>
            );
        }
        if (task.account) {
            return (
                <Link
                    href={route('accounts.show', task.account.id)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
                >
                    <Building2 className="h-3 w-3 text-emerald-500" />
                    <span>{task.account.name}</span>
                    <span className="text-[10px] text-emerald-400">({t('Account')})</span>
                </Link>
            );
        }
        if (task.contact) {
            return (
                <Link
                    href={route('contacts.show', task.contact.id)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 transition-colors"
                >
                    <Users className="h-3 w-3 text-purple-500" />
                    <span>{task.contact.name}</span>
                    <span className="text-[10px] text-purple-400">({t('Contact')})</span>
                </Link>
            );
        }
        if (task.opportunity) {
            return (
                <Link
                    href={route('opportunities.show', task.opportunity.id)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
                >
                    <TrendingUp className="h-3 w-3 text-amber-500" />
                    <span>{task.opportunity.name}</span>
                    <span className="text-[10px] text-amber-400">({t('Opportunity')})</span>
                </Link>
            );
        }
        return <span className="text-xs text-muted-foreground italic">{t('General / Internal')}</span>;
    };

    // Render Type Icon & Label
    const renderTypeBadge = (task: Task) => {
        if (task.task_type) {
            return (
                <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                        backgroundColor: `${task.task_type.color || '#3b82f6'}18`,
                        color: task.task_type.color || '#3b82f6',
                        borderColor: `${task.task_type.color || '#3b82f6'}40`,
                    }}
                >
                    <CheckSquare className="h-3 w-3" />
                    {task.task_type.name}
                </span>
            );
        }

        const rawType = (task.type || 'followup').toLowerCase().replace(/[\s\/-]+/g, '_');

        if (rawType.includes('call') || rawType === 'phone_call') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800"><Phone className="h-3 w-3" />{t('Phone Call')}</span>;
        }
        if (rawType.includes('meet') || rawType === 'meeting') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><Users className="h-3 w-3" />{t('Meeting')}</span>;
        }
        if (rawType.includes('mail') || rawType === 'email') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800"><Mail className="h-3 w-3" />{t('Email')}</span>;
        }
        if (rawType.includes('demo') || rawType === 'product_demo') {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300 border border-pink-200 dark:border-pink-800"><Video className="h-3 w-3" />{t('Product Demo')}</span>;
        }
        if (rawType.includes('task') || rawType.includes('todo')) {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border border-slate-200 dark:border-slate-800"><CheckSquare className="h-3 w-3" />{t('Task / Todo')}</span>;
        }
        if (rawType.includes('quote') || rawType.includes('contract')) {
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800"><FileText className="h-3 w-3" />{t('Quote / Contract')}</span>;
        }

        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"><Clock className="h-3 w-3" />{task.type ? (task.type.charAt(0).toUpperCase() + task.type.slice(1).replace(/_/g, ' ')) : t('Follow-up')}</span>;
    };

    // Render Priority Badge
    const renderPriorityBadge = (task: Task) => {
        if (task.task_priority) {
            return (
                <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
                    style={{
                        backgroundColor: `${task.task_priority.color}15`,
                        color: task.task_priority.color,
                        borderColor: `${task.task_priority.color}40`,
                    }}
                >
                    {task.task_priority.name}
                </span>
            );
        }

        switch (task.priority) {
            case 'urgent':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">{t('Urgent')}</span>;
            case 'high':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800">{t('High')}</span>;
            case 'low':
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{t('Low')}</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">{t('Medium')}</span>;
        }
    };

    // Render Status Badge
    const renderStatusBadge = (task: Task) => {
        if (task.task_status) {
            return (
                <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
                    style={{
                        backgroundColor: `${task.task_status.color}15`,
                        color: task.task_status.color,
                        borderColor: `${task.task_status.color}40`,
                    }}
                >
                    {task.task_status.name}
                </span>
            );
        }

        switch (task.status) {
            case 'completed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">{t('Completed')}</span>;
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

    const pageActions: any[] = [];

    if (canViewAll || isAdmin) {
        pageActions.push({
            label: '',
            icon: isViewingMyData ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />,
            variant: isViewingMyData ? 'default' : 'outline',
            tooltip: isViewingMyData ? t('All Tasks') : t('My Tasks'),
            onClick: handleToggleMyData,
        });
    }

    pageActions.push({
        label: t('Schedule Task'),
        icon: <Plus className="h-4 w-4 mr-2" />,
        variant: 'default',
        onClick: handleOpenCreate,
    });

    return (
        <PageTemplate
            title={t('Universal Tasks & Follow-ups')}
            description={t('Schedule, track, and execute tasks across Leads, Accounts, Contacts, and Opportunities')}
            breadcrumbs={breadcrumbs}
            actions={pageActions}
            noPadding
        >
            <div className="space-y-6">

                {/* ── 1. MAIN ENTITY TABS & CONFIG SHORTCUTS ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                    {/* Entity Filter Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border">
                        {[
                            { key: 'all', label: t('All Entities'), icon: Layers },
                            { key: 'lead', label: t('Leads'), icon: User },
                            { key: 'account', label: t('Accounts'), icon: Building2 },
                            { key: 'contact', label: t('Contacts'), icon: Users },
                            { key: 'opportunity', label: t('Opportunities'), icon: TrendingUp },
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleEntityChange(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    entityType === key
                                        ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Quick Config Sub-tab Buttons */}
                    <div className="flex items-center gap-2">
                        <Link href={route('task-statuses.index')}>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                <Tag className="h-3.5 w-3.5 text-primary" />
                                {t('Statuses')}
                            </Button>
                        </Link>
                        <Link href={route('task-types.index')}>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
                                {t('Types')}
                            </Button>
                        </Link>
                        <Link href={route('task-priorities.index')}>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                {t('Priorities')}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* ── 2. KPI STATS DASHBOARD CARDS ── */}
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

                {/* ── 3. SEARCH & FILTER BAR ── */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-4">
                    <form onSubmit={handleSearchSubmit}>
                        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('Search by task title, notes, lead, account, contact, or opportunity...')}
                                    className="pl-9 h-10 w-full"
                                />
                            </div>

                            {/* Dropdown Filters */}
                            <div className="flex flex-wrap items-center gap-2">
                                {/* Status Filter */}
                                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); applyFilters({ status: val }); }}>
                                    <SelectTrigger className="w-[140px] h-10">
                                        <SelectValue placeholder={t('Status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                        <SelectItem value="pending">{t('Pending')}</SelectItem>
                                        <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                        <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                        {taskStatuses.map((st: any) => (
                                            <SelectItem key={st.id} value={String(st.id)}>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                                                    {st.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Priority Filter */}
                                <Select value={priorityFilter} onValueChange={(val) => { setPriorityFilter(val); applyFilters({ priority: val }); }}>
                                    <SelectTrigger className="w-[130px] h-10">
                                        <SelectValue placeholder={t('Priority')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Priorities')}</SelectItem>
                                        <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                                        <SelectItem value="high">{t('High')}</SelectItem>
                                        <SelectItem value="medium">{t('Medium')}</SelectItem>
                                        <SelectItem value="low">{t('Low')}</SelectItem>
                                        {taskPriorities.map((tp: any) => (
                                            <SelectItem key={tp.id} value={String(tp.id)}>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tp.color || '#f59e0b' }} />
                                                    {tp.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Type Filter */}
                                <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); applyFilters({ type: val }); }}>
                                    <SelectTrigger className="w-[130px] h-10">
                                        <SelectValue placeholder={t('Type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Types')}</SelectItem>
                                        <SelectItem value="followup">{t('Follow-up')}</SelectItem>
                                        <SelectItem value="call">{t('Phone Call')}</SelectItem>
                                        <SelectItem value="meeting">{t('Meeting')}</SelectItem>
                                        <SelectItem value="email">{t('Email')}</SelectItem>
                                        <SelectItem value="demo">{t('Product Demo')}</SelectItem>
                                        <SelectItem value="task">{t('Task / Todo')}</SelectItem>
                                        {taskTypes.map((tt: any) => (
                                            <SelectItem key={tt.id} value={String(tt.id)}>
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tt.color || '#3b82f6' }} />
                                                    {tt.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Assignee Filter (Admins only) */}
                                {isAdmin && (
                                    <Select value={assigneeFilter} onValueChange={(val) => { setAssigneeFilter(val); applyFilters({ assigned_to: val }); }}>
                                        <SelectTrigger className="w-[150px] h-10">
                                            <SelectValue placeholder={t('Assigned To')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            <SelectItem value="all">{t('All Assignees')}</SelectItem>
                                            {users.map((u: any) => (
                                                <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                <Button type="submit" size="default" className="h-10">
                                    <Filter className="h-4 w-4 mr-1.5" />
                                    {t('Filter')}
                                </Button>

                                {(search || statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all' || assigneeFilter !== 'all' || entityType !== 'all' || activeTab !== 'all') && (
                                    <Button type="button" variant="outline" size="default" onClick={handleResetFilters} className="h-10">
                                        <X className="h-4 w-4 mr-1.5" />
                                        {t('Reset')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                {/* ── 4. TASKS TABLE ── */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold uppercase text-gray-500">
                                <tr>
                                    <th className="px-5 py-3.5 w-12 text-center">{t('Done')}</th>
                                    <th className="px-5 py-3.5">{t('Task Subject')}</th>
                                    <th className="px-5 py-3.5">{t('Related Entity')}</th>
                                    <th className="px-5 py-3.5">{t('Type')}</th>
                                    <th className="px-5 py-3.5">{t('Priority')}</th>
                                    <th className="px-5 py-3.5">{t('Due Date')}</th>
                                    <th className="px-5 py-3.5">{t('Status')}</th>
                                    <th className="px-5 py-3.5">{t('Assignee')}</th>
                                    <th className="px-5 py-3.5 text-right">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                {tasks?.data?.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-16 text-gray-400">
                                            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                                                    <CheckSquare className="h-6 w-6" />
                                                </div>
                                                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                                                    {t('No tasks found')}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {t('No tasks match your filter criteria. Schedule a new task or reset your search.')}
                                                </p>
                                                <Button size="sm" onClick={handleOpenCreate} className="mt-4">
                                                    <Plus className="h-4 w-4 mr-1.5" />
                                                    {t('Schedule Task')}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    tasks?.data?.map((task: Task) => {
                                        const overdue = isOverdue(task.due_date, task.status);
                                        const isCompleted = task.status === 'completed';

                                        return (
                                            <tr
                                                key={task.id}
                                                className={`hover:bg-gray-50/60 dark:hover:bg-gray-750 transition-colors ${
                                                    isCompleted ? 'bg-gray-50/40 dark:bg-gray-800/40 opacity-75' : ''
                                                }`}
                                            >
                                                {/* 1-Click Status Checkbox */}
                                                <td className="px-5 py-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(task)}
                                                        className={`flex h-5 w-5 mx-auto items-center justify-center rounded-md border transition-all ${
                                                            isCompleted
                                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                                                : 'border-gray-300 dark:border-gray-600 hover:border-emerald-500 text-transparent'
                                                        }`}
                                                    >
                                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                                    </button>
                                                </td>

                                                {/* Task Title & Description */}
                                                <td className="px-5 py-4">
                                                    <div className="max-w-md">
                                                        <p className={`font-semibold text-gray-900 dark:text-white ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                                                            {task.title}
                                                        </p>
                                                        {task.description && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                                                {task.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Related Entity */}
                                                <td className="px-5 py-4">
                                                    {renderEntityBadge(task)}
                                                </td>

                                                {/* Activity Type */}
                                                <td className="px-5 py-4">
                                                    {renderTypeBadge(task)}
                                                </td>

                                                {/* Priority */}
                                                <td className="px-5 py-4">
                                                    {renderPriorityBadge(task)}
                                                </td>

                                                {/* Due Date & Time */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                                                            overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
                                                        }`}>
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {task.due_date}
                                                            {overdue && (
                                                                <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-1 py-0.2 rounded font-bold">
                                                                    {t('Overdue')}
                                                                </span>
                                                            )}
                                                        </span>
                                                        {task.due_time && (
                                                            <span className="text-[11px] text-gray-400 ml-5">
                                                                {task.due_time.substring(0, 5)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-5 py-4">
                                                    {renderStatusBadge(task)}
                                                </td>

                                                {/* Assigned User */}
                                                <td className="px-5 py-4">
                                                    {task.assigned_user ? (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-6 w-6">
                                                                {task.assigned_user.avatar && <AvatarImage src={task.assigned_user.avatar} />}
                                                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                                                    {getInitials(task.assigned_user.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                                                                {task.assigned_user.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">{t('Unassigned')}</span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <TooltipProvider delayDuration={200}>
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
                                                                <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                                        onClick={() => {
                                                                            setTaskToDelete(task);
                                                                            setIsDeleteModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {tasks?.links && tasks.links.length > 3 && (
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                                {t('Showing')} <span className="font-semibold">{tasks.from || 0}</span> {t('to')} <span className="font-semibold">{tasks.to || 0}</span> {t('of')} <span className="font-semibold">{tasks.total}</span> {t('tasks')}
                            </p>
                            <div className="flex items-center gap-1">
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

                {/* ── 5. CREATE / EDIT UNIVERSAL TASK MODAL ── */}
                <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
                        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                            <DialogTitle className="text-lg font-semibold">
                                {editingTask ? t('Edit Task / Follow-up') : t('Schedule Task / Follow-up')}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-1">
                                {t('Schedule a follow-up, call, meeting, or demo for your lead, account, contact, or opportunity.')}
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 max-h-[calc(90vh-150px)]">
                                {/* Task Title */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="universal-task-title" required>
                                        {t('Task Title')}
                                    </Label>
                                    <Input
                                        id="universal-task-title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder={t('e.g. Follow-up regarding contract proposal')}
                                        className={formErrors.title ? 'border-red-500' : ''}
                                    />
                                    {formErrors.title && <p className="text-xs text-red-500">{formErrors.title}</p>}
                                </div>

                                {/* Related Entity Type & Record */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="parent_type" required>
                                            {t('Related Entity Type')}
                                        </Label>
                                        <Select
                                            value={formData.parent_type}
                                            onValueChange={(val) => setFormData({ ...formData, parent_type: val, parent_id: '' })}
                                        >
                                            <SelectTrigger id="parent_type">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="lead">{t('Lead')}</SelectItem>
                                                <SelectItem value="account">{t('Account')}</SelectItem>
                                                <SelectItem value="contact">{t('Contact')}</SelectItem>
                                                <SelectItem value="opportunity">{t('Opportunity')}</SelectItem>
                                                <SelectItem value="none">{t('None (Internal Task)')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.parent_type !== 'none' && (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="parent_id" required>
                                                {formData.parent_type === 'lead' && t('Select Lead')}
                                                {formData.parent_type === 'account' && t('Select Account')}
                                                {formData.parent_type === 'contact' && t('Select Contact')}
                                                {formData.parent_type === 'opportunity' && t('Select Opportunity')}
                                            </Label>
                                            <Select
                                                value={formData.parent_id ? String(formData.parent_id) : undefined}
                                                onValueChange={(val) => setFormData({ ...formData, parent_id: val })}
                                            >
                                                <SelectTrigger id="parent_id" className={formErrors.parent_id ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder={t('Choose record...')} />
                                                </SelectTrigger>
                                                <SelectContent searchable>
                                                    {formData.parent_type === 'lead' && leads.map((l: any) => (
                                                        <SelectItem key={l.id} value={String(l.id)}>
                                                            {l.name} {l.company ? `(${l.company})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                    {formData.parent_type === 'account' && accounts.map((a: any) => (
                                                        <SelectItem key={a.id} value={String(a.id)}>
                                                            {a.name}
                                                        </SelectItem>
                                                    ))}
                                                    {formData.parent_type === 'contact' && contacts.map((c: any) => (
                                                        <SelectItem key={c.id} value={String(c.id)}>
                                                            {c.name} {c.email ? `(${c.email})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                    {formData.parent_type === 'opportunity' && opportunities.map((o: any) => (
                                                        <SelectItem key={o.id} value={String(o.id)}>
                                                            {o.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {formErrors.parent_id && <p className="text-xs text-red-500">{formErrors.parent_id}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Type & Priority */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="task-type" required>
                                            {t('Activity Type')}
                                        </Label>
                                        <Select
                                            value={formData.task_type_id ? String(formData.task_type_id) : (formData.type || '')}
                                            onValueChange={(val) => {
                                                const matchedType = taskTypes.find((t: any) => String(t.id) === String(val));
                                                if (matchedType) {
                                                    setFormData({
                                                        ...formData,
                                                        task_type_id: String(matchedType.id),
                                                        type: matchedType.name.toLowerCase().replace(/[\s\/-]+/g, '_'),
                                                    });
                                                } else {
                                                    setFormData({ ...formData, type: val, task_type_id: '' });
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="task-type">
                                                <SelectValue placeholder={t('Select Type')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {taskTypes.length > 0 ? (
                                                    taskTypes.map((tt: any) => (
                                                        <SelectItem key={tt.id} value={String(tt.id)}>
                                                            <span className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tt.color || '#3b82f6' }} />
                                                                <span>{tt.name}</span>
                                                            </span>
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <>
                                                        <SelectItem value="followup">{t('Follow-up')}</SelectItem>
                                                        <SelectItem value="call">{t('Phone Call')}</SelectItem>
                                                        <SelectItem value="meeting">{t('Meeting')}</SelectItem>
                                                        <SelectItem value="email">{t('Email')}</SelectItem>
                                                        <SelectItem value="demo">{t('Product Demo')}</SelectItem>
                                                        <SelectItem value="task">{t('Task / Todo')}</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="task-priority" required>
                                            {t('Priority')}
                                        </Label>
                                        <Select
                                            value={formData.task_priority_id ? String(formData.task_priority_id) : (formData.priority || '')}
                                            onValueChange={(val) => {
                                                const matchedPrio = taskPriorities.find((p: any) => String(p.id) === String(val));
                                                if (matchedPrio) {
                                                    setFormData({
                                                        ...formData,
                                                        task_priority_id: String(matchedPrio.id),
                                                        priority: matchedPrio.name.toLowerCase().replace(/[\s\/-]+/g, '_'),
                                                    });
                                                } else {
                                                    setFormData({ ...formData, priority: val, task_priority_id: '' });
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="task-priority">
                                                <SelectValue placeholder={t('Select Priority')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {taskPriorities.length > 0 ? (
                                                    taskPriorities.map((tp: any) => (
                                                        <SelectItem key={tp.id} value={String(tp.id)}>
                                                            <span className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tp.color || '#f59e0b' }} />
                                                                <span>{tp.name}</span>
                                                            </span>
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <>
                                                        <SelectItem value="low">{t('Low')}</SelectItem>
                                                        <SelectItem value="medium">{t('Medium')}</SelectItem>
                                                        <SelectItem value="high">{t('High')}</SelectItem>
                                                        <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Due Date & Time */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="task-due-date" required>
                                            {t('Due Date')}
                                        </Label>
                                        <Input
                                            id="task-due-date"
                                            type="date"
                                            value={formData.due_date}
                                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                            className={formErrors.due_date ? 'border-red-500' : ''}
                                        />
                                        {formErrors.due_date && <p className="text-xs text-red-500">{formErrors.due_date}</p>}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="task-due-time">
                                            {t('Time (Optional)')}
                                        </Label>
                                        <Input
                                            id="task-due-time"
                                            type="time"
                                            value={formData.due_time}
                                            onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Assigned To & Status */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="task-assigned-to">
                                            {t('Assign To')}
                                        </Label>
                                        <Select
                                            value={formData.assigned_to ? String(formData.assigned_to) : undefined}
                                            onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}
                                        >
                                            <SelectTrigger id="task-assigned-to">
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
                                        <Label htmlFor="task-status">
                                            {t('Status')}
                                        </Label>
                                        <Select
                                            value={formData.task_status_id ? String(formData.task_status_id) : (formData.status || '')}
                                            onValueChange={(val) => {
                                                const matchedStatus = taskStatuses.find((s: any) => String(s.id) === String(val));
                                                if (matchedStatus) {
                                                    setFormData({
                                                        ...formData,
                                                        task_status_id: String(matchedStatus.id),
                                                        status: matchedStatus.name.toLowerCase().replace(/[\s\/-]+/g, '_'),
                                                    });
                                                } else {
                                                    setFormData({ ...formData, status: val, task_status_id: '' });
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="task-status">
                                                <SelectValue placeholder={t('Select Status')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {taskStatuses.length > 0 ? (
                                                    taskStatuses.map((st: any) => (
                                                        <SelectItem key={st.id} value={String(st.id)}>
                                                            <span className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color || '#6366f1' }} />
                                                                <span>{st.name}</span>
                                                            </span>
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <>
                                                        <SelectItem value="pending">{t('Pending')}</SelectItem>
                                                        <SelectItem value="in_progress">{t('In Progress')}</SelectItem>
                                                        <SelectItem value="completed">{t('Completed')}</SelectItem>
                                                        <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="task-notes">
                                        {t('Notes / Agenda')}
                                    </Label>
                                    <Textarea
                                        id="task-notes"
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder={t('Add key discussion points, agenda, or background details...')}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? t('Saving...') : (editingTask ? t('Update Task') : t('Schedule Task'))}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ── 6. DELETE MODAL ── */}
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
