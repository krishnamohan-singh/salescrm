import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { usePage, router } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, CalendarDays, Clock, MapPin, Users, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import UserInitials from '@/components/user-initials';
import { hasPermission } from '@/utils/authorization';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@/utils/helper';

export default function Meetings() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const isRtl = document.documentElement.dir === 'rtl';
    const {
        auth, meetings, users = [], allUsers = [], allContacts = [], allLeads = [],
        settings = {}, summary = { planned: 0, held: 0, not_held: 0 },
        meetingDates = [], selectedDate: backendDate, selectedMonth, selectedYear,
    } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const isGoogleCalendarSynced = settings?.googleCalendarEnabled === '1';

    // Parse backend selectedDate string → Date object (local, no timezone shift)
    const parseDate = (str: string) => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d); };
    const selectedDateObj = parseDate(backendDate);

    // meetingDatesSet: Set of 'YYYY-MM-DD' strings from backend for calendar dots
    const meetingDatesSet = new Set<string>(meetingDates);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    // Navigate to a specific date — triggers full backend reload
    const navigateToDate = (date: Date) => {
        const yyyy = date.getFullYear();
        const mm   = String(date.getMonth() + 1).padStart(2, '0');
        const dd   = String(date.getDate()).padStart(2, '0');
        router.get(route('meetings.index'), { date: `${yyyy}-${mm}-${dd}`, month: date.getMonth() + 1, year: yyyy }, { preserveScroll: true });
    };

    // Navigate calendar month (only changes dots, keeps selected date)
    const navigateToMonth = (year: number, month: number) => {
        router.get(route('meetings.index'), { date: backendDate, month, year }, { preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'view':          router.get(route('meetings.show', item.id)); break;
            case 'edit':          setFormMode('edit');  setIsFormModalOpen(true);   break;
            case 'delete':        setIsDeleteModalOpen(true);  break;
            case 'toggle-status': setIsStatusModalOpen(true);  break;
        }
    };

    const handleAddNew = () => { setCurrentItem(null); setFormMode('create'); setIsFormModalOpen(true); };

    const handleFormSubmit = (formData: any) => {
        if (formData.attendees && Array.isArray(formData.attendees)) {
            formData.attendees = formData.attendees.filter((a: any) => a.type && a.id && a.id !== '');
        }
        if (formData.parent_id)  formData.parent_id  = String(formData.parent_id);
        if (formData.assigned_to) formData.assigned_to = String(formData.assigned_to);

        if (formMode === 'create') {
            toast.loading(t('Creating meeting...'));
            router.post(route('meetings.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false); toast.dismiss();
                    if (page.props.flash.success)      toast.success(t(page.props.flash.success));
                    else if (page.props.flash.error)   toast.error(t(page.props.flash.error));
                    else if (page.props.flash.warning) toast.warning(t(page.props.flash.warning));
                },
                onError: (errors) => { toast.dismiss(); toast.error(t('Failed to create: {{errors}}', { errors: Object.values(errors).join(', ') })); }
            });
        } else if (formMode === 'edit') {
            toast.loading(t('Updating meeting...'));
            router.put(route('meetings.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false); toast.dismiss();
                    if (page.props.flash.success)      toast.success(t(page.props.flash.success));
                    else if (page.props.flash.error)   toast.error(t(page.props.flash.error));
                    else if (page.props.flash.warning) toast.warning(t(page.props.flash.warning));
                },
                onError: (errors) => { toast.dismiss(); toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') })); }
            });
        }
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting meeting...'));
        router.delete(route('meetings.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false); toast.dismiss();
                if (page.props.flash.success)      toast.success(t(page.props.flash.success));
                else if (page.props.flash.error)   toast.error(t(page.props.flash.error));
                else if (page.props.flash.warning) toast.warning(t(page.props.flash.warning));
            },
            onError: (errors) => { toast.dismiss(); toast.error(t('Failed to delete: {{errors}}', { errors: Object.values(errors).join(', ') })); }
        });
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('meetings.toggle-status', currentItem.id), formData, {
            onSuccess: (page) => {
                setIsStatusModalOpen(false); toast.dismiss();
                if (page.props.flash.success)    toast.success(t(page.props.flash.success));
                else if (page.props.flash.error) toast.error(t(page.props.flash.error));
            },
            onError: (errors) => { toast.dismiss(); toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') })); }
        });
    };

    // Attendee resolution using backend-provided allUsers/allContacts/allLeads
    const userMap: Record<number, any>    = Object.fromEntries(allUsers.map((u: any) => [u.id, u]));
    const contactMap: Record<number, any> = Object.fromEntries(allContacts.map((c: any) => [c.id, c]));
    const leadMap: Record<number, any>    = Object.fromEntries(allLeads.map((l: any) => [l.id, l]));

    const resolveAttendees = (meeting: any) =>
        (meeting.attendees || []).map((a: any) => {
            if (a.attendee_type === 'user')    { const u = userMap[a.attendee_id];    return u ? { name: u.name, avatar: u.avatar, type: 'user' }    : null; }
            if (a.attendee_type === 'contact') { const c = contactMap[a.attendee_id]; return c ? { name: c.name, avatar: null,   type: 'contact' } : null; }
            if (a.attendee_type === 'lead')    { const l = leadMap[a.attendee_id];    return l ? { name: l.name, avatar: null,   type: 'lead' }    : null; }
            return null;
        }).filter(Boolean);

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

    // Calendar grid for the backend-driven selectedMonth/selectedYear
    const firstDay    = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    const pageActions = [];
    if (hasPermission(permissions, 'create-meetings')) {
        pageActions.push({
            label: t('Add Meeting'),
            icon: <Plus className="h-4 w-4 me-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Meetings') }
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'planned':   return 'bg-blue-50 text-blue-700 ring-blue-600/20';
            case 'held':      return 'bg-green-50 text-green-700 ring-green-600/20';
            case 'not_held':  return 'bg-red-50 text-red-700 ring-red-600/20';
            default:          return 'bg-gray-50 text-gray-700 ring-gray-600/20';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'planned':  return t('Planned');
            case 'held':     return t('Held');
            case 'not_held': return t('Not Held');
            default:         return status;
        }
    };

    const formatTime = (timeStr: string) => timeStr ? window.appSettings.formatTime(timeStr) : '';

    const calcDuration = (start: string, end: string, fallback?: number) => {
        if (start && end) {
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            const mins = (eh * 60 + em) - (sh * 60 + sm);
            if (mins > 0) return mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`;
        }
        return fallback ? `${fallback}m` : '—';
    };

    const formatSelectedDate = (d: Date) => {
        const dateFormat = settings?.dateFormat ?? 'Y-m-d';
        const yyyy = d.getFullYear();
        const mm   = String(d.getMonth() + 1).padStart(2, '0');
        const dd   = String(d.getDate()).padStart(2, '0');
        const monthName = monthNames[d.getMonth()];
        return dateFormat
            .replace('Y', String(yyyy))
            .replace('m', mm)
            .replace('d', dd)
            .replace('M', monthName.slice(0, 3))
            .replace('F', monthName);
    };

    const isToday = (d: Date) => d.toDateString() === new Date().toDateString();

    // Mini-calendar sidebar (shared between mobile + desktop)
    const renderCalendar = () => (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => {
                        const prev = selectedMonth === 1 ? { m: 12, y: selectedYear - 1 } : { m: selectedMonth - 1, y: selectedYear };
                        navigateToMonth(prev.y, prev.m);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                    {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
                <span className="text-sm font-semibold">{monthNames[selectedMonth - 1]} {selectedYear}</span>
                <button
                    onClick={() => {
                        const next = selectedMonth === 12 ? { m: 1, y: selectedYear + 1 } : { m: selectedMonth + 1, y: selectedYear };
                        navigateToMonth(next.y, next.m);
                    }}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                >
                    {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
            </div>
            <div className="grid grid-cols-7 text-center border-b border-gray-200 dark:border-gray-700 px-4 py-1">
                {dayNames.map(d => (
                    <div key={d} className="text-xs text-muted-foreground py-1 font-medium">{d}</div>
                ))}
            </div>
            <div className="p-4">
                <div className="grid grid-cols-7 text-center gap-y-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day  = i + 1;
                        const date = new Date(selectedYear, selectedMonth - 1, day);
                        const yyyy = date.getFullYear();
                        const mm   = String(date.getMonth() + 1).padStart(2, '0');
                        const dd   = String(date.getDate()).padStart(2, '0');
                        const dateStr    = `${yyyy}-${mm}-${dd}`;
                        const isSelected = dateStr === backendDate;
                        const isTodayDate = date.toDateString() === new Date().toDateString();
                        const hasMeeting = meetingDatesSet.has(dateStr);
                        return (
                            <button
                                key={day}
                                onClick={() => navigateToDate(date)}
                                className={`relative text-xs rounded-full w-8 h-8 mx-auto flex items-center justify-center transition-colors font-medium cursor-pointer
                                    ${isSelected ? 'bg-primary text-primary-foreground' : isTodayDate ? 'text-primary font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                {day}
                                {hasMeeting && !isSelected && (
                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    // Meeting summary sidebar block
    const renderSummary = () => (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Meeting Summary')}</p>
                <span className="text-xs text-muted-foreground">({formatSelectedDate(selectedDateObj)})</span>
            </div>
            <div className="p-4 space-y-2.5">
                {[
                    { label: t('Planned'),  color: 'bg-blue-500',  count: summary.planned },
                    { label: t('Held'),     color: 'bg-green-500', count: summary.held },
                    { label: t('Not Held'), color: 'bg-red-500',   count: summary.not_held },
                ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                            <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.count}</span>
                    </div>
                ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Total Meetings')}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{Array.isArray(meetings) ? meetings.length : (meetings?.total ?? 0)}</span>
            </div>
        </div>
    );

    // Quick filters sidebar block
    const renderQuickFilters = () => (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('Quick Filters')}</p>
            </div>
            <div className="p-4 space-y-1">
                {(['yesterday', 'today', 'tomorrow'] as const).map(f => {
                    const d = new Date();
                    if (f === 'tomorrow')  d.setDate(d.getDate() + 1);
                    if (f === 'yesterday') d.setDate(d.getDate() - 1);
                    const yyyy = d.getFullYear();
                    const mm   = String(d.getMonth() + 1).padStart(2, '0');
                    const dd   = String(d.getDate()).padStart(2, '0');
                    const isActive = backendDate === `${yyyy}-${mm}-${dd}`;
                    return (
                        <button
                            key={f}
                            onClick={() => navigateToDate(d)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors cursor-pointer ${
                                isActive
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <CalendarDays className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span>{t(f.charAt(0).toUpperCase() + f.slice(1))}</span>
                            </div>
                            {isRtl ? <ChevronLeft className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <PageTemplate
            title={t("Meetings")}
            description={t("Schedule and manage meetings .")}
            url="/meetings"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Right: Sidebar — shown first on mobile */}
                <div className="w-full lg:hidden shrink-0 flex flex-col gap-4">
                    {renderCalendar()}
                    {renderSummary()}
                    {renderQuickFilters()}
                </div>

                {/* Left: Timeline Panel */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        {/* Date Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-wrap">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-gray-800 dark:text-gray-100">
                                {formatSelectedDate(selectedDateObj)}{isToday(selectedDateObj) && <span className="font-bold ms-1">({t('Today')})</span>}
                            </span>
                            {!isToday(selectedDateObj) && (
                                <Button variant="outline" size="sm" onClick={() => navigateToDate(new Date())}>{t('Today')}</Button>
                            )}
                            <span className="ms-auto inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                                {Array.isArray(meetings) ? meetings.length : (meetings?.total ?? 0)} {t('Meetings')}
                            </span>
                        </div>

                        {/* Meeting List */}
                        <div className="divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-220px)]">
                            {(Array.isArray(meetings) ? meetings : meetings?.data ?? []).length === 0 ? (
                                <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <CalendarDays className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("That's all for today!")}</p>
                                    <p className="text-xs text-muted-foreground">{t('You have no meetings scheduled for')} <span className="font-medium">{formatSelectedDate(selectedDateObj)}</span></p>
                                </div>
                            ) : (Array.isArray(meetings) ? meetings : meetings?.data ?? []).map((meeting: any) => (
                                <div key={meeting.id} className="flex items-stretch hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
                                    {/* Time column */}
                                    <div className="w-16 sm:w-20 shrink-0 flex flex-col items-end justify-start pt-4 pb-4 pe-4 me-4 relative">
                                        <div className="absolute top-3 bottom-3 end-0 w-px bg-gray-300 dark:bg-gray-600" />
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight">{formatTime(meeting.start_time)}</span>
                                        <span className="text-gray-400 dark:text-gray-400 text-xs leading-none my-0.5">↓</span>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-tight">{formatTime(meeting.end_time)}</span>
                                    </div>

                                    {/* Avatar */}
                                    <div className="shrink-0 flex items-start pt-4 pe-3">
                                        {meeting.assigned_user ? (
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={meeting.assigned_user.avatar} alt={meeting.assigned_user.name} />
                                                <AvatarFallback className="text-xs">{getInitials(meeting.assigned_user.name)}</AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                <Users className="h-4 w-4 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 py-3 sm:py-4 pe-3 sm:pe-4">
                                        {/* Row 1: title + badge + actions */}
                                        <div className="flex items-start justify-between gap-1 sm:gap-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">{meeting.title}</p>
                                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-600/20 w-fit ${getStatusBadge(meeting.status)}`}>
                                                    {getStatusLabel(meeting.status)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-0 sm:gap-0.5 shrink-0">
                                                {hasPermission(permissions, 'view-meetings') && (
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                        <button onClick={() => handleAction('view', meeting)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"><Eye className="h-4 w-4" /></button>
                                                    </TooltipTrigger><TooltipContent>{t('View')}</TooltipContent></Tooltip></TooltipProvider>
                                                )}
                                                {hasPermission(permissions, 'edit-meetings') && (
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                        <button onClick={() => handleAction('edit', meeting)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"><Edit className="h-4 w-4" /></button>
                                                    </TooltipTrigger><TooltipContent>{t('Edit')}</TooltipContent></Tooltip></TooltipProvider>
                                                )}
                                                {hasPermission(permissions, 'toggle-status-meetings') && (
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                        <button onClick={() => handleAction('toggle-status', meeting)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"><RefreshCw className="h-4 w-4" /></button>
                                                    </TooltipTrigger><TooltipContent>{t('Change Status')}</TooltipContent></Tooltip></TooltipProvider>
                                                )}
                                                {hasPermission(permissions, 'delete-meetings') && (
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                        <button onClick={() => handleAction('delete', meeting)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                                                    </TooltipTrigger><TooltipContent>{t('Delete')}</TooltipContent></Tooltip></TooltipProvider>
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2: assigned user */}
                                        {meeting.assigned_user && (
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                                {meeting.assigned_user.name} • {meeting.assigned_user.email}
                                            </p>
                                        )}

                                        {/* Row 3: location/module left, attendees+duration right */}
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mt-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {meeting.location && (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <MapPin className="h-3 w-3 shrink-0" />
                                                        {meeting.location}
                                                    </span>
                                                )}
                                                {meeting.parent_module && (
                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-gray-600/20">
                                                        {capitalize(meeting.parent_module)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                {(() => {
                                                    const att = resolveAttendees(meeting);
                                                    const visible = att.slice(0, 3);
                                                    const extra = att.length - 3;
                                                    return visible.length > 0 ? (
                                                        <div className="flex -space-x-0 items-center">
                                                            {visible.map((a: any, i: number) => (
                                                                <TooltipProvider key={i}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="cursor-pointer">
                                                                                {a.type === 'user' ? (
                                                                                    <Avatar className="h-5 w-5 ring-2 ring-white dark:ring-gray-900">
                                                                                        <AvatarImage src={a.avatar} alt={a.name} />
                                                                                        <AvatarFallback className="text-[10px]">{getInitials(a.name)}</AvatarFallback>
                                                                                    </Avatar>
                                                                                ) : (
                                                                                    <div className="[&_[data-slot=avatar]]:h-5 [&_[data-slot=avatar]]:w-5 [&_[data-slot=avatar-fallback]]:text-[9px]"><UserInitials name={a.name} /></div>
                                                                                )}
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{a.name}</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ))}
                                                            {extra > 0 && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="h-5 w-5 ring-2 ring-white dark:ring-gray-900 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[9px] font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">+{extra}</div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <div className="flex flex-col gap-0.5">
                                                                                {att.slice(3).map((a: any, i: number) => (
                                                                                    <span key={i}>{a.name}</span>
                                                                                ))}
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    ) : null;
                                                })()}
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {calcDuration(meeting.start_time, meeting.end_time, meeting.duration_minutes)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar — desktop only */}
                <div className="hidden lg:grid w-full lg:w-72 shrink-0 grid-cols-1 gap-4">
                    {renderCalendar()}
                    {renderSummary()}
                    {renderQuickFilters()}
                </div>
            </div>

            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'title', label: t('Meeting Title'), type: 'text' as const, required: true, placeholder: t('e.g. Q1 Sales Review, Product Demo, Kickoff Meeting') },
                        { name: 'description', label: t('Description'), type: 'textarea' as const, placeholder: t('Enter meeting description or agenda...') },
                        { name: 'location', label: t('Location'), type: 'text' as const, required: true, placeholder: t('e.g. Conference Room A, Zoom, Google Meet') },
                        { name: 'start_date', label: t('Start Date'), type: 'date' as const, required: true },
                        { name: 'end_date', label: t('End Date'), type: 'date' as const, required: true },
                        { name: 'start_time', label: t('Start Time'), type: 'time' as const, required: true },
                        { name: 'end_time', label: t('End Time'), type: 'time' as const, required: true },
                        {
                            name: 'parent_module',
                            label: t('Related To'),
                            type: 'select' as const,
                            required: true,
                            options: [
                                { value: 'lead', label: t('Lead') },
                                { value: 'account', label: t('Account') },
                                { value: 'contact', label: t('Contact') },
                                { value: 'opportunity', label: t('Opportunity') },
                                { value: 'case', label: t('Case') },
                                { value: 'project', label: t('Project') }
                            ]
                        },
                        {
                            name: 'parent_id',
                            label: t('Select Record'),
                            type: 'select' as const,
                            required: true,
                            searchable: true,
                            options: [],
                            placeholder: t('Select Record'),
                            emptyNote: (formData: any) => {
                                const parentModule = formData.parent_module;
                                if (!parentModule || parentModule === 'none') return null;
                                const routes: Record<string, string> = {
                                    lead: route('leads.index'),
                                    account: route('accounts.index'),
                                    contact: route('contacts.index'),
                                    opportunity: route('opportunities.index'),
                                    case: route('cases.index'),
                                    project: route('projects.index')
                                };
                                const labels: Record<string, string> = {
                                    lead: t('Leads'),
                                    account: t('Accounts'),
                                    contact: t('Contacts'),
                                    opportunity: t('Opportunities'),
                                    case: t('Cases'),
                                    project: t('Projects')
                                };
                                return { link: routes[parentModule], linkText: labels[parentModule] };
                            },
                            conditional: (mode: string, formData: any) => {
                                const parentModule = formData.parent_module;
                                return parentModule && parentModule !== 'none';
                            }
                        },
                        {
                            name: 'attendees',
                            label: t('Attendees'),
                            type: 'array' as const,
                            required: true,
                            fields: [
                                {
                                    name: 'type',
                                    label: t('Type'),
                                    type: 'select' as const,
                                    required: true,
                                    options: [
                                        { value: 'user', label: t('User') },
                                        { value: 'contact', label: t('Contact') },
                                        { value: 'lead', label: t('Lead') }
                                    ]
                                },
                                {
                                    name: 'id',
                                    label: t('Select Person'),
                                    type: 'select' as const,
                                    required: true,
                                    searchable: true,
                                    options: [],
                                    emptyNote: (formData: any, arrayIndex?: number) => {
                                        if (arrayIndex === undefined) return null;
                                        const attendees = formData.attendees || [];
                                        const attendeeType = attendees[arrayIndex]?.type;
                                        if (!attendeeType) return null;
                                        const routes: Record<string, string> = {
                                            user: route('users.index'),
                                            contact: route('contacts.index'),
                                            lead: route('leads.index')
                                        };
                                        const labels: Record<string, string> = {
                                            user: t('Users'),
                                            contact: t('Contacts'),
                                            lead: t('Leads')
                                        };
                                        return { link: routes[attendeeType], linkText: labels[attendeeType] };
                                    }
                                }
                            ]
                        },
                        {
                            name: 'assigned_to',
                            label: t('Assign To'),
                            type: 'select' as const,
                            required: true,
                            searchable: true,
                            emptyNote: { link: route('users.index'), linkText: t('Users') },
                            options: [
                                ...users.map((user: any) => ({ value: user.id, label: `${user.name} (${user.email})` }))
                            ]
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select' as const,
                            options: [
                                { value: 'planned', label: t('Planned') },
                                { value: 'held', label: t('Held') },
                                { value: 'not_held', label: t('Not Held') }
                            ],
                            defaultValue: 'planned'
                        },
                        ...(isGoogleCalendarSynced ? [{
                            name: 'sync_with_google_calendar',
                            label: t('Sync with Google Calendar'),
                            type: 'switch' as const,
                            defaultValue: false,
                            conditional: (mode: string) => mode === 'create'
                        }] : [])
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    attendees: currentItem.attendees?.map((attendee: any) => ({
                        type: attendee.attendee_type,
                        id: attendee.attendee_id
                    })) || []
                } : {}}
                title={
                    formMode === 'create'
                        ? t('Add Meeting')
                        : formMode === 'edit'
                            ? t('Edit Meeting')
                            : t('View Meeting')
                }
                mode={formMode}
            />

            {/* Status Modal */}
            <CrudFormModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSubmit={handleStatusChange}
                formConfig={{
                    fields: [
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'planned', label: t('Planned') },
                                { value: 'held', label: t('Held') },
                                { value: 'not_held', label: t('Not Held') }
                            ]
                        }
                    ],
                    modalSize: 'sm'
                }}
                initialData={currentItem ? { status: currentItem.status } : null}
                title={t('Change Meeting Status')}
                mode='edit'
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.title || ''}
                entityName={t('meeting')}
            />
        </PageTemplate>
    );
}
