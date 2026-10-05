import React, { useState, useMemo } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, User, Mail, Phone, MapPin, Building, Briefcase, FileText, Calendar, Clock, UserCheck, Eye, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';
import { hasPermission } from '@/utils/authorization';
import { EntityTasksCard } from '@/components/entity-tasks-card';

export default function ContactShow() {
    const { t } = useTranslation();
    const { contact, meetings, auth, tasks = [], users = [], taskStatuses = [], taskTypes = [], taskPriorities = [] } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    const filteredMeetings = useMemo(() => meetings?.filter((m: any) => m.type !== 'call') || [], [meetings]);
    const filteredCalls = useMemo(() => meetings?.filter((m: any) => m.type === 'call') || [], [meetings]);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Contact Management') },
        { title: t('Contacts'), href: route('contacts.index') },
        { title: t('View Contact') }
    ];

    const getStatusBadge = (status: string) => {
        const statusColors = {
            active: 'bg-green-50 text-green-700 ring-green-600/20',
            inactive: 'bg-red-50 text-red-700 ring-red-600/10'
        };
        return (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[status as keyof typeof statusColors] || statusColors.active}`}>
                {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Active'}
            </span>
        );
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return t('-');
        return window.appSettings?.formatDateTime(dateString, false) || new Date(dateString).toLocaleDateString();
    };

    return (
        <PageTemplate
            title={contact.name}
            description={t('Contact details and related information')}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.visit(route('contacts.index'))
                }
            ]}
            noPadding
        >
            <div className="mx-auto space-y-6">

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {([
                        { label: t('Position'), value: contact.position || '—', icon: Briefcase, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
                        { label: t('Account'), value: contact.account?.name || '—', icon: Building, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                        { label: t('Quotes'), value: `${contact.quotes?.length || 0} `, icon: FileText, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
                        { label: t('Created'), value: formatDate(contact.created_at), icon: Clock, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
                    ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                        <Card key={label} className="relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                            <CardContent className="relative p-4">
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                                        <p className="text-lg font-bold text-foreground truncate leading-snug">{value}</p>
                                    </div>
                                    <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5 flex-shrink-0`}>
                                        <Icon className={`h-5 w-5 ${iconCls}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Contact Summary + Contact Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Contact Summary */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Contact Summary')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('Status')}</p>
                                    <div>{getStatusBadge(contact.status)}</div>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('Position')}</p>
                                    <p className="text-sm font-medium text-foreground">{contact.position || '—'}</p>
                                </div>
                            </div>
                            <div className="pt-4 mt-4 border-t border-border">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Assigned To')}</p>
                                {contact.assigned_user ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="w-7 h-7 flex-shrink-0">
                                            <AvatarImage src={contact.assigned_user.avatar} alt={contact.assigned_user.name} />
                                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(contact.assigned_user.name || '')}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{contact.assigned_user.name}</p>
                                            {contact.assigned_user.email && (
                                                <p className="text-xs text-muted-foreground truncate">{contact.assigned_user.email}</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{t('Unassigned')}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <User className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Contact Info')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('Email')}</p>
                                    <p className="text-sm font-medium text-foreground truncate">{contact.email || '—'}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('Phone')}</p>
                                    <p className="text-sm font-medium text-foreground">{contact.phone || '—'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Address + Related Account */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Address */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Address')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="h-[100px] overflow-y-auto">
                                {contact.address ? (
                                    <p className="text-sm  text-foreground">{contact.address}</p>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <MapPin className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                        <p className="text-sm text-muted-foreground">{t('No address')}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Related Account */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <Building className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Related Account')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 flex items-center justify-center" style={{ minHeight: '130px' }}>
                            {contact.account ? (
                                <div className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors w-full">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <UserInitials name={contact.account.name} />
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-muted-foreground">{t('Account')}</p>
                                            <p className="text-sm font-semibold text-foreground truncate">{contact.account.name}</p>
                                            {contact.account.email && <p className="text-xs text-muted-foreground truncate">{contact.account.email}</p>}
                                        </div>
                                    </div>
                                    {hasPermission(permissions, 'view-accounts') && (
                                        <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Link href={route('accounts.show', contact.account.id)} className="ml-3 flex-shrink-0">
                                                        <Eye className="h-4 w-4 text-gray-500" />
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center py-8">
                                    <Building className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('No account linked')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quotes + Cases */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Quotes */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Quotes')}
                                {contact.quotes?.length > 0 && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{contact.quotes.length}</span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {contact.quotes?.length > 0 ? (
                <div className="space-y-2 p-2 overflow-y-auto" style={{ height: '305px', overflowY: contact.quotes.length > 4 ? 'auto' : 'hidden' }}>
                                    {contact.quotes.map((quote: any) => (
                                        <div key={quote.id} className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <UserInitials name={quote.quote_number} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">{quote.quote_number}</p>
                                                    {quote.name && <p className="text-xs text-muted-foreground truncate">{quote.name}</p>}
                                                </div>
                                            </div>
                                            {hasPermission(permissions, 'view-quotes') && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={route('quotes.show', quote.id)} className="ml-3 flex-shrink-0">
                                                                <Eye className="h-4 w-4 text-gray-500" />
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center py-12">
                                    <FileText className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('No quotes linked')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Cases */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <Tag className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Cases')}
                                {contact.cases?.length > 0 && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{contact.cases.length}</span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {contact.cases?.length > 0 ? (
                <div className="space-y-2 p-2 overflow-y-auto" style={{ height: '305px', overflowY: contact.cases.length > 4 ? 'auto' : 'hidden' }}>
                                    {contact.cases.map((caseItem: any) => (
                                        <div key={caseItem.id} className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <UserInitials name={caseItem.subject} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">{caseItem.subject}</p>
                                                    {caseItem.status && <p className="text-xs text-muted-foreground truncate">{caseItem.status}</p>}
                                                </div>
                                            </div>
                                            {hasPermission(permissions, 'view-cases') && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={route('cases.show', caseItem.id)} className="ml-3 flex-shrink-0">
                                                                <Eye className="h-4 w-4 text-gray-500" />
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center py-12">
                                    <Tag className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('No cases linked')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Tasks & Follow-ups */}
                <EntityTasksCard
                    entityType="contact"
                    entityId={contact.id}
                    entityName={contact.name}
                    tasks={tasks}
                    users={users}
                    taskStatuses={taskStatuses}
                    taskTypes={taskTypes}
                    taskPriorities={taskPriorities}
                    defaultAssignedTo={contact.assigned_to}
                />

                {/* Meetings & Calls */}
                {meetings?.length > 0 && (() => {
                    return (
                        <Card className="shadow-sm">
                            <CardHeader className="border-b py-3.5 px-5">
                                <CardTitle className="flex items-center text-lg font-semibold">
                                    <Calendar className="h-5 w-5 mr-3 text-muted-foreground" />
                                    {t('Meetings & Calls')}
                                    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{meetings.length}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="shadow-none border">
                                        <CardHeader className="border-b py-3 px-4">
                                            <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                                                <div className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5" />{t('Meetings')}</div>
                                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{filteredMeetings.length}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {filteredMeetings.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-6">{t('No meetings found')}</p>
                                            ) : (
                                                <div className="space-y-2 p-3 overflow-y-auto" style={{ height: '412px', overflowY: filteredMeetings.length > 5 ? 'auto' : 'hidden' }}>
                                                    {filteredMeetings.map((meeting: any) => (
                                                        <div key={meeting.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                                                                    <UserCheck className="h-3.5 w-3.5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium text-foreground truncate">{meeting.title}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                        <span className="text-xs text-muted-foreground truncate">{window.appSettings?.formatDateTime(meeting.start_date, false) || new Date(meeting.start_date).toLocaleDateString()}</span>
                                                                        {meeting.assigned_user?.name && (
                                                                            <span className="flex items-center gap-1 flex-shrink-0">
                                                                                <span className="text-muted-foreground/40">·</span>
                                                                                <Avatar className="w-6 h-6 flex-shrink-0">
                                                                                    <AvatarImage src={meeting.assigned_user?.avatar} alt={meeting.assigned_user?.name || 'User'} />
                                                                                    <AvatarFallback className="bg-primary/15 text-primary text-[9px] font-bold">{getInitials(meeting.assigned_user?.name || 'U')}</AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="text-xs text-muted-foreground truncate">{meeting.assigned_user.name}</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {hasPermission(permissions, 'view-meetings') && (
                                                                <TooltipProvider delayDuration={200}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Link href={route('meetings.show', meeting.id)} className="flex-shrink-0">
                                                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                                                                            </Link>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-none border">
                                        <CardHeader className="border-b py-3 px-4">
                                            <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                                                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{t('Calls')}</div>
                                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{filteredCalls.length}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {filteredCalls.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-6">{t('No calls found')}</p>
                                            ) : (
                                                <div className="space-y-2 p-3 overflow-y-auto" style={{ height: '412px', overflowY: filteredCalls.length > 5 ? 'auto' : 'hidden' }}>
                                                    {filteredCalls.map((call: any) => (
                                                        <div key={call.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                                                                    <Phone className="h-3.5 w-3.5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium text-foreground truncate">{call.title}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                                                        <span className="text-xs text-muted-foreground truncate">{window.appSettings?.formatDateTime(call.start_date, false) || new Date(call.start_date).toLocaleDateString()}</span>
                                                                        {call.assigned_user?.name && (
                                                                            <span className="flex items-center gap-1 flex-shrink-0">
                                                                                <span className="text-muted-foreground/40">·</span>
                                                                                <Avatar className="w-6 h-6 flex-shrink-0">
                                                                                    <AvatarImage src={call.assigned_user?.avatar} alt={call.assigned_user?.name || 'User'} />
                                                                                    <AvatarFallback className="bg-primary/15 text-primary text-[9px] font-bold">{getInitials(call.assigned_user?.name || 'U')}</AvatarFallback>
                                                                                </Avatar>
                                                                                <span className="text-xs text-muted-foreground truncate">{call.assigned_user.name}</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {hasPermission(permissions, 'view-calls') && (
                                                                <TooltipProvider delayDuration={200}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Link href={route('calls.show', call.id)} className="flex-shrink-0">
                                                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                                                                            </Link>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}

            </div>
        </PageTemplate>
    );
}
