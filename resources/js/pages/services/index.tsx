import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, Layers, DollarSign, Clock, Users, Building2, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';

export default function ServicesIndex() {
    const { t } = useTranslation();
    const { auth, services, categories = [], taxes = [], users = [], filters: pageFilters = {}, flash } = usePage().props as any;

    useEffect(() => {
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
        else if (flash?.warning) toast.warning(t(flash.warning));
    }, [flash]);

    useEffect(() => {
        if (pageFilters.view && (pageFilters.view === 'list' || pageFilters.view === 'grid')) {
            setActiveView(pageFilters.view);
        }
    }, [pageFilters.view]);

    const permissions = auth?.permissions || [];
    const canCreate = hasPermission(permissions, 'create-services');
    const canEdit = hasPermission(permissions, 'edit-services');
    const canDelete = hasPermission(permissions, 'delete-services');
    const canView = hasPermission(permissions, 'view-services');

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(pageFilters.category || 'all');
    const [selectedCycle, setSelectedCycle] = useState(pageFilters.billing_cycle || 'all');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [activeView, setActiveView] = useState<'list' | 'grid'>(pageFilters.view || 'list');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<any>(null);

    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedCategory !== 'all' || selectedCycle !== 'all' || selectedStatus !== 'all';
    };

    const activeFilterCount = () => {
        return (selectedCategory !== 'all' ? 1 : 0) + (selectedCycle !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0);
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setSelectedCycle('all');
        setSelectedStatus('all');
        router.get(route('services.index'), { view: activeView });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('services.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            billing_cycle: selectedCycle !== 'all' ? selectedCycle : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('services.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            billing_cycle: selectedCycle !== 'all' ? selectedCycle : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            sort_field: field,
            sort_direction: direction,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setServiceToDelete(item);
        if (action === 'view') {
            router.visit(route('services.show', item.id));
        } else if (action === 'edit') {
            router.visit(route('services.edit', item.id));
        } else if (action === 'delete') {
            setIsDeleteModalOpen(true);
        } else if (action === 'toggle-status') {
            handleToggleStatus(item);
        }
    };

    const handleToggleStatus = (service: any) => {
        router.put(route('services.toggle-status', service.id), {}, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Service status updated.')),
            onError: () => toast.error(t('Failed to update status.')),
        });
    };

    const handleDeleteConfirm = () => {
        if (!serviceToDelete) return;
        router.delete(route('services.destroy', serviceToDelete.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                setServiceToDelete(null);
                toast.success(t('Service deleted successfully.'));
            },
            onError: () => toast.error(t('Failed to delete service.')),
        });
    };

    const formatCurrency = (amount: number) =>
        window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

    const getBillingCycleLabel = (cycle?: string) => {
        switch (cycle) {
            case 'hourly': return t('Hourly');
            case 'daily': return t('Daily');
            case 'monthly': return t('Monthly');
            case 'quarterly': return t('Quarterly');
            case 'yearly': return t('Yearly');
            default: return t('One-Time');
        }
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Catalog') },
        { title: t('Services') },
    ];

    const pageActions = [];
    if (canCreate) {
        pageActions.push({
            label: t('Add Service'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default' as const,
            onClick: () => router.visit(route('services.create')),
        });
    }

    const tableActions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-services',
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-services',
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-services',
        },
    ];

    const columns = [
        {
            key: 'name',
            label: t('Service'),
            sortable: true,
            render: (value: any, row: any) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Layers className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">{row.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            {row.code && <span className="font-mono">{row.code}</span>}
                            {row.category?.name && (
                                <>
                                    <span>·</span>
                                    <span>{row.category.name}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'billing_cycle',
            label: t('Billing Period'),
            sortable: true,
            render: (value: any) => (
                <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {getBillingCycleLabel(value)}
                </span>
            ),
        },
        {
            key: 'price',
            label: t('Standard Rate'),
            sortable: true,
            render: (value: any) => (
                <span className="font-semibold text-emerald-600 font-mono text-sm">
                    {formatCurrency(value)}
                </span>
            ),
        },
        {
            key: 'mappings',
            label: t('Mapped CRM Entities'),
            render: (_: any, row: any) => (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-muted text-foreground">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {row.leads_count || 0} {t('Leads')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-muted text-foreground">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {row.accounts_count || 0} {t('Accounts')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium bg-muted text-foreground">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        {row.opportunities_count || 0} {t('Opps')}
                    </span>
                </div>
            ),
        },
        {
            key: 'status',
            label: t('Status'),
            sortable: true,
            render: (value: any, row: any) => (
                <button
                    onClick={() => handleToggleStatus(row)}
                    className="cursor-pointer group"
                    title={t('Click to toggle status')}
                >
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        value === 'active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                    }`}>
                        {value === 'active' ? t('Active') : t('Inactive')}
                    </span>
                </button>
            ),
        },
    ];

    const serviceItems = services?.data || [];
    const totalCount = services?.total || serviceItems.length;
    const activeCount = serviceItems.filter((s: any) => s.status === 'active').length;
    const totalMappings = serviceItems.reduce((acc: number, s: any) => acc + (s.leads_count || 0) + (s.accounts_count || 0) + (s.opportunities_count || 0), 0);

    return (
        <PageTemplate
            title={t('Services Catalog')}
            description={t('Manage your service offerings, standard pricing, and associations across Leads, Accounts, and Opportunities')}
            breadcrumbs={breadcrumbs}
            actions={pageActions}
            noPadding
        >
            <div className="space-y-6">
                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: t('Total Services'), value: totalCount, icon: Layers, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
                        { label: t('Active Services'), value: activeCount, icon: CheckCircle, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
                        { label: t('Total CRM Mappings'), value: totalMappings, icon: Users, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
                        { label: t('Categories'), value: categories.length, icon: Clock, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                    ].map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                        <Card key={label} className="relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                            <CardContent className="relative p-4">
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                                        <p className="text-lg font-bold text-foreground truncate font-mono leading-snug">{value}</p>
                                    </div>
                                    <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5 flex-shrink-0`}>
                                        <Icon className={`h-5 w-5 ${iconCls}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Search & Filter Bar */}
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[
                        {
                            name: 'category',
                            label: t('Category'),
                            type: 'select',
                            searchable: true,
                            value: selectedCategory,
                            onChange: (val) => {
                                setSelectedCategory(val);
                                router.get(route('services.index'), {
                                    view: activeView,
                                    page: 1,
                                    search: searchTerm || undefined,
                                    category: val !== 'all' ? val : undefined,
                                    billing_cycle: selectedCycle !== 'all' ? selectedCycle : undefined,
                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                }, { preserveState: true, preserveScroll: true });
                            },
                            options: [
                                { value: 'all', label: t('All Categories') },
                                ...categories.map((c: any) => ({ value: String(c.id), label: c.name })),
                            ],
                        },
                        {
                            name: 'billing_cycle',
                            label: t('Billing Period'),
                            type: 'select',
                            value: selectedCycle,
                            onChange: (val) => {
                                setSelectedCycle(val);
                                router.get(route('services.index'), {
                                    view: activeView,
                                    page: 1,
                                    search: searchTerm || undefined,
                                    category: selectedCategory !== 'all' ? selectedCategory : undefined,
                                    billing_cycle: val !== 'all' ? val : undefined,
                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                }, { preserveState: true, preserveScroll: true });
                            },
                            options: [
                                { value: 'all', label: t('All Periods') },
                                { value: 'one_time', label: t('One-Time') },
                                { value: 'hourly', label: t('Hourly') },
                                { value: 'daily', label: t('Daily') },
                                { value: 'monthly', label: t('Monthly') },
                                { value: 'quarterly', label: t('Quarterly') },
                                { value: 'yearly', label: t('Yearly') },
                            ],
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: (val) => {
                                setSelectedStatus(val);
                                router.get(route('services.index'), {
                                    view: activeView,
                                    page: 1,
                                    search: searchTerm || undefined,
                                    category: selectedCategory !== 'all' ? selectedCategory : undefined,
                                    billing_cycle: selectedCycle !== 'all' ? selectedCycle : undefined,
                                    status: val !== 'all' ? val : undefined,
                                }, { preserveState: true, preserveScroll: true });
                            },
                            options: [
                                { value: 'all', label: t('All Status') },
                                { value: 'active', label: t('Active') },
                                { value: 'inactive', label: t('Inactive') },
                            ],
                        },
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                    showViewToggle={true}
                    activeView={activeView}
                    onViewChange={(view) => {
                        setActiveView(view as any);
                        router.get(route('services.index'), {
                            view,
                            search: searchTerm || undefined,
                            category: selectedCategory !== 'all' ? selectedCategory : undefined,
                            billing_cycle: selectedCycle !== 'all' ? selectedCycle : undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />

                {/* Table or Grid View */}
                {activeView === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {serviceItems.map((service: any) => (
                            <Card key={service.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                                <Layers className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm text-foreground truncate">
                                                    {service.name}
                                                </h3>
                                                {service.code && (
                                                    <span className="text-xs font-mono text-muted-foreground">
                                                        {service.code}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant={service.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                            {service.status === 'active' ? t('Active') : t('Inactive')}
                                        </Badge>
                                    </div>

                                    {service.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {service.description}
                                        </p>
                                    )}

                                    <div className="flex items-baseline justify-between pt-2 border-t">
                                        <div>
                                            <span className="text-lg font-bold text-emerald-600 font-mono">
                                                {formatCurrency(service.price)}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-1">
                                                / {getBillingCycleLabel(service.billing_cycle)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {(service.leads_count || 0) + (service.accounts_count || 0) + (service.opportunities_count || 0)} {t('mapped')}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-end gap-1 pt-2 border-t">
                                        {canView && (
                                            <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                                                <Link href={route('services.show', service.id)}>
                                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                                    {t('View')}
                                                </Link>
                                            </Button>
                                        )}
                                        {canEdit && (
                                            <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                                                <Link href={route('services.edit', service.id)}>
                                                    <Edit className="h-3.5 w-3.5 mr-1" />
                                                    {t('Edit')}
                                                </Link>
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAction('delete', service)}
                                                className="h-8 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border">
                        <div className="overflow-x-auto">
                            <CrudTable
                                columns={columns}
                                actions={tableActions}
                                data={services?.data || []}
                                from={services?.from || 1}
                                onAction={handleAction}
                                sortField={pageFilters.sort_field || 'created_at'}
                                sortDirection={pageFilters.sort_direction || 'desc'}
                                onSort={handleSort}
                                permissions={permissions}
                                entityPermissions={{
                                    view: 'view-services',
                                    edit: 'edit-services',
                                    delete: 'delete-services'
                                }}
                            />
                        </div>

                        {/* Pagination section */}
                        <Pagination
                            from={services?.from || 0}
                            to={services?.to || 0}
                            total={services?.total || 0}
                            links={services?.links}
                            entityName={t("services")}
                            onPageChange={(url) => router.get(url)}
                            currentPerPage={pageFilters.per_page?.toString() || "10"}
                            onPerPageChange={(value) => {
                                router.get(route('services.index'), {
                                    view: activeView,
                                    page: 1,
                                    search: searchTerm || undefined,
                                    category: selectedCategory !== 'all' ? selectedCategory : undefined,
                                    billing_cycle: selectedCycle !== 'all' ? selectedCycle : undefined,
                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                    sort_field: pageFilters.sort_field || undefined,
                                    sort_direction: pageFilters.sort_direction || undefined,
                                    ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                                }, { preserveState: true, preserveScroll: true });
                            }}
                        />
                    </div>
                )}

                {/* Grid View Pagination */}
                {activeView === 'grid' && services?.data?.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden border mt-4">
                        <Pagination
                            from={services?.from || 0}
                            to={services?.to || 0}
                            total={services?.total || 0}
                            links={services?.links}
                            entityName={t("services")}
                            onPageChange={(url) => router.get(url)}
                            currentPerPage={pageFilters.per_page?.toString() || "10"}
                            onPerPageChange={(value) => {
                                router.get(route('services.index'), {
                                    view: activeView,
                                    page: 1,
                                    search: searchTerm || undefined,
                                    category: selectedCategory !== 'all' ? selectedCategory : undefined,
                                    billing_cycle: selectedCycle !== 'all' ? selectedCycle : undefined,
                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                    sort_field: pageFilters.sort_field || undefined,
                                    sort_direction: pageFilters.sort_direction || undefined,
                                    ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                                }, { preserveState: true, preserveScroll: true });
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={serviceToDelete?.name || ''}
                entityName={t('service')}
            />
        </PageTemplate>
    );
}
