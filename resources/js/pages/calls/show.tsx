import { PageTemplate } from '@/components/page-template';
import { Link, usePage } from '@inertiajs/react';
import { Phone, Clock, Users, Building2, ArrowLeft, Calendar, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDisplayUrl } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';

export default function CallShow() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { call } = usePage().props as any;
    const permissions = (usePage().props as any).auth?.permissions;

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Calls'), href: route('calls.index') },
        { title: t('View Call') }
    ];

    const formatDateTime = (date: string, time: string) => {
        const dateObj = new Date(`${date}T${time}`);
        return dateObj.toLocaleString();
    };

    return (
        <PageTemplate
            title={call.title}
            description={t('View call details and related information')}
            url={`/calls/${call.id}`}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => window.history.back()
                }
            ]}
            noPadding
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Call Details */}
                    <Card>
                        <div className="px-6 py-4 border-b">
                            <h2 className="text-lg font-semibold">{t('Call Details')}</h2>
                        </div>
                        <div className="p-6">

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('Date & Time')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {window.appSettings?.formatDateTime(call.start_date, false) || new Date(call.start_date).toLocaleDateString()} {window.appSettings?.formatTime(call.start_time) || call.start_time} - {window.appSettings?.formatDateTime(call.end_date, false) || new Date(call.end_date).toLocaleDateString()} {window.appSettings?.formatTime(call.end_time) || call.end_time}
                                    </p>
                                </div>
                            </div>

                            {call.description && (
                                <div>
                                    <p className="font-medium mb-2">{t('Description')}</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{call.description}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <span className="font-medium">{t('Status')}:</span>
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${call.status === 'planned' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                        call.status === 'held' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                            call.status === 'not_held' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                'bg-gray-50 text-gray-700 ring-gray-600/20'
                                    }`}>
                                    {call.status === 'planned' ? t('Planned') :
                                        call.status === 'held' ? t('Held') :
                                            call.status === 'not_held' ? t('Not Held') :
                                                call.status}
                                </span>
                            </div>
                        </div>
                        </div>
                    </Card>

                    {/* Attendees */}
                    {call.attendees && call.attendees.length > 0 && (
                        <Card>
                            <div className="px-6 py-4 border-b flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">{t('Attendees')}</h2>
                            </div>
                            <div className="p-6 space-y-3">
                                {call.attendees.map((attendee: any, index: number) => (
                                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                                        {attendee?.attendee?.avatar ?
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={attendee?.attendee?.avatar}
                                                    alt={attendee?.attendee?.name || 'Avatar'}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = getDisplayUrl('avatars/avatar.png');
                                                    }}
                                                />
                                                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                                                    {attendee?.attendee?.name?.charAt(0)?.toUpperCase() || 'U'}
                                                </AvatarFallback>
                                            </Avatar> :
                                            <UserInitials name={attendee.attendee?.name} />}
                                        <div>
                                            <p className="font-medium">{attendee.attendee?.name || t('Unknown')}</p>
                                            <p className="text-sm text-muted-foreground capitalize">
                                                {t(attendee.attendee_type)} {attendee.attendee?.email && `• ${attendee.attendee.email}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Call Info */}
                    <Card>
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-semibold">{t('Call Information')}</h3>
                        </div>
                        <div className="p-6 space-y-3">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('Created By')}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    {call.creator ? (
                                        <>
                                            <Avatar className="w-7 h-7 flex-shrink-0">
                                                <AvatarImage src={call.creator.avatar} alt={call.creator.name} />
                                                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(call.creator.name || '')}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{call.creator.name}</p>
                                                {call.creator.email && <p className="text-xs text-muted-foreground truncate">{call.creator.email}</p>}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{t('Unknown')}</p>
                                    )}
                                </div>
                            </div>

                            {call.assigned_user && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('Assigned To')}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <Avatar className="w-7 h-7 flex-shrink-0">
                                            <AvatarImage src={call.assigned_user.avatar} alt={call.assigned_user.name} />
                                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(call.assigned_user.name || '')}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{call.assigned_user.name}</p>
                                            {call.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{call.assigned_user.email}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('Created At')}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                    <p className="text-sm">{window.appSettings?.formatDateTime(call.created_at, false) || new Date(call.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {call.updated_at !== call.created_at && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('Last Updated')}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                        <p className="text-sm">{window.appSettings?.formatDateTime(call.created_at, false) || new Date(call.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Related Record */}
                    {call.parent_module && call.parent_record && (() => {
                        const isPerson = ['lead', 'contact', 'account'].includes(call.parent_module);
                        const recordName = call.parent_record.name || call.parent_record.subject;
                        const viewRoute = `view-${call.parent_module === 'opportunity' ? 'opportunities' : call.parent_module + 's'}`;
                        const recordRoute = `${call.parent_module === 'opportunity' ? 'opportunities' : call.parent_module + 's'}.show`;
                        const inner = (
                            <div className="flex items-center gap-2 min-w-0">
                                {isPerson && <UserInitials name={recordName} />}
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground capitalize">{t(call.parent_module)}</p>
                                    <p className="text-sm font-medium text-foreground truncate">{recordName}</p>
                                    {isPerson && call.parent_record.email && <p className="text-xs text-muted-foreground truncate">{call.parent_record.email}</p>}
                                </div>
                            </div>
                        );
                        return (
                            <Card className="shadow-sm">
                                <div className="flex items-center gap-2 px-5 py-3.5 border-b">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <h3 className="font-semibold text-base">{t('Related To')}</h3>
                                </div>
                                <div className="p-4">
                                    {hasPermission(permissions, viewRoute) ? (
                                        <Link href={route(recordRoute, call.parent_id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                                            {inner}
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center p-2.5 rounded-lg border">{inner}</div>
                                    )}
                                </div>
                            </Card>
                        );
                    })()}
                </div>
            </div>
        </PageTemplate>
    );
}
