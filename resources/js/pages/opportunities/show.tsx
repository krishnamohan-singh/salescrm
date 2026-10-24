import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, DollarSign, Calendar, Building, Package, FileText, Trash2, Send, Edit, MessageCircle, TrendingUp, Clock, UserCheck, Phone, PhoneCall, Plus, Eye, Hash, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';
import { formatRelativeTime } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';
import { EntityTasksCard } from '@/components/entity-tasks-card';
import { EntityServicesCard } from '@/components/entity-services-card';
import { EntityProductsCard } from '@/components/entity-products-card';
import { LogCallModal } from '@/components/log-call-modal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { EntityJourneyTimeline } from '@/components/entity-journey-timeline';

export default function OpportunityShow() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { opportunity, streamItems, auth, meetings, tasks = [], users = [], taskStatuses = [], taskTypes = [], taskPriorities = [], activeServices = [], activeProducts = [] } = usePage().props as any;
    const isCompany = auth?.user?.type === 'company';
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
    const [currentActivity, setCurrentActivity] = useState<any>(null);
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState<number | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const permissions = auth?.permissions || [];
    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Opportunity Management') },
        { title: t('Opportunities'), href: route('opportunities.index') },
        { title: t('View Opportunity') }
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

    const formatCurrency = (amount: number) => window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

    const formatDate = (dateString: string) => {
        if (!dateString) return t('-');
        return window.appSettings?.formatDateTime(dateString, false) || new Date(dateString).toLocaleDateString();
    };

    const calculateProductTotals = () => {
        let subtotal = 0;
        let totalTax = 0;

        opportunity.products?.forEach((product: any) => {
            const lineTotal = Number(product.pivot?.total_price || 0);
            subtotal += lineTotal;

            if (product.tax && lineTotal > 0) {
                totalTax += (lineTotal * Number(product.tax.rate || 0)) / 100;
            }
        });

        return { subtotal, totalTax, grandTotal: subtotal + totalTax };
    };

    const { subtotal, totalTax, grandTotal } = calculateProductTotals();

    return (
        <PageTemplate
            title={opportunity.name}
            breadcrumbs={breadcrumbs}
            description={t('Opportunity details and related information')}
            actions={[
                ...(hasPermission(permissions, 'create-calls') ? [{
                    label: t('Log Call'),
                    icon: <PhoneCall className="h-4 w-4 mr-2" />,
                    variant: 'outline' as const,
                    onClick: () => setIsLogCallModalOpen(true)
                }] : []),
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline' as const,
                    onClick: () => router.visit(route('opportunities.index'))
                }
            ]}
            noPadding
        >
            <div className="mx-auto space-y-6">
                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {([
                        { label: t('Amount'), value: formatCurrency(opportunity.amount), icon: DollarSign, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
                        { label: t('Stage'), value: opportunity.opportunity_stage?.name || '—', icon: TrendingUp, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
                        { label: t('Products'), value: `${opportunity.products?.length || 0} ${(opportunity.products?.length || 0) === 1 ? t('item') : t('items')}`, icon: Package, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                        { label: t('Close Date'), value: formatDate(opportunity.close_date), icon: Clock, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
                    ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                        <Card key={label} className="relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                            <CardContent className="relative p-4">
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                                        <p className="text-lg font-bold font-mono text-foreground truncate leading-snug">{value}</p>
                                    </div>
                                    <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5 flex-shrink-0`}>
                                        <Icon className={`h-5 w-5 ${iconCls}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content (Left) + Activity Stream (Right) */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    <div className="flex-1 min-w-0 space-y-6">
                        {/* Unified Card: Opportunity Details */}
                        <Card className="shadow-sm">
                            <CardHeader className="border-b py-3.5 px-6">
                                <CardTitle className="flex items-center text-lg font-semibold">
                                    <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                    {t('Opportunity Details')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                {/* Section 1: Opportunity Information */}
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                                        {t('Opportunity Information')}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-muted-foreground">{t('Status')}</p>
                                            <div>{getStatusBadge(opportunity.status)}</div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-muted-foreground">{t('Stage')}</p>
                                            <p className="text-sm font-medium text-foreground">{opportunity.opportunity_stage?.name || '—'}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-muted-foreground">{t('Amount')}</p>
                                            <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(opportunity.amount)}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-muted-foreground">{t('Source')}</p>
                                            <p className="text-sm font-medium text-foreground">{opportunity.opportunity_source?.name || '—'}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-muted-foreground">{t('Close Date')}</p>
                                            <p className="text-sm font-medium text-foreground">{formatDate(opportunity.close_date)}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-medium text-muted-foreground">{t('Probability')}</p>
                                            <p className="text-sm font-medium text-foreground">{opportunity.probability !== null && opportunity.probability !== undefined ? `${opportunity.probability}%` : '—'}</p>
                                        </div>
                                    </div>

                                    {/* Assigned To & Created By */}
                                    <div className="pt-4 mt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Assigned To')}</p>
                                            {opportunity.assigned_user ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-7 h-7 flex-shrink-0">
                                                        <AvatarImage src={opportunity.assigned_user.avatar} alt={opportunity.assigned_user.name} />
                                                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(opportunity.assigned_user.name || '')}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{opportunity.assigned_user.name}</p>
                                                        {opportunity.assigned_user.email && (
                                                            <p className="text-xs text-muted-foreground truncate">{opportunity.assigned_user.email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">{t('Unassigned')}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Created By')}</p>
                                            {opportunity.creator ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-7 h-7 flex-shrink-0">
                                                        <AvatarImage src={opportunity.creator.avatar} alt={opportunity.creator.name} />
                                                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(opportunity.creator.name || '')}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{opportunity.creator.name}</p>
                                                        {opportunity.creator.email && (
                                                            <p className="text-xs text-muted-foreground truncate">{opportunity.creator.email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">{t('System')}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Related Records */}
                                <div className="pt-6 border-t border-border">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                                        <Building className="h-3.5 w-3.5" />
                                        {t('Related Records')}
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Account */}
                                        {opportunity.account ? (
                                            <div className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors bg-muted/10">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <UserInitials name={opportunity.account.name} />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-muted-foreground">{t('Account')}</p>
                                                        <p className="text-sm font-semibold text-foreground truncate">{opportunity.account.name}</p>
                                                        {opportunity.account.email && <p className="text-xs text-muted-foreground truncate">{opportunity.account.email}</p>}
                                                    </div>
                                                </div>
                                                {hasPermission(permissions, 'view-accounts') && (
                                                    <TooltipProvider delayDuration={200}>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Link href={route('accounts.show', opportunity.account.id)} className="ml-3 flex-shrink-0">
                                                            <Eye className="h-4 w-4 text-gray-500" />
                                                          </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center p-3.5 rounded-xl border border-border bg-muted/20">
                                                <p className="text-xs text-muted-foreground">{t('No account linked')}</p>
                                            </div>
                                        )}

                                        {/* Contact */}
                                        {opportunity.contact ? (
                                            <div className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors bg-muted/10">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <UserInitials name={opportunity.contact.name} />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-muted-foreground">{t('Contact')}</p>
                                                        <p className="text-sm font-semibold text-foreground truncate">{opportunity.contact.name}</p>
                                                        {opportunity.contact.email && <p className="text-xs text-muted-foreground truncate">{opportunity.contact.email}</p>}
                                                    </div>
                                                </div>
                                                {hasPermission(permissions, 'view-contacts') && (
                                                    <TooltipProvider delayDuration={200}>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Link href={route('contacts.show', opportunity.contact.id)} className="ml-3 flex-shrink-0">
                                                            <Eye className="h-4 w-4 text-gray-500" />
                                                          </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center p-3.5 rounded-xl border border-border bg-muted/20">
                                                <p className="text-xs text-muted-foreground">{t('No contact linked')}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section 3: Notes & Description */}
                                {(opportunity.notes || opportunity.description) && (
                                    <div className="pt-6 border-t border-border">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {opportunity.notes && (
                                                <div className="p-4 rounded-xl border bg-muted/15 space-y-1.5">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                        <FileText className="h-3.5 w-3.5" />
                                                        {t('Notes')}
                                                    </p>
                                                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{opportunity.notes}</p>
                                                </div>
                                            )}
                                            {opportunity.description && (
                                                <div className="p-4 rounded-xl border bg-muted/15 space-y-1.5">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                        <FileText className="h-3.5 w-3.5" />
                                                        {t('Description')}
                                                    </p>
                                                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{opportunity.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                {/* Tasks & Follow-ups */}
                <EntityTasksCard
                    entityType="opportunity"
                    entityId={opportunity.id}
                    entityName={opportunity.name}
                    tasks={tasks}
                    users={users}
                    taskStatuses={taskStatuses}
                    taskTypes={taskTypes}
                    taskPriorities={taskPriorities}
                    defaultAssignedTo={opportunity.assigned_to}
                />

                {/* Meetings & Calls */}
                {meetings?.length > 0 && (() => {
                    const meetingItems = meetings.filter((m: any) => m.type !== 'call');
                    const callItems = meetings.filter((m: any) => m.type === 'call');
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
                                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{meetingItems.length}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {meetingItems.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-6">{t('No meetings found')}</p>
                                            ) : (
                                                <div className="space-y-2 p-3 overflow-y-auto" style={{ height: '412px', overflowY: meetingItems.length > 5 ? 'auto' : 'hidden' }}>
                                                    {meetingItems.map((meeting: any) => (
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
                                                                    <TooltipContent side="top"><p>{t('View ')}</p></TooltipContent>
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
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{callItems.length}</span>
                                                    {hasPermission(permissions, 'create-calls') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 px-2 text-xs flex items-center gap-1"
                                                            onClick={() => setIsLogCallModalOpen(true)}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            {t('Log Call')}
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {callItems.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-6">{t('No calls found')}</p>
                                            ) : (
                                                <div className="space-y-2 p-3 overflow-y-auto" style={{ height: '412px', overflowY: callItems.length > 5 ? 'auto' : 'hidden' }}>
                                                    {callItems.map((call: any) => (
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

                {/* Products (Catalogue) */}
                <EntityProductsCard
                    parentModule="opportunity"
                    parentId={opportunity.id}
                    parentName={opportunity.name}
                    products={opportunity.products || []}
                    activeProducts={activeProducts}
                    permissions={permissions}
                />

                {/* Services */}
                <EntityServicesCard
                    parentModule="opportunity"
                    parentId={opportunity.id}
                    parentName={opportunity.name}
                    services={opportunity.services || []}
                    activeServices={activeServices}
                    permissions={permissions}
                />

                {/* Related Quotes */}
                {opportunity.quotes?.length > 0 && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Related Quotes')} ({opportunity.quotes.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="space-y-3">
                                    {opportunity.quotes.map((quote: any) => (
                                    <div key={quote.id} className="flex items-center justify-between p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{quote.quote_number}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{quote.name}</p>
                                        </div>
                                        {hasPermission(permissions, 'view-quotes') && (
                                            <Link href={route('quotes.show', quote.id)}>
                                                <Button variant="outline" size="sm" className="bg-white">
                                                    {t('View')}
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
                    </div>

                    {/* Right Column: Journey & Activity Timeline */}
                    {hasPermission(permissions, 'view-stream') && (
                        <div className="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0 space-y-6">
                            <EntityJourneyTimeline
                                streamItems={streamItems || []}
                                entityType="opportunity"
                                entityId={opportunity.id}
                                entityName={opportunity.name}
                                recipientEmail={opportunity.contact?.email || opportunity.account?.email || ''}
                                recipientName={opportunity.contact?.name || opportunity.account?.name || opportunity.name}
                                canComment={hasPermission(permissions, 'create-opportunities')}
                                canEdit={hasPermission(permissions, 'edit-opportunities')}
                                canDeleteStream={hasPermission(permissions, 'delete-stream')}
                                commentStoreRoute={route('opportunities.comments.store', opportunity.id)}
                                commentUpdateActivityRoute="opportunities.comments.update-activity"
                                deleteActivityRoute="opportunities.delete-activity"
                                deleteAllActivitiesRoute="opportunities.delete-activities"
                            />
                        </div>
                    )}
                </div>

            </div>

            {/* Log Call Modal */}
            <LogCallModal
                isOpen={isLogCallModalOpen}
                onClose={() => setIsLogCallModalOpen(false)}
                parentModule="opportunity"
                parentId={opportunity.id}
                parentName={opportunity.name}
                users={users}
                defaultAssigneeId={opportunity.assigned_to}
                contactId={opportunity.contact_id}
            />
        </PageTemplate>
    );
}
