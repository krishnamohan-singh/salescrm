import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, Building, User, Mail, Phone, Globe, MapPin, Calendar, FileText, UserCheck, Send, Edit, MessageCircle, DollarSign, TrendingUp, Clock, Tag, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';
import { capitalize, formatRelativeTime } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';
import { EntityTasksCard } from '@/components/entity-tasks-card';
import { EntityServicesCard } from '@/components/entity-services-card';
import { EntityProductsCard } from '@/components/entity-products-card';
import { EntityJourneyTimeline } from '@/components/entity-journey-timeline';

export default function AccountShow() {
  const { t } = useTranslation();
  const { account, streamItems, auth, meetings, tasks = [], users = [], taskStatuses = [], taskTypes = [], taskPriorities = [], activeServices = [], activeProducts = [] } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const isCompany = auth?.user?.type === 'company';
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const getInitials = useInitials();

  const filteredMeetings = useMemo(() => meetings?.filter((m: any) => m.type !== 'call') || [], [meetings]);
  const filteredCalls = useMemo(() => meetings?.filter((m: any) => m.type === 'call') || [], [meetings]);

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Account Management') },
    { title: t('Accounts'), href: route('accounts.index') },
    { title: t('View Account') }
  ];

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: 'bg-green-50 text-green-700 ring-green-600/20',
      inactive: 'bg-red-50 text-red-700 ring-red-600/10'
    };
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[status as keyof typeof statusColors] || statusColors.active}`}>
        {capitalize(status) || 'Active'}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return t('-');
    return window.appSettings?.formatDateTime(dateString, false) || new Date(dateString).toLocaleDateString();
  };

  if (!account) {
    return null;
  }

  return (
    <PageTemplate
      title={account.name}
      description={t('Account details and related information')}
      breadcrumbs={breadcrumbs}
      actions={[
        {
          label: t('Back'),
          icon: <ArrowLeft className="h-4 w-4 mr-2" />,
          variant: 'outline',
          onClick: () => router.visit(route('accounts.index'))
        }
      ]}
      noPadding
    >
      <div className="mx-auto space-y-6">

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { label: t('Type'), value: account.account_type?.name || '—', icon: Building, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: t('Industry'), value: account.account_industry?.name || '—', icon: Tag, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
            { label: t('Contacts'), value: `${account.contacts?.length || 0} ${(account.contacts?.length || 0) === 1 ? t('contact') : t('contacts')}`, icon: User, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
            { label: t('Created'), value: formatDate(account.created_at), icon: Clock, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
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

        {/* Main Content (Left) + Activity Stream (Right) */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-6">
            {/* Single Unified Box: Account Details */}
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-6">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                  {t('Account Details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Section 1: Account Information */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    {t('Account Information')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Status')}</p>
                      <div>{getStatusBadge(account.status)}</div>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{t('Website')}</p>
                      {account.website
                        ? <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline break-all block">{account.website}</a>
                        : <p className="text-sm font-medium text-foreground">—</p>}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Account Type')}</p>
                      <p className="text-sm font-medium text-foreground">{account.account_type?.name || '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Industry')}</p>
                      <p className="text-sm font-medium text-foreground">{account.account_industry?.name || '—'}</p>
                    </div>
                    <div className="space-y-1.5 col-span-full pt-1">
                      <p className="text-xs font-medium text-muted-foreground">{t('Services')}</p>
                      {Array.isArray(account.services) && account.services.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {account.services.map((service: any, idx: number) => {
                            const serviceName = typeof service === 'string' ? service : (service?.name || service?.code);
                            if (!serviceName) return null;
                            return (
                              <Badge key={service?.id || serviceName || idx} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 text-xs py-0.5 px-2">
                                {serviceName}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>
                  </div>

                  {/* Assigned To + Created By */}
                  <div className="pt-4 mt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Assigned To')}</p>
                      {account.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarImage src={account.assigned_user.avatar} alt={account.assigned_user.name} />
                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(account.assigned_user.name || '')}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{account.assigned_user.name}</p>
                            {account.assigned_user.email && (
                              <p className="text-xs text-muted-foreground truncate">{account.assigned_user.email}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('Unassigned')}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Created By')}</p>
                      {account.creator ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-7 h-7 flex-shrink-0">
                            <AvatarImage src={account.creator.avatar} alt={account.creator.name} />
                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(account.creator.name || '')}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{account.creator.name}</p>
                            {account.creator.email && (
                              <p className="text-xs text-muted-foreground truncate">{account.creator.email}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('Unknown')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact Info */}
                <div className="pt-6 border-t border-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {t('Contact Info')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{t('Email')}</p>
                      <p className="text-sm font-medium text-foreground break-all">{account.email || '—'}</p>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{t('Alternate Email')}</p>
                      <p className="text-sm font-medium text-foreground break-all">{account.alternate_email || '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Phone')}</p>
                      <p className="text-sm font-medium text-foreground">{account.phone || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Addresses */}
                <div className="pt-6 border-t border-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {t('Addresses')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Billing Address */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 min-h-[110px]">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />{t('Billing Address')}
                      </p>
                      {(account.billing_address || account.billing_city || account.billing_country) ? (
                        <div className="text-sm text-foreground space-y-1">
                          {account.billing_address && <p>{account.billing_address}</p>}
                          <p>{[account.billing_city, account.billing_state, account.billing_postal_code].filter(Boolean).join(', ')}</p>
                          {account.billing_country && <p>{account.billing_country}</p>}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                          <MapPin className="h-6 w-6 text-muted-foreground/30 mb-1" />
                          <p className="text-xs text-muted-foreground">{t('No billing address')}</p>
                        </div>
                      )}
                    </div>

                    {/* Shipping Address */}
                    <div className="p-4 rounded-xl border border-border bg-muted/20 min-h-[110px]">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />{t('Shipping Address')}
                      </p>
                      {(account.shipping_address || account.shipping_city || account.shipping_country) ? (
                        <div className="text-sm text-foreground space-y-1">
                          {account.shipping_address && <p>{account.shipping_address}</p>}
                          <p>{[account.shipping_city, account.shipping_state, account.shipping_postal_code].filter(Boolean).join(', ')}</p>
                          {account.shipping_country && <p>{account.shipping_country}</p>}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                          <MapPin className="h-6 w-6 text-muted-foreground/30 mb-1" />
                          <p className="text-xs text-muted-foreground">{t('No shipping address')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader className="border-b py-3.5 px-5">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <User className="h-5 w-5 mr-3 text-muted-foreground" />
                    {t('Contacts')}
                    {account.contacts?.length > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{account.contacts.length}</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {account.contacts?.length > 0 ? (
                    <div className="space-y-2 p-2 overflow-y-auto" style={{ height: '244px', overflowY: account.contacts.length > 4 ? 'auto' : 'hidden' }}>
                      {account.contacts.map((contact: any) => (
                        <div key={contact.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserInitials name={contact.name} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{contact.name}</p>
                              {contact.email && <p className="text-xs text-muted-foreground truncate">{contact.email}</p>}
                            </div>
                          </div>
                          {hasPermission(permissions, 'view-contacts') && (
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link href={route('contacts.show', contact.id)} className="ml-3 flex-shrink-0">
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
                      <User className="h-8 w-8 text-muted-foreground/20 mb-2" />
                      <p className="text-sm text-muted-foreground">{t('No contacts linked')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quotes */}
              <Card className="shadow-sm">
                <CardHeader className="border-b py-3.5 px-5">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                    {t('Quotes')}
                    {account.quotes?.length > 0 && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{account.quotes.length}</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {account.quotes?.length > 0 ? (
                    <div className="space-y-2 p-2 overflow-y-auto" style={{ height: '244px', overflowY: account.quotes.length > 4 ? 'auto' : 'hidden' }}>
                      {account.quotes.map((quote: any) => (
                        <div key={quote.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{quote.quote_number}</p>
                            {quote.name && <p className="text-xs text-muted-foreground truncate">{quote.name}</p>}
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
            </div>

            {/* Tasks & Follow-ups */}
            <EntityTasksCard
              entityType="account"
              entityId={account.id}
              entityName={account.name}
              tasks={tasks}
              users={users}
              taskStatuses={taskStatuses}
              taskTypes={taskTypes}
              taskPriorities={taskPriorities}
              defaultAssignedTo={account.assigned_to}
            />

            {/* Products (Catalogue) */}
            <EntityProductsCard
              parentModule="account"
              parentId={account.id}
              parentName={account.name}
              products={account.products || []}
              activeProducts={activeProducts}
              permissions={permissions}
            />

            {/* Services (Catalogue) */}
            <EntityServicesCard
              parentModule="account"
              parentId={account.id}
              parentName={account.name}
              services={account.services || []}
              activeServices={activeServices}
              permissions={permissions}
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

          {/* Right Column: Journey & Activity Timeline */}
          {hasPermission(permissions, 'view-stream') && (
            <div className="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0 space-y-6">
              <EntityJourneyTimeline
                streamItems={streamItems || []}
                entityType="account"
                entityId={account.id}
                entityName={account.name}
                recipientEmail={account.email || account.alternate_email || ''}
                recipientName={account.name}
                canComment={hasPermission(permissions, 'create-accounts')}
                canEdit={hasPermission(permissions, 'edit-accounts')}
                canDeleteStream={hasPermission(permissions, 'delete-stream')}
                commentStoreRoute={route('accounts.comments.store', account.id)}
                commentUpdateActivityRoute="accounts.comments.update-activity"
                deleteActivityRoute="accounts.delete-activity"
                deleteAllActivitiesRoute="accounts.delete-activities"
              />
            </div>
          )}
        </div>

      </div>
    </PageTemplate>
  );
}
