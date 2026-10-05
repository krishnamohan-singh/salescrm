// pages/plans/plan-orders.tsx
import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Calendar, CheckCircle, CreditCard, User, Tag, Download, UserCheck, FileText } from 'lucide-react';
import { capitalize, getDisplayUrl } from '@/utils/helper';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';

export default function PlanOrdersPage() {
    const { t } = useTranslation();
    const { planOrders, filters: pageFilters = {}, auth, globalSettings } = usePage().props as any;
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [dateFrom, setDateFrom] = useState(pageFilters.date_from || '');
    const [dateTo, setDateTo] = useState(pageFilters.date_to || '');
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);

    // Check if any filters are active
    const hasActiveFilters = () => {
        return selectedStatus !== 'all' || dateFrom !== '' || dateTo !== '' || searchTerm !== '';
    };

    // Count active filters
    const activeFilterCount = () => {
        return (selectedStatus !== 'all' ? 1 : 0) +
            (dateFrom !== '' ? 1 : 0) +
            (dateTo !== '' ? 1 : 0) +
            (searchTerm !== '' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('plan-orders.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
            ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

        router.get(route('plan-orders.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
            per_page: pageFilters.per_page
        }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        if (action === 'approve') {
            if (!globalSettings?.is_demo) {
                toast.loading(t('Approving plan order...'));
            }

            router.post(route('plan-orders.approve', item.id), {}, {
                onSuccess: (page) => {
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (page.props.flash.success) {
                        toast.success(t(page.props.flash.success));
                    } else if (page.props.flash.error) {
                        toast.error(t(page.props.flash.error));
                    }
                },
                onError: (errors) => {
                    if (!globalSettings?.is_demo) {
                        toast.dismiss();
                    }
                    if (typeof errors === 'string') {
                        toast.error(t(errors));
                    } else {
                        toast.error(t('Failed to approve plan order: {{errors}}', { errors: Object.values(errors).join(', ') }));
                    }
                }
            });
        } else if (action === 'reject') {
            setCurrentItem(item);
            setIsRejectModalOpen(true);
        } else if (action === 'view') {
            setCurrentItem(item);
            setIsViewModalOpen(true);
        }
    };

    const handleRejectConfirm = (notes: string) => {
        if (!globalSettings?.is_demo) {
            toast.loading(t('Rejecting plan order...'));
        }

        router.post(route('plan-orders.reject', currentItem.id), { notes }, {
            onSuccess: (page) => {
                setIsRejectModalOpen(false);
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                if (!globalSettings?.is_demo) {
                    toast.dismiss();
                }
                if (typeof errors === 'string') {
                    toast.error(t(errors));
                } else {
                    toast.error(t('Failed to reject plan order: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const [pageInitialState, setPageInitialState] = useState(true);
    useEffect(() => {
        if (pageInitialState) { setPageInitialState(false); return; }
        applyFilters();
    }, [selectedStatus, dateFrom, dateTo]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        setDateFrom('');
        setDateTo('');
        router.get(route('plan-orders.index'));
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Plans'), href: route('plans.index') },
        { title: t('Plan Orders') }
    ];

    // Define table columns
    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
        approved: 'bg-green-50 text-green-700 ring-green-600/20',
        rejected: 'bg-red-50 text-red-700 ring-red-600/20',
        completed: 'bg-blue-50 text-blue-700 ring-blue-600/20'
    };

    const columns = [
        {
            key: 'order_number',
            label: t('Order Number'),
            className: 'whitespace-nowrap',
            render: (value) => <span className="whitespace-nowrap">{value || '-'}</span>
        },
        {
            key: 'user.name',
            label: t('Ordered By'),
            className: 'whitespace-nowrap',
            render: (_, row) => {
                const avatarUrl = row.user?.avatar ? getDisplayUrl(row.user.avatar) : getDisplayUrl('avatars/avatar.png');
                return (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={avatarUrl} alt={row.user?.name || ''} />
                            <AvatarFallback>{getInitials(row.user?.name || '')}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="whitespace-nowrap font-medium">{row.user?.name || '-'}</div>
                            <div className="text-sm text-muted-foreground whitespace-nowrap">{row.user?.email || ''}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'plan.name',
            label: t('Plan'),
            className: 'whitespace-nowrap',
            render: (_, row) => {
                const planName = row.plan?.name;
                if (!planName) return '-';
                return (
                    <span className="inline-flex items-center rounded-md px-2 py-1 text-sm font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 whitespace-nowrap">
                        {capitalize(planName)}
                    </span>
                );
            }
        },
        {
            key: 'original_price',
            label: t('Original Price'),
            className: 'whitespace-nowrap',
            render: (value) => <span className="whitespace-nowrap font-mono">{window.appSettings.formatCurrency(value) || '0'}</span>
        },
        {
            key: 'discount_amount',
            label: t('Discount'),
            className: 'whitespace-nowrap',
            render: (value) => <span className="whitespace-nowrap font-mono">{value > 0 ? `-${window.appSettings.formatCurrency(value)}` : '-'}</span>
        },
        {
            key: 'final_price',
            label: t('Final Price'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value) => <span className="whitespace-nowrap font-mono">{window.appSettings.formatCurrency(value) || '0'}</span>
        },
        {
            key: 'status',
            label: t('Status'),
            className: 'whitespace-nowrap',
            render: (value) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize whitespace-nowrap ${statusColors[value] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                    {t(value)}
                </span>
            )
        },
        {
            key: 'receipt_path',
            label: t('Receipt'),
            className: 'whitespace-nowrap',
            render: (value) => value ? (
                <a href={getDisplayUrl(value)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title={t('View Receipt')}>
                    <FileText className="h-4 w-4 text-green-600 hover:text-green-800" />
                </a>
            ) : '-'
        },
        {
            key: 'ordered_at',
            label: t('Order Date'),
            sortable: true,
            className: 'whitespace-nowrap',
            type: 'date'
        }
    ];

    // Define table actions - only visible to super admin
    const getInitials = useInitials();
    const isSuperAdmin = auth?.user?.type === 'superadmin';
    const actions = isSuperAdmin ? [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-plan-orders',
            // condition: (row) => row.payment_method === 'bank'
        },
        {
            label: t('Approve'),
            icon: 'Check',
            action: 'approve',
            className: 'text-green-500',
            requiredPermission: 'approve-plan-orders',
            condition: (row) => row.status === 'pending'
        },
        {
            label: t('Reject'),
            icon: 'X',
            action: 'reject',
            className: 'text-red-500',
            requiredPermission: 'reject-plan-orders',
            condition: (row) => row.status === 'pending'
        }
    ] : [];

    // Prepare status options for filter
    const statusOptions = [
        { value: 'all', label: t('All Status') },
        { value: 'pending', label: t('Pending') },
        { value: 'approved', label: t('Approved') },
        { value: 'rejected', label: t('Rejected') },
        { value: 'completed', label: t('Completed') }
    ];

    return (
        <PageTemplate
            title={t('Plan Orders')}
            url="/plan-orders"
            breadcrumbs={breadcrumbs}
            description={isSuperAdmin ? t('View and manage all plan orders from companies.') : t('View your plan orders.')}
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
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: statusOptions
                        },
                        {
                            name: 'date_from',
                            label: t('Date From'),
                            type: 'date',
                            value: dateFrom,
                            onChange: setDateFrom
                        },
                        {
                            name: 'date_to',
                            label: t('Date To'),
                            type: 'date',
                            value: dateTo,
                            onChange: setDateTo
                        }
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* Content section */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={planOrders?.data || []}
                    from={planOrders?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                />
                </div>

                {/* Pagination section */}
                <Pagination
                    from={planOrders?.from || 0}
                    to={planOrders?.to || 0}
                    total={planOrders?.total || 0}
                    links={planOrders?.links}
                    entityName={t("plan orders")}
                    onPageChange={(url) => router.get(url)}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('plan-orders.index'), {
                            page: 1,
                            per_page: parseInt(value) !== 10 ? parseInt(value) : undefined,
                            search: searchTerm || undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                            date_from: dateFrom || undefined,
                            date_to: dateTo || undefined,
                            ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            {/* View Modal */}
            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader className="px-6 pt-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                            </div>
                            <DialogTitle className="text-xl font-semibold">{t('Plan Order Details')}</DialogTitle>
                        </div>
                    </DialogHeader>

                    {currentItem && (
                        <div className="px-6 py-4 pb-6 space-y-4">
                            {/* Order Number | Order Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <ShoppingCart className="h-4 w-4" />
                                        {t('Order Number')}
                                    </label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{currentItem.order_number || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {t('Order Date')}
                                    </label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{window.appSettings?.formatDateTime(currentItem.ordered_at, false) || '-'}</p>
                                </div>
                            </div>

                            {/* Status | Payment Method */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        {t('Status')}
                                    </label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset capitalize ${statusColors[currentItem.status] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                                            {t(currentItem.status)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        {t('Payment Method')}
                                    </label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white capitalize">{currentItem.payment_method || '-'}</p>
                                </div>
                            </div>

                            {/* User | Plan */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        {t('User')}
                                    </label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{currentItem.user?.name || '-'}</p>
                                    <p className="text-xs text-muted-foreground">{currentItem.user?.email || ''}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <Tag className="h-4 w-4" />
                                        {t('Plan')}
                                    </label>
                                    <div className="mt-1">
                                        <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10">
                                            {capitalize(currentItem.plan?.name || '-')}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground capitalize">{currentItem.billing_cycle || ''}</p>
                                </div>
                            </div>

                            {/* Original Price | Discount */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        {t('Original Price')}
                                    </label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white font-mono">{window.appSettings.formatCurrency(currentItem.original_price)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <Tag className="h-4 w-4" />
                                        {t('Discount')}
                                    </label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white font-mono">
                                        {currentItem.discount_amount > 0 ? `-${window.appSettings.formatCurrency(currentItem.discount_amount)}` : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Final Price | Payment Receipt */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        {t('Final Price')}
                                    </label>
                                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white font-mono">{window.appSettings.formatCurrency(currentItem.final_price)}</p>
                                </div>
                                {currentItem.receipt_path && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                            <Download className="h-4 w-4" />
                                            {t('Payment Receipt')}
                                        </label>
                                        <div className="mt-1">
                                            <Button
                                                size={'sm'}
                                                varient={'primary'}
                                                onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = getDisplayUrl(currentItem.receipt_path);
                                                    link.download = '';
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                }
                                                }
                                            >
                                                {t('Download Receipt')}
                                            </Button>

                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Processed By | Notes - only when present */}
                            {(currentItem.processedBy || currentItem.notes) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {currentItem.processedBy && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                                <UserCheck className="h-4 w-4" />
                                                {t('Processed By')}
                                            </label>
                                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{currentItem.processedBy.name}</p>
                                        </div>
                                    )}
                                    {currentItem.notes && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                {t('Notes')}
                                            </label>
                                            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{currentItem.notes}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Modal */}
            <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Reject Plan Order')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const notes = formData.get('notes') as string;
                        handleRejectConfirm(notes);
                    }}>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="notes">{t('Rejection Reason (Optional)')}</Label>
                                <Textarea
                                    id="notes"
                                    name="notes"
                                    placeholder={t('Enter rejection reason...')}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setIsRejectModalOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="submit" variant="destructive">
                                {t('Reject')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}
