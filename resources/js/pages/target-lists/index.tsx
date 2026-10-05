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
import { Edit, Lock, Search, Trash2, X, ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TargetLists() {
    const { t } = useTranslation();
    const { auth, targetLists, filters: pageFilters = {} } = usePage().props as any;
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
    }, [checkOverflow, targetLists?.data]);

    const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });
    const [formErrors, setFormErrors] = useState<any>({});

    const resetForm = () => {
        setFormData({ name: '', description: '', status: 'active' });
        setFormErrors({});
        setFormMode('create');
        setCurrentItem(null);
    };

    const loadItemForEdit = (item: any) => {
        setFormData({ name: item.name || '', description: item.description || '', status: item.status || 'active' });
        setFormMode('edit');
        setCurrentItem(item);
        setFormErrors({});
    };

    const hasActiveFilters = () => searchTerm !== '' || selectedStatus !== 'all';

    const applyFilters = (
        status = selectedStatus,
        search = searchTerm
    ) => {
        router.get(route('target-lists.index'), {
            page: 1, search: search || undefined,
            status: status !== 'all' ? status : undefined,
            sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction,
            per_page: pageFilters.per_page || 10,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSearch = (e?: React.FormEvent) => { if (e?.preventDefault) e.preventDefault(); applyFilters(); };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('target-lists.index'), {
            sort_field: field, sort_direction: direction, page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            per_page: pageFilters.per_page || 10,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        setSearchTerm(''); setSelectedStatus('all');
        router.get(route('target-lists.index'), {}, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'edit': loadItemForEdit(item); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
            case 'delete': setIsDeleteModalOpen(true); break;
            case 'toggle-status': handleToggleStatus(item); break;
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault(); setFormErrors({});
        if (formMode === 'create') {
            router.post(route('target-lists.store'), formData, {
                onSuccess: (page) => { if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); } else if (page.props.flash.error) toast.error(page.props.flash.error); },
                onError: (errors) => { setFormErrors(errors); toast.error(t('Failed to create target list.')); },
            });
        } else {
            router.put(route('target-lists.update', currentItem.id), formData, {
                onSuccess: (page) => { if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); } else if (page.props.flash.error) toast.error(page.props.flash.error); },
                onError: (errors) => { setFormErrors(errors); toast.error(t('Failed to update target list.')); },
            });
        }
    };

    const handleDeleteConfirm = () => {
        router.delete(route('target-lists.destroy', currentItem.id), {
            onSuccess: (page) => { setIsDeleteModalOpen(false); if (page.props.flash.success) { toast.success(page.props.flash.success); if (formMode === 'edit') resetForm(); } else if (page.props.flash.error) toast.error(page.props.flash.error); },
            onError: (errors) => { setIsDeleteModalOpen(false); toast.error(`${t('Failed to delete target list')}: ${Object.values(errors).join(', ')}`); },
        });
    };

    const handleToggleStatus = (item: any) => {
        router.put(route('target-lists.toggle-status', item.id), {}, {
            onSuccess: (page) => {
                if (page.props.flash.success) { toast.success(page.props.flash.success); if (formMode === 'edit' && currentItem?.id === item.id) setFormData(prev => ({ ...prev, status: item.status === 'active' ? 'inactive' : 'active' })); }
                else if (page.props.flash.error) toast.error(page.props.flash.error);
            },
            onError: (errors) => toast.error(`${t('Failed to update target list')}: ${Object.values(errors).join(', ')}`),
        });
    };

    const toggleDescription = (id: number) => {
        const next = new Set(expandedDescriptions);
        next.has(id) ? next.delete(id) : next.add(id);
        setExpandedDescriptions(next);
    };

    const canCreate = hasPermission(permissions, 'create-target-lists');
    const canEdit = hasPermission(permissions, 'edit-target-lists');
    const canDelete = hasPermission(permissions, 'delete-target-lists');
    const canToggleStatus = hasPermission(permissions, 'toggle-status-target-lists');

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Campaign Management') },
        { title: t('Target Lists') },
    ];

    return (
        <PageTemplate title={t('Target Lists')} description={t('Manage target lists for your campaigns.')} url="/target-lists" breadcrumbs={breadcrumbs} noPadding>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Left — Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{formMode === 'create' ? t('Add New Target List') : t('Edit Target List')}</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formMode === 'create' ? t('Fill in the details to create a new target list') : t('Update the target list details below')}</p>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" required>{t('Name')}</Label>
                                <Input id="name" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t('e.g. Q1 Prospects, Enterprise Leads, Newsletter Subscribers')} className={formErrors.name ? 'border-red-500' : ''} disabled={!canCreate && !canEdit} required />
                                {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{t('Description')}</Label>
                                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder={t('Enter target list description...')} rows={3} className={formErrors.description ? 'border-red-500' : ''} disabled={!canCreate && !canEdit} />
                                {formErrors.description && <p className="text-sm text-red-500">{formErrors.description}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">{t('Status')}</Label>
                                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })} disabled={!canCreate && !canEdit}>
                                    <SelectTrigger className={formErrors.status ? 'border-red-500' : ''}><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
                                {(canCreate || canEdit) && <Button type="submit" className="flex-1">{formMode === 'create' ? t('Add Target List') : t('Update Target List')}</Button>}
                                {formMode === 'edit' && <Button type="button" variant="outline" onClick={resetForm}>{t('Cancel')}</Button>}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right — List */}
                <div className="space-y-4 lg:col-span-2">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input type="text" placeholder={t('Search target lists...')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)} className="pl-10" />
                                </div>
                                <Button onClick={handleSearch} variant="default">{t('Search')}</Button>
                                {hasActiveFilters() && <Button onClick={handleResetFilters} variant="outline"><X className="mr-2 h-4 w-4" />{t('Reset')}</Button>}
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <Select value={selectedStatus} onValueChange={(value) => {
                                        setSelectedStatus(value);
                                        applyFilters(value, searchTerm);
                                    }}>
                                    <SelectTrigger><SelectValue placeholder={t('All Statuses')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('All Statuses')}</SelectItem>
                                        <SelectItem value="active">{t('Active')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        {(targetLists?.data || []).length > 0 ? (
                            <>
                                {/* <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Target Lists')}</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Manage target lists for your campaigns.')}</p>
                                </div> */}
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr className="bg-[#F0F0F1] hover:bg-[#F0F0F1] dark:border-gray-900 dark:bg-gray-900 border-t">
                                                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 select-none dark:text-gray-300" onClick={() => handleSort('name')}>
                                                    <div className="flex items-center gap-1">{t('Target List')}{pageFilters.sort_field === 'name' ? (pageFilters.sort_direction === 'asc' ? ' ↑' : ' ↓') : <span className="opacity-40">↕</span>}</div>
                                                </th>
                                                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Status')}</th>
                                                <th className="px-4 py-3  pr-[50px] text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                            {targetLists.data.map((item: any) => (
                                                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center">
                                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                                <ListChecks className="h-5 w-5" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                                                                {item.description && (
                                                                    <div className="mt-0.5 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                                                                        <div ref={(el) => { if (el) descriptionRefs.current.set(item.id, el); else descriptionRefs.current.delete(item.id); }} className={expandedDescriptions.has(item.id) ? '' : 'line-clamp-2'}>{item.description}</div>
                                                                        {(overflowingDescriptions.has(item.id) || expandedDescriptions.has(item.id)) && (
                                                                            <button onClick={() => toggleDescription(item.id)} className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                                                                {expandedDescriptions.has(item.id) ? <><ChevronUp className="mr-1 h-3 w-3" />{t('Show less')}</> : <><ChevronDown className="mr-1 h-3 w-3" />{t('Show more')}</>}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-4">
                                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>{item.status === 'active' ? t('Active') : t('Inactive')}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canEdit && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('edit', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><Edit className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>{t('Edit')}</TooltipContent></Tooltip></TooltipProvider>}
                                                            {canToggleStatus && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('toggle-status', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><Lock className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>{item.status === 'active' ? t('Deactivate') : t('Activate')}</TooltipContent></Tooltip></TooltipProvider>}
                                                            {canDelete && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('delete', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><Trash2 className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>{t('Delete')}</TooltipContent></Tooltip></TooltipProvider>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Mobile Cards */}
                                <div className="space-y-4 p-4 lg:hidden">
                                    {targetLists.data.map((item: any) => (
                                        <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                            <div className="mb-3 flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                        <ListChecks className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                                                        {item.description && (
                                                            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                                <div ref={(el) => { if (el) descriptionRefsMobile.current.set(item.id, el); else descriptionRefsMobile.current.delete(item.id); }} className={expandedDescriptions.has(item.id) ? '' : 'line-clamp-2'}>{item.description}</div>
                                                                {(overflowingDescriptions.has(item.id) || expandedDescriptions.has(item.id)) && (
                                                                    <button onClick={() => toggleDescription(item.id)} className="mt-1 inline-flex items-center text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                                                        {expandedDescriptions.has(item.id) ? <><ChevronUp className="mr-1 h-3 w-3" />{t('Show less')}</> : <><ChevronDown className="mr-1 h-3 w-3" />{t('Show more')}</>}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex justify-end gap-1">
                                                    {canEdit && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('edit', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><Edit className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>{t('Edit')}</TooltipContent></Tooltip></TooltipProvider>}
                                                    {canToggleStatus && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('toggle-status', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><Lock className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>{item.status === 'active' ? t('Deactivate') : t('Activate')}</TooltipContent></Tooltip></TooltipProvider>}
                                                    {canDelete && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('delete', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><Trash2 className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>{t('Delete')}</TooltipContent></Tooltip></TooltipProvider>}
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 dark:border-gray-700">
                                                <div><p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{t('Status')}</p><span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>{item.status === 'active' ? t('Active') : t('Inactive')}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {targetLists?.total > (targetLists?.per_page || 10) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                        <Pagination from={targetLists?.from || 0} to={targetLists?.to || 0} total={targetLists?.total || 0} links={targetLists?.links} entityName={t('target lists')} hidePerPage={true} onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })} />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"><ListChecks className="h-8 w-8 text-gray-400" /></div>
                                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{t('No target lists found')}</h3>
                                <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">{hasActiveFilters() ? t('No target lists match your search criteria. Try adjusting your filters.') : t('Create target lists to organize your campaign recipients.')}</p>
                                {!hasActiveFilters() && canCreate && <p className="text-sm text-gray-500 dark:text-gray-400">{t('Use the form on the left to add your first target list.')}</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <CrudDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} itemName={currentItem?.name || ''} entityName={t('target list')} />
        </PageTemplate>
    );
}
