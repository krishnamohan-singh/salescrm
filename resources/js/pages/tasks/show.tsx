import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Circle,
    Calendar,
    Clock,
    User,
    Building,
    Phone,
    Mail,
    Edit,
    Trash2,
    Send,
    Plus,
    FileText,
    Users,
    Video,
    CheckSquare,
    AlertCircle,
    ExternalLink,
    Check,
    X,
    MessageSquare,
    StickyNote,
    UserCheck,
    Target,
    Briefcase,
    Globe,
    Layers,
    Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { useInitials } from '@/hooks/use-initials';
import { formatRelativeTime } from '@/utils/helper';

interface TaskNote {
    id: number;
    task_id: number;
    user_id: number;
    note: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email?: string;
        avatar?: string;
    };
}

interface Task {
    id: number;
    title: string;
    description?: string;
    parent_type?: string;
    parent_id?: number;
    lead_id?: number;
    account_id?: number;
    contact_id?: number;
    opportunity_id?: number;
    task_status_id?: number;
    task_type_id?: number;
    task_priority_id?: number;
    status: string;
    type: string;
    priority: string;
    assigned_to?: number;
    created_by: number;
    due_date: string;
    due_time?: string;
    completed_at?: string;
    created_at: string;
    updated_at: string;
    lead?: any;
    account?: any;
    contact?: any;
    opportunity?: any;
    assigned_user?: any;
    creator?: any;
    task_status?: any;
    task_type?: any;
    task_priority?: any;
    notes?: TaskNote[];
}

interface Props {
    task: Task;
    taskStatuses: any[];
    taskTypes: any[];
    taskPriorities: any[];
    leads?: any[];
    accounts?: any[];
    contacts?: any[];
    opportunities?: any[];
    users?: any[];
    canEdit: boolean;
    canDelete: boolean;
}

export default function TaskShow({
    task,
    taskStatuses = [],
    taskTypes = [],
    taskPriorities = [],
    leads = [],
    accounts = [],
    contacts = [],
    opportunities = [],
    users = [],
    canEdit,
    canDelete,
}: Props) {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { auth } = usePage().props as any;
    const currentUser = auth?.user;

    // Notes State
    const [newNote, setNewNote] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [editNoteText, setEditNoteText] = useState('');
    const [isSavingEditNote, setIsSavingEditNote] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<TaskNote | null>(null);
    const [isDeleteNoteModalOpen, setIsDeleteNoteModalOpen] = useState(false);

    // Task Actions State
    const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

    // Edit Task Form State
    let initialParentType = 'none';
    let initialParentId = '';
    if (task.lead_id) {
        initialParentType = 'lead';
        initialParentId = String(task.lead_id);
    } else if (task.account_id) {
        initialParentType = 'account';
        initialParentId = String(task.account_id);
    } else if (task.contact_id) {
        initialParentType = 'contact';
        initialParentId = String(task.contact_id);
    } else if (task.opportunity_id) {
        initialParentType = 'opportunity';
        initialParentId = String(task.opportunity_id);
    }

    const [editFormData, setEditFormData] = useState({
        title: task.title || '',
        parent_type: initialParentType,
        parent_id: initialParentId,
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
    const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

    const isCompleted = task.status === 'completed';
    const isOverdue = !isCompleted && task.due_date && new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

    // Handle Quick Status Toggle (Pending <-> Completed)
    const handleToggleStatus = () => {
        const newStatus = isCompleted ? 'pending' : 'completed';
        router.post(
            route('tasks.update-status', task.id),
            { status: newStatus },
            { preserveScroll: true }
        );
    };

    // Handle Quick Status Dropdown Change
    const handleQuickStatusChange = (statusValue: string) => {
        router.post(
            route('tasks.update-status', task.id),
            { status: statusValue },
            { preserveScroll: true }
        );
    };

    // Handle Add Note
    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim()) return;

        setIsSubmittingNote(true);
        router.post(
            route('tasks.notes.store', task.id),
            { note: newNote },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setNewNote('');
                    setIsSubmittingNote(false);
                },
                onError: () => {
                    setIsSubmittingNote(false);
                },
            }
        );
    };

    // Handle Update Note
    const handleSaveNoteEdit = (noteId: number) => {
        if (!editNoteText.trim()) return;

        setIsSavingEditNote(true);
        router.put(
            route('tasks.notes.update', { task: task.id, note: noteId }),
            { note: editNoteText },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingNoteId(null);
                    setEditNoteText('');
                    setIsSavingEditNote(false);
                },
                onError: () => {
                    setIsSavingEditNote(false);
                },
            }
        );
    };

    // Handle Delete Note
    const handleConfirmDeleteNote = () => {
        if (!noteToDelete) return;

        router.delete(
            route('tasks.notes.destroy', { task: task.id, note: noteToDelete.id }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsDeleteNoteModalOpen(false);
                    setNoteToDelete(null);
                },
            }
        );
    };

    // Handle Delete Task
    const handleConfirmDeleteTask = () => {
        router.delete(route('tasks.destroy', task.id), {
            onSuccess: () => {
                router.visit(route('tasks.index'));
            },
        });
    };

    // Handle Submit Edit Task Modal
    const handleEditTaskSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errors: Record<string, string> = {};

        if (!editFormData.title.trim()) errors.title = t('Task title is required');
        if (editFormData.parent_type !== 'none' && !editFormData.parent_id) {
            errors.parent_id = t('Please select a related record');
        }
        if (!editFormData.due_date) errors.due_date = t('Due date is required');

        if (Object.keys(errors).length > 0) {
            setEditFormErrors(errors);
            return;
        }

        setIsSubmittingEdit(true);
        router.put(route('tasks.update', task.id), editFormData, {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditModalOpen(false);
                setIsSubmittingEdit(false);
            },
            onError: (err: any) => {
                setEditFormErrors(err);
                setIsSubmittingEdit(false);
            },
        });
    };

    // Breadcrumbs
    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Task Management') },
        { title: t('Tasks & Follow-ups'), href: route('tasks.index') },
        { title: task.title },
    ];

    // Page Actions
    const pageActions = [
        {
            label: t('Back to Tasks'),
            icon: <ArrowLeft className="h-4 w-4 mr-1.5" />,
            variant: 'outline' as const,
            onClick: () => router.visit(route('tasks.index')),
        },
    ];

    if (canEdit) {
        pageActions.push({
            label: isCompleted ? t('Mark as Pending') : t('Mark Completed'),
            icon: isCompleted ? <Circle className="h-4 w-4 mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />,
            variant: isCompleted ? ('outline' as const) : ('default' as const),
            onClick: handleToggleStatus,
        });

        pageActions.push({
            label: t('Edit Task'),
            icon: <Edit className="h-4 w-4 mr-1.5" />,
            variant: 'outline' as const,
            onClick: () => {
                setEditFormData({
                    title: task.title || '',
                    parent_type: initialParentType,
                    parent_id: initialParentId,
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
                setEditFormErrors({});
                setIsEditModalOpen(true);
            },
        });
    }

    if (canDelete) {
        pageActions.push({
            label: t('Delete'),
            icon: <Trash2 className="h-4 w-4 mr-1.5" />,
            variant: 'destructive' as const,
            onClick: () => setIsDeleteTaskModalOpen(true),
        });
    }

    // Type Badge Renderer
    const renderTypeBadge = () => {
        if (task.task_type) {
            return (
                <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                    style={{
                        backgroundColor: `${task.task_type.color || '#3b82f6'}18`,
                        color: task.task_type.color || '#3b82f6',
                        borderColor: `${task.task_type.color || '#3b82f6'}40`,
                    }}
                >
                    <CheckSquare className="h-3.5 w-3.5" />
                    {task.task_type.name}
                </span>
            );
        }

        const rawType = (task.type || 'followup').toLowerCase().replace(/[\s\/-]+/g, '_');
        if (rawType.includes('call')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Phone className="h-3.5 w-3.5" />
                    {t('Phone Call')}
                </span>
            );
        }
        if (rawType.includes('meet')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Users className="h-3.5 w-3.5" />
                    {t('Meeting')}
                </span>
            );
        }
        if (rawType.includes('mail')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    <Mail className="h-3.5 w-3.5" />
                    {t('Email')}
                </span>
            );
        }
        if (rawType.includes('demo')) {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                    <Video className="h-3.5 w-3.5" />
                    {t('Product Demo')}
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Clock className="h-3.5 w-3.5" />
                {task.type ? (task.type.charAt(0).toUpperCase() + task.type.slice(1).replace(/_/g, ' ')) : t('Follow-up')}
            </span>
        );
    };

    // Priority Badge Renderer
    const renderPriorityBadge = () => {
        if (task.task_priority) {
            return (
                <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                    style={{
                        backgroundColor: `${task.task_priority.color}18`,
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
                return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800 animate-pulse">{t('Urgent')}</span>;
            case 'high':
                return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800">{t('High')}</span>;
            case 'low':
                return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{t('Low')}</span>;
            default:
                return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">{t('Medium')}</span>;
        }
    };

    // Status Badge Renderer
    const renderStatusBadge = () => {
        if (task.task_status) {
            return (
                <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                    style={{
                        backgroundColor: `${task.task_status.color}18`,
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
                return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">{t('Completed')}</span>;
            case 'in_progress':
                return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">{t('In Progress')}</span>;
            case 'cancelled':
                return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">{t('Cancelled')}</span>;
            default:
                return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">{t('Pending')}</span>;
        }
    };

    // Related Entity Details
    const renderRelatedEntityCard = () => {
        if (task.lead) {
            return (
                <Card className="shadow-sm border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-blue-600" />
                                {t('Related Lead')}
                            </CardTitle>
                            <Link
                                href={route('leads.show', task.lead.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                <span>{t('View Lead')}</span>
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <div>
                            <Link
                                href={route('leads.show', task.lead.id)}
                                className="text-base font-bold text-foreground hover:text-primary transition-colors"
                            >
                                {task.lead.name}
                            </Link>
                            {task.lead.company && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <Building className="h-3.5 w-3.5" />
                                    {task.lead.company}
                                </p>
                            )}
                        </div>

                        <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {task.lead.email && (
                                <a
                                    href={`mailto:${task.lead.email}`}
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
                                >
                                    <Mail className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                    <span className="truncate">{task.lead.email}</span>
                                </a>
                            )}
                            {task.lead.phone && (
                                <a
                                    href={`tel:${task.lead.phone}`}
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
                                >
                                    <Phone className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                    <span className="truncate">{task.lead.phone}</span>
                                </a>
                            )}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        if (task.account) {
            return (
                <Card className="shadow-sm border-l-4 border-l-indigo-500">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Building className="h-4 w-4 text-indigo-600" />
                                {t('Related Account')}
                            </CardTitle>
                            <Link
                                href={route('accounts.show', task.account.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                            >
                                <span>{t('View Account')}</span>
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <div>
                            <Link
                                href={route('accounts.show', task.account.id)}
                                className="text-base font-bold text-foreground hover:text-primary transition-colors"
                            >
                                {task.account.name}
                            </Link>
                            {task.account.website && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <Globe className="h-3.5 w-3.5" />
                                    {task.account.website}
                                </p>
                            )}
                        </div>

                        <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {task.account.email && (
                                <a
                                    href={`mailto:${task.account.email}`}
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
                                >
                                    <Mail className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                    <span className="truncate">{task.account.email}</span>
                                </a>
                            )}
                            {task.account.phone && (
                                <a
                                    href={`tel:${task.account.phone}`}
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
                                >
                                    <Phone className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                    <span className="truncate">{task.account.phone}</span>
                                </a>
                            )}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        if (task.contact) {
            return (
                <Card className="shadow-sm border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Users className="h-4 w-4 text-emerald-600" />
                                {t('Related Contact')}
                            </CardTitle>
                            <Link
                                href={route('contacts.show', task.contact.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                            >
                                <span>{t('View Contact')}</span>
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <div>
                            <Link
                                href={route('contacts.show', task.contact.id)}
                                className="text-base font-bold text-foreground hover:text-primary transition-colors"
                            >
                                {task.contact.name}
                            </Link>
                            {task.contact.job_title && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <Briefcase className="h-3.5 w-3.5" />
                                    {task.contact.job_title}
                                </p>
                            )}
                        </div>

                        <div className="pt-2 border-t grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {task.contact.email && (
                                <a
                                    href={`mailto:${task.contact.email}`}
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
                                >
                                    <Mail className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                    <span className="truncate">{task.contact.email}</span>
                                </a>
                            )}
                            {task.contact.phone && (
                                <a
                                    href={`tel:${task.contact.phone}`}
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
                                >
                                    <Phone className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                                    <span className="truncate">{task.contact.phone}</span>
                                </a>
                            )}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        if (task.opportunity) {
            return (
                <Card className="shadow-sm border-l-4 border-l-amber-500">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Target className="h-4 w-4 text-amber-600" />
                                {t('Related Opportunity')}
                            </CardTitle>
                            <Link
                                href={route('opportunities.show', task.opportunity.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
                            >
                                <span>{t('View Opportunity')}</span>
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-2">
                        <Link
                            href={route('opportunities.show', task.opportunity.id)}
                            className="text-base font-bold text-foreground hover:text-primary transition-colors"
                        >
                            {task.opportunity.name}
                        </Link>
                        {task.opportunity.amount && (
                            <p className="text-xs text-muted-foreground">
                                {t('Amount')}: <span className="font-semibold text-foreground font-mono">{window.appSettings?.formatCurrency ? window.appSettings.formatCurrency(task.opportunity.amount) : `$${task.opportunity.amount}`}</span>
                            </p>
                        )}
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card className="shadow-sm border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-medium">{t('General / Internal Task')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('This task is not tied to a specific lead, account, contact, or opportunity.')}
                    </p>
                </CardContent>
            </Card>
        );
    };

    const notesList = task.notes || [];

    return (
        <PageTemplate
            title={task.title}
            description={t('Task details, status tracking, and notes')}
            breadcrumbs={breadcrumbs}
            actions={pageActions}
            noPadding
        >
            <div className="space-y-6">
                {/* Metric Summary Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Status Card */}
                    <Card className="relative overflow-hidden shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Status')}</p>
                                    <div>{renderStatusBadge()}</div>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    {isCompleted ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Clock className="h-5 w-5" />}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Due Date Card */}
                    <Card className={`relative overflow-hidden shadow-sm ${isOverdue ? 'border-red-300 dark:border-red-800 bg-red-50/20' : ''}`}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <p className="text-xs font-medium text-muted-foreground">{t('Due Date')}</p>
                                        {isOverdue && (
                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                                                {t('Overdue')}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-sm font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                        {task.due_date}
                                        {task.due_time && (
                                            <span className="text-xs font-normal text-muted-foreground ml-1.5">
                                                {task.due_time.substring(0, 5)}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-950/60' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}`}>
                                    <Calendar className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Priority & Type Card */}
                    <Card className="relative overflow-hidden shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Priority & Type')}</p>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {renderPriorityBadge()}
                                    </div>
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Tag className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assigned User Card */}
                    <Card className="relative overflow-hidden shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 pr-2">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('Assigned To')}</p>
                                    {task.assigned_user ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6 flex-shrink-0">
                                                {task.assigned_user.avatar && <AvatarImage src={task.assigned_user.avatar} />}
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                                    {getInitials(task.assigned_user.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-semibold text-foreground truncate">
                                                {task.assigned_user.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">{t('Unassigned')}</p>
                                    )}
                                </div>
                                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                    <User className="h-5 w-5" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main 2-Column Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column (8 cols): Task Overview & Related Record */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                        {/* Task Overview Card */}
                        <Card className="shadow-sm">
                            <CardHeader className="border-b py-4 px-6 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-base font-semibold">{t('Task Overview')}</CardTitle>
                                </div>
                                <div>{renderTypeBadge()}</div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                {/* Title & Completion State */}
                                <div>
                                    <h2 className={`text-xl font-bold ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        {task.title}
                                    </h2>
                                    {isCompleted && task.completed_at && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5 font-medium">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            {t('Completed on')}{' '}
                                            {window.appSettings?.formatDateTime
                                                ? window.appSettings.formatDateTime(task.completed_at, true)
                                                : new Date(task.completed_at).toLocaleString()}
                                        </p>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                        {t('Description')}
                                    </h4>
                                    {task.description ? (
                                        <div className="p-4 rounded-xl bg-muted/40 border text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                            {task.description}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">
                                            {t('No description provided for this task.')}
                                        </p>
                                    )}
                                </div>

                                {/* Comprehensive Information Grid */}
                                <div className="pt-4 border-t">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                                        {t('Task Information')}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                        <div>
                                            <span className="text-xs text-muted-foreground block mb-0.5">{t('Activity Type')}</span>
                                            <span className="font-medium text-foreground">
                                                {task.task_type?.name || (task.type ? (task.type.charAt(0).toUpperCase() + task.type.slice(1).replace(/_/g, ' ')) : t('Follow-up'))}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-xs text-muted-foreground block mb-0.5">{t('Priority Level')}</span>
                                            <span className="font-medium text-foreground">
                                                {task.task_priority?.name || (task.priority ? (task.priority.charAt(0).toUpperCase() + task.priority.slice(1)) : t('Medium'))}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-xs text-muted-foreground block mb-0.5">{t('Due Schedule')}</span>
                                            <span className="font-medium text-foreground flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                {task.due_date}
                                                {task.due_time && (
                                                    <span className="text-xs text-muted-foreground">({task.due_time.substring(0, 5)})</span>
                                                )}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-xs text-muted-foreground block mb-0.5">{t('Assigned Agent')}</span>
                                            {task.assigned_user ? (
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Avatar className="h-5 w-5">
                                                        {task.assigned_user.avatar && <AvatarImage src={task.assigned_user.avatar} />}
                                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                                            {getInitials(task.assigned_user.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-medium text-foreground">{task.assigned_user.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground italic text-xs">{t('Unassigned')}</span>
                                            )}
                                        </div>

                                        <div>
                                            <span className="text-xs text-muted-foreground block mb-0.5">{t('Created By')}</span>
                                            <span className="font-medium text-foreground">
                                                {task.creator?.name || t('System')}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-xs text-muted-foreground block mb-0.5">{t('Created At')}</span>
                                            <span className="font-medium text-foreground">
                                                {window.appSettings?.formatDateTime
                                                    ? window.appSettings.formatDateTime(task.created_at, false)
                                                    : new Date(task.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Related Record Section */}
                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                                {t('Associated Record')}
                            </h3>
                            {renderRelatedEntityCard()}
                        </div>
                    </div>

                    {/* Right Column (4 cols): Quick Status & Task Notes */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                        {/* Quick Status Updater */}
                        <Card className="shadow-sm">
                            <CardHeader className="py-3.5 px-5 border-b">
                                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-primary" />
                                        {t('Quick Status Update')}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">
                                        {t('Change Status')}
                                    </Label>
                                    <Select
                                        value={task.task_status_id ? String(task.task_status_id) : task.status}
                                        onValueChange={handleQuickStatusChange}
                                        disabled={!canEdit}
                                    >
                                        <SelectTrigger className="w-full h-9">
                                            <SelectValue placeholder={t('Select status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {taskStatuses.length > 0 ? (
                                                taskStatuses.map((status) => (
                                                    <SelectItem key={status.id} value={status.name.toLowerCase().replace(/[\s\/-]+/g, '_')}>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="h-2.5 w-2.5 rounded-full"
                                                                style={{ backgroundColor: status.color || '#6366f1' }}
                                                            />
                                                            <span>{status.name}</span>
                                                        </div>
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

                                <div className="pt-2 border-t">
                                    <Button
                                        type="button"
                                        variant={isCompleted ? 'outline' : 'default'}
                                        size="sm"
                                        className="w-full flex items-center justify-center gap-2"
                                        onClick={handleToggleStatus}
                                        disabled={!canEdit}
                                    >
                                        {isCompleted ? (
                                            <>
                                                <Circle className="h-4 w-4" />
                                                <span>{t('Reopen Task')}</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span>{t('Mark as Completed')}</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Task Notes Section - Primary Feature */}
                        <Card className="shadow-sm">
                            <CardHeader className="py-4 px-5 border-b">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <StickyNote className="h-4 w-4 text-amber-500" />
                                        <span>{t('Task Notes & Remarks')}</span>
                                    </CardTitle>
                                    <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                                        {notesList.length}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground mt-1">
                                    {t('Log remarks, follow-up outcomes, meeting notes, or updates.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                {/* Add Note Box */}
                                <div className="p-4 border-b bg-muted/20">
                                    <form onSubmit={handleAddNote} className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="w-7 h-7 mt-1 flex-shrink-0">
                                                {currentUser?.avatar && <AvatarImage src={currentUser.avatar} />}
                                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                                                    {getInitials(currentUser?.name || 'U')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 rounded-xl border bg-background shadow-xs overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                                                <Textarea
                                                    placeholder={t('Write a note or remark about this task...')}
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                                            handleAddNote(e);
                                                        }
                                                    }}
                                                    className="border-0 resize-none focus-visible:ring-0 shadow-none text-sm p-3 min-h-[75px]"
                                                />
                                                <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {t('Tip: Cmd/Ctrl + Enter to save')}
                                                    </span>
                                                    <Button
                                                        type="submit"
                                                        size="sm"
                                                        disabled={!newNote.trim() || isSubmittingNote}
                                                        className="h-7 px-3 text-xs gap-1.5"
                                                    >
                                                        <Send className="h-3 w-3" />
                                                        <span>{isSubmittingNote ? t('Saving...') : t('Add Note')}</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>

                                {/* Notes Timeline List */}
                                <div className="divide-y divide-border max-h-[550px] overflow-y-auto">
                                    {notesList.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <div className="h-10 w-10 mx-auto rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
                                                <StickyNote className="h-5 w-5" />
                                            </div>
                                            <p className="text-xs font-semibold text-foreground">{t('No notes added yet')}</p>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                {t('Add your first note above to keep a paper trail.')}
                                            </p>
                                        </div>
                                    ) : (
                                        notesList.map((noteItem) => {
                                            const isEditing = editingNoteId === noteItem.id;
                                            const isAuthor = noteItem.user_id === currentUser?.id;
                                            const canModifyNote = isAuthor || canDelete;

                                            return (
                                                <div key={noteItem.id} className="p-4 hover:bg-muted/15 transition-colors">
                                                    {isEditing ? (
                                                        <div className="space-y-2">
                                                            <Textarea
                                                                value={editNoteText}
                                                                onChange={(e) => setEditNoteText(e.target.value)}
                                                                className="text-sm min-h-[70px] resize-none"
                                                            />
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-7 px-2.5 text-xs"
                                                                    onClick={() => {
                                                                        setEditingNoteId(null);
                                                                        setEditNoteText('');
                                                                    }}
                                                                >
                                                                    {t('Cancel')}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-7 px-3 text-xs"
                                                                    disabled={!editNoteText.trim() || isSavingEditNote}
                                                                    onClick={() => handleSaveNoteEdit(noteItem.id)}
                                                                >
                                                                    {isSavingEditNote ? t('Saving...') : t('Save Note')}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="h-6 w-6 flex-shrink-0">
                                                                        {noteItem.user?.avatar && <AvatarImage src={noteItem.user.avatar} />}
                                                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                                                                            {getInitials(noteItem.user?.name || 'U')}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="text-xs font-semibold text-foreground">
                                                                            {noteItem.user?.name || t('User')}
                                                                        </span>
                                                                        <span className="text-[11px] text-muted-foreground">
                                                                            • {formatRelativeTime(noteItem.created_at)}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {canModifyNote && (
                                                                    <div className="flex items-center gap-1">
                                                                        <TooltipProvider delayDuration={200}>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                                        onClick={() => {
                                                                                            setEditingNoteId(noteItem.id);
                                                                                            setEditNoteText(noteItem.note);
                                                                                        }}
                                                                                    >
                                                                                        <Edit className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent><p>{t('Edit Note')}</p></TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>

                                                                        <TooltipProvider delayDuration={200}>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                                                        onClick={() => {
                                                                                            setNoteToDelete(noteItem);
                                                                                            setIsDeleteNoteModalOpen(true);
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent><p>{t('Delete Note')}</p></TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="pl-8 text-xs text-foreground/90 whitespace-pre-line leading-relaxed">
                                                                {noteItem.note}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Edit Task Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">{t('Edit Task')}</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {t('Update details, schedule, or related entity for this task.')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditTaskSubmit} className="space-y-4 pt-2">
                        {/* Task Title */}
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-task-title" required>
                                {t('Task Title')}
                            </Label>
                            <Input
                                id="edit-task-title"
                                value={editFormData.title}
                                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                placeholder={t('e.g., Follow up with client regarding proposal')}
                                className={editFormErrors.title ? 'border-red-500' : ''}
                            />
                            {editFormErrors.title && <p className="text-xs text-red-500">{editFormErrors.title}</p>}
                        </div>

                        {/* Related Entity Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>{t('Related Module')}</Label>
                                <Select
                                    value={editFormData.parent_type}
                                    onValueChange={(val) => setEditFormData({ ...editFormData, parent_type: val, parent_id: '' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select module')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t('None (General Task)')}</SelectItem>
                                        <SelectItem value="lead">{t('Lead')}</SelectItem>
                                        <SelectItem value="account">{t('Account')}</SelectItem>
                                        <SelectItem value="contact">{t('Contact')}</SelectItem>
                                        <SelectItem value="opportunity">{t('Opportunity')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {editFormData.parent_type !== 'none' && (
                                <div className="space-y-1.5">
                                    <Label required>{t('Select Record')}</Label>
                                    <Select
                                        value={editFormData.parent_id}
                                        onValueChange={(val) => setEditFormData({ ...editFormData, parent_id: val })}
                                    >
                                        <SelectTrigger className={editFormErrors.parent_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={t('Select record')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {editFormData.parent_type === 'lead' &&
                                                leads.map((l: any) => (
                                                    <SelectItem key={l.id} value={String(l.id)}>
                                                        {l.name} {l.company ? `(${l.company})` : ''}
                                                    </SelectItem>
                                                ))}
                                            {editFormData.parent_type === 'account' &&
                                                accounts.map((a: any) => (
                                                    <SelectItem key={a.id} value={String(a.id)}>
                                                        {a.name}
                                                    </SelectItem>
                                                ))}
                                            {editFormData.parent_type === 'contact' &&
                                                contacts.map((c: any) => (
                                                    <SelectItem key={c.id} value={String(c.id)}>
                                                        {c.name} {c.email ? `(${c.email})` : ''}
                                                    </SelectItem>
                                                ))}
                                            {editFormData.parent_type === 'opportunity' &&
                                                opportunities.map((o: any) => (
                                                    <SelectItem key={o.id} value={String(o.id)}>
                                                        {o.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    {editFormErrors.parent_id && <p className="text-xs text-red-500">{editFormErrors.parent_id}</p>}
                                </div>
                            )}
                        </div>

                        {/* Task Type, Priority, Status Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label>{t('Task Type')}</Label>
                                <Select
                                    value={editFormData.task_type_id}
                                    onValueChange={(val) => setEditFormData({ ...editFormData, task_type_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select Type')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {taskTypes.map((tt: any) => (
                                            <SelectItem key={tt.id} value={String(tt.id)}>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tt.color }} />
                                                    <span>{tt.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Priority')}</Label>
                                <Select
                                    value={editFormData.task_priority_id}
                                    onValueChange={(val) => setEditFormData({ ...editFormData, task_priority_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select Priority')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {taskPriorities.map((tp: any) => (
                                            <SelectItem key={tp.id} value={String(tp.id)}>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tp.color }} />
                                                    <span>{tp.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Status')}</Label>
                                <Select
                                    value={editFormData.task_status_id}
                                    onValueChange={(val) => setEditFormData({ ...editFormData, task_status_id: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select Status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {taskStatuses.map((ts: any) => (
                                            <SelectItem key={ts.id} value={String(ts.id)}>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ts.color }} />
                                                    <span>{ts.name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Due Date & Time, Assigned Agent Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-task-due-date" required>
                                    {t('Due Date')}
                                </Label>
                                <Input
                                    id="edit-task-due-date"
                                    type="date"
                                    value={editFormData.due_date}
                                    onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                                    className={editFormErrors.due_date ? 'border-red-500' : ''}
                                />
                                {editFormErrors.due_date && <p className="text-xs text-red-500">{editFormErrors.due_date}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="edit-task-due-time">{t('Due Time')}</Label>
                                <Input
                                    id="edit-task-due-time"
                                    type="time"
                                    value={editFormData.due_time}
                                    onChange={(e) => setEditFormData({ ...editFormData, due_time: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>{t('Assigned To')}</Label>
                                <Select
                                    value={editFormData.assigned_to}
                                    onValueChange={(val) => setEditFormData({ ...editFormData, assigned_to: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Assign user')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>
                                                {u.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-task-desc">{t('Description')}</Label>
                            <Textarea
                                id="edit-task-desc"
                                value={editFormData.description}
                                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                placeholder={t('Task context, notes, or next actions...')}
                                rows={3}
                            />
                        </div>

                        <DialogFooter className="pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditModalOpen(false)}
                                disabled={isSubmittingEdit}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" disabled={isSubmittingEdit}>
                                {isSubmittingEdit ? t('Saving...') : t('Save Changes')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Task Confirmation Modal */}
            <CrudDeleteModal
                isOpen={isDeleteTaskModalOpen}
                onClose={() => setIsDeleteTaskModalOpen(false)}
                onConfirm={handleConfirmDeleteTask}
                itemName={task.title}
                entityName={t('Task')}
            />

            {/* Delete Note Confirmation Modal */}
            <CrudDeleteModal
                isOpen={isDeleteNoteModalOpen}
                onClose={() => {
                    setIsDeleteNoteModalOpen(false);
                    setNoteToDelete(null);
                }}
                onConfirm={handleConfirmDeleteNote}
                itemName={t('this note')}
                entityName={t('Note')}
            />
        </PageTemplate>
    );
}
