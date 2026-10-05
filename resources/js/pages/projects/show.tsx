import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Calendar, DollarSign, User, Building2, AlertTriangle, Clock, LayoutGrid, Edit, ArrowLeft, BarChart3, BanknoteIcon } from 'lucide-react';
import { hasPermission } from '@/utils/authorization';
import UserInitials from '@/components/user-initials';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { formatCurrency } from '@/utils/helper';

export default function ProjectShow() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { auth, project, taskStats = {}, totalTasks = 0, completedTasks = 0, progressPercentage = 0, meetings, taskStatuses = [] } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const pageActions = [];
    pageActions.push({
        label: t('Back'),
        icon: <ArrowLeft className="h-4 w-4 mr-2" />,
        variant: 'outline',
        onClick: () => window.history.back()
    });

    if (hasPermission(permissions, 'view-project-tasks')) {
        pageActions.push({
            label: t('Kanban View'),
            icon: <LayoutGrid className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => router.get(route('projects.kanban', project.id))
        });

        pageActions.push({
            label: t('Gantt View'),
            icon: <BarChart3 className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => router.get(route('projects.gantt', project.id))
        });
    }


    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Project Management')},
        { title: t('Projects'), href: route('projects.index') },
        { title: t('View Project') }
    ];

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'on_hold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <PageTemplate
            title={project.name}
            description={t('Project details and related information')}
            url={`/projects/${project.id}`}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="space-y-6">
                {/* Project Header */}
                <Card>
                    <div className="flex items-start justify-between px-6 py-4 border-b">
                        <div>
                            <h1 className="text-lg font-bold">
                                {project.name}
                            </h1>
                            {project.code && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {t('Code')}: {project.code}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${project.priority === 'urgent' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20' :
                                project.priority === 'high' ? 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20' :
                                    project.priority === 'medium' ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20' :
                                        'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                                }`}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {t(project.priority.charAt(0).toUpperCase() + project.priority.slice(1))}
                            </span>
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${project.status === 'active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                                project.status === 'completed' ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20' :
                                    project.status === 'on_hold' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20' :
                                        'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                                }`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {t(project.status.replace('_', ' ').charAt(0).toUpperCase() + project.status.replace('_', ' ').slice(1))}
                            </span>
                        </div>
                    </div>
                    {project.description && (
                        <div className="px-6 py-4">
                            <p className="text-gray-700 dark:text-gray-300 max-w-3xl">{project.description}</p>
                        </div>
                    )}
                </Card>

                {/* Task Progress Chart */}
                {totalTasks > 0 && (
                    <Card>
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold">{t('Task Progress')}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('Overall Progress')}
                                </span>
                                <span className="text-lg font-bold text-primary">
                                    {progressPercentage}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-primary h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>
                            <div className={`grid gap-4 mt-4 ${taskStatuses.length <= 2 ? 'grid-cols-2' : taskStatuses.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
                                {taskStatuses.map((status: any) => (
                                    <div key={status.id} className="text-center p-3 rounded-lg" style={{ backgroundColor: `${status.color}20`, border: `1px solid ${status.color}40` }}>
                                        <div className="text-lg font-bold" style={{ color: status.color }}>
                                            {taskStats[status.name] || 0}
                                        </div>
                                        <div className="text-xs text-gray-500">{status.name}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                                {completedTasks} {t('of')} {totalTasks} {t('tasks completed')}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Project Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Account Information */}
                    <Card>
                        <div className="flex items-center gap-2 px-6 py-4 border-b">
                            <Building2 className="h-5 w-5 text-gray-400" />
                            <h3 className="text-lg font-semibold">{t('Account Information')}</h3>
                        </div>
                        <div className="p-6 space-y-3">
                            {project.account ? (
                                <div className="flex items-center gap-3">
                                    <UserInitials name={project.account.name} />
                                    <div>
                                        <p className="text-sm font-medium">{project.account.name}</p>
                                        <p className="text-xs text-muted-foreground">{project.account.email || '-'}</p>
                                    </div>
                                </div>
                            ) : <p className="text-sm">-</p>}
                            {project.account?.phone && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('Phone')}</p>
                                    <p className="text-sm mt-1">{project.account.phone}</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Project Timeline */}
                    <Card>
                        <div className="flex items-center gap-2 px-6 py-4 border-b">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            <h3 className="text-lg font-semibold">{t('Timeline')}</h3>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('Start Date')}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    <p className="text-sm">{project.start_date ? (window.appSettings?.formatDateTime(project.start_date, false) || new Date(project.start_date).toLocaleDateString()) : 'Not set'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('End Date')}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    <p className="text-sm">{project.end_date ? (window.appSettings?.formatDateTime(project.end_date, false) || new Date(project.end_date).toLocaleDateString()) : 'Not set'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('Created')}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                    <p className="text-sm">{window.appSettings?.formatDateTime(project.created_at, false) || new Date(project.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Budget & Assignment */}
                    <Card>
                        <div className="flex items-center gap-2 px-6 py-4 border-b">
                            <DollarSign className="h-5 w-5 text-gray-400" />
                            <h3 className="text-lg font-semibold">{t('Budget & Assignment')}</h3>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('Budget')}
                                </p>
                                <div className="flex items-center mt-1">
                                    <BanknoteIcon className="h-4 w-4 text-muted-foreground mr-2" />
                                    <p className="text-sm mt-1 font-mono">
                                        {project.budget ? formatCurrency(project.budget) : 'Not set'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('Assigned To')}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    {project.assigned_user ? (
                                        <>
                                            <Avatar className="w-7 h-7 flex-shrink-0">
                                                <AvatarImage src={project.assigned_user.avatar} alt={project.assigned_user.name} />
                                                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(project.assigned_user.name || '')}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{project.assigned_user.name}</p>
                                                {project.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{project.assigned_user.email}</p>}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{t('Unassigned')}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {t('Created By')}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    {project.creator ? (
                                        <>
                                            <Avatar className="w-7 h-7 flex-shrink-0">
                                                <AvatarImage src={project.creator.avatar} alt={project.creator.name} />
                                                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(project.creator.name || '')}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{project.creator.name}</p>
                                                {project.creator.email && <p className="text-xs text-muted-foreground truncate">{project.creator.email}</p>}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{t('Unknown')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Activities */}
                {meetings && meetings.length > 0 && (
                    <Card>
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold">{t('Activities')}</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Meetings Section */}
                            <div>
                                <div className="flex items-center mb-4">
                                    <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <h4 className="text-sm font-medium text-muted-foreground">{t('Meetings')} ({meetings.filter((m: any) => m.type !== 'call').length})</h4>
                                </div>
                                <div className="space-y-3">
                                    {meetings.filter((m: any) => m.type !== 'call').slice(0, 5).map((meeting: any) => (
                                        <div key={meeting.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{meeting.title}</p>
                                                    <p className="text-xs text-gray-500">{window.appSettings?.formatDateTime(meeting.start_date, false) || new Date(meeting.start_date).toLocaleDateString()}</p>
                                                    <p className="text-xs text-gray-500">{meeting.assigned_user?.name || 'Unassigned'}</p>
                                                </div>
                                            </div>
                                            {hasPermission(permissions, 'view-meetings') && (
                                                <a href={route('meetings.show', meeting.id)}>
                                                    <Button variant="outline" size="sm">{t('View')}</Button>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                    {meetings.filter((m: any) => m.type !== 'call').length > 5 && (
                                        <p className="text-sm text-gray-500 text-center">+{meetings.filter((m: any) => m.type !== 'call').length - 5} more meetings</p>
                                    )}
                                    {meetings.filter((m: any) => m.type !== 'call').length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">No meetings found</p>
                                    )}
                                </div>
                            </div>

                            {/* Calls Section */}
                            <div>
                                <div className="flex items-center mb-4">
                                    <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <h4 className="text-sm font-medium text-muted-foreground">{t('Calls')} ({meetings.filter((m: any) => m.type === 'call').length})</h4>
                                </div>
                                <div className="space-y-3">
                                    {meetings.filter((m: any) => m.type === 'call').slice(0, 5).map((call: any) => (
                                        <div key={call.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{call.title}</p>
                                                    <p className="text-xs text-gray-500">{window.appSettings?.formatDateTime(call.start_date, false) || new Date(call.start_date).toLocaleDateString()}</p>
                                                    <p className="text-xs text-gray-500">{call.assigned_user?.name || 'Unassigned'}</p>
                                                </div>
                                            </div>
                                            {hasPermission(permissions, 'view-calls') && (
                                                <a href={route('meetings.show', call.id)}>
                                                    <Button variant="outline" size="sm">{t('View')}</Button>
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                    {meetings.filter((m: any) => m.type === 'call').length > 5 && (
                                        <p className="text-sm text-gray-500 text-center">+{meetings.filter((m: any) => m.type === 'call').length - 5} more calls</p>
                                    )}
                                    {meetings.filter((m: any) => m.type === 'call').length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">No calls found</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Additional Information */}
                {project.description && (
                    <Card>
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold">{t('Description')}</h3>
                        </div>
                        <div className="p-6 prose dark:prose-invert max-w-none">
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {project.description}
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </PageTemplate>
    );
}
