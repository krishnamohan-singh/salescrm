import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  Send,
  Inbox,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Trash2,
  Reply,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Target,
  Briefcase,
  Paperclip,
  Clock,
  Settings,
  Sparkles,
  Link as LinkIcon,
  Filter,
  FileText,
  Image as ImageIcon,
  Download,
  File,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { SendEmailModal } from '@/components/send-email-modal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { Pagination } from '@/components/ui/pagination';
import { toast } from '@/components/custom-toast';

interface CrmEmailItem {
  id: number;
  message_id: string;
  thread_id?: string;
  direction: 'inbound' | 'outbound';
  from_email: string;
  from_name: string;
  to_emails: string[];
  cc_emails?: string[];
  bcc_emails?: string[];
  subject: string;
  snippet?: string;
  body_text?: string;
  body_html?: string;
  sent_at: string;
  has_attachments: boolean;
  attachment_names?: Array<string | { name: string; size?: number; mime?: string; url?: string; path?: string }>;
  source: string;
  lead_id?: number;
  contact_id?: number;
  account_id?: number;
  opportunity_id?: number;
  lead?: { id: number; name: string; email?: string };
  contact?: { id: number; name: string; email?: string };
  account?: { id: number; name: string; email?: string };
  opportunity?: { id: number; name: string };
  user?: { id: number; name: string };
}

interface EmailsPageProps {
  emails: {
    data: CrmEmailItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: any[];
  };
  counts: {
    total: number;
    inbound: number;
    outbound: number;
    leads: number;
    contacts: number;
    accounts: number;
    opportunities: number;
    unlinked: number;
  };
  filters: {
    direction: string;
    entity_type: string;
    search: string;
    selected_id?: number | string;
  };
  googleMail: {
    isConnected: boolean;
    connectedEmail?: string;
    connectedName?: string;
    lastSyncAt?: string;
  };
  availableEntities?: {
    leads?: Array<{ id: number; name: string; email?: string }>;
    contacts?: Array<{ id: number; name: string; email?: string }>;
    accounts?: Array<{ id: number; name: string; email?: string }>;
    opportunities?: Array<{ id: number; name: string; contact?: any; account?: any }>;
  };
}

export default function EmailsIndex({
  emails,
  counts,
  filters,
  googleMail,
  availableEntities,
}: EmailsPageProps) {
  const { t } = useTranslation();

  // Search input state
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [isSyncing, setIsSyncing] = useState(false);

  // Selected email state
  const [selectedEmail, setSelectedEmail] = useState<CrmEmailItem | null>(() => {
    if (filters.selected_id) {
      return emails.data.find((e) => String(e.id) === String(filters.selected_id)) || emails.data[0] || null;
    }
    return emails.data[0] || null;
  });

  // Compose modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeRecipientName, setComposeRecipientName] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeEntityType, setComposeEntityType] = useState('');
  const [composeEntityId, setComposeEntityId] = useState<number | string>('');
  const [composeEntityName, setComposeEntityName] = useState('');

  // Delete modal state
  const [deleteEmailId, setDeleteEmailId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Format file size helper
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date helper with proper date and time
  const formatEmailDate = (dateStr: string) => {
    if (!dateStr) return '';
    const safeStr = typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')
      ? dateStr.replace(' ', 'T')
      : dateStr;
    const date = new Date(safeStr);
    if (isNaN(date.getTime())) return String(dateStr);

    const now = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `${t('Today')}, ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isYesterday) {
      return `${t('Yesterday')}, ${timeStr}`;
    }

    const isThisYear = date.getFullYear() === now.getFullYear();
    const datePart = date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      ...(isThisYear ? {} : { year: 'numeric' }),
    });
    return `${datePart}, ${timeStr}`;
  };

  // Trigger search filter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.get(
      route('emails.index'),
      {
        ...filters,
        search: searchQuery,
      },
      { preserveState: true }
    );
  };

  // Filter change (folder or entity)
  const handleFilterChange = (key: 'direction' | 'entity_type', value: string) => {
    router.get(
      route('emails.index'),
      {
        ...filters,
        [key]: value,
      },
      { preserveState: true }
    );
  };

  // Sync emails from Gmail
  const handleSyncNow = () => {
    setIsSyncing(true);
    router.post(
      route('google-mail.sync'),
      { limit: 500 },
      {
        preserveScroll: true,
        onSuccess: () => {
          setIsSyncing(false);
          toast.success(t('Gmail synced successfully!'));
        },
        onError: () => {
          setIsSyncing(false);
          toast.error(t('Failed to sync emails. Please check your Google account connection.'));
        },
      }
    );
  };

  // Reply to selected email
  const handleReply = (email: CrmEmailItem) => {
    const replyTo = email.direction === 'inbound' ? email.from_email : (email.to_emails[0] || '');
    const replyName = email.direction === 'inbound' ? email.from_name : '';
    const subjectPrefix = email.subject.toLowerCase().startsWith('re:') ? '' : 'Re: ';

    setComposeRecipient(replyTo);
    setComposeRecipientName(replyName);
    setComposeSubject(`${subjectPrefix}${email.subject}`);

    if (email.lead) {
      setComposeEntityType('lead');
      setComposeEntityId(email.lead.id);
      setComposeEntityName(email.lead.name);
    } else if (email.contact) {
      setComposeEntityType('contact');
      setComposeEntityId(email.contact.id);
      setComposeEntityName(email.contact.name);
    } else if (email.account) {
      setComposeEntityType('account');
      setComposeEntityId(email.account.id);
      setComposeEntityName(email.account.name);
    } else if (email.opportunity) {
      setComposeEntityType('opportunity');
      setComposeEntityId(email.opportunity.id);
      setComposeEntityName(email.opportunity.name);
    } else {
      setComposeEntityType('');
      setComposeEntityId('');
      setComposeEntityName('');
    }

    setIsComposeOpen(true);
  };

  // Open fresh Compose modal
  const handleOpenCompose = () => {
    setComposeRecipient('');
    setComposeRecipientName('');
    setComposeSubject('');
    setComposeEntityType('');
    setComposeEntityId('');
    setComposeEntityName('');
    setIsComposeOpen(true);
  };

  // Confirm delete email
  const handleConfirmDelete = () => {
    if (!deleteEmailId) return;
    router.delete(route('emails.destroy', deleteEmailId), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success(t('Email deleted successfully'));
        setIsDeleteOpen(false);
        if (selectedEmail?.id === deleteEmailId) {
          setSelectedEmail(null);
        }
      },
      onError: () => {
        toast.error(t('Failed to delete email'));
      },
    });
  };

  const breadcrumbs = [
    { label: t('Home'), href: route('dashboard') },
    { label: t('Emails & Mailbox') },
  ];

  return (
    <PageTemplate
      title={t('Emails & Mailbox')}
      description={t('Unified inbox and communication timeline synced with Google Mail')}
      breadcrumbs={breadcrumbs}
      actions={[
        {
          label: t('Compose Email'),
          icon: <Send className="h-4 w-4 mr-2" />,
          variant: 'default',
          onClick: handleOpenCompose,
        },
        {
          label: isSyncing ? t('Syncing...') : t('Sync Gmail'),
          icon: <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />,
          variant: 'outline',
          onClick: handleSyncNow,
          disabled: isSyncing || !googleMail.isConnected,
        },
      ]}
      noPadding
    >
      <Head title={t('Emails & Mailbox')} />

      <div className="mx-auto space-y-6">
        {/* Google Mail Connection Banner */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
          googleMail.isConnected
            ? 'bg-emerald-500/5 border-emerald-500/20 text-foreground'
            : 'bg-amber-500/5 border-amber-500/20 text-foreground'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg shrink-0 ${
              googleMail.isConnected ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
            }`}>
              {googleMail.isConnected ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {googleMail.isConnected ? t('Google Mail Connected') : t('Google Mail Disconnected')}
                </span>
                {googleMail.connectedEmail && (
                  <Badge variant="outline" className="font-mono text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                    {googleMail.connectedEmail}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {googleMail.isConnected
                  ? t('Emails sent & received via Gmail are automatically synchronized to CRM timelines.')
                  : t('Connect your Google Workspace or Gmail account in settings to enable two-way sync.')}
                {googleMail.lastSyncAt && (
                  <span className="ml-1 opacity-75">
                    ({t('Last synced')}: {formatEmailDate(googleMail.lastSyncAt)})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
            {!googleMail.isConnected ? (
              <Button
                size="sm"
                variant="default"
                className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => { window.location.href = route('google-mail.connect'); }}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t('Connect Account')}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                className="gap-1.5 text-xs"
                onClick={() => {
                  if (confirm(t('Are you sure you want to disconnect your Google account? All synced emails and mailbox data for this account will be removed.'))) {
                    router.post(route('google-mail.disconnect'), {}, {
                      preserveScroll: true,
                      onSuccess: () => toast.success(t('Google account disconnected successfully.')),
                    });
                  }
                }}
              >
                {t('Disconnect Account')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              onClick={() => router.visit(route('settings') + '#google-mail-settings')}
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              {t('Mail Settings')}
            </Button>
          </div>
        </div>

        {/* Quick Stat Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: t('Total Emails'),
              value: counts.total,
              icon: Mail,
              iconCls: 'text-primary',
              blobCls: 'bg-primary/10',
            },
            {
              label: t('Received (Inbound)'),
              value: counts.inbound,
              icon: ArrowDownLeft,
              iconCls: 'text-emerald-600',
              blobCls: 'bg-emerald-50 dark:bg-emerald-950/40',
            },
            {
              label: t('Sent (Outbound)'),
              value: counts.outbound,
              icon: ArrowUpRight,
              iconCls: 'text-blue-600',
              blobCls: 'bg-blue-50 dark:bg-blue-950/40',
            },
            {
              label: t('Linked to CRM'),
              value: counts.leads + counts.contacts + counts.accounts + counts.opportunities,
              icon: User,
              iconCls: 'text-purple-600',
              blobCls: 'bg-purple-50 dark:bg-purple-950/40',
            },
          ].map(({ label, value, icon: Icon, iconCls, blobCls }) => (
            <Card key={label} className="relative overflow-hidden shadow-2xs">
              <div className={`absolute top-0 right-0 w-16 h-16 ${blobCls} rounded-bl-full`} />
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold font-mono text-foreground mt-1">{value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${blobCls}`}>
                    <Icon className={`h-4 w-4 ${iconCls}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Split Mailbox Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* 1. Left Folders & Entity Filters Sidebar (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="shadow-2xs">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Inbox className="h-3.5 w-3.5" />
                  {t('Mailbox Folders')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {[
                  { id: 'all', label: t('All Mail'), count: counts.total, icon: Mail },
                  { id: 'inbound', label: t('Inbox (Received)'), count: counts.inbound, icon: ArrowDownLeft, color: 'text-emerald-600' },
                  { id: 'outbound', label: t('Sent Messages'), count: counts.outbound, icon: ArrowUpRight, color: 'text-blue-600' },
                ].map((folder) => {
                  const isActive = (filters.direction || 'all') === folder.id;
                  const Icon = folder.icon;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => handleFilterChange('direction', folder.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : folder.color || 'text-muted-foreground'}`} />
                        <span>{folder.label}</span>
                      </div>
                      <Badge
                        variant={isActive ? 'secondary' : 'outline'}
                        className={`text-[10px] px-1.5 py-0 font-mono ${
                          isActive ? 'bg-primary-foreground/20 text-primary-foreground' : ''
                        }`}
                      >
                        {folder.count}
                      </Badge>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="shadow-2xs">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  {t('CRM Entity Filter')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {[
                  { id: 'all', label: t('All Records'), count: counts.total, icon: LinkIcon },
                  { id: 'lead', label: t('Leads'), count: counts.leads, icon: Target, color: 'text-orange-600' },
                  { id: 'contact', label: t('Contacts'), count: counts.contacts, icon: User, color: 'text-purple-600' },
                  { id: 'account', label: t('Accounts'), count: counts.accounts, icon: Building, color: 'text-blue-600' },
                  { id: 'opportunity', label: t('Opportunities'), count: counts.opportunities, icon: Briefcase, color: 'text-emerald-600' },
                  { id: 'unlinked', label: t('Unlinked'), count: counts.unlinked, icon: Mail, color: 'text-muted-foreground' },
                ].map((item) => {
                  const isActive = (filters.entity_type || 'all') === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleFilterChange('entity_type', item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : item.color}`} />
                        <span>{item.label}</span>
                      </div>
                      <Badge
                        variant={isActive ? 'secondary' : 'outline'}
                        className={`text-[10px] px-1.5 py-0 font-mono ${
                          isActive ? 'bg-primary-foreground/20 text-primary-foreground' : ''
                        }`}
                      >
                        {item.count}
                      </Badge>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* 2. Middle Email List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search subject, sender, content...')}
                className="pl-9 pr-8 text-xs h-9 bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    router.get(route('emails.index'), { ...filters, search: '' }, { preserveState: true });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </form>

            {/* Email List Cards */}
            <Card className="shadow-2xs overflow-hidden">
              <div className="divide-y divide-border/60 max-h-[620px] overflow-y-auto">
                {emails.data.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Mail className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{t('No emails found')}</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      {t('Try adjusting your search criteria, or click "Sync Gmail" to retrieve new messages.')}
                    </p>
                  </div>
                ) : (
                  emails.data.map((email) => {
                    const isSelected = selectedEmail?.id === email.id;
                    const isInbound = email.direction === 'inbound';
                    return (
                      <div
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={`p-3.5 cursor-pointer transition-all border-l-3 ${
                          isSelected
                            ? 'bg-primary/10 border-l-primary'
                            : 'hover:bg-muted/50 border-l-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {isInbound ? (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            )}
                            <span className="font-semibold text-xs text-foreground truncate">
                              {isInbound ? email.from_name || email.from_email : (email.to_emails[0] || t('Recipient'))}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                            {formatEmailDate(email.sent_at)}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-foreground truncate mb-1">
                          {email.subject || t('(No Subject)')}
                        </p>

                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-snug">
                          {email.snippet || email.body_text || t('(No preview available)')}
                        </p>

                        {/* Entity linkage pill */}
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {email.lead && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal gap-1 bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900">
                              <Target className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[120px]">{email.lead.name}</span>
                            </Badge>
                          )}
                          {email.contact && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal gap-1 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900">
                              <User className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[120px]">{email.contact.name}</span>
                            </Badge>
                          )}
                          {email.account && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal gap-1 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900">
                              <Building className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[120px]">{email.account.name}</span>
                            </Badge>
                          )}
                          {email.opportunity && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                              <Briefcase className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[120px]">{email.opportunity.name}</span>
                            </Badge>
                          )}
                          {email.user && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal gap-1 text-muted-foreground border-dashed">
                              <User className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[100px]">{email.user.name}</span>
                            </Badge>
                          )}
                          {email.has_attachments && (
                            <Paperclip className="h-3 w-3 text-muted-foreground ml-auto" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination */}
              {emails.total > emails.per_page && (
                <div className="p-3 border-t bg-muted/20">
                  <Pagination links={emails.links} />
                </div>
              )}
            </Card>
          </div>

          {/* 3. Right Full Email Reading & Detail View (5 cols) */}
          <div className="lg:col-span-5">
            {selectedEmail ? (
              <Card className="shadow-sm overflow-hidden sticky top-6">
                <CardHeader className="p-4 border-b bg-muted/20 space-y-3">
                  {/* Subject and Action buttons */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold tracking-wider ${
                            selectedEmail.direction === 'inbound'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                          }`}
                        >
                          {selectedEmail.direction === 'inbound' ? t('Received (Inbound)') : t('Sent (Outbound)')}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {selectedEmail.source === 'gmail' ? 'Gmail API' : 'SMTP'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-foreground leading-snug">
                        {selectedEmail.subject || t('(No Subject)')}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReply(selectedEmail)}
                        className="h-8 px-2.5 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        <span>{t('Reply')}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeleteEmailId(selectedEmail.id);
                          setIsDeleteOpen(true);
                        }}
                        className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title={t('Delete')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Sender & Recipient Metadata */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-foreground">{t('From')}:</span>
                        <span className="text-foreground font-medium">{selectedEmail.from_name || selectedEmail.from_email}</span>
                        <span className="text-muted-foreground font-mono text-[11px]">&lt;{selectedEmail.from_email}&gt;</span>
                      </div>
                      <span className="text-[11px] font-mono shrink-0 flex items-center gap-1 text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/60">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatEmailDate(selectedEmail.sent_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                      <span className="font-semibold text-foreground">{t('To')}:</span>
                      <span className="font-mono text-[11px] text-foreground">
                        {Array.isArray(selectedEmail.to_emails)
                          ? selectedEmail.to_emails.join(', ')
                          : selectedEmail.to_emails}
                      </span>
                    </div>

                    {selectedEmail.cc_emails && selectedEmail.cc_emails.length > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                        <span className="font-semibold text-foreground">{t('Cc')}:</span>
                        <span className="font-mono text-[11px]">{selectedEmail.cc_emails.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Linked CRM Entity Card */}
                  {(selectedEmail.lead || selectedEmail.contact || selectedEmail.account || selectedEmail.opportunity) && (
                    <div className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded bg-primary/10 text-primary">
                          <LinkIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="text-muted-foreground text-[11px]">{t('Linked CRM Record')}: </span>
                          <strong className="text-foreground font-semibold">
                            {selectedEmail.lead?.name ||
                              selectedEmail.contact?.name ||
                              selectedEmail.account?.name ||
                              selectedEmail.opportunity?.name}
                          </strong>
                        </div>
                      </div>

                      {/* Link to Entity Profile */}
                      <div>
                        {selectedEmail.lead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px] text-primary gap-1"
                            onClick={() => router.visit(route('leads.show', selectedEmail.lead!.id))}
                          >
                            <span>{t('View Lead')}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {selectedEmail.contact && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px] text-primary gap-1"
                            onClick={() => router.visit(route('contacts.show', selectedEmail.contact!.id))}
                          >
                            <span>{t('View Contact')}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {selectedEmail.account && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px] text-primary gap-1"
                            onClick={() => router.visit(route('accounts.show', selectedEmail.account!.id))}
                          >
                            <span>{t('View Account')}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {selectedEmail.opportunity && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px] text-primary gap-1"
                            onClick={() => router.visit(route('opportunities.show', selectedEmail.opportunity!.id))}
                          >
                            <span>{t('View Opportunity')}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardHeader>

                {/* Email Body */}
                <CardContent className="p-6 max-h-[520px] overflow-y-auto">
                  {selectedEmail.body_html ? (
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed break-words"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-xs text-foreground leading-relaxed">
                      {selectedEmail.body_text || selectedEmail.snippet || t('(Empty message body)')}
                    </div>
                  )}
                </CardContent>

                {/* Attachments Section (Documents & Media) */}
                {selectedEmail.has_attachments && selectedEmail.attachment_names && selectedEmail.attachment_names.length > 0 && (
                  <div className="p-5 border-t bg-muted/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Paperclip className="h-4 w-4 text-primary" />
                      <span>{t('Attachments')} ({selectedEmail.attachment_names.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedEmail.attachment_names.map((att: any, idx: number) => {
                        const attName = typeof att === 'string' ? att : att?.name || `Attachment ${idx + 1}`;
                        const attUrl = typeof att === 'object' && att?.url ? att.url : null;
                        const attSize = typeof att === 'object' && att?.size ? formatFileSize(att.size) : null;
                        const isImg = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attName);

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2.5 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-all text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-2 rounded-md bg-muted text-muted-foreground shrink-0">
                                {isImg ? (
                                  <ImageIcon className="h-4 w-4 text-purple-500" />
                                ) : (
                                  <FileText className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate text-foreground text-xs" title={attName}>{attName}</p>
                                {attSize && <p className="text-[10px] text-muted-foreground font-mono">{attSize}</p>}
                              </div>
                            </div>
                            {attUrl ? (
                              <a
                                href={attUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0 p-1 px-2 rounded hover:bg-primary/10 transition-colors"
                              >
                                <span>{t('Download')}</span>
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                                {t('Attached')}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-12 text-center shadow-2xs space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Mail className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">{t('No Email Selected')}</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {t('Select an email from the list on the left to read its full contents, reply, or inspect linked CRM customer history.')}
                </p>
                <Button size="sm" variant="outline" onClick={handleOpenCompose} className="gap-2 text-xs">
                  <Send className="h-3.5 w-3.5" />
                  {t('Compose New Email')}
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Compose & Send Email Modal */}
      <SendEmailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        recipientEmail={composeRecipient}
        recipientName={composeRecipientName}
        initialSubject={composeSubject}
        entityType={composeEntityType}
        entityId={composeEntityId}
        entityName={composeEntityName}
        availableEntities={availableEntities}
      />

      {/* Delete Email Modal */}
      <CrudDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteEmailId(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={t('this email record')}
        entityName={t('email')}
      />
    </PageTemplate>
  );
}
