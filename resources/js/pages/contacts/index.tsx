import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, MoreHorizontal, FileDown, Lock, Calendar, Phone, Briefcase, Building2, Mail, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

export default function Contacts() {
    const { t } = useTranslation();
    const { auth, contacts, accounts = [], allAccounts = [], users = [], allUsers = [], canViewAll = false, planLimits, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedAccount, setSelectedAccount] = useState(pageFilters.account_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');
    const [activeView, setActiveView] = useState(
        ['list', 'grid'].includes(pageFilters.view) ? pageFilters.view : 'list'
    );
    const [pageInitialState, setPageInitialState] = useState(true);
    const getInitials = useInitials();

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedAccount, selectedStatus, selectedAssignee]);

    const isViewingMyData = selectedAssignee === String(auth?.user?.id);

    const handleToggleMyData = () => {
        const newAssignee = isViewingMyData ? 'all' : String(auth?.user?.id);
        setSelectedAssignee(newAssignee);
    };

    // Check if any filters are active
    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedAccount !== 'all' || selectedStatus !== 'all' || selectedAssignee !== 'all';
    };

    // Count active filters
    const activeFilterCount = () => {
        return (selectedAccount !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('contacts.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('contacts.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: field,
            sort_direction: direction,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);

        switch (action) {
            case 'view':
                router.get(route('contacts.show', item.id));
                break;
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                handleToggleStatus(item);
                break;
        }
    };

    const handleAddNew = () => {
        if (planLimits && !planLimits.can_create) {
            toast.error(t('Contact limit reached. Your plan allows maximum {{max}} contacts.', { max: planLimits.max_contacts }));
            return;
        }

        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {
            toast.loading(t('Creating contact...'));

            router.post(route('contacts.store'), formData, {
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
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(t('Failed to create contact: {{errors}}', { errors: Object.values(errors).join(', ') }));
                    }
                }
            });
        } else if (formMode === 'edit') {
            toast.loading(t('Updating contact...'));

            router.put(route("contacts.update", currentItem.id), formData, {
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
                    if (typeof errors === 'string') {
                        toast.error(errors);
                    } else {
                        toast.error(t('Failed to update contact: {{errors}}', { errors: Object.values(errors).join(', ') }));
                    }
                }
            });
        }
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting contact...'));

        router.delete(route('contacts.destroy', currentItem.id), {
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
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(t('Failed to delete contact: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const handleToggleStatus = (contact: any) => {
        const newStatus = contact.status === 'active' ? 'inactive' : 'active';
        toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} contact...`);

        router.put(route('contacts.toggle-status', contact.id), {}, {
            onSuccess: (page) => {
                toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(t('Failed to update contact status: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const handleResetFilters = () => {
        router.get(route('contacts.index'), { view: activeView });
    };

    // Define page actions
    const pageActions: any[] = [];

    // Add My Contacts / All Contacts toggle button for users with full permission
    if (canViewAll) {
        pageActions.push({
            label: '',
            icon: isViewingMyData ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />,
            variant: isViewingMyData ? 'default' : 'outline',
            tooltip: isViewingMyData ? t('All Contacts') : t('My Contacts'),
            onClick: () => handleToggleMyData(),
        });
    }

    // Add export button
    if (hasPermission(permissions, 'export-contacts')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => window.location.href = route('contact.export')
        });
    }

    // Add the "Add Contact" button if user has permission and within limits
    if (hasPermission(permissions, 'create-contacts')) {
        const isDisabled = planLimits && !planLimits.can_create;
        pageActions.push({
            label: isDisabled ? t('Contact Limit Reached ({{current}}/{{max}})', { current: planLimits?.current_contacts || 0, max: planLimits?.max_contacts || 0 }) : t('Add Contact'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: isDisabled ? 'outline' : 'default',
            disabled: isDisabled,
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Contacts') }
    ];

    // Define table columns
    const columns = [
        {
            key: 'name',
            label: t('Name'),
            sortable: true,
            render: (value: any, row: any) => {
                return (
                    <div className="flex items-center gap-3">
                        <UserInitials name={row.name} />
                        <div>
                            <div className="font-medium">{row.name}</div>
                            <div className="text-sm text-muted-foreground">{row.email || t('No email')}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'phone',
            label: t('Phone'),
            render: (value: string) => value || '-'
        },
        {
            key: 'position',
            label: t('Position'),
            render: (value: string) => value || '-'
        },
        {
            key: 'account',
            label: t('Account'),
            render: (value: any) => value?.name
                ? <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20">{value.name}</span>
                : <span className="text-muted-foreground">-</span>
        },
        {
            key: 'status',
            label: t('Status'),
            render: (value: string) => {
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${value === 'active'
                        ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                        : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                        }`}>
                        {value === 'active' ? t('Active') : t('Inactive')}
                    </span>
                );
            }
        },
        {
            key: 'created_at',
            label: t('Created At'),
            sortable: true,
            type: 'date',
            // render: (value: string) => window.appSettings?.formatDateTime(value, false) || '-'
        }
    ];

    // Define table actions
    const actions = [
        {
            label: t('Toggle Status'),
            icon: 'Lock',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-contacts'
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-contacts'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-contacts'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-contacts'
        }
    ];

    return (
        <PageTemplate
            title={t("Contacts")}
            description={t("Manage your contacts.")}
            url="/contacts"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Search and filters section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'account_id',
                            label: t('Account'),
                            type: 'select',
                            searchable: true,
                            value: selectedAccount,
                            onChange: setSelectedAccount,
                            options: [
                                { value: 'all', label: t('All Accounts') },
                                ...allAccounts.map((account: any) => ({
                                    value: account.id.toString(),
                                    label: account.name
                                }))
                            ]
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: [
                                { value: 'all', label: t('All Status') },
                                { value: 'active', label: t('Active') },
                                { value: 'inactive', label: t('Inactive') }
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
                    showViewToggle={true}
                    activeView={activeView}
                    onViewChange={(view) => {
                        setActiveView(view);
                        router.get(route('contacts.index'), {
                            view,
                            page: pageFilters.page || undefined,
                            search: searchTerm || undefined,
                            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
                        });
                    }}
                />
            </div>

            {/* Content section */}
            {activeView === 'list' ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                    <CrudTable
                        columns={columns}
                        actions={actions}
                        data={contacts?.data || []}
                        from={contacts?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                        entityPermissions={{
                            view: 'view-contacts',
                            create: 'create-contacts',
                            edit: 'edit-contacts',
                            delete: 'delete-contacts'
                        }}
                    />

                    {/* Pagination section */}
                    <Pagination
                        from={contacts?.from || 0}
                        to={contacts?.to || 0}
                        total={contacts?.total || 0}
                        links={contacts?.links}
                        entityName={t("contacts")}
                        onPageChange={(url) => router.get(url)}
                        currentPerPage={pageFilters.per_page?.toString() || "10"}
                        onPerPageChange={(value) => {
                            router.get(route('contacts.index'), {
                                view: activeView, page: 1,
                                search: searchTerm || undefined,
                                account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                                sort_field: pageFilters.sort_field || undefined,
                                sort_direction: pageFilters.sort_direction || undefined,
                                ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                            }, { preserveState: true, preserveScroll: true });
                        }}
                    />
                </div>
            ) : (
                <div>
                    {/* Grid View */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {contacts?.data?.map((contact: any) => (
                            <Card key={contact.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
                                <div className="relative p-4 flex flex-col flex-1">

                                    {/* Three-dots dropdown — top right */}
                                    <div className="absolute top-2 right-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 z-50" sideOffset={5}>
                                                {hasPermission(permissions, 'view-contacts') && (
                                                    <DropdownMenuItem onClick={() => handleAction('view', contact)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        <span>{t('View Contact')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'toggle-status-contacts') && (
                                                    <DropdownMenuItem onClick={() => handleAction('toggle-status', contact)}>
                                                        <Lock className="h-4 w-4 mr-2" />
                                                        <span>{contact.status === 'active' ? t('Deactivate') : t('Activate')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'edit-contacts') && (
                                                    <DropdownMenuItem onClick={() => handleAction('edit', contact)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        <span>{t('Edit')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                {hasPermission(permissions, 'delete-contacts') && (
                                                    <DropdownMenuItem onClick={() => handleAction('delete', contact)} className="text-rose-600">
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        <span>{t('Delete')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Status badge — top right below trigger */}
                                    <div className="flex items-start gap-3 mb-4 pr-8">
                                        <UserInitials name={contact.name} />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{contact.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                                                <Mail className="h-3 w-3 text-gray-500 shrink-0" />
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{contact.email || t('No email')}</p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                contact.status === 'active'
                                                    ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                    : 'bg-red-50 text-red-700 ring-red-600/20'
                                            }`}>
                                                {contact.status === 'active' ? t('Active') : t('Inactive')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info rows */}
                                    <div className="space-y-1.5 mb-3">
                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                            <Phone className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                            <span className="truncate">{contact.phone || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                            <Briefcase className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                            <span className="truncate">{contact.position || '-'}</span>
                                        </div>
                                        {contact.account && (
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Building2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20 max-w-full overflow-hidden">
                                                    <span className="truncate">{contact.account.name}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer: date left, assigned avatar right */}
                                    <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                                        
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            <Calendar className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                            <span>{window.appSettings?.formatDateTime(contact.created_at, false) || new Date(contact.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {contact.assigned_user && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('Assigned to')}</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Avatar className="h-7 w-7 cursor-pointer shrink-0">
                                                                <AvatarImage src={contact.assigned_user.avatar} alt={contact.assigned_user.name} />
                                                                <AvatarFallback className="text-xs bg-purple-100 text-purple-700 font-medium">{getInitials(contact.assigned_user.name)}</AvatarFallback>
                                                            </Avatar>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>{contact.assigned_user.name}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination for grid view */}
                    <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                        <Pagination
                            from={contacts?.from || 0}
                            to={contacts?.to || 0}
                            total={contacts?.total || 0}
                            links={contacts?.links}
                            entityName={t("contacts")}
                            onPageChange={(url) => router.get(url)}
                            perPageOptions={[12, 24, 48, 96]}
                            currentPerPage={pageFilters.per_page?.toString() || '12'}
                            onPerPageChange={(value) => {
                                router.get(route('contacts.index'), {
                                    view: activeView, page: 1,
                                    search: searchTerm || undefined,
                                    account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                    assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                                    sort_field: pageFilters.sort_field || undefined,
                                    sort_direction: pageFilters.sort_direction || undefined,
                                    ...(parseInt(value) !== 12 && { per_page: parseInt(value) }),
                                }, { preserveState: true, preserveScroll: true });
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Form Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                formConfig={{
                    fields: [
                        { name: 'name', label: t('Contact Name'), type: 'text', required: true, placeholder: t('eg. John Smith') },
                        { name: 'email', label: t('Email'), type: 'email', required: true, placeholder: t('eg. john@example.com') },
                        { name: 'phone', label: t('Phone'), type: 'text', placeholder: t('eg. +1 234 567 8900') },
                        { name: 'position', label: t('Position'), type: 'text', placeholder: t('eg. CEO, Manager, Developer') },
                        {
                            name: formMode === 'view' ? 'account_name' : 'account_id',
                            label: t('Account'),
                            type: formMode === 'view' ? 'text' : 'select',
                            required: true,
                            searchable: true,
                            readOnly: formMode === 'view',
                            options: formMode === 'view' ? [] : accounts.map((account: any) => ({
                                value: account.id,
                                label: account.name
                            })),
                            emptyNote: accounts.length === 0 ? {
                                link: route('accounts.index'),
                                linkText: t('Accounts')
                            } : undefined
                        },
                        { name: 'address', label: t('Address'), type: 'textarea', required: true, placeholder: t('eg. 123 Main St, City, Country') },
                        {
                            name: formMode === 'view' ? 'assigned_user_name' : 'assigned_to',
                            label: t('Assign To'),
                            type: formMode === 'view' ? 'text' : 'select',
                            required: true,
                            searchable: true,
                            options: formMode === 'view' ? [] : [
                                ...users.map((user: any) => ({ value: user.id, label: `${user.name} (${user.email})` }))
                            ],
                            readOnly: formMode === 'view',
                            emptyNote: users.length === 0 ? {
                                link: route('users.index'),
                                linkText: t('Users')
                            } : undefined
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            options: [
                                { value: 'active', label: t('Active') },
                                { value: 'inactive', label: t('Inactive') }
                            ],
                            defaultValue: 'active'
                        }
                    ],
                    modalSize: 'xl'
                }}
                initialData={currentItem ? {
                    ...currentItem,
                    assigned_user_name: currentItem.assigned_user?.name || t('Unassigned'),
                    account_name: currentItem.account?.name || t('No Account')
                } : null}
                title={
                    formMode === 'create'
                        ? t('Add Contact')
                        : formMode === 'edit'
                            ? t('Edit Contact')
                            : t('View Contact')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('contact')}
            />
        </PageTemplate>
    );
}
