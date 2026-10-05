import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, Building, User, Mail, Phone, Globe, MapPin, Calendar, FileText, UserCheck, Send, Edit, MessageCircle, DollarSign, TrendingUp, Clock, Tag, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

export default function AccountShow() {
  const { t } = useTranslation();
  const { account, streamItems, auth, meetings, tasks = [], users = [], taskStatuses = [], taskTypes = [], taskPriorities = [] } = usePage().props as any;
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
            { label: t('Contacts'), value: `${account.contacts?.length || 0} ${t('contacts')}`, icon: User, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
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

        {/* Account Summary + Contact Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Account Summary */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                {t('Account Summary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Status')}</p>
                  <div>{getStatusBadge(account.status)}</div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Website')}</p>
                  {account.website
                    ? <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:!text-blue-600 hover:underline truncate block">{account.website}</a>
                    : <p className="text-sm font-medium text-foreground">—</p>}
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-border">
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
                  <p className="text-sm font-medium text-foreground truncate">{account.email || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Phone')}</p>
                  <p className="text-sm font-medium text-foreground">{account.phone || '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Billing + Shipping Address */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                {t('Billing Address')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-[100px] overflow-y-auto">
                {(account.billing_address || account.billing_city || account.billing_country) ? (
                  <div className="text-sm text-foreground space-y-1">
                    {account.billing_address && <p>{account.billing_address}</p>}
                    <p>{[account.billing_city, account.billing_state, account.billing_postal_code].filter(Boolean).join(', ')}</p>
                    {account.billing_country && <p>{account.billing_country}</p>}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MapPin className="h-8 w-8 text-muted-foreground/20 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('No billing address')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                {t('Shipping Address')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-[100px] overflow-y-auto">
                {(account.shipping_address || account.shipping_city || account.shipping_country) ? (
                  <div className="text-sm text-foreground space-y-1">
                    {account.shipping_address && <p>{account.shipping_address}</p>}
                    <p>{[account.shipping_city, account.shipping_state, account.shipping_postal_code].filter(Boolean).join(', ')}</p>
                    {account.shipping_country && <p>{account.shipping_country}</p>}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MapPin className="h-8 w-8 text-muted-foreground/20 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('No shipping address')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

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
              {hasPermission(permissions, 'create-accounts') && (
                <div className="px-5 pt-4 pb-4 border-b">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (newComment.trim()) {
                      router.post(route('accounts.comments.store', account.id), { comment: newComment }, { preserveScroll: true, onSuccess: () => setNewComment('') });
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
                                  {activity.activity_type === 'comment' && activity.user_id === auth?.user?.id && hasPermission(permissions, 'edit-accounts') && (
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
                                        router.put(route('accounts.comments.update-activity', { account: account.id, activity: activity.id }), { comment: editCommentText }, { preserveScroll: true });
                                        setEditingComment(null);
                                      }}>{t('Save')}</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-foreground">{activity.description}</p>
                                )
                              ) : activity.field_changed === 'status' && (activity.description === 'Active' || activity.description === 'Inactive') ? (
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                  activity.description === 'Active' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                }`}>{activity.description}</span>
                              ) : activity.field_changed === 'name' || activity.field_changed === 'assigned_to' || activity.description?.includes('into') ? (
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

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (currentActivity?.id) {
            router.delete(route('accounts.delete-activity', { account: account.id, activity: currentActivity.id }), { preserveScroll: true });
          }
          setIsDeleteModalOpen(false);
        }}
        itemName={t('this activity')}
        entityName={t('activity')}
      />
      <CrudDeleteModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onConfirm={() => {
          router.delete(route('accounts.delete-activities', account.id), { preserveScroll: true });
          setIsDeleteAllModalOpen(false);
        }}
        itemName={t('all activities for {{name}}', { name: account.name })}
        entityName={t('activities')}
      />
    </PageTemplate>
  );
}
