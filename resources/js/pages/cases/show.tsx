import React, { useMemo } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import {
    ArrowLeft, AlertTriangle, CheckCircle, FileText, Calendar, Clock,
    Building, User, Phone, UserCheck, Eye, Tag, ShieldAlert, Layers,
    MessageSquare, Zap, XCircle, Loader, PauseCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';
import { hasPermission } from '@/utils/authorization';

export default function CaseShow() {
    const { t } = useTranslation();
    const { case: caseData, meetings } = usePage().props as any;
    const permissions = (usePage().props as any).auth?.permissions || [];
    const getInitials = useInitials();

    const filteredMeetings = useMemo(() => meetings?.filter((m: any) => m.type !== 'call') || [], [meetings]);
    const filteredCalls = useMemo(() => meetings?.filter((m: any) => m.type === 'call') || [], [meetings]);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Cases'), href: route('cases.index') },
        { title: t('View Case') }
    ];

    const statusSteps = ['new', 'in_progress', 'pending', 'resolved', 'closed'];
    const currentStatusIndex = statusSteps.indexOf(caseData.status);

    const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; ring: string; dot: string }> = {
        new:         { label: t('New'),         icon: Zap,         color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',    ring: 'ring-blue-600/20',   dot: 'bg-blue-500' },
        in_progress: { label: t('In Progress'), icon: Loader,      color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', ring: 'ring-yellow-600/20', dot: 'bg-yellow-500' },
        pending:     { label: t('Pending'),     icon: PauseCircle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', ring: 'ring-orange-600/20', dot: 'bg-orange-500' },
        resolved:    { label: t('Resolved'),    icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',   ring: 'ring-green-600/20',  dot: 'bg-green-500' },
        closed:      { label: t('Closed'),      icon: XCircle,     color: 'text-gray-500',   bg: 'bg-gray-50 dark:bg-gray-800/40',     ring: 'ring-gray-600/20',   dot: 'bg-gray-400' },
    };

    const priorityConfig: Record<string, { label: string; color: string; bg: string; ring: string }> = {
        low:    { label: t('Low'),    color: 'text-gray-600',   bg: 'bg-gray-50',   ring: 'ring-gray-600/20' },
        medium: { label: t('Medium'), color: 'text-blue-600',   bg: 'bg-blue-50',   ring: 'ring-blue-600/20' },
        high:   { label: t('High'),   color: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-600/20' },
        urgent: { label: t('Urgent'), color: 'text-red-600',    bg: 'bg-red-50',    ring: 'ring-red-600/20' },
    };

    const caseTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
        support:         { label: t('Support'),         icon: ShieldAlert,   color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
        bug:             { label: t('Bug Report'),      icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
        feature_request: { label: t('Feature Request'), icon: Layers,        color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        complaint:       { label: t('Complaint'),       icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        inquiry:         { label: t('Inquiry'),         icon: FileText,      color: 'text-teal-600',   bg: 'bg-teal-50 dark:bg-teal-900/20' },
    };

    const status   = statusConfig[caseData.status]     || statusConfig.new;
    const priority = priorityConfig[caseData.priority] || priorityConfig.low;
    const caseType = caseTypeConfig[caseData.case_type] || { label: caseData.case_type, icon: Tag, color: 'text-gray-600', bg: 'bg-gray-50' };
    const CaseTypeIcon = caseType.icon;

    const ActivityRow = ({ item, icon: Icon, viewPermission, viewRoute }: {
        item: any; icon: React.ElementType; viewPermission: string; viewRoute: string;
    }) => (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">
                            {window.appSettings?.formatDateTime(item.start_date, false) || new Date(item.start_date).toLocaleDateString()}
                        </span>
                        {item.assigned_user?.name && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-muted-foreground/40">·</span>
                                <Avatar className="w-4 h-4">
                                    <AvatarImage src={item.assigned_user?.avatar} alt={item.assigned_user?.name} />
                                    <AvatarFallback className="bg-primary/15 text-primary text-[8px] font-bold">{getInitials(item.assigned_user?.name || 'U')}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-muted-foreground truncate">{item.assigned_user.name}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
            {hasPermission(permissions, viewPermission) && (
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href={route(viewRoute, item.id)} className="flex-shrink-0">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );

    return (
        <PageTemplate
            title={caseData.subject}
            description={t('Case details and related information')}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.visit(route('cases.index'))
                }
            ]}
            noPadding
        >
            <div className="mx-auto space-y-6">

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {([
                        { label: t('Priority'),  value: priority.label, icon: AlertTriangle, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                        { label: t('Case Type'), value: caseType.label, icon: Tag,           iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
                        { label: t('Created'),   value: window.appSettings?.formatDateTime(caseData.created_at, false) || new Date(caseData.created_at).toLocaleDateString(), icon: Clock, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
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

                {/* Status Pipeline */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b py-3.5 px-5">
                        <CardTitle className="flex items-center text-lg font-semibold">
                            <Loader className="h-5 w-5 mr-3 text-muted-foreground" />
                            {t('Case Progress')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 py-5">
                        <div className="flex items-center">
                            {statusSteps.map((step, i) => {
                                const s = statusConfig[step];
                                const StepIcon = s.icon;
                                const isActive = step === caseData.status;
                                const isDone   = i < currentStatusIndex;
                                const isLast   = i === statusSteps.length - 1;
                                return (
                                    <React.Fragment key={step}>
                                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                                                isActive ? `${s.bg} border-current ${s.color}` :
                                                isDone   ? 'bg-primary/10 border-primary text-primary' :
                                                           'bg-muted border-border text-muted-foreground'
                                            }`}>
                                                <StepIcon className="h-4 w-4" />
                                            </div>
                                            <span className={`text-[10px] font-medium whitespace-nowrap ${isActive ? s.color : isDone ? 'text-primary' : 'text-muted-foreground'}`}>
                                                {s.label}
                                            </span>
                                        </div>
                                        {!isLast && (
                                            <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < currentStatusIndex ? 'bg-primary' : 'bg-border'}`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Case Summary + Description */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Case Summary */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <UserCheck className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Assignment')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 flex items-center justify-center" style={{ minHeight: '100px' }}>
                            <div className="w-full">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t('Assigned To')}</p>
                                {caseData.assigned_user ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="w-7 h-7 flex-shrink-0">
                                            <AvatarImage src={caseData.assigned_user.avatar} alt={caseData.assigned_user.name} />
                                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(caseData.assigned_user.name || '')}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{caseData.assigned_user.name}</p>
                                            {caseData.assigned_user.email && (
                                                <p className="text-xs text-muted-foreground truncate">{caseData.assigned_user.email}</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">{t('Unassigned')}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Description */}
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
                                    {caseData.description ? (
                                        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{caseData.description}</p>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-center">
                                            <FileText className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                            <p className="text-sm text-muted-foreground">{t('No description provided')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Related Account + Related Contact */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Related Account */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <Building className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Related Account')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {caseData.account ? (
                                <div className="p-2">
                                    <div className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <UserInitials name={caseData.account.name} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{caseData.account.name}</p>
                                                {caseData.account.email && <p className="text-xs text-muted-foreground truncate">{caseData.account.email}</p>}
                                            </div>
                                        </div>
                                        {hasPermission(permissions, 'view-accounts') && (
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={route('accounts.show', caseData.account.id)} className="ml-3 flex-shrink-0">
                                                            <Eye className="h-4 w-4 text-gray-500" />
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center py-12">
                                    <Building className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('No account linked')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Related Contact */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <User className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Related Contact')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {caseData.contact ? (
                                <div className="p-2">
                                    <div className="flex items-center justify-between p-3.5 rounded-xl border hover:bg-muted/40 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <UserInitials name={caseData.contact.name} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{caseData.contact.name}</p>
                                                {caseData.contact.email && <p className="text-xs text-muted-foreground truncate">{caseData.contact.email}</p>}
                                            </div>
                                        </div>
                                        {hasPermission(permissions, 'view-contacts') && (
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={route('contacts.show', caseData.contact.id)} className="ml-3 flex-shrink-0">
                                                            <Eye className="h-4 w-4 text-gray-500" />
                                                        </Link>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center py-12">
                                    <User className="h-8 w-8 text-muted-foreground/20 mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('No contact linked')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Meetings & Calls */}
                {meetings?.length > 0 && (
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
                                                    <ActivityRow key={meeting.id} item={meeting} icon={UserCheck} viewPermission="view-meetings" viewRoute="meetings.show" />
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
                                                    <ActivityRow key={call.id} item={call} icon={Phone} viewPermission="view-calls" viewRoute="calls.show" />
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                )}

            </div>
        </PageTemplate>
    );
}
