import { PageTemplate } from '@/components/page-template';
import { Link, usePage } from '@inertiajs/react';
import { Calendar, MapPin, Clock, Users, Building2, ArrowLeft, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDisplayUrl } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function MeetingShow() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { meeting } = usePage().props as any;
    const permissions = (usePage().props as any).auth?.permissions;

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Meetings'), href: route('meetings.index') },
        { title: t('View Meeting') }
    ];



    return (
        <PageTemplate
            title={meeting.title}
            description={t('Meeting details and related information')}
            url={`/meetings/${meeting.id}`}
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
                    {/* Meeting Details */}
                    <Card>
                        <div className="px-6 py-4 border-b">
                            <h2 className="text-lg font-semibold">{t('Meeting Details')}</h2>
                        </div>
                        <div className="p-6">

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                                <div>
                                    <p className="font-medium">{t('Date & Time')}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {window.appSettings?.formatDateTime(meeting.start_date, false) || new Date(meeting.start_date).toLocaleDateString()} {window.appSettings?.formatTime(meeting.start_time) || meeting.start_time} - {window.appSettings?.formatDateTime(meeting.end_date, false) || new Date(meeting.end_date).toLocaleDateString()} {window.appSettings?.formatTime(meeting.end_time) || meeting.end_time}
                                    </p>
                                </div>
                            </div>

                            {meeting.location && (
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="font-medium">{t('Location')}</p>
                                        <p className="text-sm text-muted-foreground">{meeting.location}</p>
                                    </div>
                                </div>
                            )}

                            {meeting.description && (
                                <div>
                                    <p className="font-medium mb-2">{t('Description')}</p>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{meeting.description}</p>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <span className="font-medium">{t('Status')}:</span>
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${meeting.status === 'planned' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                        meeting.status === 'held' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                            meeting.status === 'not_held' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                'bg-gray-50 text-gray-700 ring-gray-600/20'
                                    }`}>
                                    {meeting.status === 'planned' ? t('Planned') :
                                        meeting.status === 'held' ? t('Held') :
                                            meeting.status === 'not_held' ? t('Not Held') :
                                                meeting.status}
                                </span>
                            </div>
                        </div>
                        </div>
                    </Card>

                    {/* Attendees */}
                    {meeting.attendees && meeting.attendees.length > 0 && (
                        <Card>
                            <div className="px-6 py-4 border-b flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">{t('Attendees')}</h2>
                            </div>
                            <div className="p-6 space-y-3">
                                {meeting.attendees.map((attendee: any, index: number) => (
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
                                                {attendee.attendee_type} {attendee.attendee?.email && `• ${attendee.attendee.email}`}
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
                    {/* Meeting Info */}
                    <Card>
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-semibold">{t('Meeting Information')}</h3>
                        </div>
                        <div className="p-6 space-y-3">

                            {meeting.assigned_user && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('Assigned To')}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <Avatar className="w-7 h-7 flex-shrink-0">
                                            <AvatarImage src={meeting.assigned_user.avatar} alt={meeting.assigned_user.name} />
                                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(meeting.assigned_user.name || '')}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{meeting.assigned_user.name}</p>
                                            {meeting.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{meeting.assigned_user.email}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t('Created At')}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                    <p className="text-sm">{window.appSettings?.formatDateTime(meeting.created_at, false) || new Date(meeting.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {meeting.updated_at !== meeting.created_at && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t('Last Updated')}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                        <p className="text-sm">{window.appSettings?.formatDateTime(meeting.updated_at, false) || new Date(meeting.updated_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Related Record */}
                    {meeting.parent_module && meeting.parent_record && (() => {
                        const isPerson = ['lead', 'contact', 'account'].includes(meeting.parent_module);
                        const recordName = meeting.parent_record.name || meeting.parent_record.subject;
                        const viewRoute = `view-${meeting.parent_module === 'opportunity' ? 'opportunities' : meeting.parent_module + 's'}`;
                        const recordRoute = `${meeting.parent_module === 'opportunity' ? 'opportunities' : meeting.parent_module + 's'}.show`;
                        const inner = (
                            <div className="flex items-center gap-2 min-w-0">
                                {isPerson && <UserInitials name={recordName} />}
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground capitalize">{t(meeting.parent_module)}</p>
                                    <p className="text-sm font-medium text-foreground truncate">{recordName}</p>
                                    {isPerson && meeting.parent_record.email && <p className="text-xs text-muted-foreground truncate">{meeting.parent_record.email}</p>}
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
                                        <Link href={route(recordRoute, meeting.parent_id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
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
