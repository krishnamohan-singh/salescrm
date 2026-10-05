import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, MoreHorizontal, FileDown, Lock, Calendar, Phone, Globe, Building2, Mail, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { useInitials } from '@/hooks/use-initials';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import UserInitials from '@/components/user-initials';

export default function Accounts() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { auth, accounts, flash, allUsers = [], allAccountTypes = [], allAccountIndustries = [], canViewAll = false, planLimits, filters: pageFilters = {} } = usePage().props as any;
    useEffect(() => {
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
        else if (flash?.warning) toast.warning(t(flash.warning));
    }, [flash]);
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedType, setSelectedType] = useState(pageFilters.account_type_id || 'all');
    const [selectedIndustry, setSelectedIndustry] = useState(pageFilters.account_industry_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [activeView, setActiveView] = useState(
        ['list', 'grid'].includes(pageFilters.view) ? pageFilters.view : 'list'
    );
    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedType, selectedIndustry, selectedStatus, selectedAssignee]);

    const isViewingMyData = selectedAssignee === String(auth?.user?.id);

    const handleToggleMyData = () => {
        const newAssignee = isViewingMyData ? 'all' : String(auth?.user?.id);
        setSelectedAssignee(newAssignee);
    };

    // Check if any filters are active
    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedType !== 'all' || selectedIndustry !== 'all' || selectedStatus !== 'all' || selectedAssignee !== 'all';
    };

    // Count active filters
    const activeFilterCount = () => {
        return (selectedType !== 'all' ? 1 : 0) + (selectedIndustry !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('accounts.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            account_type_id: selectedType !== 'all' ? selectedType : undefined,
            account_industry_id: selectedIndustry !== 'all' ? selectedIndustry : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('accounts.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            account_type_id: selectedType !== 'all' ? selectedType : undefined,
            account_industry_id: selectedIndustry !== 'all' ? selectedIndustry : undefined,
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
                router.get(route('accounts.show', item.id));
                break;
            case 'edit':
                router.visit(route('accounts.edit', item.id));
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                handleToggleStatus(item);
                break;
        }
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting account...'));

        if (!currentItem?.id) {
            toast.dismiss();
            toast.error('Invalid account selected');
            return;
        }
        router.delete(route('accounts.destroy', currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
            },
            onError: (errors) => {
                toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(t('Failed to delete account: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const handleToggleStatus = (account: any) => {
        const newStatus = account.status === 'active' ? 'inactive' : 'active';
        toast.loading(`${newStatus === 'active' ? t('Activating') : t('Deactivating')} account...`);

        router.put(route('accounts.toggle-status', account.id), {}, {
            onSuccess: () => toast.dismiss(),
            onError: (errors) => {
                toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(t('Failed to update account status: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const handleResetFilters = () => {
        router.get(route('accounts.index'), { view: activeView });
    };

    // Define page actions
    const pageActions: any[] = [];

    // Add My Accounts / All Accounts toggle button for users with full permission
    if (canViewAll) {
        pageActions.push({
            label: '',
            icon: isViewingMyData ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />,
            variant: isViewingMyData ? 'default' : 'outline',
            tooltip: isViewingMyData ? t('All Accounts') : t('My Accounts'),
            onClick: () => handleToggleMyData(),
        });
    }

    // Add export button
    if (hasPermission(permissions, 'export-accounts')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => window.location.href = route('account.export')
        });
    }

    // Add the "Add Account" button if user has permission
    if (hasPermission(permissions, 'create-accounts')) {
        const isDisabled = planLimits && !planLimits.can_create;
        pageActions.push({
            label: isDisabled ? t('Account Limit Reached ({{current}}/{{max}})', { current: planLimits?.current_accounts || 0, max: planLimits?.max_accounts || 0 }) : t('Add Account'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: isDisabled ? 'outline' : 'default',
            disabled: isDisabled,
            onClick: isDisabled
                ? () => toast.error(t('Account limit reached. Your plan allows maximum {{max}} accounts.', { max: planLimits.max_accounts }))
                : () => router.visit(route('accounts.create')),
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Account Management'), href: route('accounts.index') },
        { title: t('Accounts') }
    ];

    // Define table columns
    const columns = [
        {
            key: 'name',
            label: t('Name'),
            sortable: true,
            render: (value: any, row: any) => (
                <div className="flex items-center gap-3">
                    <UserInitials name={row.name} />
                    <div>
                        <div className="font-medium">{row.name}</div>
                        <div className="text-sm text-muted-foreground">{row.email || t('No email')}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'assigned_user',
            label: t('Assigned To'),
            render: (value: any) => value ? (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={value.avatar} />
                        <AvatarFallback>{getInitials(value.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-medium">{value.name}</div>
                        <div className="text-sm text-muted-foreground">{value.email}</div>
                    </div>
                </div>
            ) : <span className="text-muted-foreground">{t('Unassigned')}</span>
        },
        {
            key: 'account_type',
            label: t('Type'),
            render: (value: any) => {
                if (!value) return '-';
                return (
                    <span
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
                        style={{
                            backgroundColor: `${value.color}20`,
                            color: value.color,
                            borderColor: `${value.color}40`
                        }}
                    >
                        {value.name}
                    </span>
                );
            }
        },
        {
            key: 'account_industry',
            label: t('Industry'),
            render: (value: any) => {
                if (!value) return '-';
                return (
                    <span
                        className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
                        style={{
                            backgroundColor: `${value.color}20`,
                            color: value.color,
                            borderColor: `${value.color}40`
                        }}
                    >
                        {value.name}
                    </span>
                );
            }
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
        }
    ];

    // Define table actions
    const actions = [
        {
            label: t('Toggle Status'),
            icon: 'Lock',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-accounts'
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-accounts'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-accounts'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-accounts'
        }
    ];

    return (
        <PageTemplate
            title={t("Accounts")}
            description={t("Manage your accounts")}
            url="/accounts"
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
                            name: 'account_type_id',
                            label: t('Type'),
                            type: 'select',
                            searchable: true,
                            value: selectedType,
                            onChange: setSelectedType,
                            options: [
                                { value: 'all', label: t('All Types') },
                                ...allAccountTypes.map((type: any) => ({
                                    value: type.id.toString(),
                                    label: type.name
                                }))
                            ]
                        },
                        {
                            name: 'account_industry_id',
                            label: t('Industry'),
                            type: 'select',
                            searchable: true,
                            value: selectedIndustry,
                            onChange: setSelectedIndustry,
                            options: [
                                { value: 'all', label: t('All Industries') },
                                ...allAccountIndustries.map((industry: any) => ({
                                    value: industry.id.toString(),
                                    label: industry.name
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
                        router.get(route('accounts.index'), {
                            view,
                            page: pageFilters.page || 1,
                            search: searchTerm || undefined,
                            account_type_id: selectedType !== 'all' ? selectedType : undefined,
                            account_industry_id: selectedIndustry !== 'all' ? selectedIndustry : undefined,
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
                        data={accounts?.data || []}
                        from={accounts?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                        entityPermissions={{
                            view: 'view-accounts',
                            create: 'create-accounts',
                            edit: 'edit-accounts',
                            delete: 'delete-accounts'
                        }}
                    />

                    {/* Pagination section */}
                    <Pagination
                        from={accounts?.from || 0}
                        to={accounts?.to || 0}
                        total={accounts?.total || 0}
                        links={accounts?.links}
                        entityName={t("accounts")}
                        onPageChange={(url) => router.get(url)}
                        currentPerPage={pageFilters.per_page?.toString() || "10"}
                        onPerPageChange={(value) => {
                            router.get(route('accounts.index'), {
                                view: activeView,
                                page: 1,
                                search: searchTerm || undefined,
                                account_type_id: selectedType !== 'all' ? selectedType : undefined,
                                account_industry_id: selectedIndustry !== 'all' ? selectedIndustry : undefined,
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
                        {accounts?.data?.map((account: any) => (
                            <Card key={account.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
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
                                                {hasPermission(permissions, 'view-accounts') && (
                                                    <DropdownMenuItem onClick={() => handleAction('view', account)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        <span>{t('View Account')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'toggle-status-accounts') && (
                                                    <DropdownMenuItem onClick={() => handleAction('toggle-status', account)}>
                                                        <Lock className="h-4 w-4 mr-2" />
                                                        <span>{account.status === 'active' ? t('Deactivate') : t('Activate')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {hasPermission(permissions, 'edit-accounts') && (
                                                    <DropdownMenuItem onClick={() => handleAction('edit', account)}>
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        <span>{t('Edit')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                {hasPermission(permissions, 'delete-accounts') && (
                                                    <DropdownMenuItem onClick={() => handleAction('delete', account)} className="text-rose-600">
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        <span>{t('Delete')}</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {/* Avatar + name + email + status */}
                                    <div className="flex items-start gap-3 mb-4 pr-8">
                                        <UserInitials name={account.name} />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{account.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                                                <Mail className="h-3 w-3 text-gray-500 shrink-0" />
                                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{account.email || t('No email')}</p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                account.status === 'active'
                                                    ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20'
                                                    : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20'
                                            }`}>
                                                {account.status === 'active' ? t('Active') : t('Inactive')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Info rows */}
                                    <div className="space-y-1.5 mb-3">
                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                            <Phone className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                            <span className="truncate">{account.phone || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                            <Globe className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                            {account.website
                                                ? <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noopener noreferrer" className="truncate text-blue-600 hover:!text-blue-600 hover:underline">{account.website}</a>
                                                : <span className="truncate">-</span>
                                            }
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {account.account_type && (
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset" style={{ backgroundColor: `${account.account_type.color}20`, color: account.account_type.color, borderColor: `${account.account_type.color}40` }}>
                                                    {account.account_type.name}
                                                </span>
                                            )}
                                            {account.account_industry && (
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset" style={{ backgroundColor: `${account.account_industry.color}20`, color: account.account_industry.color, borderColor: `${account.account_industry.color}40` }}>
                                                    {account.account_industry.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer: date left, assigned avatar right */}
                                    <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            <Calendar className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                            <span>{window.appSettings?.formatDateTime(account.created_at, false) || new Date(account.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {account.assigned_user && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{t('Assigned to')}</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Avatar className="h-7 w-7 cursor-pointer shrink-0">
                                                                <AvatarImage src={account.assigned_user.avatar} alt={account.assigned_user.name} />
                                                                <AvatarFallback className="text-xs bg-purple-100 text-purple-700 font-medium">{getInitials(account.assigned_user.name)}</AvatarFallback>
                                                            </Avatar>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>{account.assigned_user.name}</p>
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
                            from={accounts?.from || 0}
                            to={accounts?.to || 0}
                            total={accounts?.total || 0}
                            links={accounts?.links}
                            entityName={t("accounts")}
                            onPageChange={(url) => router.get(url)}
                            perPageOptions={[12, 24, 48, 96]}
                            currentPerPage={pageFilters.per_page?.toString() || '12'}
                            onPerPageChange={(value) => {
                                router.get(route('accounts.index'), {
                                    view: activeView,
                                    page: 1,
                                    search: searchTerm || undefined,
                                    account_type_id: selectedType !== 'all' ? selectedType : undefined,
                                    account_industry_id: selectedIndustry !== 'all' ? selectedIndustry : undefined,
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

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('account')}
            />
        </PageTemplate>
    );
}
