import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, Phone, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import UserInitials from '@/components/user-initials';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { capitalize } from '@/utils/helper';

export default function Calls() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { auth, calls, users = [], allUsers = [], allContacts = [], allLeads = [], filters: pageFilters = {}, settings = {} } = usePage().props as any;

    const userMap: Record<number, any>    = Object.fromEntries(allUsers.map((u: any) => [u.id, u]));
    const contactMap: Record<number, any> = Object.fromEntries(allContacts.map((c: any) => [c.id, c]));
    const leadMap: Record<number, any>    = Object.fromEntries(allLeads.map((l: any) => [l.id, l]));

    const resolveAttendees = (call: any) =>
        (call.attendees || []).map((a: any) => {
            if (a.attendee_type === 'user')    { const u = userMap[a.attendee_id];    return u ? { name: u.name, avatar: u.avatar, type: 'user' }    : null; }
            if (a.attendee_type === 'contact') { const c = contactMap[a.attendee_id]; return c ? { name: c.name, avatar: null, type: 'contact' } : null; }
            if (a.attendee_type === 'lead')    { const l = leadMap[a.attendee_id];    return l ? { name: l.name, avatar: null, type: 'lead' }    : null; }
            return null;
        }).filter(Boolean);
    const permissions = auth?.permissions || [];
    const isGoogleCalendarSynced = settings?.googleCalendarEnabled === '1';

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    const hasActiveFilters = () => searchTerm !== '' || selectedStatus !== 'all' || selectedAssignee !== 'all';
    const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('calls.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('calls.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'view':
                router.get(route('calls.show', item.id));
                break;
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                setIsStatusModalOpen(true);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (formData: any) => {
        if (formData.attendees && Array.isArray(formData.attendees)) {
            formData.attendees = formData.attendees.filter((attendee: any) =>
                attendee.type && attendee.id && attendee.id !== ''
            );
        }

        if (formData.parent_id) {
            formData.parent_id = String(formData.parent_id);
        }
        if (formData.assigned_to) {
            formData.assigned_to = String(formData.assigned_to);
        }

        if (formMode === 'create') {
            toast.loading(t('Creating call...'));
            router.post(route('calls.store'), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    }
                },
                onError: (errors) => {
                    toast.dismiss();
                    const errorMessages = Object.entries(errors).map(([field, messages]) => {
                        const messageArray = Array.isArray(messages) ? messages : [messages];
                        return `${field}: ${messageArray.join(', ')}`;
                    }).join('; ');
                    toast.error(errorMessages);
                }
            });
        } else if (formMode === 'edit') {
            toast.loading(t('Updating call...'));
            router.put(route('calls.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    toast.dismiss();
                    const errorMessages = Object.entries(errors).map(([field, messages]) => {
                        const messageArray = Array.isArray(messages) ? messages : [messages];
                        return `${field}: ${messageArray.join(', ')}`;
                    }).join('; ');
                    toast.error(errorMessages);
                }
            });
        }
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting call...'));
        router.delete(route('calls.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to delete call: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('calls.toggle-status', currentItem.id), formData, {
            onSuccess: (page) => {
                setIsStatusModalOpen(false);
                toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to update call status: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const handleToggleStatus = (call: any) => {
        const newStatus = call.status === 'planned' ? 'held' : 'planned';
        toast.loading(`${newStatus === 'held' ? t('Marking as held') : t('Marking as planned')} call...`);
        router.put(route('calls.toggle-status', call.id), {}, {
            onSuccess: (page) => {
                toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                }
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to update call status: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const pageInitialState = useState(true);
    useEffect(() => {
        if (pageInitialState[0]) { pageInitialState[1](false); return; }
        applyFilters();
    }, [searchTerm, selectedStatus, selectedAssignee]);

    const handleResetFilters = () => {
        router.get(route('calls.index'));
    };

    const pageActions = [];
    if (hasPermission(permissions, 'create-calls')) {
        pageActions.push({
            label: t('Add Call'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Calls') }
    ];

    const columns = [
        {
            key: 'title',
            label: t('Title'),
            sortable: true,
            render: (value: string) => (
                <div className="font-medium whitespace-nowrap">{value}</div>
            )
        },
        {
            key: 'assigned_user',
            label: t('Assigned To'),
            className: 'whitespace-nowrap',
            render: (value: any) => value ? (
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={value.avatar} alt={value.name} />
                        <AvatarFallback className="text-xs">{getInitials(value.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium whitespace-nowrap">{value.name}</div>
                        <div className="text-sm text-muted-foreground whitespace-nowrap">{value.email}</div>
                    </div>
                </div>
            ) : <span className="whitespace-nowrap">{t('Unassigned')}</span>
        },
        {
            key: 'start_date',
            label: t('Date & Time'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: string, row: any) => (
                <div className="flex flex-col gap-1 whitespace-nowrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        {window.appSettings?.formatDateTime(`${value.split('T')[0]}T${row.start_time}`, true) || '-'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        {window.appSettings?.formatDateTime(`${row.end_date.split('T')[0]}T${row.end_time}`, true) || '-'}
                    </span>
                </div>
            )
        },
        
        {
            key: 'parent_module',
            label: t('Related To'),
            className: 'whitespace-nowrap',
            render: (value: string, row: any) => value ? (
                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20 whitespace-nowrap">
                    {capitalize(value)}
                </span>
            ) : <span className="whitespace-nowrap">-</span>
        },
        {
            key: 'attendees',
            label: t('Attendees'),
            render: (_: any, row: any) => {
                const att = resolveAttendees(row);
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
                                                <Avatar className="h-6 w-6 ring-2 ring-white dark:ring-gray-900">
                                                    <AvatarImage src={a.avatar} alt={a.name} />
                                                    <AvatarFallback className="text-[10px]">{getInitials(a.name)}</AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <div className="h-6 w-6 [&_[data-slot=avatar]]:h-6 [&_[data-slot=avatar]]:w-6 [&_[data-slot=avatar-fallback]]:text-[9px]"><UserInitials name={a.name} /></div>
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
                                        <div className="h-6 w-6 ring-2 ring-white dark:ring-gray-900 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[9px] font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">+{extra}</div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <div className="flex flex-col gap-0.5">
                                            {att.slice(3).map((a: any, i: number) => <span key={i}>{a.name}</span>)}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                ) : <span className="text-muted-foreground text-xs">-</span>;
            }
        },
        {
            key: 'status',
            label: t('Status'),
            className: 'whitespace-nowrap',
            render: (value: string) => {
                const getStatusColor = (status: string) => {
                    switch (status) {
                        case 'planned': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
                        case 'held': return 'bg-green-50 text-green-700 ring-green-600/20';
                        case 'not_held': return 'bg-red-50 text-red-700 ring-red-600/20';
                        default: return 'bg-gray-50 text-gray-700 ring-gray-600/20';
                    }
                };
                const getStatusLabel = (status: string) => {
                    switch (status) {
                        case 'planned': return t('Planned');
                        case 'held': return t('Held');
                        case 'not_held': return t('Not Held');
                        default: return status;
                    }
                };
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${getStatusColor(value)}`}>
                        {getStatusLabel(value)}
                    </span>
                );
            }
        },
        // {
        //     key: 'created_at',
        //     label: t('Created At'),
        //     sortable: true,
        //     className: 'whitespace-nowrap',
        //     type: 'date'
        // }
    ];

    const actions = [
        {
            label: t('Change Status'),
            icon: 'RefreshCw',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-calls'
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-calls'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-calls'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-calls'
        }
    ];

    return (
        <PageTemplate
            title={t("Calls")}
            description={t("Manage your calls.")}
            url="/calls"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: [
                                { value: 'all', label: t('All Status') },
                                { value: 'planned', label: t('Planned') },
                                { value: 'held', label: t('Held') },
                                { value: 'not_held', label: t('Not Held') }
                            ]
                        },
                        {
                            name: 'assigned_to',
                            label: t('Assigned To'),
                            type: 'select',
                            searchable: true,
                            value: selectedAssignee,
                            onChange: setSelectedAssignee,
                            options: [
                                { value: 'all', label: t('All Users') },
                                { value: 'unassigned', label: t('Unassigned') },
                                ...allUsers.map((user: any) => ({
                                    value: user.id.toString(),
                                    label: user.name
                                }))
                            ]
                        }
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={calls?.data || []}
                    from={calls?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-calls',
                        create: 'create-calls',
                        edit: 'edit-calls',
                        delete: 'delete-calls'
                    }}
                />
                </div>

                <Pagination
                    from={calls?.from || 0}
                    to={calls?.to || 0}
                    total={calls?.total || 0}
                    links={calls?.links}
                    entityName={t("calls")}
                    onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('calls.index'), {
                            page: 1,
                            search: searchTerm || undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'title', label: t('Call Title'), type: 'text' as const, required: true, placeholder: t('e.g. Follow-up Call, Sales Discovery, Support Call') },
                        { name: 'description', label: t('Description'), type: 'textarea' as const, placeholder: t('Enter call description or agenda...') },
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
                        ? t('Add Call')
                        : formMode === 'edit'
                            ? t('Edit Call')
                            : t('View Call')
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
                title={t('Change Call Status')}
                mode='edit'
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.title || ''}
                entityName={t('call')}
            />
        </PageTemplate>
    );
}
