import React, { useState, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  MessageCircle,
  Send,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  TrendingUp,
  UserCheck,
  PhoneCall,
  CalendarCheck,
  CheckSquare,
  Package,
  Layers,
  Building,
  RefreshCw,
  Tag,
  AlertCircle,
  Filter,
  CheckCircle2,
  GitCommit,
  UserPlus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Reply,
  Inbox
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { useInitials } from '@/hooks/use-initials';
import { formatRelativeTime } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';
import { toast } from '@/components/custom-toast';
import { SendEmailModal } from '@/components/send-email-modal';

export interface JourneyStreamItem {
  id: number;
  user_id?: number | null;
  activity_type: string;
  field_changed?: string | null;
  title?: string | null;
  description?: string | null;
  old_values?: any;
  new_values?: any;
  created_at: string;
  user?: {
    id: number;
    name: string;
    avatar?: string;
  } | null;
}

export interface EntityJourneyTimelineProps {
  title?: string;
  streamItems: JourneyStreamItem[];
  entityType: 'lead' | 'contact' | 'opportunity' | 'account';
  entityId: number | string;
  entityName?: string;
  recipientEmail?: string;
  recipientName?: string;
  leadAge?: string;
  leadAgeDays?: number;
  leadAgeBadge?: 'fresh' | 'warm' | 'aging' | string;
  canComment?: boolean;
  canEdit?: boolean;
  canDeleteStream?: boolean;
  commentStoreRoute: string;
  commentUpdateActivityRoute?: string;
  deleteActivityRoute?: string;
  deleteAllActivitiesRoute?: string;
  className?: string;
}

type TimelineFilter = 'all' | 'emails' | 'updates' | 'calls_meetings' | 'tasks' | 'comments';

export function EntityJourneyTimeline({
  title,
  streamItems = [],
  entityType,
  entityId,
  entityName,
  recipientEmail,
  recipientName,
  leadAge,
  leadAgeDays,
  leadAgeBadge = 'fresh',
  canComment = true,
  canEdit = true,
  canDeleteStream = true,
  commentStoreRoute,
  commentUpdateActivityRoute,
  deleteActivityRoute,
  deleteAllActivitiesRoute,
  className = '',
}: EntityJourneyTimelineProps) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const currentUserId = auth?.user?.id;
  const getInitials = useInitials();

  const [activeFilter, setActiveFilter] = useState<TimelineFilter>('all');
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<JourneyStreamItem | null>(null);
  const [isSendEmailOpen, setIsSendEmailOpen] = useState(false);
  const [isSyncingGmail, setIsSyncingGmail] = useState(false);
  const [expandedEmailIds, setExpandedEmailIds] = useState<Record<number, boolean>>({});

  const toggleEmailExpand = (id: number) => {
    setExpandedEmailIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSyncGmail = () => {
    setIsSyncingGmail(true);
    router.post(route('google-mail.sync'), { limit: 30 }, {
      preserveScroll: true,
      onSuccess: (page: any) => {
        setIsSyncingGmail(false);
        const msg = page.props?.flash?.success || t('Gmail sync completed.');
        toast.success(msg);
      },
      onError: () => {
        setIsSyncingGmail(false);
        toast.error(t('Failed to sync Gmail messages'));
      },
    });
  };

  // Categorize activities
  const categorizedItems = useMemo(() => {
    return streamItems.map((item) => {
      const type = (item.activity_type || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();

      let category: 'emails' | 'updates' | 'calls_meetings' | 'tasks' | 'comments' | 'other' = 'other';

      if (
        type.includes('email') ||
        title.includes('email') ||
        title.includes('mail') ||
        type === 'email_inbound' ||
        type === 'email_outbound'
      ) {
        category = 'emails';
      } else if (type === 'comment' || title.includes('comment') || desc.includes('comment') || title.includes('added a note')) {
        category = 'comments';
      } else if (
        type.includes('call') ||
        title.includes('call') ||
        type.includes('meeting') ||
        title.includes('meeting')
      ) {
        category = 'calls_meetings';
      } else if (type.includes('task') || title.includes('task')) {
        category = 'tasks';
      } else if (
        type === 'created' ||
        type === 'updated' ||
        type === 'assigned' ||
        type === 'converted' ||
        type.includes('stage') ||
        type.includes('status') ||
        type.includes('service')
      ) {
        category = 'updates';
      }

      return {
        ...item,
        _category: category,
      };
    });
  }, [streamItems]);

  // Counts for filters
  const counts = useMemo(() => {
    const total = categorizedItems.length;
    const emails = categorizedItems.filter((i) => i._category === 'emails').length;
    const comments = categorizedItems.filter((i) => i._category === 'comments').length;
    const callsMeetings = categorizedItems.filter((i) => i._category === 'calls_meetings').length;
    const tasks = categorizedItems.filter((i) => i._category === 'tasks').length;
    const updates = categorizedItems.filter((i) => i._category === 'updates').length;
    return { total, emails, comments, callsMeetings, tasks, updates };
  }, [categorizedItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return categorizedItems;
    return categorizedItems.filter((i) => i._category === activeFilter);
  }, [categorizedItems, activeFilter]);

  // Format date helper
  const formatExactDate = (dateString: string) => {
    if (!dateString) return '';
    return (
      window.appSettings?.formatDateTime(dateString, false) ||
      new Date(dateString).toLocaleString()
    );
  };

  // Activity visuals (icon, colors, badge label)
  const getActivityVisuals = (activity: JourneyStreamItem) => {
    const rawType = (activity.activity_type || '').toLowerCase();
    const title = (activity.title || '').toLowerCase();
    const field = (activity.field_changed || '').toLowerCase();

    // 0. Emails (Gmail / Inbound & Outbound)
    if (rawType.includes('email') || title.includes('email') || title.includes('mail')) {
      const isInbound = rawType.includes('inbound') || title.includes('received') || title.includes('inbound');
      return {
        label: isInbound ? t('Received Email (Gmail)') : t('Sent Email (Gmail)'),
        badgeCls: isInbound
          ? 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800'
          : 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
        nodeBg: isInbound ? 'bg-rose-500 text-white shadow-rose-200 dark:shadow-rose-950' : 'bg-blue-500 text-white shadow-blue-200 dark:shadow-blue-950',
        icon: Mail,
      };
    }

    // 1. Comments
    if (rawType === 'comment' || title.includes('comment') || title.includes('added a note')) {
      return {
        label: t('Comment'),
        badgeCls: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800',
        nodeBg: 'bg-indigo-500 text-white shadow-indigo-200 dark:shadow-indigo-950',
        icon: MessageCircle,
      };
    }

    // 2. Created
    if (rawType === 'created' || rawType.includes('creation') || title.includes('created')) {
      return {
        label: t('Created'),
        badgeCls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800',
        nodeBg: 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-950',
        icon: Sparkles,
      };
    }

    // 3. Converted
    if (rawType === 'converted' || rawType.includes('convert') || title.includes('converted')) {
      return {
        label: t('Converted'),
        badgeCls: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800',
        nodeBg: 'bg-amber-500 text-white shadow-amber-200 dark:shadow-amber-950',
        icon: Building,
      };
    }

    // 4. Calls
    if (rawType.includes('call') || title.includes('call')) {
      return {
        label: t('Call'),
        badgeCls: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-800',
        nodeBg: 'bg-cyan-600 text-white shadow-cyan-200 dark:shadow-cyan-950',
        icon: PhoneCall,
      };
    }

    // 5. Meetings
    if (rawType.includes('meeting') || title.includes('meeting')) {
      return {
        label: t('Meeting'),
        badgeCls: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800',
        nodeBg: 'bg-violet-600 text-white shadow-violet-200 dark:shadow-violet-950',
        icon: CalendarCheck,
      };
    }

    // 6. Tasks
    if (rawType.includes('task') || title.includes('task')) {
      return {
        label: t('Task'),
        badgeCls: 'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-800',
        nodeBg: 'bg-teal-600 text-white shadow-teal-200 dark:shadow-teal-950',
        icon: CheckSquare,
      };
    }

    // 7. Assigned
    if (rawType === 'assigned' || field === 'assigned_to' || title.includes('assigned')) {
      return {
        label: t('Assigned'),
        badgeCls: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-800',
        nodeBg: 'bg-purple-600 text-white shadow-purple-200 dark:shadow-purple-950',
        icon: UserPlus,
      };
    }

    // 8. Stage / Status / Pipeline
    if (field === 'lead_status_id' || field === 'stage' || field === 'status' || title.includes('status') || title.includes('stage')) {
      return {
        label: t('Stage Change'),
        badgeCls: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-800',
        nodeBg: 'bg-blue-600 text-white shadow-blue-200 dark:shadow-blue-950',
        icon: TrendingUp,
      };
    }

    // 9. Services
    if (rawType.includes('service') || title.includes('service')) {
      return {
        label: t('Service'),
        badgeCls: 'bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-950/40 dark:text-pink-300 dark:ring-pink-800',
        nodeBg: 'bg-pink-600 text-white shadow-pink-200 dark:shadow-pink-950',
        icon: Package,
      };
    }

    // 10. Default / Updated
    return {
      label: activity.activity_type
        ? activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)
        : t('Updated'),
      badgeCls: 'bg-slate-50 text-slate-700 ring-slate-600/20 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700',
      nodeBg: 'bg-slate-600 text-white shadow-slate-200 dark:shadow-slate-900',
      icon: RefreshCw,
    };
  };

  // Lead age pill visual styling
  const getLeadAgeBadgeStyle = () => {
    switch (leadAgeBadge) {
      case 'aging':
        return {
          container: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-300',
          dot: 'bg-rose-500 animate-pulse',
          label: t('Aging Lead (> 30d)'),
        };
      case 'warm':
        return {
          container: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-300',
          dot: 'bg-amber-500',
          label: t('Warm Lead (7-30d)'),
        };
      case 'fresh':
      default:
        return {
          container: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-300',
          dot: 'bg-emerald-500',
          label: t('Fresh Lead (< 7d)'),
        };
    }
  };

  // Submit comment
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    router.post(
      commentStoreRoute,
      { comment: newComment },
      {
        preserveScroll: true,
        onSuccess: () => {
          setNewComment('');
          setIsSubmitting(false);
        },
        onError: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  // Save edited comment
  const handleSaveComment = (activity: JourneyStreamItem) => {
    if (!editCommentText.trim()) return;

    if (commentUpdateActivityRoute) {
      router.put(
        route(commentUpdateActivityRoute, { [entityType]: entityId, activity: activity.id }),
        { comment: editCommentText },
        {
          preserveScroll: true,
          onSuccess: () => setEditingCommentId(null),
        }
      );
    } else {
      setEditingCommentId(null);
    }
  };

  // Delete activity
  const handleConfirmDelete = () => {
    if (!currentActivity) return;

    if (deleteActivityRoute) {
      router.delete(
        route(deleteActivityRoute, { [entityType]: entityId, activity: currentActivity.id }),
        {
          preserveScroll: true,
          onSuccess: () => {
            setIsDeleteModalOpen(false);
            setCurrentActivity(null);
          },
        }
      );
    } else {
      setIsDeleteModalOpen(false);
    }
  };

  // Delete all activities
  const handleConfirmDeleteAll = () => {
    if (!deleteAllActivitiesRoute) return;

    router.delete(route(deleteAllActivitiesRoute, entityId), {
      preserveScroll: true,
      onSuccess: () => setIsDeleteAllModalOpen(false),
    });
  };

  const ageStyle = getLeadAgeBadgeStyle();

  return (
    <Card className={`shadow-sm border rounded-xl overflow-hidden bg-card ${className}`}>
      {/* Timeline Header */}
      <CardHeader className="border-b py-3 px-4 sm:px-5 bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GitCommit className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base font-semibold leading-tight text-foreground flex items-center gap-2">
                <span className="truncate">{title || t('Journey & Activity Timeline')}</span>
                <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0 shrink-0">
                  {streamItems.length}
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {t('Chronological audit trail of all engagements and events')}
              </p>
            </div>
          </div>

          {/* Right Header items: Email compose, Gmail Sync, and Delete All button */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSendEmailOpen(true)}
              className="h-7 px-2.5 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shadow-2xs shrink-0"
            >
              <Send className="h-3 w-3" />
              <span>{t('Send Email')}</span>
            </Button>

            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSyncingGmail}
                    onClick={handleSyncGmail}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncingGmail ? 'animate-spin text-primary' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('Sync recent Gmail messages')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {deleteAllActivitiesRoute && canDeleteStream && streamItems.length > 0 && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setIsDeleteAllModalOpen(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {t('Clear')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{t('Clear all activity records')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Lead Age Status Banner (When Present) */}
        {leadAge && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`mt-2.5 px-3 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 shadow-2xs ${ageStyle.container}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ageStyle.dot}`} />
                    <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    <span className="font-semibold shrink-0">{t('Lead Age')}:</span>
                    <span className="font-bold truncate">{leadAge}</span>
                    {leadAgeDays !== undefined && (
                      <span className="opacity-75 font-mono text-[11px] shrink-0">
                        ({leadAgeDays} {leadAgeDays === 1 ? t('day') : t('days')})
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold shrink-0 border-current/30 px-1.5 py-0 bg-background/50">
                    {ageStyle.label}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="font-medium">{ageStyle.label}</p>
                <p className="text-xs opacity-90">{t('Calculated since lead inception')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'all' as TimelineFilter, label: t('All'), count: counts.total },
            { id: 'emails' as TimelineFilter, label: t('Emails'), count: counts.emails },
            { id: 'updates' as TimelineFilter, label: t('Updates'), count: counts.updates },
            { id: 'calls_meetings' as TimelineFilter, label: t('Calls & Mtgs'), count: counts.callsMeetings },
            { id: 'tasks' as TimelineFilter, label: t('Tasks'), count: counts.tasks },
            { id: 'comments' as TimelineFilter, label: t('Comments'), count: counts.comments },
          ].map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive ? 'bg-primary-foreground/25 text-primary-foreground' : 'bg-background/80 text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Comment Composer */}
        {canComment && (
          <div className="px-4 py-3.5 border-b bg-muted/10">
            <form onSubmit={handleCommentSubmit}>
              <div className="flex items-start gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5 border border-border shadow-2xs">
                  <AvatarImage src={auth?.user?.avatar} alt={auth?.user?.name || 'User'} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(auth?.user?.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 rounded-xl border border-input shadow-xs overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all bg-background">
                  <Textarea
                    placeholder={t('Write an update, note, or comment... (Ctrl+Enter to send)')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleCommentSubmit(e);
                      }
                    }}
                    className="border-0 resize-none focus-visible:ring-0 bg-transparent text-sm py-2 px-3 min-h-[58px]"
                    rows={2}
                  />
                  <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/20">
                    <span className="text-[11px] text-muted-foreground">
                      {t('Press Ctrl+Enter to post')}
                    </span>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!newComment.trim() || isSubmitting}
                            className="h-7 px-3 text-xs gap-1.5 shadow-2xs"
                          >
                            <Send className="h-3 w-3" />
                            <span>{t('Post')}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>{t('Post update to timeline')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Timeline Events List */}
        <div className="max-h-[560px] overflow-y-auto px-4 py-5 space-y-0">
          {filteredItems.length > 0 ? (
            <div className="relative pl-1">
              {filteredItems.map((activity, index) => {
                const visuals = getActivityVisuals(activity);
                const IconComponent = visuals.icon;
                const isEditing = editingCommentId === activity.id;
                const isComment = (activity.activity_type || '').toLowerCase() === 'comment';
                const isAuthor = activity.user_id === currentUserId;
                const isLast = index === filteredItems.length - 1;

                return (
                  <div key={activity.id || index} className="relative flex gap-3 pb-5 group">
                    {/* Continuous vertical connector line */}
                    {!isLast && (
                      <div
                        className="absolute left-[17px] top-8 bottom-0 w-[2px] bg-gradient-to-b from-border via-border/80 to-transparent"
                        aria-hidden="true"
                      />
                    )}

                    {/* Timeline Node Icon / Avatar */}
                    <div className="flex flex-col items-center flex-shrink-0 relative z-10">
                      {isComment && activity.user?.avatar ? (
                        <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-background shadow-xs">
                          <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                            {getInitials(activity.user.name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-background shadow-xs ${visuals.nodeBg}`}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Timeline Card */}
                    <div
                      className={`flex-1 min-w-0 rounded-xl border bg-card shadow-2xs transition-all duration-200 overflow-hidden ${
                        isEditing
                          ? 'border-primary ring-1 ring-primary'
                          : 'hover:border-border/80 hover:shadow-sm'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b bg-muted/20">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {activity.user?.name || t('System')}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${visuals.badgeCls}`}
                          >
                            {visuals.label}
                          </span>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 cursor-default">
                                  <Clock className="h-2.5 w-2.5 opacity-70" />
                                  {formatRelativeTime(activity.created_at)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="font-mono text-xs">{formatExactDate(activity.created_at)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>

                        {/* Card Actions (Edit, Delete) */}
                        {!isEditing && (
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            {isComment && isAuthor && canEdit && commentUpdateActivityRoute && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        setEditingCommentId(activity.id);
                                        setEditCommentText(activity.description || '');
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>{t('Edit comment')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            {canDeleteStream && deleteActivityRoute && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => {
                                        setCurrentActivity(activity);
                                        setIsDeleteModalOpen(true);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>{t('Delete item')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="px-3.5 py-2.5 text-xs">
                        {activity._category === 'emails' ? (
                          <div className="space-y-2">
                            {/* Email metadata header */}
                            <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 space-y-1.5 text-xs">
                              {activity.new_values?.from && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <span className="font-semibold text-foreground">{t('From')}:</span>
                                  <span className="truncate font-mono text-[11px]">{activity.new_values.from}</span>
                                </div>
                              )}
                              {activity.new_values?.to && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <span className="font-semibold text-foreground">{t('To')}:</span>
                                  <span className="truncate font-mono text-[11px]">
                                    {Array.isArray(activity.new_values.to) ? activity.new_values.to.join(', ') : activity.new_values.to}
                                  </span>
                                </div>
                              )}
                              {activity.new_values?.subject && (
                                <div className="pt-0.5">
                                  <p className="font-semibold text-foreground text-xs">{activity.new_values.subject}</p>
                                </div>
                              )}
                            </div>

                            {/* Email Snippet / Body */}
                            <div className="text-muted-foreground text-xs leading-relaxed">
                              {expandedEmailIds[activity.id] ? (
                                <div className="p-2.5 rounded-lg bg-background border border-border space-y-2 text-xs">
                                  <div
                                    className="prose prose-sm dark:prose-invert max-w-none text-xs break-words"
                                    dangerouslySetInnerHTML={{
                                      __html: activity.new_values?.body || activity.description || '',
                                    }}
                                  />
                                </div>
                              ) : (
                                <p className="line-clamp-2 italic">
                                  "{activity.new_values?.snippet || activity.description}"
                                </p>
                              )}
                            </div>

                            {/* Action toggles (Expand / Collapse / Reply) */}
                            <div className="flex items-center justify-between pt-1 text-[11px]">
                              <button
                                type="button"
                                onClick={() => toggleEmailExpand(activity.id)}
                                className="text-primary hover:underline font-medium flex items-center gap-1"
                              >
                                {expandedEmailIds[activity.id] ? (
                                  <>
                                    <ChevronUp className="h-3 w-3" />
                                    {t('Show less')}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3 w-3" />
                                    {t('View full email')}
                                  </>
                                )}
                              </button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSendEmailOpen(true)}
                                className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                              >
                                <Reply className="h-3 w-3" />
                                {t('Reply')}
                              </Button>
                            </div>
                          </div>
                        ) : isComment ? (
                          isEditing ? (
                            <div className="space-y-2 pt-1">
                              <Textarea
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="w-full text-xs resize-none"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2.5 text-xs"
                                  onClick={() => setEditingCommentId(null)}
                                >
                                  {t('Cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 text-xs"
                                  onClick={() => handleSaveComment(activity)}
                                >
                                  {t('Save')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                              {activity.description}
                            </p>
                          )
                        ) : (
                          <div className="space-y-1">
                            {activity.title && (
                              <p className="font-medium text-foreground leading-snug">
                                {activity.title}
                              </p>
                            )}
                            {activity.description && activity.description !== activity.title && (
                              <div
                                className="text-muted-foreground leading-relaxed break-words"
                                dangerouslySetInnerHTML={{ __html: activity.description }}
                              />
                            )}

                            {/* Before/After Diff Chips */}
                            {activity.old_values && activity.new_values && (
                              <div className="pt-2 mt-1 border-t border-border/50 flex flex-wrap gap-1.5 items-center">
                                {Object.keys(activity.new_values)
                                  .filter((k) => !['updated_at', 'created_at', 'id'].includes(k))
                                  .slice(0, 3)
                                  .map((key) => {
                                    const oldVal = activity.old_values?.[key];
                                    const newVal = activity.new_values?.[key];
                                    if (oldVal === newVal) return null;
                                    return (
                                      <div
                                        key={key}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-muted/60 font-mono"
                                      >
                                        <span className="text-muted-foreground capitalize">
                                          {key.replace('_', ' ')}:
                                        </span>
                                        <span className="line-through text-rose-500">
                                          {String(oldVal || t('none'))}
                                        </span>
                                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                          {String(newVal || t('none'))}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3 text-muted-foreground/40">
                <Calendar className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {activeFilter === 'all'
                  ? t('No activity recorded yet')
                  : t('No {{filter}} found', { filter: activeFilter.replace('_', ' ') })}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                {t('Engagements, stage updates, calls, meetings, and notes will appear here in chronological journey order.')}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Delete Item Modal */}
      {deleteActivityRoute && (
        <CrudDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setCurrentActivity(null);
          }}
          onConfirm={handleConfirmDelete}
          itemName={t('this activity')}
          entityName={t('activity')}
        />
      )}

      {/* Delete All Modal */}
      {deleteAllActivitiesRoute && (
        <CrudDeleteModal
          isOpen={isDeleteAllModalOpen}
          onClose={() => setIsDeleteAllModalOpen(false)}
          onConfirm={handleConfirmDeleteAll}
          itemName={t('all activities for {{name}}', { name: entityName || entityType })}
          entityName={t('activities')}
        />
      )}

      {/* Compose & Send Email Modal */}
      <SendEmailModal
        isOpen={isSendEmailOpen}
        onClose={() => setIsSendEmailOpen(false)}
        recipientEmail={recipientEmail || ''}
        recipientName={recipientName}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
      />
    </Card>
  );
}
export default EntityJourneyTimeline;
