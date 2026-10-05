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

export default function Quotes() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { auth, quotes, allAccounts, allOpportunities, allUsers = [], filters: pageFilters = {}, publicUrlBase, encryptedQuoteIds, flash = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    useEffect(() => {
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
        else if (flash?.warning) toast.warning(t(flash.warning));
    }, [flash]);

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedAccount, setSelectedAccount] = useState(pageFilters.account_id || 'all');
    const [selectedOpportunity, setSelectedOpportunity] = useState(pageFilters.opportunity_id || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [selectedStatus, selectedAccount, selectedOpportunity, selectedAssignee]);

    const hasActiveFilters = () =>
        searchTerm !== '' || selectedStatus !== 'all' || selectedAccount !== 'all' || selectedOpportunity !== 'all' || selectedAssignee !== 'all';

    const activeFilterCount = () =>
        (searchTerm ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAccount !== 'all' ? 1 : 0) + (selectedOpportunity !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('quotes.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            opportunity_id: selectedOpportunity !== 'all' ? selectedOpportunity : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('quotes.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            opportunity_id: selectedOpportunity !== 'all' ? selectedOpportunity : undefined,
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
                router.get(route('quotes.show', item.id));
                break;
            case 'edit':
                router.visit(route('quotes.edit', item.id));
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                setIsStatusModalOpen(true);
                break;
            case 'copy-link':
                handleCopyQuoteLink(item);
                break;
        }
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting quote...'));
        router.delete(route('quotes.destroy', currentItem.id), {
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

    const handleCopyQuoteLink = (quote: any) => {
        const baseUrl = publicUrlBase?.endsWith('/') ? publicUrlBase.slice(0, -1) : publicUrlBase;
        const encryptedId = encryptedQuoteIds[quote.id];
        const quoteUrl = `${baseUrl}/quotes/public/${encryptedId}`;
        navigator.clipboard.writeText(quoteUrl).then(() => {
            toast.success(t('Quote link copied to clipboard!'));
        }).catch(() => {
            toast.error(t('Failed to copy quote link'));
        });
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('quotes.toggle-status', currentItem.id), formData, {
            onSuccess: () => {
                setIsStatusModalOpen(false);
                toast.dismiss();
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const handleResetFilters = () => {
        router.get(route('quotes.index'));
    };

    const pageActions: any[] = [];

    if (hasPermission(permissions, 'export-quotes')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => { window.location.href = route('quote.export'); }
        });
    }

    if (hasPermission(permissions, 'create-quotes')) {
        pageActions.push({
            label: t('Add Quote'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => router.visit(route('quotes.create'))
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Quotes') }
    ];

    const columns = [
        {
            key: 'quote_number',
            label: t('Quote Number'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: string, item: any) => (
                hasPermission(permissions, 'view-quotes') ? (
                    <Link
                        href={route('quotes.show', item.id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors duration-200 border border-blue-200 cursor-pointer whitespace-nowrap" style={{ color: '#1d4ed8' }} onMouseEnter={e => (e.currentTarget.style.color = '#1d4ed8')} onMouseLeave={e => (e.currentTarget.style.color = '#1d4ed8')}
                    >
                        {value}
                    </Link>
                ) : (
                    <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                        {value}
                    </span>
                )
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
            key: 'total_amount',
            label: t('Amount'),
            render: (value: any) => <span className="whitespace-nowrap font-mono">{window.appSettings?.formatCurrency(Number(value || 0)) || `$${Number(value || 0).toFixed(2)}`}</span>
        },
        {
            key: 'status',
            label: t('Status'),
            className: 'whitespace-nowrap',
            render: (value: string) => {
                const statusColors: Record<string, string> = {
                    draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
                    sent: 'bg-blue-50 text-blue-700 ring-blue-600/20',
                    accepted: 'bg-green-50 text-green-700 ring-green-600/20',
                    rejected: 'bg-red-50 text-red-700 ring-red-600/20',
                    expired: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                };
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${statusColors[value] || statusColors.draft}`}>
                        {t(value?.charAt(0).toUpperCase() + value?.slice(1)) || t('Draft')}
                    </span>
                );
            }
        },

        // {
        //     key: 'created_at',
        //     label: t('Date'),
        //     sortable: true,
        //     className: 'whitespace-nowrap',
        //     type: 'date'
        // }
    ];

    const actions = [
        { label: t('Copy Quote Link'), icon: 'Copy', action: 'copy-link', className: 'text-purple-500', requiredPermission: 'view-quotes' },
        { label: t('Change Status'), icon: 'RefreshCw', action: 'toggle-status', className: 'text-amber-500', requiredPermission: 'toggle-status-quotes' },
        { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500', requiredPermission: 'view-quotes' },
        { label: t('Edit'), icon: 'Edit', action: 'edit', className: 'text-amber-500', requiredPermission: 'edit-quotes' },
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-grey-500', requiredPermission: 'delete-quotes' }
    ];

    const statusOptions = [
        { value: 'all', label: t('All Statuses') },
        { value: 'draft', label: t('Draft') },
        { value: 'sent', label: t('Sent') },
        { value: 'accepted', label: t('Accepted') },
        { value: 'rejected', label: t('Rejected') },
        { value: 'expired', label: t('Expired') }
    ];

    return (
        <PageTemplate title={t('Quotes')} 
        description={t('Manage your quotes.')}
        url="/quotes" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        { name: 'status', label: t('Status'), type: 'select', value: selectedStatus, onChange: setSelectedStatus, options: statusOptions },
                        {
                            name: 'account_id', label: t('Account'), type: 'select', searchable: true,
                            value: selectedAccount, onChange: setSelectedAccount,
                            options: [{ value: 'all', label: t('All Accounts') }, ...allAccounts?.map((acc: any) => ({ value: acc.id.toString(), label: acc.name })) || []]
                        },
                        {
                            name: 'opportunity_id', label: t('Opportunity'), type: 'select', searchable: true,
                            value: selectedOpportunity, onChange: setSelectedOpportunity,
                            options: [{ value: 'all', label: t('All Opportunities') }, ...allOpportunities?.map((opp: any) => ({ value: opp.id.toString(), label: opp.name })) || []]
                        },
                        {
                            name: 'assigned_to', label: t('Assigned To'), type: 'select', searchable: true,
                            value: selectedAssignee, onChange: setSelectedAssignee,
                            options: [{ value: 'all', label: t('All Users') }, ...allUsers.map((user: any) => ({ value: user.id.toString(), label: user.name }))]
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
                    data={quotes?.data || []}
                    from={quotes?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{ view: 'view-quotes', create: 'create-quotes', edit: 'edit-quotes', delete: 'delete-quotes' }}
                />
                </div>
                <Pagination
                    from={quotes?.from || 0}
                    to={quotes?.to || 0}
                    total={quotes?.total || 0}
                    links={quotes?.links}
                    entityName={t('quotes')}
                    onPageChange={(url) => router.get(url)}
                    currentPerPage={pageFilters.per_page?.toString() || '10'}
                    onPerPageChange={(value) => {
                        router.get(route('quotes.index'), {
                            page: 1,
                            search: searchTerm || undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                            opportunity_id: selectedOpportunity !== 'all' ? selectedOpportunity : undefined,
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
                    fields: [{
                        name: 'status', label: t('Status'), type: 'select', required: true,
                        options: [
                            { value: 'draft', label: t('Draft') },
                            { value: 'sent', label: t('Sent') },
                            { value: 'accepted', label: t('Accepted') },
                            { value: 'rejected', label: t('Rejected') },
                            { value: 'expired', label: t('Expired') }
                        ]
                    }],
                    modalSize: 'sm'
                }}
                initialData={currentItem ? { status: currentItem.status } : null}
                title={t('Change Quote Status')}
                mode="edit"
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('quote')}
            />
        </PageTemplate>
    );
}
