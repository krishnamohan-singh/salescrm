import { useState, useEffect, useRef, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, MoreHorizontal, FileDown, Calendar, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { hasPermission } from '@/utils/authorization';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

function ParentTaskSelect({ tasksRef, value, onChange }: { tasksRef: React.MutableRefObject<any[]>, value: string, onChange: (v: string) => void }) {
    const { t } = useTranslation();
    const [tasks, setTasks] = useState<any[]>(() => [...tasksRef.current]);

    useEffect(() => {
        tasksRef.current.__notify = () => setTasks([...tasksRef.current]);
        // Sync on mount in case data was loaded before this mounted
        setTasks([...tasksRef.current]);
        return () => { delete tasksRef.current.__notify; };
    }, [tasksRef]);
    return (
        <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger>
                <SelectValue placeholder={t('Select Parent Task')} />
            </SelectTrigger>
            <SelectContent className="z-[60000]">
                {tasks.map((task: any) => (
                    <SelectItem key={task.id} value={String(task.id)}>{task.title}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export default function ProjectTasks() {
    const { t } = useTranslation();
    const { auth, kanbanData: initialKanbanData, statuses = [], projects = [], allProjects = [], users = [], allUsers = [], canViewAll = false, parentTasks = [], taskStatuses = [], allTaskStatuses = [], filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedPriority, setSelectedPriority] = useState(pageFilters.priority || 'all');
    const [selectedProject, setSelectedProject] = useState(pageFilters.project_id || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
    const [prefilledStatus, setPrefilledStatus] = useState<string>('');
    const [kanbanData, setKanbanData] = useState<any>(null);
    const dynamicParentTasksRef = useRef<any[]>([]);
    const isDraggingRef = useRef(false);
    const canView = hasPermission(permissions, 'view-project-tasks');

    const setParentTasks = useCallback((tasks: any[]) => {
        dynamicParentTasksRef.current.splice(0, dynamicParentTasksRef.current.length, ...tasks);
        dynamicParentTasksRef.current.__notify?.();
    }, []);

    const isViewingMyData = selectedAssignee === String(auth?.user?.id);

    const handleToggleMyData = () => {
        const newAssignee = isViewingMyData ? 'all' : String(auth?.user?.id);
        setSelectedAssignee(newAssignee);
    };

    const pageInitialState = useState(true);
    useEffect(() => {
        if (pageInitialState[0]) { pageInitialState[1](false); return; }
        applyFilters();
    }, [searchTerm, selectedStatus, selectedPriority, selectedProject, selectedAssignee]);

    const hasActiveFilters = () => searchTerm !== '' || selectedStatus !== 'all' || selectedPriority !== 'all' || selectedProject !== 'all' || selectedAssignee !== 'all';
    const activeFilterCount = () => (selectedStatus !== 'all' ? 1 : 0) + (selectedPriority !== 'all' ? 1 : 0) + (selectedProject !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);

    const loadKanbanData = () => {
        const allTasks = Object.values(initialKanbanData || {}).flatMap((col: any) => col.tasks || []);
        const structured: any = {};

        statuses.forEach((status: any) => {
            structured[status.id] = {
                status,
                items: allTasks.filter((task: any) => {
                    const matchesStatus = task.task_status_id === status.id;
                    const matchesSearch = !searchTerm ||
                        task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        task.description?.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
                    const matchesProject = selectedProject === 'all' || task.project?.id?.toString() === selectedProject;
                    const matchesAssignee = selectedAssignee === 'all' || task.assigned_user?.id?.toString() === selectedAssignee;
                    return matchesStatus && matchesSearch && matchesPriority && matchesProject && matchesAssignee;
                })
            };
        });

        setKanbanData(structured);
    };

    useEffect(() => {
        loadKanbanData();
    }, [initialKanbanData, searchTerm, selectedPriority, selectedProject, selectedAssignee, statuses]);

    const applyFilters = () => {
        router.get(route('project-tasks.index'), {
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            priority: selectedPriority !== 'all' ? selectedPriority : undefined,
            project_id: selectedProject !== 'all' ? selectedProject : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleResetFilters = () => {
        router.get(route('project-tasks.index'));
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'view':
                router.get(route('project-tasks.show', item.id));
                break;
            case 'edit':
                setFormMode('edit');
                if (item.project?.id) {
                    fetch(route('api.projects.details', item.project.id) + '?exclude_id=' + item.id)
                        .then(res => res.json())
                        .then(data => setParentTasks(data.parent_tasks || []))
                        .catch(() => setParentTasks([]))
                        .finally(() => setIsFormModalOpen(true));
                } else {
                    setParentTasks([]);
                    setIsFormModalOpen(true);
                }
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
        }
    };

    const handleAddTask = (statusId: string) => {
        setCurrentItem(null);
        setFormMode('create');
        setPrefilledStatus(statusId);
        setParentTasks([]);
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {
            toast.loading(t('Creating task...'));
            router.post(route('project-tasks.store'), {
                ...formData,
                task_status_id: prefilledStatus ? parseInt(prefilledStatus) : formData.task_status_id,
            }, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                    if (page.props.flash.success) toast.success(t(page.props.flash.success));
                    else if (page.props.flash.error) toast.error(t(page.props.flash.error));
                },
                onError: (errors) => {
                    toast.dismiss();
                    toast.error(typeof errors === 'string' ? errors : t('Failed to create: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            });
        } else if (formMode === 'edit') {
            toast.loading(t('Updating task...'));
            router.put(route('project-tasks.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                    if (page.props.flash.success) toast.success(t(page.props.flash.success));
                    else if (page.props.flash.error) toast.error(t(page.props.flash.error));
                },
                onError: (errors) => {
                    toast.dismiss();
                    toast.error(typeof errors === 'string' ? errors : t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            });
        }
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting task...'));
        router.delete(route('project-tasks.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
                if (page.props.flash.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(typeof errors === 'string' ? errors : t('Failed to delete: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const pageActions: any[] = [];

    // Add My Tasks / All Tasks toggle button for users with full permission
    if (canViewAll) {
        pageActions.push({
            label: '',
            icon: isViewingMyData ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />,
            variant: isViewingMyData ? 'default' : 'outline',
            tooltip: isViewingMyData ? t('All Tasks') : t('My Tasks'),
            onClick: () => handleToggleMyData(),
        });
    }

    if (hasPermission(permissions, 'export-project-tasks')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => window.location.href = route('project-task.export')
        });
    }

    if (hasPermission(permissions, 'create-project-tasks')) {
        pageActions.push({
            label: t('Add Task'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddTask('')
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Project Management'), href: route('project-tasks.index') },
        { title: t('Project Tasks') }
    ];

    const priorityColors: any = {
        urgent: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
        high: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
        medium: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
        low: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20',
    };

    return (
        <PageTemplate
            title={t('Project Tasks')}
            description={t('Manage your project tasks.')}
            url="/project-tasks"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
            className={`overflow-hidden`}
        >
            <style>{`
              .kanban-col-scroll::-webkit-scrollbar { width: 4px; }
              .kanban-col-scroll::-webkit-scrollbar-track { background: transparent; }
              .kanban-col-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
              .kanban-board-scroll::-webkit-scrollbar { height: 6px; }
              .kanban-board-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
              .kanban-board-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            `}</style>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: [
                                { value: 'all', label: t('All Status') },
                                ...allTaskStatuses.map((s: any) => ({ value: s.id.toString(), label: s.name }))
                            ]
                        },
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
                                { value: 'urgent', label: t('Urgent') }
                            ]
                        },
                        {
                            name: 'project_id',
                            label: t('Project'),
                            type: 'select',
                            searchable: true,
                            value: selectedProject,
                            onChange: setSelectedProject,
                            options: [
                                { value: 'all', label: t('All Projects') },
                                ...allProjects.map((p: any) => ({ value: p.id.toString(), label: p.name }))
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
                                ...allUsers.map((u: any) => ({ value: u.id.toString(), label: u.name }))
                            ]
                        }
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    hideViewToggle={true}
                />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 kanban-board-scroll" style={{ height: 'calc(100vh - 240px)' }}>
                        {statuses.map((status: any) => {
                            const statusTasks = kanbanData?.[status.id]?.items || [];
                            const colBg = status.color ? `${status.color}12` : '#f8fafc';
                            const colBorder = status.color ? `${status.color}30` : '#e2e8f0';
                            return (
                                <div
                                    key={status.id}
                                    className="flex-shrink-0 flex flex-col rounded-xl border"
                                    style={{ width: '300px', minWidth: '300px', backgroundColor: colBg, borderColor: colBorder, height: '100%' }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const taskId = e.dataTransfer.getData('taskId');
                                        if (!taskId) return;
                                        if (!hasPermission(permissions, 'move-project-task')) { toast.error(t('Permission denied.')); return; }
                                        toast.loading(t('Updating task status...'));
                                        router.put(route('project-tasks.update-status', taskId), { task_status_id: status.id }, {
                                            preserveState: true,
                                            preserveScroll: true,
                                            onSuccess: (page) => {
                                                toast.dismiss();
                                                if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                                                else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
                                                router.reload();
                                            },
                                            onError: () => { toast.dismiss(); toast.error(t('Failed to update task status')); }
                                        });
                                    }}
                                >
                                    {/* Column header */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: colBorder }}>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }}></span>
                                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{status.name}</span>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: status.color + '22', color: status.color }}>
                                                {statusTasks.length}
                                            </span>
                                        </div>
                                        {hasPermission(permissions, 'create-project-tasks') && (
                                            <button
                                                onClick={() => handleAddTask(status.id.toString())}
                                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/60 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                                                title={t('Add Task')}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Cards */}
                                    <div className="flex-1 overflow-y-auto kanban-col-scroll p-3 space-y-3">
                                        {statusTasks.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                                                <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center mb-2">
                                                    <User className="h-6 w-6 text-gray-300" />
                                                </div>
                                                <p className="text-xs text-gray-400">{t('Drop tasks here')}</p>
                                            </div>
                                        ) : statusTasks.map((task: any) => (
                                            <div
                                                key={task.id}
                                                draggable={hasPermission(permissions, 'move-project-task')}
                                                onDragStart={(e) => {
                                                    if (!hasPermission(permissions, 'move-project-task')) { e.preventDefault(); return; }
                                                    isDraggingRef.current = true;
                                                    e.dataTransfer.setData('taskId', task.id.toString());
                                                    e.currentTarget.classList.add('opacity-50');
                                                }}
                                                onDragEnd={(e) => {
                                                    e.currentTarget.classList.remove('opacity-50');
                                                    setTimeout(() => { isDraggingRef.current = false; }, 150);
                                                }}
                                                className={hasPermission(permissions, 'move-project-task') ? 'cursor-grab active:cursor-grabbing' : ''}
                                            >
                                                <div
                                                    className={cn(
                                                        "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-200",
                                                        canView && "cursor-pointer"
                                                    )}
                                                    onClick={(e) => {
                                                        if (isDraggingRef.current) return;
                                                        const target = e.target as HTMLElement;
                                                        if (target.closest('button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-radix-collection-item]')) {
                                                            return;
                                                        }
                                                        const selection = window.getSelection();
                                                        if (selection && selection.toString().trim().length > 0) {
                                                            return;
                                                        }
                                                        if (canView) {
                                                            handleAction('view', task);
                                                        }
                                                    }}
                                                >
                                                    <div className="p-3">
                                                        {/* Top row: title + menu */}
                                                        <div className="flex items-start gap-2.5 mb-2.5">
                                                            <div className="flex-1 min-w-0">
                                                                <h4
                                                                    className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight truncate hover:text-primary transition-colors"
                                                                >
                                                                    {task.title}
                                                                </h4>
                                                                {task.project?.name && (
                                                                    <p className="text-xs text-gray-500 truncate mt-0.5">{task.project.name}</p>
                                                                )}
                                                            </div>
                                                            {(hasPermission(permissions, 'view-project-tasks') || hasPermission(permissions, 'edit-project-tasks') || hasPermission(permissions, 'delete-project-tasks')) && (
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0 text-gray-400 hover:text-gray-600">
                                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="w-32">
                                                                        {hasPermission(permissions, 'view-project-tasks') && (
                                                                            <DropdownMenuItem onClick={() => handleAction('view', task)}>
                                                                                <Eye className="h-4 w-4 mr-2" />{t('View')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {hasPermission(permissions, 'edit-project-tasks') && (
                                                                            <DropdownMenuItem onClick={() => handleAction('edit', task)}>
                                                                                <Edit className="h-4 w-4 mr-2" />{t('Edit')}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                        {hasPermission(permissions, 'delete-project-tasks') && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onClick={() => handleAction('delete', task)} className="text-red-600">
                                                                                    <Trash2 className="h-4 w-4 mr-2" />{t('Delete')}
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            )}
                                                        </div>

                                                        {/* Priority badge */}
                                                        <div className="flex flex-wrap gap-1 mb-2.5">
                                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${priorityColors[task.priority] || priorityColors.medium}`}>
                                                                {t(task.priority.charAt(0).toUpperCase() + task.priority.slice(1))}
                                                            </span>
                                                        </div>

                                                        {/* Progress bar */}
                                                        <div className="mb-2.5">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-gray-500">{t('Progress')}</span>
                                                                <span className="font-medium text-gray-700">{task.progress}%</span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                                <div
                                                                    className="h-1.5 rounded-full transition-all duration-300 bg-primary"
                                                                    style={{ width: `${task.progress}%` }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Footer: due date + assigned avatar */}
                                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>
                                                                    {t('Due')}:{' '}{task.due_date
                                                                        ? (window.appSettings?.formatDateTime(task.due_date, false) || new Date(task.due_date).toLocaleDateString())
                                                                        : t('No due date')}
                                                                </span>
                                                            </div>
                                                            {task.assigned_user ? (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Avatar className="h-7 w-7 cursor-pointer">
                                                                                <AvatarImage src={task.assigned_user.avatar} />
                                                                                <AvatarFallback className="text-xs" style={{ backgroundColor: status.color + '33', color: status.color }}>
                                                                                    {getInitials(task.assigned_user.name)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{task.assigned_user.name}</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ) : (
                                                                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                                    <User className="h-3 w-3 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    ...(hasPermission(permissions, 'export-project-tasks') && { exportRoute: 'project-task.export' }),
                    fields: [
                        { name: 'title', label: t('Task Title'), type: 'text', required: true, placeholder: t('e.g. Design homepage mockup, Fix login bug') },
                        { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('Enter task description...') },
                        {
                            name: formMode === 'view' ? 'project_name' : 'project_id',
                            label: t('Project'),
                            type: formMode === 'view' ? 'text' : 'select',
                            required: true,
                            searchable: true,
                            readOnly: formMode === 'view',
                            emptyNote: { link: route('projects.index'), linkText: t('Projects') },
                            options: formMode === 'view' ? [] : projects.map((p: any) => ({ value: String(p.id), label: p.name })),
                            onChange: (value: string) => {
                                setParentTasks([]);
                                if (formMode === 'create' && value) {
                                    fetch(route('api.projects.details', value))
                                        .then(res => res.json())
                                        .then(data => setParentTasks(data.parent_tasks || []))
                                        .catch(() => {});
                                }
                            }
                        },
                        {
                            name: 'parent_id',
                            label: t('Parent Task'),
                            type: 'custom',
                            render: (_field: any, formData: any, handleChange: any, _errors: any, mode: any) => {
                                if (mode === 'view') {
                                    return <div className="p-2 border rounded-md bg-gray-50">{formData.parent_name || '-'}</div>;
                                }
                                return (
                                    <ParentTaskSelect
                                        tasksRef={dynamicParentTasksRef}
                                        value={formData.parent_id || ''}
                                        onChange={(value) => handleChange('parent_id', value)}
                                    />
                                );
                            }
                        },
                        { name: 'start_date', label: t('Start Date'), type: 'date' },
                        { name: 'due_date', label: t('Due Date'), type: 'date' },
                        {
                            name: 'priority',
                            label: t('Priority'),
                            type: 'select',
                            options: [
                                { value: 'low', label: t('Low') },
                                { value: 'medium', label: t('Medium') },
                                { value: 'high', label: t('High') },
                                { value: 'urgent', label: t('Urgent') }
                            ],
                            defaultValue: 'medium'
                        },
                        {
                            name: 'task_status_id',
                            label: t('Status'),
                            type: 'select',
                            required: true,
                            searchable: true,
                            emptyNote: { link: route('task-statuses.index'), linkText: t('Task Statuses') },
                            options: taskStatuses.map((s: any) => ({ value: String(s.id), label: s.name })),
                            defaultValue: prefilledStatus ? String(prefilledStatus) : String(taskStatuses.find((s: any) => s.name === 'To Do')?.id || taskStatuses[0]?.id || ''),
                            hidden: formMode === 'create' && !!prefilledStatus
                        },
                        { name: 'estimated_hours', label: t('Estimated Hours'), type: 'number', step: '0.5', placeholder: t('e.g. 8') },
                        { name: 'actual_hours', label: t('Actual Hours'), type: 'number', step: '0.5', placeholder: t('e.g. 6.5') },
                        { name: 'progress', label: t('Progress (%)'), type: 'number', min: '0', max: '100', placeholder: t('e.g. 50') },
                        {
                            name: formMode === 'view' ? 'assigned_user_name' : 'assigned_to',
                            label: t('Assign To'),
                            type: formMode === 'view' ? 'text' : 'select',
                            required: true,
                            searchable: true,
                            emptyNote: { link: route('users.index'), linkText: t('Users') },
                            options: formMode === 'view' ? [] : users.map((u: any) => ({ value: String(u.id), label: `${u.name} (${u.email})` })),
                            readOnly: formMode === 'view'
                        }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    project_id: currentItem.project?.id ? String(currentItem.project.id) : '',
                    assigned_to: currentItem.assigned_user?.id ? String(currentItem.assigned_user.id) : '',
                    task_status_id: currentItem.task_status_id ? String(currentItem.task_status_id) : '',
                    parent_id: currentItem.parent_id ? String(currentItem.parent_id) : '',
                    assigned_user_name: currentItem.assigned_user?.name || t('Unassigned'),
                    project_name: currentItem.project?.name || t('No Project'),
                    parent_name: currentItem.parent?.title || t('No Parent Task')
                } : null}
                title={formMode === 'create' ? t('Add Task') : formMode === 'edit' ? t('Edit Task') : t('View Task')}
                mode={formMode}
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.title || ''}
                entityName={t('task')}
            />
        </PageTemplate>
    );
}
