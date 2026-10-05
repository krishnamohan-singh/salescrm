import { useState, useEffect, useRef, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Lock, Search, Trash2, X, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function LeadSources() {
    const { t } = useTranslation();
    const { auth, leadSources, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
    const [overflowingDescriptions, setOverflowingDescriptions] = useState<Set<number>>(new Set());
    const descriptionRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    const descriptionRefsMobile = useRef<Map<number, HTMLDivElement>>(new Map());

    const checkOverflow = useCallback(() => {
        const next = new Set<number>();
        descriptionRefs.current.forEach((el, id) => {
            if (el && el.scrollHeight > el.clientHeight) next.add(id);
        });
        descriptionRefsMobile.current.forEach((el, id) => {
            if (el && el.scrollHeight > el.clientHeight) next.add(id);
        });
        setOverflowingDescriptions(next);
    }, []);

    useEffect(() => {
        checkOverflow();
        const observer = new ResizeObserver(checkOverflow);
        descriptionRefs.current.forEach((el) => { if (el) observer.observe(el); });
        descriptionRefsMobile.current.forEach((el) => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, [checkOverflow, leadSources?.data]);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: 'active',
    });
    const [formErrors, setFormErrors] = useState<any>({});

    const resetForm = () => {
        setFormData({ name: '', description: '', status: 'active' });
        setFormErrors({});
        setFormMode('create');
        setCurrentItem(null);
    };

    const loadItemForEdit = (item: any) => {
        setFormData({
            name: item.name || '',
            description: item.description || '',
            status: item.status || 'active',
        });
        setFormMode('edit');
        setCurrentItem(item);
        setFormErrors({});
    };

    const hasActiveFilters = () => searchTerm !== '' || selectedStatus !== 'all';


    const applyFilters = (
        status = selectedStatus,
        search = searchTerm
    ) => {
        router.get(route('lead-sources.index'), {
            page: 1,
            search: search || undefined,
            status: status !== 'all' ? status : undefined,
            sort_field: pageFilters.sort_field,
            sort_direction: pageFilters.sort_direction,
            per_page: pageFilters.per_page || 10,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearch = (e?: React.FormEvent) => {
        if (e?.preventDefault) e.preventDefault();
        applyFilters();
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('lead-sources.index'), {
            sort_field: field,
            sort_direction: direction,
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            per_page: pageFilters.per_page || 10,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        router.get(route('lead-sources.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'edit':
                loadItemForEdit(item);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                handleToggleStatus(item);
                break;
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormErrors({});

        if (formMode === 'create') {
            router.post(route('lead-sources.store'), formData, {
                onSuccess: (page) => {
                    if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); }
                    else if (page.props.flash.error) toast.error(page.props.flash.error);
                },
                onError: (errors) => { setFormErrors(errors); toast.error(t('Failed to create lead source.')); },
            });
        } else {
            router.put(route('lead-sources.update', currentItem.id), formData, {
                onSuccess: (page) => {
                    if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); }
                    else if (page.props.flash.error) toast.error(page.props.flash.error);
                },
                onError: (errors) => { setFormErrors(errors); toast.error(t('Failed to update lead source.')); },
            });
        }
    };

    const handleDeleteConfirm = () => {
        router.delete(route('lead-sources.destroy', currentItem.id), {
            onSuccess: (page) => {
                setIsDeleteModalOpen(false);
                if (page.props.flash.success) { toast.success(page.props.flash.success); if (formMode === 'edit') resetForm(); }
                else if (page.props.flash.error) toast.error(page.props.flash.error);
            },
            onError: (errors) => {
                setIsDeleteModalOpen(false);
                toast.error(`${t('Failed to delete lead source')}: ${Object.values(errors).join(', ')}`);
            },
        });
    };

    const handleToggleStatus = (item: any) => {
        router.put(route('lead-sources.toggle-status', item.id), {}, {
            onSuccess: (page) => {
                if (page.props.flash.success) {
                    toast.success(page.props.flash.success);
                    if (formMode === 'edit' && currentItem?.id === item.id) {
                        setFormData(prev => ({ ...prev, status: item.status === 'active' ? 'inactive' : 'active' }));
                    }
                } else if (page.props.flash.error) toast.error(page.props.flash.error);
            },
            onError: (errors) => toast.error(`${t('Failed to update lead source')}: ${Object.values(errors).join(', ')}`),
        });
    };

    const toggleDescription = (id: number) => {
        const next = new Set(expandedDescriptions);
        next.has(id) ? next.delete(id) : next.add(id);
        setExpandedDescriptions(next);
    };

    const canCreate = hasPermission(permissions, 'create-lead-sources');
    const canEdit = hasPermission(permissions, 'edit-lead-sources');
    const canDelete = hasPermission(permissions, 'delete-lead-sources');
    const canToggleStatus = hasPermission(permissions, 'toggle-status-lead-sources');

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Lead Management') },
        { title: t('Lead Sources') },
    ];

    return (
        <PageTemplate title={t('Lead Sources')} description={t('Manage lead source categories for your leads.')} url="/lead-sources" breadcrumbs={breadcrumbs} noPadding>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Left — Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formMode === 'create' ? t('Add New Lead Source') : t('Edit Lead Source')}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {formMode === 'create'
                                    ? t('Fill in the details to create a new lead source')
                                    : t('Update the lead source details below')}
                            </p>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" required>{t('Source Name')}</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('eg. Website, Referral, Social Media')}
                                    className={formErrors.name ? 'border-red-500' : ''}
                                    disabled={!canCreate && !canEdit}
                                    required
                                />
                                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">{t('Description')}</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder={t('Enter source description...')}
                                    rows={3}
                                    className={formErrors.description ? 'border-red-500' : ''}
                                    disabled={!canCreate && !canEdit}
                                />
                                {formErrors.description && <p className="text-sm text-red-500">{formErrors.description}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">{t('Status')}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                                    disabled={!canCreate && !canEdit}
                                >
                                    <SelectTrigger className={formErrors.status ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {formErrors.status && <p className="text-sm text-red-500">{formErrors.status}</p>}
                            </div>

                            <div className="flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                                {(canCreate || canEdit) && (
                                    <Button type="submit" className="flex-1">
                                        {formMode === 'create' ? t('Add Lead Source') : t('Update Lead Source')}
                                    </Button>
                                )}
                                {formMode === 'edit' && (
                                    <Button type="button" variant="outline" onClick={resetForm}>
                                        {t('Cancel')}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right — List */}
                <div className="space-y-4 lg:col-span-2">
                    {/* Search & Filter */}
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder={t('Search lead sources...')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                                        className="pl-10"
                                    />
                                </div>
                                <Button onClick={handleSearch} variant="default">{t('Search')}</Button>
                                {hasActiveFilters() && (
                                    <Button onClick={handleResetFilters} variant="outline">
                                        <X className="mr-2 h-4 w-4" />{t('Reset')}
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <Select
                                    value={selectedStatus}
                                    onValueChange={(value) => {
                                        setSelectedStatus(value);
                                        applyFilters(value);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('All Statuses')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        {(leadSources?.data || []).length > 0 ? (
                            <>
                                {/* <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Lead Sources')}</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Manage lead source categories for your leads.')}</p>
                                </div> */}

                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr className="bg-[#F0F0F1] hover:bg-[#F0F0F1] dark:border-gray-900 dark:bg-gray-900 border-t">
                                                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 select-none dark:text-gray-300" onClick={() => handleSort('name')}>
                                                    <div className="flex items-center gap-1">
                                                        {t('Lead Source')}
                                                        {pageFilters.sort_field === 'name'
                                                            ? (pageFilters.sort_direction === 'asc' ? ' ↑' : ' ↓')
                                                            : <span className="opacity-40">↕</span>}
                                                    </div>
                                                </th>
                                                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Status')}</th>
                                                <th className="px-4 py-3 pr-[50px] text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                            {leadSources.data.map((item: any) => (
                                                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center">
                                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                                <Globe className="h-5 w-5" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                                {item.description && (
                                                                    <div className="mt-0.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                                                                        <div
                                                                            ref={(el) => { if (el) descriptionRefs.current.set(item.id, el); else descriptionRefs.current.delete(item.id); }}
                                                                            className={expandedDescriptions.has(item.id) ? '' : 'line-clamp-2'}
                                                                        >{item.description}</div>
                                                                        {(overflowingDescriptions.has(item.id) || expandedDescriptions.has(item.id)) && (
                                                                            <button onClick={() => toggleDescription(item.id)} className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                                                                {expandedDescriptions.has(item.id)
                                                                                    ? <><ChevronUp className="mr-1 h-3 w-3" />{t('Show less')}</>
                                                                                    : <><ChevronDown className="mr-1 h-3 w-3" />{t('Show more')}</>}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                                                            {item.status === 'active' ? t('Active') : t('Inactive')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canEdit && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="sm" onClick={() => handleAction('edit', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-transparent">
                                                                                <Edit className="h-4 w-4 text-gray-500" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{t('Edit')}</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                            {canToggleStatus && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="sm" onClick={() => handleAction('toggle-status', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-transparent">
                                                                                <Lock className="h-4 w-4 text-gray-500" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{item.status === 'active' ? t('Deactivate') : t('Activate')}</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                            {canDelete && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="sm" onClick={() => handleAction('delete', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-transparent">
                                                                                <Trash2 className="h-4 w-4 text-gray-500" />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{t('Delete')}</TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="space-y-4 p-4 lg:hidden">
                                    {leadSources.data.map((item: any) => (
                                        <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                            <div className="mb-3 flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                        <Globe className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                                                        {item.description && (
                                                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                                <div
                                                                    ref={(el) => { if (el) descriptionRefsMobile.current.set(item.id, el); else descriptionRefsMobile.current.delete(item.id); }}
                                                                    className={expandedDescriptions.has(item.id) ? '' : 'line-clamp-2'}
                                                                >{item.description}</div>
                                                                {(overflowingDescriptions.has(item.id) || expandedDescriptions.has(item.id)) && (
                                                                    <button onClick={() => toggleDescription(item.id)} className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                                                        {expandedDescriptions.has(item.id)
                                                                            ? <><ChevronUp className="mr-1 h-3 w-3" />{t('Show less')}</>
                                                                            : <><ChevronDown className="mr-1 h-3 w-3" />{t('Show more')}</>}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex justify-end gap-1">
                                                    {canEdit && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleAction('edit', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-transparent"><Edit className="h-4 w-4" /></Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{t('Edit')}</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {canToggleStatus && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleAction('toggle-status', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-transparent"><Lock className="h-4 w-4" /></Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{item.status === 'active' ? t('Deactivate') : t('Activate')}</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {canDelete && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleAction('delete', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-transparent"><Trash2 className="h-4 w-4" /></Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>{t('Delete')}</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                                                <div>
                                                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Status')}</p>
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                                                        {item.status === 'active' ? t('Active') : t('Inactive')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {leadSources?.total > (leadSources?.per_page || 10) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                        <Pagination
                                            from={leadSources?.from || 0}
                                            to={leadSources?.to || 0}
                                            total={leadSources?.total || 0}
                                            links={leadSources?.links}
                                            entityName={t('lead sources')}
                                            hidePerPage={true}
                                            onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
                                        />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                    <Globe className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{t('No lead sources found')}</h3>
                                <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">
                                    {hasActiveFilters()
                                        ? t('No lead sources match your search criteria. Try adjusting your filters.')
                                        : t('Create lead sources to start categorizing your leads.')}
                                </p>
                                {!hasActiveFilters() && canCreate && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('Use the form on the left to add your first lead source.')}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('lead source')}
            />
        </PageTemplate>
    );
}
