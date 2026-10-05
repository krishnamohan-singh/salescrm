import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, Package, FileDown, FileUp, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { Button } from '@/components/ui/button';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { ImportModal } from '@/components/ImportModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';

// import { ProductBarcode } from '@/components/Barcode';

export default function Products() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { auth, products, categories, allCategories, brands, allBrands, taxes, users, allUsers, samplePath, filters: pageFilters = {}, flash } = usePage().props as any;

    useEffect(() => {
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
        else if (flash?.warning) toast.warning(t(flash.warning));
    }, [flash]);
    const permissions = auth?.permissions || [];

    // State
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedCategory, setSelectedCategory] = useState(pageFilters.category || 'all');
    const [selectedBrand, setSelectedBrand] = useState(pageFilters.brand || 'all');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);

    const [activeView, setActiveView] = useState<'list' | 'grid'>(pageFilters.view || 'list');

    // Check if any filters are active
    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedCategory !== 'all' || selectedBrand !== 'all' || selectedStatus !== 'all' || selectedAssignee !== 'all';
    };

    // Count active filters
    const activeFilterCount = () => {
        return (selectedCategory !== 'all' ? 1 : 0) + (selectedBrand !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('products.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            brand: selectedBrand !== 'all' ? selectedBrand : undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('products.index'), {
            view: activeView,
            page: 1,
            search: searchTerm || undefined,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            brand: selectedBrand !== 'all' ? selectedBrand : undefined,
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
                router.visit(route('products.show', item.id));
                break;
            case 'edit':
                router.visit(route('products.edit', item.id));
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
        router.visit(route('products.create'));
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting product...'));

        router.delete(route('products.destroy', currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
            },
            onError: (errors) => {
                toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(t('Failed to delete: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const handleToggleStatus = (product: any) => {
        router.put(route('products.toggle-status', product.id), {}, {
            onSuccess: () => {},
            onError: (errors) => {
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') }));
                }
            }
        });
    };

    const pageInitialState = useState(true);
    useEffect(() => {
        if (pageInitialState[0]) { pageInitialState[1](false); return; }
        applyFilters();
    }, [searchTerm, selectedCategory, selectedBrand, selectedStatus, selectedAssignee]);

    const handleResetFilters = () => {
        router.get(route('products.index'), { view: activeView });
    };

    // Define page actions
    const pageActions = [];

    // Add export button
    if (hasPermission(permissions, 'export-products')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => { window.location.href = route('product.export'); }
        });
    }

    // Add import button
    if (hasPermission(permissions, 'import-products')) {
        pageActions.push({
            label: t('Import'),
            icon: <FileUp className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => setIsImportModalOpen(true)
        });
    }

    // Add the "Add Product" button if user has permission
    if (hasPermission(permissions, 'create-products')) {
        pageActions.push({
            label: t('Add Product'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => router.visit(route('products.create'))
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Products') }
    ];

    // Define table columns
    const columns = [
        {
            key: 'name',
            label: t('Name'),
            sortable: true,
            render: (value: any, row: any) => {
                const mainImage = row.media?.find((m: any) => m.collection_name === 'main');
                const imageUrl = mainImage?.original_url || row.display_image_url || row.main_image_url || row.image;

                return (
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden p-1">
                            <img
                                src={imageUrl}
                                alt={row.name}
                                className="max-h-full max-w-full object-contain rounded-lg"
                                onError={(e) => {
                                    const target = e.currentTarget as HTMLImageElement;
                                    if (!target.src.startsWith('data:image/svg+xml')) {
                                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNjBMMTQwIDgwVjE0MEwxMDAgMTYwTDYwIDE0MFY4MEwxMDAgNjBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iI0U1RTdFQiIvPgo8Y2lyY2xlIGN4PSI4NSIgY3k9Ijk1IiByPSI4IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik03MCAxMzBMODUgMTE1TDEwMCAxMzBMMTMwIDEwMEwxMzAgMTMwSDcwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
                                    } else {
                                        target.style.display = 'none';
                                        const icon = target.nextElementSibling as HTMLElement;
                                        if (icon) icon.style.display = 'flex';
                                    }
                                }}
                            />
                            <Package className="h-6 w-6 text-gray-400 hidden" />
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{row.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">SKU: {row.sku}</div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'price',
            label: t('Price'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: any) => (
                <span className="font-semibold text-green-600 whitespace-nowrap font-mono">
                    {window.appSettings?.formatCurrency(parseFloat(value || 0)) || `$${parseFloat(value || 0).toFixed(2)}`}
                </span>
            )
        },
        {
            key: 'stock_quantity',
            label: t('Stock'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: any) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap ${value > 10 ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                        value > 0 ? 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20' :
                            'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                    }`}>
                    {value} {value === 1 ? t('unit') : t('units')}
                </span>
            )
        },
        // {
        //     key: 'assigned_user',
        //     label: t('Assigned To'),
        //     className: 'whitespace-nowrap',
        //     render: (value: any) => value ? (
        //         <div className="flex items-center gap-2">
        //             <Avatar className="h-8 w-8 flex-shrink-0">
        //                 <AvatarImage src={value.avatar} alt={value.name} />
        //                 <AvatarFallback className="text-xs">{getInitials(value.name)}</AvatarFallback>
        //             </Avatar>
        //             <div>
        //                 <div className="font-medium whitespace-nowrap">{value.name}</div>
        //                 <div className="text-sm text-muted-foreground whitespace-nowrap">{value.email}</div>
        //             </div>
        //         </div>
        //     ) : <span className="whitespace-nowrap">{t('Unassigned')}</span>
        // },
        {
            key: 'category',
            label: t('Category'),
            className: 'whitespace-nowrap',
            render: (value: any) => value?.name
                ? <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 whitespace-nowrap">{value.name}</span>
                : <span className="whitespace-nowrap">{t('-')}</span>
        },
        {
            key: 'brand',
            label: t('Brand'),
            className: 'whitespace-nowrap',
            render: (value: any) => <span className="whitespace-nowrap">{value?.name || t('-')}</span>
        },
        {
            key: 'status',
            label: t('Status'),
            className: 'whitespace-nowrap',
            render: (value: string) => (
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap ${value === 'active'
                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                    }`}>
                    {value === 'active' ? t('Active') : t('Inactive')}
                </span>
            )
        }
    ];

    // Define table actions
    const actions = [
        {
            label: t('Toggle Status'),
            icon: 'Lock',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-products'
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-products'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-products'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-products'
        }
    ];

    // Prepare filter options
    const categoryOptions = [
        { value: 'all', label: t('All Categories') },
        ...(allCategories || []).map((category: any) => ({
            value: category.id.toString(),
            label: category.name
        }))
    ];

    const brandOptions = [
        { value: 'all', label: t('All Brands') },
        ...(allBrands || []).map((brand: any) => ({
            value: brand.id.toString(),
            label: brand.name
        }))
    ];

    const statusOptions = [
        { value: 'all', label: t('All Statuses') },
        { value: 'active', label: t('Active') },
        { value: 'inactive', label: t('Inactive') }
    ];

    return (
        <PageTemplate
            title={t("Products")}
            description={t("Manage your products.")}
            url="/products"
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
                            name: 'category',
                            label: t('Category'),
                            type: 'select',
                            searchable: true,
                            value: selectedCategory,
                            onChange: setSelectedCategory,
                            options: categoryOptions
                        },
                        {
                            name: 'brand',
                            label: t('Brand'),
                            type: 'select',
                            searchable: true,
                            value: selectedBrand,
                            onChange: setSelectedBrand,
                            options: brandOptions
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            value: selectedStatus,
                            onChange: setSelectedStatus,
                            options: statusOptions
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
                    showViewToggle={true}
                    activeView={activeView}
                    onViewChange={(view) => {
                        setActiveView(view);
                        router.get(route('products.index'), {
                            view,
                            page: pageFilters.page || undefined,
                            search: searchTerm || undefined,
                            category: selectedCategory !== 'all' ? selectedCategory : undefined,
                            brand: selectedBrand !== 'all' ? selectedBrand : undefined,
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
                    <div className="overflow-x-auto">
                    <CrudTable
                        columns={columns}
                        actions={actions}
                        data={products?.data || []}
                        from={products?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                        entityPermissions={{
                            view: 'view-products',
                            create: 'create-products',
                            edit: 'edit-products',
                            delete: 'delete-products'
                        }}
                    />
                    </div>

                    {/* Pagination section */}
                    <Pagination
                        from={products?.from || 0}
                        to={products?.to || 0}
                        total={products?.total || 0}
                        links={products?.links}
                        entityName={t("products")}
                        onPageChange={(url) => router.get(url)}
                        currentPerPage={pageFilters.per_page?.toString() || "10"}
                        onPerPageChange={(value) => {
                            router.get(route('products.index'), {
                                view: activeView, page: 1,
                                search: searchTerm || undefined,
                                category: selectedCategory !== 'all' ? selectedCategory : undefined,
                                brand: selectedBrand !== 'all' ? selectedBrand : undefined,
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                        {products?.data?.map((product: any) => {
                            const mainImage = product.media?.find((m: any) => m.collection_name === 'main');
                            const imageUrl = mainImage?.original_url || product.display_image_url || product.main_image_url || product.image;
                            const stockPct = Math.min(100, Math.max(0, (product.stock_quantity / 50) * 100));
                            const stockColor = product.stock_quantity > 10 ? 'bg-emerald-500' : product.stock_quantity > 0 ? 'bg-amber-400' : 'bg-red-500';

                            return (
                                <div key={product.id} className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col overflow-hidden cursor-pointer" onClick={() => router.visit(route('products.show', product.id))}>

                                    {/* Image Area */}
                                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700" style={{ height: '200px' }} onClick={(e) => { e.stopPropagation(); window.open(imageUrl, '_blank'); }}>
                                        <img
                                            src={imageUrl}
                                            alt={product.name}
                                            className="w-full h-full object-contain p-5"
                                            onError={(e) => {
                                                const target = e.currentTarget as HTMLImageElement;
                                                if (!target.src.startsWith('data:image/svg+xml')) {
                                                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNjBMMTQwIDgwVjE0MEwxMDAgMTYwTDYwIDE0MFY4MEwxMDAgNjBaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0iI0U1RTdFQiIvPgo8Y2lyY2xlIGN4PSI4NSIgY3k9Ijk1IiByPSI4IiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik03MCAxMzBMODUgMTE1TDEwMCAxMzBMMTMwIDEwMEwxMzAgMTMwSDcwWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
                                                }
                                            }}
                                        />
                                        {/* Status badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                                product.status === 'active'
                                                    ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                                                    : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20'
                                            }`}>
                                                {product.status === 'active' ? t('Active') : t('Inactive')}
                                            </span>
                                        </div>
                                        {/* Out of stock badge */}
                                        {product.stock_quantity === 0 && (
                                            <div className="absolute bottom-3 left-3">
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                                                    {t('Out of Stock')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4 flex flex-col flex-1 gap-3">

                                        {/* Name + SKU */}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">{product.name}</h3>
                                            <div className="flex items-center justify-between mt-0.5">
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono tracking-wide">#{product.sku}</p>
                                                {product.tax && <span className="text-[11px] text-gray-500 dark:text-gray-400">{t('Tax')}: {product.tax.rate != null ? `${product.tax.rate}%` : product.tax.name}</span>}
                                            </div>
                                        </div>

                                        {/* Category & Brand */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {product.category && (
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 whitespace-nowrap">
                                                    {product.category.name}
                                                </span>
                                            )}
                                            {product.brand && (
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20 whitespace-nowrap">
                                                    {product.brand.name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Stock */}
                                        <div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="rounded-md px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{t('Price')}</p>
                                                    <p className="text-sm font-bold text-green-600 font-mono">{window.appSettings?.formatCurrency(parseFloat(product.price || 0)) || `$${parseFloat(product.price || 0).toFixed(2)}`}</p>
                                                </div>
                                                <div className="rounded-md px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{t('In Stock')}</p>
                                                    <p className="text-sm font-bold text-orange-500">{product.stock_quantity} {t('units')}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Actions */}
                                        <div className="flex items-center justify-around mt-auto pt-2 border-t border-gray-300 dark:border-gray-600 -mx-4 px-4">
                                            <TooltipProvider delayDuration={200}>
                                                {hasPermission(permissions, 'view-products') && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" onClick={() => router.visit(route('products.show', product.id))} className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>{t('View')}</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {hasPermission(permissions, 'edit-products') && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" onClick={() => router.visit(route('products.edit', product.id))} className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>{t('Edit')}</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {hasPermission(permissions, 'toggle-status-products') && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(product)} className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                                                                <Lock className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>{product.status === 'active' ? t('Deactivate') : t('Activate')}</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                                {hasPermission(permissions, 'delete-products') && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="ghost" size="sm" onClick={() => handleAction('delete', product)} className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent><p>{t('Delete')}</p></TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </TooltipProvider>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination for grid view */}
                    <div className="mt-6 bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                        <Pagination
                            from={products?.from || 0}
                            to={products?.to || 0}
                            total={products?.total || 0}
                            links={products?.links}
                            entityName={t("products")}
                            onPageChange={(url) => router.get(url)}
                            currentPerPage={pageFilters.per_page?.toString() || "10"}
                            onPerPageChange={(value) => {
                                router.get(route('products.index'), {
                                    view: activeView, page: 1,
                                    search: searchTerm || undefined,
                                    category: selectedCategory !== 'all' ? selectedCategory : undefined,
                                    brand: selectedBrand !== 'all' ? selectedBrand : undefined,
                                    status: selectedStatus !== 'all' ? selectedStatus : undefined,
                                    assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                                    sort_field: pageFilters.sort_field || undefined,
                                    sort_direction: pageFilters.sort_direction || undefined,
                                    ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
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
                entityName={t('product')}
            />

            {/* Import Modal */}
            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                title={t('Import Products from CSV/Excel')}
                importRoute="product.import"
                parseRoute="product.parse"
                samplePath={samplePath}
                importNotes={t('Ensure that the values entered for Category, Brand, Tax match the existing records in your system.')}
                databaseFields={[
                    { key: 'name', required: true },
                    { key: 'sku', required: true },
                    { key: 'description' },
                    { key: 'price', required: true },
                    { key: 'stock', required: true },
                    { key: 'category' },
                    { key: 'brand' },
                    { key: 'tax' },
                    { key: 'status' }
                ]}
            />

        </PageTemplate>
    );
}
