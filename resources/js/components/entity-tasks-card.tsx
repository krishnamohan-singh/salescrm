import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { useTranslation } from 'react-i18next';
import { useInitials } from '@/hooks/use-initials';
import {
    ListTodo,
    CheckSquare,
    Plus,
    Check,
    Calendar,
    Clock,
    Edit,
    Trash2,
    Phone,
    Mail,
    Users,
    Video,
    AlertCircle
} from 'lucide-react';

interface EntityTasksCardProps {
    entityType: 'lead' | 'account' | 'contact' | 'opportunity';
    entityId: number;
    entityName: string;
    tasks?: any[];
    users?: any[];
    taskStatuses?: any[];
    taskTypes?: any[];
    taskPriorities?: any[];
    defaultAssignedTo?: number | string;
}

export function EntityTasksCard({
    entityType,
    entityId,
    entityName,
    tasks = [],
    users = [],
    taskStatuses = [],
    taskTypes = [],
    taskPriorities = [],
    defaultAssignedTo,
}: EntityTasksCardProps) {
    const { t } = useTranslation();
    const getInitials = useInitials();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        parent_type: entityType,
        parent_id: entityId,
        [`${entityType}_id`]: entityId,
        assigned_to: defaultAssignedTo ? String(defaultAssignedTo) : (users[0]?.id ? String(users[0].id) : ''),
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
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const handleOpenCreate = () => {
        setEditingTask(null);
        setFormData({
            title: '',
            parent_type: entityType,
            parent_id: entityId,
            [`${entityType}_id`]: entityId,
            assigned_to: defaultAssignedTo ? String(defaultAssignedTo) : (users[0]?.id ? String(users[0].id) : ''),
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
        setIsModalOpen(true);
    };

    const handleOpenEdit = (task: any) => {
        setEditingTask(task);
        setFormData({
            title: task.title,
            parent_type: entityType,
            parent_id: entityId,
            [`${entityType}_id`]: entityId,
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
        setIsModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};
        if (!formData.title.trim()) errors.title = t('Task title is required');
        if (!formData.due_date) errors.due_date = t('Due date is required');

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setIsSubmitting(true);
        if (editingTask) {
            router.put(route('tasks.update', editingTask.id), formData, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsModalOpen(false);
                    setEditingTask(null);
                    setIsSubmitting(false);
                },
                onError: (err: any) => {
                    setFormErrors(err);
                    setIsSubmitting(false);
                },
            });
        } else {
            router.post(route('tasks.store'), formData, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsModalOpen(false);
                    setIsSubmitting(false);
                },
                onError: (err: any) => {
                    setFormErrors(err);
                    setIsSubmitting(false);
                },
            });
        }
    };

    const handleToggleStatus = (task: any) => {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        router.post(route('tasks.update-status', task.id), { status: newStatus }, {
            preserveScroll: true,
        });
    };

    const handleConfirmDelete = () => {
        if (taskToDelete) {
            router.delete(route('tasks.destroy', taskToDelete.id), {
                preserveScroll: true,
                onSuccess: () => setIsDeleteModalOpen(false),
            });
        }
    };

    const isOverdue = (dueDate: string, status: string) => {
        if (status === 'completed' || status === 'cancelled') return false;
        const today = new Date().toISOString().split('T')[0];
        return dueDate < today;
    };

    return (
        <>
            <Card className="shadow-sm">
                <CardHeader className="border-b py-3.5 px-5 flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center text-lg font-semibold">
                        <ListTodo className="h-5 w-5 mr-3 text-primary" />
                        {t('Tasks & Follow-ups')}
                        <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                            {tasks.length}
                        </span>
                    </CardTitle>
                    <Button type="button" size="sm" onClick={handleOpenCreate}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        {t('Schedule Task')}
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                                <CheckSquare className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-medium text-foreground">{t('No tasks or follow-ups scheduled')}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                                {t('Schedule a follow-up call, meeting, demo, or reminder for this {{type}}.', { type: t(entityType) })}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {tasks.map((task: any) => {
                                const overdue = isOverdue(task.due_date, task.status);
                                const isCompleted = task.status === 'completed';

                                return (
                                    <div
                                        key={task.id}
                                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors ${
                                            isCompleted ? 'opacity-65 bg-muted/20' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* 1-Click Complete Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(task)}
                                                className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all mt-0.5 ${
                                                    isCompleted
                                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                                        : 'border-muted-foreground/30 hover:border-emerald-500 text-transparent'
                                                }`}
                                            >
                                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                                            </button>

                                             <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                                        {task.title}
                                                    </span>

                                                    {/* Type Badge */}
                                                    {task.task_type ? (
                                                        <span
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                                                            style={{
                                                                backgroundColor: `${task.task_type.color || '#3b82f6'}18`,
                                                                color: task.task_type.color || '#3b82f6',
                                                                borderColor: `${task.task_type.color || '#3b82f6'}40`,
                                                            }}
                                                        >
                                                            {task.task_type.name}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border">
                                                            {task.type ? (task.type.charAt(0).toUpperCase() + task.type.slice(1).replace(/_/g, ' ')) : t('Follow-up')}
                                                        </span>
                                                    )}

                                                    {/* Priority Badge */}
                                                    {task.task_priority ? (
                                                        <span
                                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                                                            style={{
                                                                backgroundColor: `${task.task_priority.color || '#f59e0b'}18`,
                                                                color: task.task_priority.color || '#f59e0b',
                                                                borderColor: `${task.task_priority.color || '#f59e0b'}40`,
                                                            }}
                                                        >
                                                            {task.task_priority.name}
                                                        </span>
                                                    ) : (
                                                        <>
                                                            {task.priority === 'urgent' && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                                                    {t('Urgent')}
                                                                </span>
                                                            )}
                                                            {task.priority === 'high' && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                                                                    {t('High')}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}

                                                    {/* Status Badge */}
                                                    {task.task_status ? (
                                                        <span
                                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border"
                                                            style={{
                                                                backgroundColor: `${task.task_status.color || '#6366f1'}18`,
                                                                color: task.task_status.color || '#6366f1',
                                                                borderColor: `${task.task_status.color || '#6366f1'}40`,
                                                            }}
                                                        >
                                                            {task.task_status.name}
                                                        </span>
                                                    ) : null}
                                                </div>

                                                {task.description && (
                                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                                    <span className={`flex items-center gap-1 font-medium ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {task.due_date} {task.due_time ? `at ${task.due_time.substring(0, 5)}` : ''}
                                                        {overdue && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded font-bold">{t('Overdue')}</span>}
                                                    </span>

                                                    {task.assigned_user && (
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="text-muted-foreground/40">·</span>
                                                            <Avatar className="h-4 w-4">
                                                                {task.assigned_user.avatar && <AvatarImage src={task.assigned_user.avatar} />}
                                                                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">{getInitials(task.assigned_user.name)}</AvatarFallback>
                                                            </Avatar>
                                                            <span>{task.assigned_user.name}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 self-end sm:self-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                onClick={() => handleOpenEdit(task)}
                                            >
                                                <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                onClick={() => {
                                                    setTaskToDelete(task);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create / Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
                        <DialogTitle className="text-lg font-semibold">
                            {editingTask ? t('Edit Task / Follow-up') : t('Schedule Task / Follow-up')}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground mt-1">
                            {t('Set up a scheduled call, meeting, demo, or task for {{name}}', { name: entityName })}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 max-h-[calc(90vh-150px)]">
                            {/* Task Title */}
                            <div className="space-y-1.5">
                                <Label htmlFor="entity-task-title" required>
                                    {t('Task Title')}
                                </Label>
                                <Input
                                    id="entity-task-title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={t('e.g. Call client for contract review')}
                                    className={formErrors.title ? 'border-red-500' : ''}
                                />
                                <p className="text-xs text-red-500">{formErrors.title}</p>
                            </div>

                            {/* Type & Priority */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="entity-task-type" required>
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
                                        <SelectTrigger id="entity-task-type">
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
                                    <Label htmlFor="entity-task-priority" required>
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
                                        <SelectTrigger id="entity-task-priority">
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
                                    <Label htmlFor="entity-task-due-date" required>
                                        {t('Due Date')}
                                    </Label>
                                    <Input
                                        id="entity-task-due-date"
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                        className={formErrors.due_date ? 'border-red-500' : ''}
                                    />
                                    {formErrors.due_date && <p className="text-xs text-red-500">{formErrors.due_date}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="entity-task-due-time">
                                        {t('Time (Optional)')}
                                    </Label>
                                    <Input
                                        id="entity-task-due-time"
                                        type="time"
                                        value={formData.due_time}
                                        onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Assigned To & Status */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="entity-task-assigned-to">
                                        {t('Assign To')}
                                    </Label>
                                    <Select
                                        value={formData.assigned_to ? String(formData.assigned_to) : undefined}
                                        onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}
                                    >
                                        <SelectTrigger id="entity-task-assigned-to">
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
                                    <Label htmlFor="entity-task-status">
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
                                        <SelectTrigger id="entity-task-status">
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
                                <Label htmlFor="entity-task-description">
                                    {t('Notes / Agenda')}
                                </Label>
                                <Textarea
                                    id="entity-task-description"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('Add key discussion points, agenda, or background details...')}
                                />
                            </div>
                        </div>

                        <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? t('Saving...') : (editingTask ? t('Update Task') : t('Schedule Task'))}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                itemName={taskToDelete?.title || ''}
                entityName={t('Task')}
            />
        </>
    );
}
