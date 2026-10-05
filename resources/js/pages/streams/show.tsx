import React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Trash2, MessageCircle, Calendar, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { hasPermission } from '@/utils/authorization';
import { useState } from 'react';
import { capitalize, formatRelativeTime } from '@/utils/helper';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageTemplate } from '@/components/page-template';
import { useInitials } from '@/hooks/use-initials';

interface Stream {
    id: number;
    activity_type: string;
    field_changed?: string;
    title: string;
    description: string;
    user_id: number;
    created_at: string;
    user?: { name: string; email: string; avatar?: string; };
    account?: { id: number; name: string; };
    lead?: { id: number; name: string; };
    opportunity?: { id: number; name: string; };
    invoice?: { id: number; name: string; };
    purchaseOrder?: { id: number; name: string; };
    quote?: { id: number; name: string; };
    salesOrder?: { id: number; name: string; };
}

interface StreamsShowProps {
    module: string;
    moduleTitle: string;
    streams: Stream[];
}

export default function Show({ module, moduleTitle, streams = [] }: StreamsShowProps) {
    const { t } = useTranslation();
    const { auth, flash } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentActivity, setCurrentActivity] = useState<any>(null);

    React.useEffect(() => {
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const getInitials = useInitials();

    const getRecordLink = (activity: Stream) => {
        if (activity.account) return { name: activity.account.name, href: route('accounts.show', activity.account.id) };
        if (activity.lead) return { name: activity.lead.name, href: route('leads.show', activity.lead.id) };
        if (activity.opportunity) return { name: activity.opportunity.name, href: route('opportunities.show', activity.opportunity.id) };
        if (activity.invoice) return { name: activity.invoice.name, href: route('invoices.show', activity.invoice.id) };
        if (activity.purchaseOrder) return { name: activity.purchaseOrder.name, href: route('purchase-orders.show', activity.purchaseOrder.id) };
        if (activity.quote) return { name: activity.quote.name, href: route('quotes.show', activity.quote.id) };
        if (activity.salesOrder) return { name: activity.salesOrder.name, href: route('sales-orders.show', activity.salesOrder.id) };
        return null;
    };

    const getActivityBadgeColor = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'created':   return 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30';
            case 'updated':   return 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30';
            case 'deleted':   return 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30';
            case 'assigned':  return 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-400 dark:ring-purple-500/30';
            case 'converted': return 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-500/30';
            case 'comment':   return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-500/30';
            default:          return 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-500/30';
        }
    };

    const getStatusBadgeColor = (desc: string): string | null => {
        const map: Record<string, string> = {
            'Active':         'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30',
            'Inactive':       'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30',
            'Overdue':        'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30',
            'Paid':           'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30',
            'Partially_paid': 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400 dark:ring-yellow-500/30',
            'Cancelled':      'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30',
            'Received':       'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30',
            'Rejected':       'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-500/30',
            'Expired':        'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-400 dark:ring-orange-500/30',
            'Sent':           'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30',
            'Accepted':       'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30',
            'Delivered':      'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30',
            'Shipped':        'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400 dark:ring-indigo-500/30',
            'Confirmed':      'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-500/30',
            'Processing':     'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-500/30',
            'Draft':          'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-500/30',
        };
        return map[desc] ?? null;
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Streams'), href: route('stream.index') },
        { title: t(moduleTitle) }
    ];

    return (
        <PageTemplate
            title={t(moduleTitle)}
            description={t('Activity stream and related information')}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 me-2" />,
                    variant: 'outline',
                    onClick: () => router.visit(route('stream.index'))
                }
            ]}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <Head title={`${t(moduleTitle)} - ${t('Streams')}`} />

            {hasPermission(permissions, 'view-stream') && (
                <>
                    <Card className="shadow-sm">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <Calendar className="h-5 w-5 me-3 text-primary" />
                                {t('Activity Stream')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {(streams ?? []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <MessageCircle className="h-10 w-10 mb-3 text-muted-foreground/30" />
                                    <p className="text-sm">{t('No activities found')}</p>
                                </div>
                            ) : (
                                <div className="py-4 px-3 sm:py-5 sm:px-5 max-h-[calc(100vh-327px)] overflow-y-auto">
                                    {(streams ?? []).map((activity, index) => (
                                        <div key={activity.id} className="relative flex gap-2 sm:gap-3 pb-4">
                                            {/* Avatar + connector */}
                                            <div className="flex flex-col items-center flex-shrink-0 w-8 sm:w-9">
                                                <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 relative z-10">
                                                    <TooltipProvider delayDuration={200}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="w-full h-full">
                                                                    <AvatarImage src={activity.user?.avatar} alt={activity.user?.name || 'U'} />
                                                                    <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full">
                                                                        {getInitials(activity.user?.name || 'U')}
                                                                    </AvatarFallback>
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top"><p>{activity.user?.name || t('System')}</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </Avatar>
                                                {index < (streams ?? []).length - 1 && (
                                                    <div className="absolute start-[15px] sm:start-[18px] top-8 sm:top-9 bottom-0 w-px bg-border dark:bg-gray-600" />
                                                )}
                                            </div>
                                            {/* Card */}
                                            <div className="flex-1 min-w-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                                                {/* Card Header */}
                                                <div className="flex items-start sm:items-center justify-between gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-muted/40 dark:bg-muted/20 border-b border-border">
                                                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                                                        <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[100px] sm:max-w-[180px]">
                                                            {activity.user?.name || t('System')}
                                                        </span>
                                                        <span className={`inline-flex items-center rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-medium ring-1 ring-inset ${getActivityBadgeColor(activity.activity_type)}`}>
                                                            {capitalize(activity.activity_type || 'Activity')}
                                                        </span>
                                                        {(() => {
                                                            const rec = getRecordLink(activity);
                                                            return rec ? (
                                                                <Link href={rec.href} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline truncate max-w-[90px] sm:max-w-[160px]">
                                                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                                                    <span className="truncate">{rec.name}</span>
                                                                </Link>
                                                            ) : null;
                                                        })()}
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatRelativeTime(activity.created_at)}
                                                        </span>
                                                    </div>
                                                    {hasPermission(permissions, 'delete-stream') && (
                                                        <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 w-6 p-0 text-muted-foreground  flex-shrink-0"
                                                                        onClick={() => { setCurrentActivity(activity); setIsDeleteModalOpen(true); }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top"><p>{t('Delete')}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                                {/* Card Body */}
                                                <div className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                    {activity.activity_type === 'comment' ? (
                                                        <p className="text-sm text-foreground break-words">{activity.description}</p>
                                                    ) : (() => {
                                                        const badgeColor = getStatusBadgeColor(activity.description);
                                                        return badgeColor ? (
                                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badgeColor}`}>
                                                                {activity.description?.replace('_', ' ')}
                                                            </span>
                                                        ) : activity.field_changed === 'lead_status_id' || activity.field_changed === 'name' || activity.field_changed === 'assigned_to' || activity.description?.includes('into') ? (
                                                            <p className="text-sm text-muted-foreground break-words" dangerouslySetInnerHTML={{ __html: activity.description }} />
                                                        ) : activity.title ? (
                                                            <p className="text-sm text-muted-foreground break-words" dangerouslySetInnerHTML={{ __html: activity.title }} />
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground break-words" dangerouslySetInnerHTML={{ __html: activity.description || '' }} />
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <CrudDeleteModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setIsDeleteModalOpen(false)}
                        onConfirm={() => {
                            if (currentActivity) {
                                router.delete(route(`stream.delete-${module.replace(/_/g, '-')}`, currentActivity.id), {
                                    onSuccess: () => {
                                        toast.success(t('Activity deleted successfully'));
                                        setIsDeleteModalOpen(false);
                                    },
                                    onError: () => {
                                        toast.error(t('Failed to delete activity'));
                                    }
                                });
                            }
                        }}
                        itemName={t('this activity')}
                        entityName={t('activity')}
                    />
                </>
            )}
        </PageTemplate>
    );
}
