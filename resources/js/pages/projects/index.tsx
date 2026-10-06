import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, MoreHorizontal, FileDown, RefreshCw, LayoutGrid, Play, PauseCircle, CheckCircle2, AlertCircle, CheckCircle, AlignJustify, Calendar, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { cn } from '@/lib/utils';

const statusConfig: Record<string, { label: string; className: string }> = {
    active:    { label: 'Active',    className: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' },
    inactive:  { label: 'Inactive',  className: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20' },
    completed: { label: 'Completed', className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20' },
    on_hold:   { label: 'On Hold',   className: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
    low:    { label: 'Low',    className: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20' },
    medium: { label: 'Medium', className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20' },
    high:   { label: 'High',   className: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20' },
    urgent: { label: 'Urgent', className: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' },
};

const progressBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 40) return 'bg-blue-500';
    return 'bg-orange-400';
};

function Avatar({ name, src }: { name: string; src?: string }) {
    const [imgError, setImgError] = useState(false);
    if (src && !imgError) {
        return <img src={src} alt={name} onError={() => setImgError(true)} className="h-7 w-7 rounded-full object-cover border-2 border-white" />;
    }
    return (
        <div className="h-7 w-7 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center border-2 border-white uppercase">
            {name.charAt(0)}
        </div>
    );
}

export default function Projects() {
    const { t } = useTranslation();
    const { auth, projects, accounts = [], allAccounts = [], users = [], allUsers = [], planLimits, stats = {}, canViewAll = false, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const canView = hasPermission(permissions, 'view-projects');

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedPriority, setSelectedPriority] = useState(pageFilters.priority || 'all');
    const [selectedAccount, setSelectedAccount] = useState(pageFilters.account_id || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

    const isViewingMyData = canViewAll && (selectedAssignee === String(auth?.user?.id) || pageFilters?.assigned_to === String(auth?.user?.id));

    const handleToggleMyData = () => {
        const newAssignee = isViewingMyData ? 'all' : String(auth?.user?.id);
        setSelectedAssignee(newAssignee);
        router.get(route('projects.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            priority: selectedPriority !== 'all' ? selectedPriority : undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            assigned_to: newAssignee !== 'all' ? newAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            per_page: pageFilters.per_page ? parseInt(pageFilters.per_page) : undefined,
        }, { preserveState: true, preserveScroll: true });
    };
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    const hasActiveFilters = () =>
        searchTerm !== '' || selectedPriority !== 'all' || selectedAccount !== 'all' || selectedAssignee !== 'all';

    const activeFilterCount = () =>
        (selectedPriority !== 'all' ? 1 : 0) + (selectedAccount !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);

    const baseParams = () => ({
        page: 1,
        search: searchTerm || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
        assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
        sort_field: pageFilters.sort_field || undefined,
        sort_direction: pageFilters.sort_direction || undefined,
        per_page: pageFilters.per_page ? parseInt(pageFilters.per_page) : undefined,
    });

    const applyFilters = () => {
        router.get(route('projects.index'), baseParams(), { preserveState: true, preserveScroll: true });
    };

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilters(); };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'view':   router.get(route('projects.show', item.id)); break;
            case 'edit':   setFormMode('edit'); setIsFormModalOpen(true); break;
            case 'delete': setIsDeleteModalOpen(true); break;
            case 'toggle-status': setIsStatusModalOpen(true); break;
        }
    };

    const handleAddNew = () => { setCurrentItem(null); setFormMode('create'); setIsFormModalOpen(true); };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {
            toast.loading(t('Creating project...'));
            router.post(route('projects.store'), formData, {
                onSuccess: (page) => { setIsFormModalOpen(false); toast.dismiss(); page.props.flash.success ? toast.success(t(page.props.flash.success)) : page.props.flash.error && toast.error(t(page.props.flash.error)); },
                onError: (errors) => { toast.dismiss(); toast.error(typeof errors === 'string' ? errors : `Failed to create project: ${Object.values(errors).join(', ')}`); }
            });
        } else if (formMode === 'edit') {
            toast.loading(t('Updating project...'));
            router.put(route('projects.update', currentItem.id), formData, {
                onSuccess: (page) => { setIsFormModalOpen(false); toast.dismiss(); page.props.flash.success ? toast.success(t(page.props.flash.success)) : page.props.flash.error && toast.error(t(page.props.flash.error)); },
                onError: (errors) => { toast.dismiss(); toast.error(typeof errors === 'string' ? errors : `Failed to update project: ${Object.values(errors).join(', ')}`); }
            });
        }
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting project...'));
        router.delete(route('projects.destroy', currentItem.id), {
            onSuccess: (page) => { setIsDeleteModalOpen(false); toast.dismiss(); page.props.flash.success ? toast.success(t(page.props.flash.success)) : page.props.flash.error && toast.error(t(page.props.flash.error)); },
            onError: (errors) => { toast.dismiss(); toast.error(typeof errors === 'string' ? errors : `Failed to delete project: ${Object.values(errors).join(', ')}`); }
        });
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('projects.toggle-status', currentItem.id), formData, {
            onSuccess: (page) => { setIsStatusModalOpen(false); toast.dismiss(); page.props.flash.success ? toast.success(t(page.props.flash.success)) : page.props.flash.error && toast.error(t(page.props.flash.error)); },
            onError: (errors) => { toast.dismiss(); toast.error(typeof errors === 'string' ? errors : t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') })); }
        });
    };

    const [pageInitialState, setPageInitialState] = useState(true);
    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedPriority, selectedAccount, selectedAssignee]);

    const handleResetFilters = () => {
        setSearchTerm(''); setSelectedPriority('all'); setSelectedAccount('all'); setSelectedAssignee('all');
        router.get(route('projects.index'), { status: selectedStatus !== 'all' ? selectedStatus : undefined });
    };

    const handleTabChange = (status: string) => {
        setSelectedStatus(status);
        router.get(route('projects.index'), {
            ...baseParams(),
            status: status !== 'all' ? status : undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const pageActions: any[] = [];

    if (canViewAll) {
        pageActions.push({
            label: '',
            icon: isViewingMyData ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />,
            variant: isViewingMyData ? 'default' : 'outline',
            tooltip: isViewingMyData ? t('All Projects') : t('My Projects'),
            onClick: handleToggleMyData,
        });
    }

    if (hasPermission(permissions, 'export-projects')) {
        pageActions.push({ label: t('Export'), icon: <FileDown className="h-4 w-4 mr-2" />, variant: 'outline', onClick: () => (CrudFormModal as any).handleExport?.() });
    }

    if (hasPermission(permissions, 'create-projects')) {
        const canCreate = !planLimits || planLimits.can_create;
        pageActions.push({
            label: planLimits && !canCreate ? t('Project Limit Reached ({{current}}/{{max}})', { current: planLimits.current_projects, max: planLimits.max_projects }) : t('Add Project'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: canCreate ? 'default' : 'outline',
            onClick: canCreate ? handleAddNew : () => toast.error(t('Project limit exceeded. Your plan allows maximum {{max}} projects. Please upgrade your plan.', { max: planLimits.max_projects })),
            disabled: !canCreate
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Project Management'), href: route('projects.index') },
        { title: t('Projects') }
    ];

    const statCards = [
        { label: t('Total Projects'), value: stats.total ?? 0, sub: t('All time'),         icon: <LayoutGrid className="h-6 w-6" />, color: 'text-blue-700',   cardBg: 'bg-blue-50 dark:bg-blue-900/30',   borderColor: '#bfdbfe' },
        { label: t('Active'),        value: stats.ongoing ?? 0,   sub: stats.total ? `${Math.round(((stats.ongoing   ?? 0) / stats.total) * 100)}% ${t('of total')}` : '—', icon: <Play className="h-6 w-6" />,         color: 'text-green-700',  cardBg: 'bg-green-50 dark:bg-green-900/30',  borderColor: '#bbf7d0' },
        { label: t('On Hold'),        value: stats.on_hold ?? 0,   sub: stats.total ? `${Math.round(((stats.on_hold   ?? 0) / stats.total) * 100)}% ${t('of total')}` : '—', icon: <PauseCircle className="h-6 w-6" />,  color: 'text-yellow-600', cardBg: 'bg-yellow-50 dark:bg-yellow-900/30', borderColor: '#fde68a' },
        { label: t('Completed'),      value: stats.completed ?? 0, sub: stats.total ? `${Math.round(((stats.completed ?? 0) / stats.total) * 100)}% ${t('of total')}` : '—', icon: <CheckCircle2 className="h-6 w-6" />, color: 'text-violet-700', cardBg: 'bg-violet-50 dark:bg-violet-900/30', borderColor: '#ddd6fe' },
        { label: t('Overdue'),        value: stats.overdue ?? 0,   sub: stats.total ? `${Math.round(((stats.overdue   ?? 0) / stats.total) * 100)}% ${t('of total')}` : '—', icon: <AlertCircle className="h-6 w-6" />,  color: 'text-red-600',    cardBg: 'bg-red-50 dark:bg-red-900/30',      borderColor: '#fecaca' },
    ];

    return (
        <PageTemplate title={t('Manage Projects')} description={t('Manage your projects.')} url="/projects" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                {statCards.map((s) => (
                    <Card key={s.label} className={`p-6 flex flex-col gap-2 rounded-xl shadow-sm ${s.cardBg}`} style={{ border: `1.5px solid ${s.borderColor}` }}>
                        <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${s.color}`}>{s.label}</p>
                            <span className={s.color}>{React.cloneElement(s.icon, { className: 'h-5 w-5' })}</span>
                        </div>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className={`text-xs ${s.color} opacity-70`}>{s.sub}</p>
                    </Card>
                ))}
            </div>

            {/* Search & Filter Card */}
            <div className="bg-white dark:bg-gray-900 rounded-t-lg shadow border border-gray-200 dark:border-gray-700">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'priority',
                            label: t('Priority'),
                            type: 'select',
                            value: selectedPriority,
                            onChange: setSelectedPriority,
                            options: [
                                { value: 'all', label: t('All Priorities') },
                                { value: 'low', label: t('Low') },
                                { value: 'medium', label: t('Medium') },
                                { value: 'high', label: t('High') },
                                { value: 'urgent', label: t('Urgent') },
                            ]
                        },
                        {
                            name: 'account_id',
                            label: t('Account'),
                            type: 'select',
                            searchable: true,
                            value: selectedAccount,
                            onChange: setSelectedAccount,
                            options: [
                                { value: 'all', label: t('All Accounts') },
                                ...allAccounts.map((a: any) => ({ value: a.id.toString(), label: a.name }))
                            ]
                        },
                        {
                            name: 'assigned_to',
                            label: t('Assigned To'),
                            type: 'select',
                            searchable: true,
                            value: selectedAssignee,
                            onChange: setSelectedAssignee,
                            options: [
                                { value: 'all', label: t('All Users') },
                                { value: 'unassigned', label: t('Unassigned') },
                                ...allUsers.map((u: any) => ({ value: u.id.toString(), label: u.name }))
                            ]
                        }
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    hidePerPage={true}
                />
            </div>

            {/* Status Tabs + Content Card */}
            <div className="bg-white dark:bg-gray-900 rounded-b-lg shadow border border-gray-200 dark:border-gray-700 border-t-0 mb-4">

                {/* Status Tabs */}
                <div className="flex items-center gap-1 px-4 border-b border-gray-200 dark:border-gray-700">
                    {([
                        { value: 'all',       label: t('All'),      count: stats.total ?? 0,     icon: <LayoutGrid className="h-3.5 w-3.5" /> },
                        { value: 'active',    label: t('Active'),   count: stats.ongoing ?? 0,   icon: <Play className="h-3.5 w-3.5" /> },
                        { value: 'inactive',  label: t('Inactive'), count: stats.inactive ?? 0,  icon: <AlertCircle className="h-3.5 w-3.5" /> },
                        { value: 'on_hold',   label: t('On Hold'),  count: stats.on_hold ?? 0,   icon: <PauseCircle className="h-3.5 w-3.5" /> },
                        { value: 'completed', label: t('Finished'), count: stats.completed ?? 0, icon: <CheckCircle className="h-3.5 w-3.5" /> },
                    ] as const).map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => handleTabChange(tab.value)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                selectedStatus === tab.value
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            <span className={`ml-0.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold min-w-[1.25rem] ${
                                selectedStatus === tab.value
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                            }`}>{tab.count}</span>
                        </button>
                    ))}
                </div>



                {/* Row 4: Projects Grid */}
            {(projects?.data?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-500">
                    <p className="text-lg font-medium">{t('No projects found')}</p>
                    <p className="text-sm mt-1">{t('Try adjusting your filters or create a new project.')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 p-4">
                    {projects.data.map((project: any) => {
                        const sCfg = statusConfig[project.status] ?? statusConfig.inactive;
                        const pCfg = priorityConfig[project.priority] ?? priorityConfig.medium;
                        const pct  = project.task_progress ?? 0;
                        const total = project.task_total ?? 0;

                        return (
                            <Card
                                key={project.id}
                                className={cn(
                                    "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden",
                                    canView && "cursor-pointer"
                                )}
                                onClick={(e) => {
                                    if (!canView) return;
                                    const target = e.target as HTMLElement;
                                    if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-radix-collection-item]')) {
                                        return;
                                    }
                                    const selection = window.getSelection();
                                    if (selection && selection.toString().trim().length > 0) {
                                        return;
                                    }
                                    router.get(route('projects.show', project.id));
                                }}
                            >
                                <div className="p-5 flex flex-col flex-1 gap-3">
                                    {/* Top row: name + menu */}
                                    <div className="flex items-start justify-between gap-2">
                                        <h3
                                            className="font-semibold text-gray-900 dark:text-white truncate text-sm leading-snug cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                            onClick={() => router.get(route('projects.show', project.id))}
                                        >
                                            {project.name}
                                        </h3>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-gray-400 hover:text-gray-600 hover:bg-transparent rounded-none">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 z-50" sideOffset={5}>
                                                {hasPermission(permissions, 'view-projects') && (
                                                    <DropdownMenuItem onClick={() => handleAction('view', project)}>
                                                        <Eye className="h-4 w-4 mr-2" /> {t('View Project')}
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'toggle-status-projects') && (
                                                    <DropdownMenuItem onClick={() => handleAction('toggle-status', project)}>
                                                        <RefreshCw className="h-4 w-4 mr-2" /> {t('Change Status')}
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'edit-projects') && (
                                                    <DropdownMenuItem onClick={() => handleAction('edit', project)}>
                                                        <Edit className="h-4 w-4 mr-2" /> {t('Edit')}
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                {hasPermission(permissions, 'delete-projects') && (
                                                    <DropdownMenuItem onClick={() => handleAction('delete', project)} className="text-rose-600">
                                                        <Trash2 className="h-4 w-4 mr-2" /> {t('Delete')}
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Separator */}
                                    <hr className="border-gray-200 dark:border-gray-600" />

                                    {/* Task Progress */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                                            <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                                <AlignJustify className="h-3 w-3 text-gray-400" />
                                                {project.task_done ?? 0}/{total}
                                            </span>
                                            <span>({pct}% {t('completed')})</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${progressBarColor(pct)}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Assigned to + Deadline */}
                                    <div className="flex items-end justify-between gap-2">
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">{t('Assigned to')}</p>
                                            {project.assigned_user ? (
                                                <Avatar name={project.assigned_user.name} src={project.assigned_user.avatar} />
                                            ) : (
                                                <span className="text-xs text-gray-400">{t('Unassigned')}</span>
                                            )}
                                        </div>
                                        {project.end_date && (
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 mb-1">{t('Deadline')}</p>
                                                <p className={`text-xs font-medium flex items-center gap-1 justify-end ${new Date(project.end_date) < new Date() && project.status !== 'completed' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    <Calendar className="h-3 w-3" />
                                                    <span className="text-xs">{window.appSettings?.formatDateTime(project.end_date, false) || project.end_date}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer: status badge + priority + budget */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${sCfg.className}`}>
                                            {t(sCfg.label)}
                                        </span>
                                        {project.priority && (
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${pCfg.className}`}>
                                                {t(pCfg.label)}
                                            </span>
                                        )}
                                        {project.budget && (
                                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium ml-auto font-mono">
                                                {window.appSettings?.formatCurrency(project.budget) || `$${Number(project.budget).toLocaleString()}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
                <Pagination
                    from={projects?.from || 0}
                    to={projects?.to || 0}
                    total={projects?.total || 0}
                    links={projects?.links}
                    entityName={t('projects')}
                    onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                    perPageOptions={[12, 24, 48, 96]}
                    currentPerPage={pageFilters.per_page?.toString() || '12'}
                    onPerPageChange={(value) => {
                        router.get(route('projects.index'), {
                            ...baseParams(),
                            page: 1,
                            per_page: parseInt(value) !== 12 ? parseInt(value) : undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            {/* Form Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    ...(hasPermission(permissions, 'export-projects') && { exportRoute: 'project.export' }),
                    fields: [
                        { name: 'name', label: t('Project Name'), type: 'text', required: true, placeholder: t('e.g. Website Redesign, Mobile App v2, CRM Integration') },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('Enter project description...') },
                        {
                            name: formMode === 'view' ? 'account_name' : 'account_id',
                            label: t('Account'), type: formMode === 'view' ? 'text' : 'select', required: true, searchable: true, readOnly: formMode === 'view',
                            emptyNote: { link: route('accounts.index'), linkText: t('Accounts') },
                            options: formMode === 'view' ? [] : accounts.map((a: any) => ({ value: a.id, label: a.name }))
                        },
                        { name: 'start_date', label: t('Start Date'), type: 'date' },
                        { name: 'end_date', label: t('End Date'), type: 'date' },
                        { name: 'budget', label: t('Budget'), type: 'number', step: '0.01', placeholder: t('e.g. 10000.00') },
                        {
                            name: 'priority', label: t('Priority'), type: 'select', defaultValue: 'medium',
                            options: [{ value: 'low', label: t('Low') }, { value: 'medium', label: t('Medium') }, { value: 'high', label: t('High') }, { value: 'urgent', label: t('Urgent') }]
                        },
                        {
                            name: 'status', label: t('Status'), type: 'select', defaultValue: 'active',
                            options: [{ value: 'active', label: t('Active') }, { value: 'inactive', label: t('Inactive') }, { value: 'completed', label: t('Completed') }, { value: 'on_hold', label: t('On Hold') }]
                        },
                        {
                            name: formMode === 'view' ? 'assigned_user_name' : 'assigned_to',
                            label: t('Assign To'), type: formMode === 'view' ? 'text' : 'select', required: true, searchable: true, readOnly: formMode === 'view',
                            emptyNote: { link: route('users.index'), linkText: t('Users') },
                            options: formMode === 'view' ? [] : users.map((u: any) => ({ value: u.id, label: `${u.name} (${u.email})` }))
                        }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem ? { ...currentItem, assigned_user_name: currentItem.assigned_user?.name || 'Unassigned', account_name: currentItem.account?.name || 'No Account' } : null}
                title={formMode === 'create' ? t('Add Project') : formMode === 'edit' ? t('Edit Project') : t('View Project')}
                mode={formMode}
            />

            {/* Status Modal */}
            <CrudFormModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSubmit={handleStatusChange}
                formConfig={{
                    fields: [{
                        name: 'status', label: t('Status'), type: 'select', required: true,
                        options: [{ value: 'active', label: t('Active') }, { value: 'inactive', label: t('Inactive') }, { value: 'completed', label: t('Completed') }, { value: 'on_hold', label: t('On Hold') }]
                    }],
                    modalSize: 'sm'
                }}
                initialData={currentItem ? { status: currentItem.status } : null}
                title={t('Change Project Status')}
                mode="edit"
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName="project"
            />
        </PageTemplate>
    );
}
 
