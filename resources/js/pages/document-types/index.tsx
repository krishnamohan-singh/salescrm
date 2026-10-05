import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Lock, Search, Trash2, X, FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function DocumentTypes() {
    const { t } = useTranslation();
    const { auth, documentTypes, filters: pageFilters = {} } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState({ type_name: '', status: 'active' });
    const [formErrors, setFormErrors] = useState<any>({});

    const resetForm = () => {
        setFormData({ type_name: '', status: 'active' });
        setFormErrors({});
        setFormMode('create');
        setCurrentItem(null);
    };

    const loadItemForEdit = (item: any) => {
        setFormData({ type_name: item.type_name || '', status: item.status || 'active' });
        setFormMode('edit');
        setCurrentItem(item);
        setFormErrors({});
    };

    const hasActiveFilters = () => searchTerm !== '' || selectedStatus !== 'all';

    const applyFilters = (
        status = selectedStatus,
        search = searchTerm
    ) => {
        router.get(route('document-types.index'), {
            page: 1, search: search || undefined,
            status: status !== 'all' ? status : undefined,
            sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction,
            per_page: pageFilters.per_page || 10,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSearch = (e?: React.FormEvent) => { if (e?.preventDefault) e.preventDefault(); applyFilters(); };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('document-types.index'), {
            sort_field: field, sort_direction: direction, page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            per_page: pageFilters.per_page || 10,
        }, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        setSearchTerm(''); setSelectedStatus('all');
        router.get(route('document-types.index'), {}, { preserveState: true, preserveScroll: true });
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
            router.post(route('document-types.store'), formData, {
                onSuccess: (page) => { if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); } else if (page.props.flash.error) toast.error(page.props.flash.error); },
                onError: (errors) => { setFormErrors(errors); toast.error(t('Failed to create document type.')); },
            });
        } else {
            router.put(route('document-types.update', currentItem.id), formData, {
                onSuccess: (page) => { if (page.props.flash.success) { toast.success(page.props.flash.success); resetForm(); } else if (page.props.flash.error) toast.error(page.props.flash.error); },
                onError: (errors) => { setFormErrors(errors); toast.error(t('Failed to update document type.')); },
            });
        }
    };

    const handleDeleteConfirm = () => {
        router.delete(route('document-types.destroy', currentItem.id), {
            onSuccess: (page) => { setIsDeleteModalOpen(false); if (page.props.flash.success) { toast.success(page.props.flash.success); if (formMode === 'edit') resetForm(); } else if (page.props.flash.error) toast.error(page.props.flash.error); },
            onError: (errors) => { setIsDeleteModalOpen(false); toast.error(`${t('Failed to delete document type')}: ${Object.values(errors).join(', ')}`); },
        });
    };

    const handleToggleStatus = (item: any) => {
        router.put(route('document-types.toggle-status', item.id), {}, {
            onSuccess: (page) => {
                if (page.props.flash.success) { toast.success(page.props.flash.success); if (formMode === 'edit' && currentItem?.id === item.id) setFormData(prev => ({ ...prev, status: item.status === 'active' ? 'inactive' : 'active' })); }
                else if (page.props.flash.error) toast.error(page.props.flash.error);
            },
            onError: (errors) => toast.error(`${t('Failed to update document type')}: ${Object.values(errors).join(', ')}`),
        });
    };

    const canCreate = hasPermission(permissions, 'create-document-types');
    const canEdit = hasPermission(permissions, 'edit-document-types');
    const canDelete = hasPermission(permissions, 'delete-document-types');
    const canToggleStatus = hasPermission(permissions, 'toggle-status-document-types');

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Document Management') },
        { title: t('Types') },
    ];

    return (
        <PageTemplate title={t('Types')} description={t('Manage document types for your documents.')} url="/document-types" breadcrumbs={breadcrumbs} noPadding>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Left — Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4 rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{formMode === 'create' ? t('Add New Document Type') : t('Edit Document Type')}</h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formMode === 'create' ? t('Fill in the details to create a new document type') : t('Update the document type details below')}</p>
                        </div>
                        <form onSubmit={handleFormSubmit} className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="type_name" required>{t('Type Name')}</Label>
                                <Input id="type_name" type="text" value={formData.type_name} onChange={(e) => setFormData({ ...formData, type_name: e.target.value })} placeholder={t('e.g. Contract, NDA, Invoice, Report')} className={formErrors.type_name ? 'border-red-500' : ''} disabled={!canCreate && !canEdit} required />
                                {formErrors.type_name && <p className="text-sm text-red-500">{formErrors.type_name}</p>}
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
                                {(canCreate || canEdit) && <Button type="submit" className="flex-1">{formMode === 'create' ? t('Add Document Type') : t('Update Document Type')}</Button>}
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
                                    <Input type="text" placeholder={t('Search document types...')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)} className="pl-10" />
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
                        {(documentTypes?.data || []).length > 0 ? (
                            <>
                                {/* <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Document Types')}</h3>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('Manage document type categories.')}</p>
                                </div> */}
                                {/* Desktop Table */}
                                <div className="hidden lg:block overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr className="bg-[#F0F0F1] hover:bg-[#F0F0F1] dark:border-gray-900 dark:bg-gray-900 border-t">
                                                <th className="cursor-pointer px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 select-none dark:text-gray-300" onClick={() => handleSort('type_name')}>
                                                    <div className="flex items-center gap-1">{t('Type Name')}{pageFilters.sort_field === 'type_name' ? (pageFilters.sort_direction === 'asc' ? ' ↑' : ' ↓') : <span className="opacity-40">↕</span>}</div>
                                                </th>
                                                <th className="px-3 py-3 text-left text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Status')}</th>
                                                <th className="px-4 py-3 pr-[50px] text-right text-xs font-medium tracking-wider text-gray-500 dark:text-gray-300">{t('Actions')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                            {documentTypes.data.map((item: any) => (
                                                <tr key={item.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-4 py-4">
                                                        <div className="flex items-center">
                                                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
                                                            <div className="ml-3 text-sm font-medium text-gray-900 dark:text-white">{item.type_name}</div>
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
                                    {documentTypes.data.map((item: any) => (
                                        <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                            <div className="flex items-start justify-between">
                                                <div className="flex gap-3">
                                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-5 w-5" /></div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{item.type_name}</h4>
                                                        <div className="mt-1"><span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${item.status === 'active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>{item.status === 'active' ? t('Active') : t('Inactive')}</span></div>
                                                    </div>
                                                </div>
                                                <div className="ml-4 flex justify-end gap-1">
                                                    {canEdit && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('edit', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><Edit className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>{t('Edit')}</TooltipContent></Tooltip></TooltipProvider>}
                                                    {canToggleStatus && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('toggle-status', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><Lock className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>{item.status === 'active' ? t('Deactivate') : t('Activate')}</TooltipContent></Tooltip></TooltipProvider>}
                                                    {canDelete && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleAction('delete', item)} className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700"><Trash2 className="h-4 w-4 text-gray-500" /></Button></TooltipTrigger><TooltipContent>{t('Delete')}</TooltipContent></Tooltip></TooltipProvider>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {documentTypes?.total > (documentTypes?.per_page || 10) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700">
                                        <Pagination from={documentTypes?.from || 0} to={documentTypes?.to || 0} total={documentTypes?.total || 0} links={documentTypes?.links} entityName={t('document types')}  hidePerPage={true} onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })} />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"><FileText className="h-8 w-8 text-gray-400" /></div>
                                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">{t('No document types found')}</h3>
                                <p className="mx-auto mb-6 max-w-sm text-gray-500 dark:text-gray-400">{hasActiveFilters() ? t('No document types match your search criteria. Try adjusting your filters.') : t('Create document types to categorize your documents.')}</p>
                                {!hasActiveFilters() && canCreate && <p className="text-sm text-gray-500 dark:text-gray-400">{t('Use the form on the left to add your first document type.')}</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <CrudDeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteConfirm} itemName={currentItem?.type_name || ''} entityName={t('document type')} />
        </PageTemplate>
    );
}
