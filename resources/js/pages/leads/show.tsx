import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, User, Building, MapPin, FileText, Phone, Mail, Globe, DollarSign, Calendar, Target, UserCheck, MessageCircle, Eye, Trash2, Send, Edit, Check, X, TrendingUp, Clock, Tag, Users, ListTodo, CheckSquare, Plus, Video, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useState } from 'react';
import { useInitials } from '@/hooks/use-initials';
import { formatRelativeTime, getDisplayUrl } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';
import UserInitials from '@/components/user-initials';
import { EntityTasksCard } from '@/components/entity-tasks-card';

export default function LeadShow() {
  const { t } = useTranslation();
  const { lead, streamItems, auth, relatedAccounts, relatedContacts, meetings, tasks = [], users = [], taskStatuses = [], taskTypes = [], taskPriorities = [] } = usePage().props as any;
  const comments = lead.comments || [];
  const isCompany = auth?.user?.type === 'company';
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const permissions = auth?.permissions;
  const getInitials = useInitials();

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Lead Management') },
    { title: t('Leads'), href: route('leads.index') },
    { title: t('View Lead') }
  ];

  const getStatusBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${status === 'active'
          ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
          : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
        }`}>
        {status === 'active' ? t('Active') : t('Inactive')}
      </span>
    );
  };

  const formatCurrency = (amount: number) => window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;





  return (
    <PageTemplate
      title={lead.name}
      description={t('Lead details and related information')}
      breadcrumbs={breadcrumbs}
      actions={[
        {
          label: t('Back'),
          icon: <ArrowLeft className="h-4 w-4 mr-2" />,
          variant: 'outline',
          onClick: () => router.visit(route('leads.index'))
        }
      ]}
      noPadding
    >
      <div className="mx-auto space-y-6">
        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { label: t('Lead Value'), value: formatCurrency(lead.value), icon: DollarSign, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: t('Pipeline Stage'), value: lead.lead_status?.name || '—', icon: TrendingUp, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: t('Source'), value: lead.lead_source?.name || '—', icon: Tag, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
            { label: t('Created'), value: window.appSettings?.formatDateTime(lead.created_at, false) || new Date(lead.created_at).toLocaleDateString(), icon: Clock, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
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

        {/* Lead Summary + Contact & Address */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Summary */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                {t('Lead Summary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Status')}</p>
                  <div>{getStatusBadge(lead.status)}</div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Pipeline Stage')}</p>
                  <p className="text-sm font-medium text-foreground">{lead.lead_status?.name || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Source')}</p>
                  <p className="text-sm font-medium text-foreground">{lead.lead_source?.name || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Conversion')}</p>
                  <div>
                    {lead.is_converted
                      ? <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"><TrendingUp className="h-3 w-3" />{t('Converted')}</span>
                      : <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-muted text-muted-foreground ring-1 ring-inset ring-border">{t('Not Converted')}</span>}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Account Name')}</p>
                  <p className="text-sm font-medium text-foreground">{lead.account_name || '—'}</p>
                </div>
              </div>
              {/* Assigned To + Created By — footer */}
              <div className="pt-4 mt-4 border-t border-border grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Assigned To')}</p>
                  {lead.assigned_user ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarImage src={lead.assigned_user.avatar} alt={lead.assigned_user.name} />
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(lead.assigned_user.name || '')}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{lead.assigned_user.name}</p>
                        {lead.assigned_user.email && (
                          <p className="text-xs text-muted-foreground truncate">{lead.assigned_user.email}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('Unassigned')}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Created By')}</p>
                  {lead.creator ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7 flex-shrink-0">
                        <AvatarImage src={lead.creator.avatar} alt={lead.creator.name} />
                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(lead.creator.name || '')}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{lead.creator.name}</p>
                        {lead.creator.email && (
                          <p className="text-xs text-muted-foreground truncate">{lead.creator.email}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('Unknown')}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact & Address */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <User className="h-5 w-5 mr-3 text-muted-foreground" />
                {t('Contact & Address')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Email')}</p>
                  <p className="text-sm font-medium text-foreground truncate">{lead.email || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Phone')}</p>
                  <p className="text-sm font-medium text-foreground">{lead.phone || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Company')}</p>
                  <p className="text-sm font-medium text-foreground">{lead.company || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Position')}</p>
                  <p className="text-sm font-medium text-foreground">{lead.position || '—'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Website')}</p>
                  {lead.website
                    ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:!text-blue-600 hover:underline truncate block">{lead.website}</a>
                    : <p className="text-sm text-muted-foreground">—</p>}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{t('Industry')}</p>
                  <p className="text-sm font-medium text-foreground">{lead.account_industry?.name || '—'}</p>
                </div>
                {lead.address && (
                  <div className="sm:col-span-2 space-y-0.5">
                  </div>
                )}
              </div>
              {lead.address && (
                // <div className="pt-4 border-t border-border">
                <div className="pt-4 mt-4 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{t('Address')}
                  </p>
                  <p className="text-sm font-medium text-foreground whitespace-pre-line">{lead.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Notes + Related Campaign — Additional Information card removed (duplicated Lead Value, Industry, Campaign, Conversion) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                {t('Notes')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-5 py-4 max-h-[150px] overflow-y-auto scroll-smooth"
                style={{ scrollbarGutter: 'stable' }}>
                {lead.notes ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{lead.notes}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <FileText className="h-8 w-8 text-muted-foreground/20 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('No notes available')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <Target className="h-5 w-5 mr-3 text-muted-foreground" />
                {t('Related Campaign')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-[120px] flex items-center">
              {lead.campaign ? (
                <div className="flex items-center justify-between p-4  rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors w-full">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{lead.campaign.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{lead.campaign.campaign_type?.name || t('Campaign')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('Budget')}: <span className="font-mono">{window.appSettings?.formatCurrency(Number(lead.campaign.budget || 0)) || `$${Number(lead.campaign.budget || 0).toFixed(2)}`}</span></p>
                  </div>
                  {hasPermission(permissions, 'view-campaigns') && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={route('campaigns.show', lead.campaign.id)}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-full text-center">
                  <Target className="h-8 w-8 text-muted-foreground/20 mb-2" />
                  <p className="text-sm text-muted-foreground">{t('No campaign linked')}</p>
                </div>
              )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Related Accounts & Contacts */}
        {(relatedAccounts?.length > 0 || relatedContacts?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Related Accounts */}
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Building className="h-5 w-5 mr-3 text-muted-foreground" />
                  {t('Related Accounts')}
                  {relatedAccounts?.length > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{relatedAccounts.length}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {relatedAccounts?.length > 0 ? (
                  <div className="space-y-2 p-3 overflow-y-auto" style={{ maxHeight: '280px' }}>
                    {relatedAccounts.map((account: any) => (
                      <div key={account.id} className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {account.name && <UserInitials name={account.name} />}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">{account.account_type?.name || t('Account')}</p>
                            <p className="text-sm font-semibold text-foreground truncate">{account.name}</p>
                            {account.email && <p className="text-xs text-muted-foreground truncate">{account.email}</p>}
                          </div>
                        </div>
                        {hasPermission(permissions, 'view-accounts') && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link href={route('accounts.show', account.id)} className="ml-3 flex-shrink-0">
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
                  <div className="flex flex-col items-center justify-center text-center py-10">
                    <Building className="h-8 w-8 text-muted-foreground/20 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('No accounts linked')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Contacts */}
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Users className="h-5 w-5 mr-3 text-muted-foreground" />
                  {t('Related Contacts')}
                  {relatedContacts?.length > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{relatedContacts.length}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {relatedContacts?.length > 0 ? (
                  <div className="space-y-2 p-3 overflow-y-auto" style={{ maxHeight: '280px' }}>
                    {relatedContacts.map((contact: any) => (
                      <div key={contact.id} className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {contact.name && <UserInitials name={contact.name} />}
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-muted-foreground">{contact.account?.name || t('No account')}</p>
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
                  <div className="flex flex-col items-center justify-center text-center py-10">
                    <User className="h-8 w-8 text-muted-foreground/20 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('No contacts linked')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        )}

        {/* Tasks & Follow-ups */}
        <EntityTasksCard
          entityType="lead"
          entityId={lead.id}
          entityName={lead.name}
          tasks={tasks}
          users={users}
          taskStatuses={taskStatuses}
          taskTypes={taskTypes}
          taskPriorities={taskPriorities}
          defaultAssignedTo={lead.assigned_to}
        />

        {/* Activities */}
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

                  {/* Meetings sub-card */}
                  <Card className="shadow-none border">
                    <CardHeader className="border-b py-3 px-4">
                      <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-3.5 w-3.5" />
                          {t('Meetings')}
                        </div>
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

                  {/* Calls sub-card */}
                  <Card className="shadow-none border">
                    <CardHeader className="border-b py-3 px-4">
                      <CardTitle className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          {t('Calls')}
                        </div>
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

        {/* Activity Stream - Full Width */}
        {hasPermission(permissions, 'view-stream') && (
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center text-lg font-semibold">
                <MessageCircle className="h-5 w-5 mr-3 text-muted-foreground" />
                {t('Activity Stream')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {/* Add Comment Form */}
                {hasPermission(permissions, 'create-leads') && (
                  <div className="px-5 pt-4 pb-4 border-b">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      if (newComment.trim()) {
                        router.post(route('leads.comments.store', lead.id), { comment: newComment }, { preserveScroll: true, onSuccess: () => setNewComment('') });
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
                {/* Stream List */}
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
                          case 'converted': return 'bg-orange-50 text-orange-700 ring-orange-600/20';
                          case 'comment': return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20';
                          default: return 'bg-gray-50 text-gray-700 ring-gray-600/20';
                        }
                      };
                      const badgeCls = getActivityBadgeColor(activity.activity_type);
                      const isEditing = editingComment === activity.id;

                      return (
                        <div key={activity.id || index} className="relative flex gap-3 pb-4">
                          {/* Avatar + connector line */}
                          <div className="flex flex-col items-center flex-shrink-0 w-9">
                            <Avatar className="w-9 h-9 flex-shrink-0 relative z-10">
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="w-full h-full">
                                      <AvatarImage src={activity.user?.avatar} alt={activity.user?.name || 'U'} />
                                      <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold w-9 h-9 flex items-center justify-center rounded-full">{getInitials(activity.user?.name || 'U')}</AvatarFallback>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top"><p>{activity.user?.name || t('System')}</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Avatar>
                            {index < streamItems.length - 1 && (
                              <div className="absolute left-[18px] top-9 bottom-0 w-px bg-gray-300 dark:bg-gray-600" />
                            )}
                          </div>
                          {/* Card */}
                          <div className={`flex-1 min-w-0 rounded-xl border bg-card shadow-sm overflow-hidden ${isEditing ? 'border-emerald-400 ring-1 ring-emerald-300' : ''}`}>
                            {/* Card Header */}
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
                                  {activity.activity_type === 'comment' && activity.user_id === auth?.user?.id && hasPermission(permissions, 'edit-leads') && (
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
                            {/* Card Body */}
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
                                        router.put(route('leads.comments.update-activity', { lead: lead.id, activity: activity.id }), { comment: editCommentText }, { preserveScroll: true });
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
                              ) : activity.field_changed === 'lead_status_id' || activity.field_changed === 'name' || activity.field_changed === 'assigned_to' || activity.description?.includes('into') ? (
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
          router.delete(route('leads.delete-activity', { lead: lead.id, activity: currentActivity.id }), {
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
          router.delete(route('leads.delete-activities', lead.id), {
            preserveScroll: true
          });
          setIsDeleteAllModalOpen(false);
        }}
        itemName={t('all activities for {{name}}', { name: lead.name })}
        entityName={t('activities')}
      />
    </PageTemplate>
  );
}
