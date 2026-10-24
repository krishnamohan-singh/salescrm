import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, User, Building, MapPin, FileText, Phone, PhoneCall, Mail, Globe, DollarSign, Calendar, Target, UserCheck, MessageCircle, Eye, Trash2, Send, Edit, Check, X, TrendingUp, Clock, Tag, Users, ListTodo, CheckSquare, Plus, Video, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useState } from 'react';
import { useInitials } from '@/hooks/use-initials';
import { formatRelativeTime, getDisplayUrl } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';
import UserInitials from '@/components/user-initials';
import { EntityTasksCard } from '@/components/entity-tasks-card';
import { EntityServicesCard } from '@/components/entity-services-card';
import { EntityProductsCard } from '@/components/entity-products-card';
import { LogCallModal } from '@/components/log-call-modal';
import { EntityJourneyTimeline } from '@/components/entity-journey-timeline';

export default function LeadShow() {
  const { t } = useTranslation();
  const { lead, streamItems, auth, relatedAccounts, relatedContacts, meetings, tasks = [], users = [], taskStatuses = [], taskTypes = [], taskPriorities = [], activeServices = [], activeProducts = [] } = usePage().props as any;
  const comments = lead.comments || [];
  const isCompany = auth?.user?.type === 'company';
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false);
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
          onClick: () => router.visit(route('leads.index'))
        }
      ]}
      noPadding
    >
      <div className="mx-auto space-y-6">
        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {([
            { label: t('Lead Value'), value: formatCurrency(lead.value), icon: DollarSign, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: t('Pipeline Stage'), value: lead.lead_status?.name || '—', icon: TrendingUp, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: t('Source'), value: lead.lead_source?.name || '—', icon: Tag, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
            {
              label: t('Lead Age'),
              value: lead.lead_age || t('Just now'),
              icon: Clock,
              iconCls: lead.lead_age_badge === 'aging' ? 'text-rose-600' : lead.lead_age_badge === 'warm' ? 'text-amber-600' : 'text-emerald-600',
              blobCls: lead.lead_age_badge === 'aging' ? 'bg-rose-50 dark:bg-rose-900/30' : lead.lead_age_badge === 'warm' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30',
            },
            { label: t('Created'), value: window.appSettings?.formatDateTime(lead.created_at, false) || new Date(lead.created_at).toLocaleDateString(), icon: Calendar, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
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

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: Lead Information, Tasks & Meetings */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Single Unified Box: Lead Details */}
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-6">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                  {t('Lead Details')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Section 1: Lead Information */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    {t('Lead Information')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Status')}</p>
                      <div>{getStatusBadge(lead.status)}</div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Pipeline Stage')}</p>
                      <p className="text-sm font-medium text-foreground">{lead.lead_status?.name || '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Lead Age')}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold border ${
                          lead.lead_age_badge === 'aging'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                            : lead.lead_age_badge === 'warm'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        }`}>
                          <Clock className="h-3 w-3" />
                          {lead.lead_age || t('Just now')}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Source')}</p>
                      <p className="text-sm font-medium text-foreground">{lead.lead_source?.name || '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Conversion')}</p>
                      <div>
                        {lead.is_converted
                          ? <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"><TrendingUp className="h-3 w-3" />{t('Converted')}</span>
                          : <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground ring-1 ring-inset ring-border">{t('Not Converted')}</span>}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Account Name')}</p>
                      <p className="text-sm font-medium text-foreground truncate">{lead.account_name || '—'}</p>
                    </div>
                    {lead.integration_source && (
                      <div className="space-y-0.5 sm:col-span-2 lg:col-span-3">
                        <p className="text-xs font-medium text-muted-foreground">{t('Integration Channel')}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary capitalize">
                            {lead.integration_source === 'facebook' ? 'Facebook Lead Ads' : lead.integration_source === 'google_ads' ? 'Google Ads' : lead.integration_source === 'webhook' ? 'Custom Webhook' : 'REST API'}
                          </span>
                          {lead.external_lead_id && (
                            <span className="text-xs text-muted-foreground font-mono">#{lead.external_lead_id}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned To + Created By */}
                  <div className="pt-4 mt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>

                {/* Section 2: Contact & Address */}
                <div className="pt-6 border-t border-border">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                    <User className="h-3.5 w-3.5" />
                    {t('Contact & Address')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Email')}</p>
                      <p className="text-sm font-medium text-foreground truncate">{lead.email || '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Alternate Email')}</p>
                      <p className="text-sm font-medium text-foreground truncate">{lead.alternate_email || '—'}</p>
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
                    <div className="space-y-1.5 col-span-full pt-1">
                      <p className="text-xs font-medium text-muted-foreground">{t('Services')}</p>
                      {Array.isArray(lead.services) && lead.services.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {lead.services.map((service: any, index: number) => {
                            const serviceName = typeof service === 'string' ? service : (service?.name || service?.code || '');
                            const serviceKey = typeof service === 'string' ? `${service}-${index}` : (service?.id || index);
                            return (
                              <Badge key={serviceKey} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 text-xs py-0.5 px-2">
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

                  {lead.address && (
                    <div className="pt-4 mt-4 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                        <MapPin className="h-3.5 w-3.5" />{t('Address')}
                      </p>
                      <p className="text-sm font-medium text-foreground whitespace-pre-line">{lead.address}</p>
                    </div>
                  )}
                </div>

                {/* Section 3: Notes & Related Campaign */}
                <div className="pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Notes */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      {t('Notes')}
                    </h4>
                    <div className="p-4 rounded-xl border border-border bg-muted/20 min-h-[110px] max-h-[180px] overflow-y-auto">
                      {lead.notes ? (
                        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{lead.notes}</p>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                          <FileText className="h-6 w-6 text-muted-foreground/30 mb-1" />
                          <p className="text-xs text-muted-foreground">{t('No notes available')}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Related Campaign */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" />
                      {t('Related Campaign')}
                    </h4>
                    <div className="p-4 rounded-xl border border-border bg-muted/20 min-h-[110px] flex items-center">
                      {lead.campaign ? (
                        <div className="flex items-center justify-between w-full">
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
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Eye className="h-4 w-4 text-muted-foreground" /></Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full text-center py-2">
                          <Target className="h-6 w-6 text-muted-foreground/30 mb-1" />
                          <p className="text-xs text-muted-foreground">{t('No campaign linked')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

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

        {/* Products (Catalogue) */}
        <EntityProductsCard
          parentModule="lead"
          parentId={lead.id}
          parentName={lead.name}
          products={lead.products || []}
          activeProducts={activeProducts}
          permissions={permissions}
        />

        {/* Services (Catalogue) */}
        <EntityServicesCard
          parentModule="lead"
          parentId={lead.id}
          parentName={lead.name}
          services={lead.services || []}
          activeServices={activeServices}
          permissions={permissions}
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
          </div>{/* End Left Column */}

          {/* Right Column: Journey & Activity Timeline */}
          {hasPermission(permissions, 'view-stream') && (
            <div className="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0 space-y-6">
              <EntityJourneyTimeline
                streamItems={streamItems || []}
                entityType="lead"
                entityId={lead.id}
                entityName={lead.name}
                recipientEmail={lead.email || lead.alternate_email || ''}
                recipientName={lead.name}
                leadAge={lead.lead_age}
                leadAgeDays={lead.lead_age_days}
                leadAgeBadge={lead.lead_age_badge}
                canComment={hasPermission(permissions, 'create-leads')}
                canEdit={hasPermission(permissions, 'edit-leads')}
                canDeleteStream={hasPermission(permissions, 'delete-stream')}
                commentStoreRoute={route('leads.comments.store', lead.id)}
                commentUpdateActivityRoute="leads.comments.update-activity"
                deleteActivityRoute="leads.delete-activity"
                deleteAllActivitiesRoute="leads.delete-activities"
              />
            </div>
          )}
        </div>

      </div>

      {/* Log Call Modal */}
      <LogCallModal
        isOpen={isLogCallModalOpen}
        onClose={() => setIsLogCallModalOpen(false)}
        parentModule="lead"
        parentId={lead.id}
        parentName={lead.name}
        parentPhone={lead.phone}
        parentEmail={lead.email}
        users={users}
        defaultAssigneeId={lead.assigned_to}
      />
    </PageTemplate>
  );
}
