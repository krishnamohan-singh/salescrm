import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, DollarSign, Calendar, Building, Package, FileText, Trash2, Send, Edit, MessageCircle, TrendingUp, Clock, UserCheck, Phone, Eye, Hash, ShoppingCart } from 'lucide-react';
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

export default function OpportunityShow() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { opportunity, streamItems, auth, meetings, tasks = [], users = [], taskStatuses = [], taskTypes = [], taskPriorities = [] } = usePage().props as any;
    const isCompany = auth?.user?.type === 'company';
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
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
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
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

                {/* Opportunity Summary + Related Records */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Opportunity Summary */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Opportunity Summary')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('Status')}</p>
                                    <div>{getStatusBadge(opportunity.status)}</div>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('Source')}</p>
                                    <p className="text-sm font-medium text-foreground">{opportunity.opportunity_source?.name || '—'}</p>
                                </div>
                            </div>
                            <div className="pt-4 mt-4 border-t border-border">
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
                        </CardContent>
                    </Card>

                    {/* Related Records */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <Building className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Related Records')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            {opportunity.account ? (
                                <div className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors">
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
                            {opportunity.contact ? (
                                <div className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors">
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
                        </CardContent>
                    </Card>
                </div>

                {/* Notes & Description */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Notes')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[150px] overflow-y-auto">
                                <div className="px-5 py-4">
                                    {opportunity.notes ? (
                                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{opportunity.notes}</p>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-center">
                                            <FileText className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                            <p className="text-sm text-muted-foreground">{t('No notes available')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Description')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[150px] overflow-y-auto">
                                <div className="px-5 py-4">
                                    {opportunity.description ? (
                                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{opportunity.description}</p>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-center">
                                            <FileText className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                            <p className="text-sm text-muted-foreground">{t('No description available')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
                                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{callItems.length}</span>
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

                {/* Products */}
                <Card className="shadow-sm overflow-hidden">
                    {/* Card Header */}
                    <CardHeader className="border-b py-3.5 px-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <ShoppingCart className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Products')}
                            </CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {opportunity.products && opportunity.products.length > 0 ? (
                            <>
                                {/* Table */}
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#F0F0F1] dark:bg-gray-800 border-b hover:!bg-[#F0F0F1] dark:hover:!bg-gray-800">
                                            <TableHead className="py-2.5 font-semibold">{t('Product')}</TableHead>
                                            <TableHead className="py-2.5 font-semibold text-center">{t('Quantity')}</TableHead>
                                            <TableHead className="py-2.5 font-semibold text-center">{t('Unit Price')}</TableHead>
                                            <TableHead className="py-2.5 font-semibold text-center">{t('Tax')}</TableHead>
                                            <TableHead className="py-2.5 font-semibold text-right">{t('Total')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {opportunity.products.map((product: any, index: number) => {
                                            const lineTotal = Number(product.pivot?.total_price || 0);
                                            const taxAmount = product.tax ? (lineTotal * Number(product.tax.rate || 0)) / 100 : 0;
                                            return (
                                                <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 border-b">
                                                    <TableCell className="py-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {product.main_image_url ? (
                                                                <a href={product.main_image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                                                    <img src={product.main_image_url} alt={product.name} className="w-11 h-11 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity cursor-pointer" />
                                                                </a>
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                                                                    <Package className="h-4 w-4 text-muted-foreground/40" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-foreground truncate">{product.name}</p>
                                                                {product.sku && <p className="text-xs text-muted-foreground mt-0.5">SKU: {product.sku}</p>}
                                                                {product.category?.name && (
                                                                    <span className="mt-1 inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                                                                        {product.category.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        <p className="text-sm font-semibold text-foreground">{product.pivot.quantity}</p>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        <p className="text-sm font-semibold font-mono text-foreground">{formatCurrency(product.pivot.unit_price)}</p>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        {product.tax ? (
                                                            <>
                                                                <p className="text-sm font-semibold text-foreground">{product.tax.name} ({parseFloat(product.tax.rate).toFixed(2)}%)</p>
                                                                <p className="text-xs font-mono text-muted-foreground mt-0.5">{formatCurrency(taxAmount)}</p>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right">
                                                        <p className="text-sm font-bold font-mono text-emerald-600">{formatCurrency(lineTotal + taxAmount)}</p>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>

                                <div className="flex flex-col md:flex-row items-start md:items-end justify-end gap-4 px-6 py-5 border-t bg-muted/10">
                                    <div className="w-full max-w-sm border rounded-xl overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 border-b">
                                            <span className="text-sm text-muted-foreground font-medium">{t('Subtotal')}</span>
                                            <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(subtotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3 border-b">
                                            <span className="text-sm text-muted-foreground font-medium">{t('Total Tax')}</span>
                                            <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(totalTax)}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <span className="text-sm font-bold text-foreground">{t('Grand Total')}</span>
                                            <span className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>

                                
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                    <Package className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">{t('No products added to this opportunity')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

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

                {/* Activity Stream */}
                {hasPermission(permissions, 'view-stream') && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <MessageCircle className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Activity Stream')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {hasPermission(permissions, 'create-opportunities') && (
                                <div className="px-5 pt-4 pb-4 border-b">
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        if (newComment.trim()) {
                                            router.post(route('opportunities.comments.store', opportunity.id), { comment: newComment }, { preserveScroll: true, onSuccess: () => setNewComment('') });
                                        }
                                    }}>
                                        <div className="flex items-start gap-3">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                                                            <AvatarImage src={auth?.user?.avatar} alt={auth?.user?.name || 'User'} />
                                                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(auth?.user?.name || 'U')}</AvatarFallback>
                                                        </Avatar>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top"><p>{auth?.user?.name || t('User')}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <div className="flex-1 rounded-xl border shadow-sm overflow-hidden">
                                                <Textarea
                                                    placeholder={t('Write a comment...')}
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    className="border-0 resize-none focus-visible:ring-0 bg-transparent"
                                                    rows={2}
                                                />
                                                <div className="flex items-center justify-end px-3 py-2 border-t bg-muted/30">
                                                    <TooltipProvider delayDuration={200}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button type="submit" size="sm" disabled={!newComment.trim()} className="h-7 px-3">
                                                                    <Send className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top"><p>{t('Send')}</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}
                            <div className="max-h-[520px] overflow-y-auto border-t">
                                {streamItems && streamItems.length > 0 ? (
                                    <div className="py-5 px-5">
                                        {streamItems.map((activity: any, index: number) => {
                                            const getActivityBadgeColor = (type: string): string => {
                                                switch (type) {
                                                    case 'created': return 'bg-green-50 text-green-700 ring-green-600/20';
                                                    case 'updated': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
                                                    case 'deleted': return 'bg-red-50 text-red-700 ring-red-600/20';
                                                    case 'assigned': return 'bg-purple-50 text-purple-700 ring-purple-600/20';
                                                    case 'comment': return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20';
                                                    default: return 'bg-gray-50 text-gray-700 ring-gray-600/20';
                                                }
                                            };
                                            const badgeCls = getActivityBadgeColor(activity.activity_type);
                                            const isEditing = editingComment === activity.id;
                                            return (
                                                <div key={activity.id || index} className="relative flex gap-3 pb-4">
                                                    <div className="flex flex-col items-center flex-shrink-0 w-9">
                                                        <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Avatar className="w-9 h-9 flex-shrink-0 relative z-10">
                                                                        <AvatarImage src={activity.user?.avatar} alt={activity.user?.name || 'U'} />
                                                                        <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold">{getInitials(activity.user?.name || 'U')}</AvatarFallback>
                                                                    </Avatar>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top"><p>{activity.user?.name || t('System')}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        {index < streamItems.length - 1 && (
                                                            <div className="absolute left-[18px] top-9 bottom-0 w-px bg-gray-300 dark:bg-gray-600" />
                                                        )}
                                                    </div>
                                                    <div className={`flex-1 min-w-0 rounded-xl border bg-card shadow-sm overflow-hidden ${isEditing ? 'border-emerald-400 ring-1 ring-emerald-300' : ''}`}>
                                                        <div className={`flex items-center justify-between gap-2 px-4 py-2.5 ${isEditing ? 'bg-emerald-50/60' : 'bg-muted/30'} border-b`}>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-semibold text-foreground">{activity.user?.name || t('System')}</span>
                                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badgeCls}`}>
                                                                    {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">{formatRelativeTime(activity.created_at)}</span>
                                                            </div>
                                                            {!isEditing && (
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    {activity.activity_type === 'comment' && activity.user_id === auth?.user?.id && hasPermission(permissions, 'edit-opportunities') && (
                                                                        <TooltipProvider delayDuration={200}>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground"
                                                                                        onClick={() => { setEditingComment(activity.id); setEditCommentText(activity.description); }}>
                                                                                        <Edit className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top"><p>{t('Edit')}</p></TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}
                                                                    {hasPermission(permissions, 'delete-stream') && (
                                                                        <TooltipProvider delayDuration={200}>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground"
                                                                                        onClick={() => { setCurrentActivity(activity); setIsDeleteModalOpen(true); }}>
                                                                                        <Trash2 className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top"><p>{t('Delete')}</p></TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="px-4 py-3">
                                                            {activity.activity_type === 'comment' ? (
                                                                isEditing ? (
                                                                    <div className="space-y-3">
                                                                        <Textarea
                                                                            value={editCommentText}
                                                                            onChange={(e) => setEditCommentText(e.target.value)}
                                                                            className="w-full resize-none border-emerald-300 focus-visible:ring-emerald-400"
                                                                            rows={3}
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <Button size="sm" variant="outline" onClick={() => setEditingComment(null)}>{t('Cancel')}</Button>
                                                                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => {
                                                                                router.put(route('opportunities.comments.update-activity', { opportunity: opportunity.id, activity: activity.id }), { comment: editCommentText }, { preserveScroll: true });
                                                                                setEditingComment(null);
                                                                            }}>{t('Save')}</Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-foreground">{activity.description}</p>
                                                                )
                                                            ) : activity.description?.includes('into') ? (
                                                                <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: activity.description }} />
                                                            ) : activity.title ? (
                                                                <p className="text-sm text-muted-foreground">{activity.title}</p>
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                                        <p className="text-sm">{t('No activities found')}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}


            </div>

            {/* Delete Activity Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => {
                    router.delete(route('opportunities.delete-activity', { opportunity: opportunity.id, activity: currentActivity.id }), {
                        preserveScroll: true
                    });
                    setIsDeleteModalOpen(false);
                }}
                itemName={t('this activity')}
                entityName={t('activity')}
            />

            {/* Delete All Activities Modal */}
            <CrudDeleteModal
                isOpen={isDeleteAllModalOpen}
                onClose={() => setIsDeleteAllModalOpen(false)}
                onConfirm={() => {
                    router.delete(route('opportunities.delete-activities', opportunity.id), {
                        preserveScroll: true
                    });
                    setIsDeleteAllModalOpen(false);
                }}
                itemName={t('all activities for {{name}}', { name: opportunity.name })}
                entityName={t('activities')}
            />
        </PageTemplate>
    );
}
