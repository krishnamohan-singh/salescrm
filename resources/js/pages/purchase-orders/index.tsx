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

export default function PurchaseOrders() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { auth, purchaseOrders, accounts, allAccounts, contacts, salesOrders, products, users = [], allUsers = [], filters: pageFilters = {}, flash = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedAccount, setSelectedAccount] = useState(pageFilters.account_id || 'all');
    const [selectedSalesOrder, setSelectedSalesOrder] = useState(pageFilters.sales_order_id || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);

    useEffect(() => {
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
        else if (flash?.warning) toast.warning(t(flash.warning));
    }, [flash]);

    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedStatus !== 'all' || selectedAccount !== 'all' || selectedSalesOrder !== 'all' || selectedAssignee !== 'all';
    };

    const activeFilterCount = () => {
        return (searchTerm ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAccount !== 'all' ? 1 : 0) + (selectedSalesOrder !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('purchase-orders.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            sales_order_id: selectedSalesOrder !== 'all' ? selectedSalesOrder : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('purchase-orders.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            sales_order_id: selectedSalesOrder !== 'all' ? selectedSalesOrder : undefined,
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
                router.get(route('purchase-orders.show', item.id));
                break;
            case 'edit':
                router.visit(route('purchase-orders.edit', item.id));
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
        router.visit(route('purchase-orders.create'));
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting purchase order...'));

        router.delete(route('purchase-orders.destroy', currentItem.id), {
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
        router.put(route('purchase-orders.toggle-status', currentItem.id), formData, {
            onSuccess: () => {
                setIsStatusModalOpen(false);
            },
            onError: (errors) => {
                toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const handleToggleStatus = (purchaseOrder: any) => {
        toast.loading(t('Updating purchase order status...'));

        router.put(route('purchase-orders.toggle-status', purchaseOrder.id), {}, {
            onSuccess: (page) => {
                toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                }
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const pageInitialState = useState(true);
    useEffect(() => {
        if (pageInitialState[0]) { pageInitialState[1](false); return; }
        applyFilters();
    }, [searchTerm, selectedStatus, selectedAccount, selectedSalesOrder, selectedAssignee]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        setSelectedAccount('all');
        setSelectedSalesOrder('all');
        setSelectedAssignee('all');
        router.get(route('purchase-orders.index'));
    };

    const pageActions = [];

    if (hasPermission(permissions, 'export-purchase-orders')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => window.location.href = route('purchase-order.export')
        });
    }

    if (hasPermission(permissions, 'create-purchase-orders')) {
        pageActions.push({
            label: t('Add Purchase Order'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Purchase Orders') }
    ];

    const columns = [
        {
            key: 'order_number',
            label: t('Order Number'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: string, item: any) => (
                <Link href={route('purchase-orders.show', item.id)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors duration-200 border border-blue-200 cursor-pointer whitespace-nowrap" style={{ color: '#1d4ed8' }} onMouseEnter={e => (e.currentTarget.style.color = '#1d4ed8')} onMouseLeave={e => (e.currentTarget.style.color = '#1d4ed8')}>{value}</Link>
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
            key: 'sales_order',
            label: t('Sales Order'),
            className: 'whitespace-nowrap',
            render: (value: any) => <span className="whitespace-nowrap">{value?.name || t('-')}</span>
        },
        {
            key: 'order_date',
            label: t('Order Date'),
            sortable: true,
            className: 'whitespace-nowrap',
            type: 'date'
        },
        {
            key: 'status',
            label: t('Status'),
            className: 'whitespace-nowrap',
            render: (value: string) => {
                const statusColors = {
                    draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
                    sent: 'bg-blue-50 text-blue-700 ring-blue-600/20',
                    confirmed: 'bg-green-50 text-green-700 ring-green-600/20',
                    received: 'bg-purple-50 text-purple-700 ring-purple-600/20',
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
            label: t('Change Status'),
            icon: 'RefreshCw',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-purchase-orders'
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-purchase-orders'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-purchase-orders'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-purchase-orders'
        }
    ];

    const statusOptions = [
        { value: 'all', label: t('All Statuses') },
        { value: 'draft', label: t('Draft') },
        { value: 'sent', label: t('Sent') },
        { value: 'confirmed', label: t('Confirmed') },
        { value: 'received', label: t('Received') },
        { value: 'cancelled', label: t('Cancelled') }
    ];

    return (
        <PageTemplate
            title={t("Purchase Orders")}
            description={t("Manage your purchase orders.")}
            url="/purchase-orders"
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
                            options: [
                                { value: 'all', label: t('All Accounts') },
                                ...allAccounts?.map((acc: any) => ({ value: acc.id.toString(), label: acc.name })) || []
                            ]
                        },
                        {
                            name: 'sales_order_id',
                            label: t('Sales Order'),
                            type: 'select',
                            searchable: true,
                            value: selectedSalesOrder,
                            onChange: setSelectedSalesOrder,
                            options: [
                                { value: 'all', label: t('All Sales Orders') },
                                ...salesOrders?.map((so: any) => ({ value: so.id.toString(), label: so.name })) || []
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
                                ...allUsers.map((user: any) => ({ value: user.id.toString(), label: user.name }))
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
                    data={purchaseOrders?.data || []}
                    from={purchaseOrders?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-purchase-orders',
                        create: 'create-purchase-orders',
                        edit: 'edit-purchase-orders',
                        delete: 'delete-purchase-orders'
                    }}
                />
                </div>

                <Pagination
                    from={purchaseOrders?.from || 0}
                    to={purchaseOrders?.to || 0}
                    total={purchaseOrders?.total || 0}
                    links={purchaseOrders?.links}
                    entityName={t("purchase orders")}
                    onPageChange={(url) => router.get(url)}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('purchase-orders.index'), {
                            page: 1,
                            search: searchTerm || undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                            sales_order_id: selectedSalesOrder !== 'all' ? selectedSalesOrder : undefined,
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
                                { value: 'sent', label: t('Sent') },
                                { value: 'confirmed', label: t('Confirmed') },
                                { value: 'received', label: t('Received') },
                                { value: 'cancelled', label: t('Cancelled') }
                            ]
                        }
                    ],
                    modalSize: 'sm'
                }}
                initialData={currentItem ? { status: currentItem.status } : null}
                title={t('Change Purchase Order Status')}
                mode='edit'
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('purchase order')}
            />
        </PageTemplate>
    );
}
