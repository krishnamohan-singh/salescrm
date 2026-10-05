import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { Plus, FileDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';


export default function SalesOrders() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { auth, salesOrders, allAccounts, allUsers = [], filters: pageFilters = {}, publicUrlBase, encryptedSalesOrderIds, flash = {} } = usePage().props as any;

    useEffect(() => {
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
        else if (flash?.warning) toast.warning(t(flash.warning));
    }, [flash]);
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedAccount, setSelectedAccount] = useState(pageFilters.account_id || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);


    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedStatus !== 'all' || selectedAccount !== 'all' || selectedAssignee !== 'all';
    };

    const activeFilterCount = () => {
        return (searchTerm ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAccount !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('sales-orders.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('sales-orders.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
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
                router.get(route('sales-orders.show', item.id));
                break;
            case 'edit':
                router.visit(route('sales-orders.edit', item.id));
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                setIsStatusModalOpen(true);
                break;
            case 'copy-link':
                handleCopySalesOrderLink(item);
                break;

        }
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting sales order...'));

        router.delete(route('sales-orders.destroy', currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to delete: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('sales-orders.toggle-status', currentItem.id), formData, {
            onSuccess: () => {
                setIsStatusModalOpen(false);
            },
            onError: (errors) => {
                toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const handleCopySalesOrderLink = (salesOrder: any) => {
        const baseUrl = publicUrlBase?.endsWith('/') ? publicUrlBase.slice(0, -1) : publicUrlBase;
        const encryptedId = encryptedSalesOrderIds[salesOrder.id];
        const salesOrderUrl = `${baseUrl}/sales-orders/public/${encryptedId}`;
        navigator.clipboard.writeText(salesOrderUrl).then(() => {
            toast.success(t('Sales order link copied to clipboard!'));
        }).catch(() => {
            toast.error(t('Failed to copy sales order link'));
        });
    };



    const pageInitialState = useState(true);
    useEffect(() => {
        if (pageInitialState[0]) { pageInitialState[1](false); return; }
        applyFilters();
    }, [searchTerm, selectedStatus, selectedAccount, selectedAssignee]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        setSelectedAccount('all');
        setSelectedAssignee('all');
        router.get(route('sales-orders.index'));
    };

    const pageActions = [];

    // Add export button
    if (hasPermission(permissions, 'export-sales-orders')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => { window.location.href = route('sales-order.export'); }
        });
    }

    if (hasPermission(permissions, 'create-sales-orders')) {
        pageActions.push({
            label: t('Add Sales Order'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => router.visit(route('sales-orders.create'))
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Sales Orders') }
    ];

    const columns = [
        {
            key: 'order_number',
            label: t('Order Number'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: string, item: any) => (
                <Link href={route('sales-orders.show', item.id)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors duration-200 border border-blue-200 cursor-pointer whitespace-nowrap" style={{ color: '#1d4ed8' }} onMouseEnter={e => (e.currentTarget.style.color = '#1d4ed8')} onMouseLeave={e => (e.currentTarget.style.color = '#1d4ed8')}>{value}</Link>
            )
        },
        {
            key: 'name',
            label: t('Name'),
            sortable: true,
            render: (value: string) => <span className="whitespace-nowrap font-medium">{value || '-'}</span>
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
            key: 'order_date',
            label: t('Order Date'),
            sortable: true,
            className: 'whitespace-nowrap',
            type: 'date'
        },
        {
            key: 'total_amount',
            label: t('Total Amount'),
            className: 'whitespace-nowrap',
            render: (value: any) => <span className="whitespace-nowrap font-mono">{window.appSettings?.formatCurrency(Number(value || 0)) || `$${Number(value || 0).toFixed(2)}`}</span>
        },
        {
            key: 'status',
            label: t('Status'),
            className: 'whitespace-nowrap',
            render: (value: string) => {
                const statusColors = {
                    draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
                    confirmed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
                    processing: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
                    shipped: 'bg-purple-50 text-purple-700 ring-purple-600/20',
                    delivered: 'bg-green-50 text-green-700 ring-green-600/20',
                    cancelled: 'bg-red-50 text-red-700 ring-red-600/20'
                };
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${statusColors[value as keyof typeof statusColors] || statusColors.draft}`}>
                        {t(value.charAt(0).toUpperCase() + value.slice(1))}
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
            label: t('Copy Sales Order Link'),
            icon: 'Copy',
            action: 'copy-link',
            className: 'text-purple-500'
        },
        {
            label: t('Change Status'),
            icon: 'RefreshCw',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-sales-orders'
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-sales-orders'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-sales-orders'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-sales-orders'
        }
    ];

    const statusOptions = [
        { value: 'all', label: t('All Statuses') },
        { value: 'draft', label: t('Draft') },
        { value: 'confirmed', label: t('Confirmed') },
        { value: 'processing', label: t('Processing') },
        { value: 'shipped', label: t('Shipped') },
        { value: 'delivered', label: t('Delivered') },
        { value: 'cancelled', label: t('Cancelled') }
    ];

    const accountOptions = [
        { value: 'all', label: t('All Accounts') },
        ...allAccounts.map((account: any) => ({ value: account.id.toString(), label: account.name }))
    ];

    const assigneeOptions = [
        { value: 'all', label: t('All Users') },
        { value: 'unassigned', label: t('Unassigned') },
        ...allUsers.map((user: any) => ({ value: user.id.toString(), label: user.name }))
    ];

    return (
        <PageTemplate
            title={t("Sales Orders")}
            description={t("Manage your sales orders.")}
            url="/sales-orders"
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
                            options: statusOptions
                        },
                        {
                            name: 'account_id',
                            label: t('Account'),
                            type: 'select',
                            searchable: true,
                            value: selectedAccount,
                            onChange: setSelectedAccount,
                            options: accountOptions
                        },
                        {
                            name: 'assigned_to',
                            label: t('Assigned To'),
                            type: 'select',
                            searchable: true,
                            value: selectedAssignee,
                            onChange: setSelectedAssignee,
                            options: assigneeOptions
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
                    data={salesOrders?.data || []}
                    from={salesOrders?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-sales-orders',
                        create: 'create-sales-orders',
                        edit: 'edit-sales-orders',
                        delete: 'delete-sales-orders'
                    }}
                />
                </div>

                <Pagination
                    from={salesOrders?.from || 0}
                    to={salesOrders?.to || 0}
                    total={salesOrders?.total || 0}
                    links={salesOrders?.links}
                    entityName={t("sales orders")}
                    onPageChange={(url) => router.get(url)}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('sales-orders.index'), {
                            page: 1,
                            search: searchTerm || undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

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
                                { value: 'draft', label: t('Draft') },
                                { value: 'confirmed', label: t('Confirmed') },
                                { value: 'processing', label: t('Processing') },
                                { value: 'shipped', label: t('Shipped') },
                                { value: 'delivered', label: t('Delivered') },
                                { value: 'cancelled', label: t('Cancelled') }
                            ]
                        }
                    ],
                    modalSize: 'sm'
                }}
                initialData={currentItem ? { status: currentItem.status } : null}
                title={t('Change Sales Order Status')}
                mode='edit'
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('sales order')}
            />


        </PageTemplate>
    );
}
