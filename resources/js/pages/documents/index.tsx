import { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Plus, Edit, Trash2, MoreHorizontal, Folder, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { hasPermission } from '@/utils/authorization';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';

export default function Documents() {
    const { t } = useTranslation();
    const { themeColor, customColor } = useBrand();
    const color = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];
    const {
        auth,
        rootFolders = [],
        parentFolders = [],
        filters: pageFilters = {},
    } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const flash = (usePage().props as any).flash || {};

    useEffect(() => {
        if (flash.error) toast.error(t(flash.error));
    }, [flash.error]);

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isFolderDeleteModalOpen, setIsFolderDeleteModalOpen] = useState(false);
    const [currentFolder, setCurrentFolder] = useState<any>(null);
    const [folderFormMode, setFolderFormMode] = useState<'create' | 'edit'>('create');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('documents.index'), { search: searchTerm || undefined, page: 1 }, { preserveState: true, preserveScroll: true });
    };

    const handleFolderFormSubmit = (formData: any) => {
        if (formData.parent_folder_id === 'null') formData.parent_folder_id = null;
        delete formData.status;
        if (folderFormMode === 'create') {
            toast.loading(t('Creating folder...'));
            router.post(route('document-folders.store'), formData, {
                preserveState: false,
                onSuccess: (page) => { setIsFolderModalOpen(false); toast.dismiss(); if (page.props.flash.success_title) toast.success(t(page.props.flash.success_title)); if (page.props.flash.success) toast.success(t(page.props.flash.success)); else if (page.props.flash.error) toast.error(t(page.props.flash.error)); },
                onError: (errors) => { toast.dismiss(); toast.error(t('Failed to create: {{errors}}', { errors: Object.values(errors).join(', ') })); }
            });
        } else {
            toast.loading(t('Updating folder...'));
            router.put(route('document-folders.update', currentFolder.id), formData, {
                preserveState: false,
                onSuccess: (page) => { setIsFolderModalOpen(false); toast.dismiss(); if (page.props.flash.success_title) toast.success(t(page.props.flash.success_title)); if (page.props.flash.success) toast.success(t(page.props.flash.success)); else if (page.props.flash.error) toast.error(t(page.props.flash.error)); },
                onError: (errors) => { toast.dismiss(); toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') })); }
            });
        }
    };

    const handleFolderDeleteConfirm = () => {
        toast.loading(t('Deleting folder...'));
        router.delete(route('document-folders.destroy', currentFolder.id), {
            onSuccess: (page) => { setIsFolderDeleteModalOpen(false); toast.dismiss(); if (page.props.flash.success_title) toast.success(t(page.props.flash.success_title)); if (page.props.flash.success) toast.success(t(page.props.flash.success)); else if (page.props.flash.error) toast.error(t(page.props.flash.error)); },
            onError: (errors) => { toast.dismiss(); toast.error(t('Failed to delete: {{errors}}', { errors: Object.values(errors).join(', ') })); }
        });
    };

    const pageActions: any[] = [];
    if (hasPermission(permissions, 'create-document-folders')) {
        pageActions.push({
            label: t('Create Folder'),
            icon: <FolderPlus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => { setCurrentFolder(null); setFolderFormMode('create'); setIsFolderModalOpen(true); }
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Document Management') },
        { title: t('Documents') }
    ];

    const folderFormFields = [
        { name: 'name', label: t('Folder Name'), type: 'text', required: true, placeholder: t('e.g. Contracts, HR Documents') },
        {
            name: 'parent_folder_id', label: t('Parent Folder'), type: 'select', searchable: true,
            options: [
                { value: 'null', label: t('Root Folder') },
                ...parentFolders.map((f: any) => ({ value: f.id, label: f.display_name || f.name }))
            ]
        },
        { name: 'description', label: t('Description'), type: 'textarea', placeholder: t('Enter folder description...') },
    ];

    const folders = rootFolders?.data || rootFolders || [];

    return (
        <PageTemplate title={t('Documents')} description={t('Manage your documents and organizing them into folders.')} url="/documents" actions={pageActions} breadcrumbs={breadcrumbs} noPadding>
            {/* Search bar */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border border-gray-200 dark:border-gray-700">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    hasActiveFilters={() => false}
                    activeFilterCount={() => 0}
                    onResetFilters={() => {}}
                />
            </div>

            {/* Folders grid */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="p-4">
                    {folders.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {folders.map((folder: any) => (
                                <div key={folder.id} className="relative group">
                                    <div
                                        className="flex flex-col items-center justify-center p-4 pt-6 pb-5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer transition-all duration-150 select-none min-h-[130px]"
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = color;
                                            e.currentTarget.style.backgroundColor = `${color}14`;
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = '';
                                            e.currentTarget.style.backgroundColor = '';
                                        }}
                                        onClick={() => hasPermission(permissions, 'view-documents') ? router.get(route('documents.folder', folder.id)) : toast.error(t('Permission denied.'))}
                                    >
                                        <Folder className="h-14 w-14 mb-3" style={{ color }} strokeWidth={1.8} />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 text-center leading-snug line-clamp-2 w-full">{folder.name}</span>
                                    </div>

                                    {/* Three-dot menu */}
                                    <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                                        {(hasPermission(permissions, 'edit-document-folders') || hasPermission(permissions, 'delete-document-folders')) ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-transparent hover:bg-transparent shadow-none border-none">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-24 z-50">
                                                    {hasPermission(permissions, 'edit-document-folders') && (
                                                        <DropdownMenuItem onClick={() => { setCurrentFolder(folder); setFolderFormMode('edit'); setIsFolderModalOpen(true); }}>
                                                            <Edit className="h-4 w-4 mr-2" />{t('Edit')}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {hasPermission(permissions, 'edit-document-folders') && hasPermission(permissions, 'delete-document-folders') && (
                                                        <DropdownMenuSeparator />
                                                    )}
                                                    {hasPermission(permissions, 'delete-document-folders') && (
                                                        <DropdownMenuItem className="text-red-600" onClick={() => { setCurrentFolder(folder); setIsFolderDeleteModalOpen(true); }}>
                                                            <Trash2 className="h-4 w-4 mr-2" />{t('Delete')}
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <Button variant="ghost" size="sm" className="p-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-transparent hover:bg-transparent shadow-none border-none"
                                                onClick={() => toast.error(t('Permission denied.'))}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                <Folder className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                                {searchTerm ? t('No folders match your search') : t('No folders yet')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {searchTerm ? t('Try a different search term.') : t('Create a folder to start organizing your documents.')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <Pagination
                    from={rootFolders?.from || 0}
                    to={rootFolders?.to || 0}
                    total={rootFolders?.total || 0}
                    links={rootFolders?.links || []}
                    entityName={t('documents')}
                    onPageChange={(url) => router.get(url)}
                    perPageOptions={[24, 48, 96]}
                    currentPerPage={pageFilters.per_page?.toString() || '24'}
                    onPerPageChange={(value) => {
                        router.get(route('documents.index'), {
                            search: searchTerm || undefined,
                            page: 1,
                            ...(parseInt(value) !== 24 && { per_page: parseInt(value) }),
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            {/* Create/Edit Folder Modal */}
            <CrudFormModal
                isOpen={isFolderModalOpen}
                onClose={() => setIsFolderModalOpen(false)}
                onSubmit={handleFolderFormSubmit}
                formConfig={{ fields: folderFormFields, modalSize: 'md' }}
                initialData={currentFolder ? {
                    ...currentFolder,
                    parent_folder_id: currentFolder.parent_folder_id ? String(currentFolder.parent_folder_id) : 'null'
                } : { parent_folder_id: 'null' }}
                title={folderFormMode === 'create' ? t('Create Folder') : t('Edit Folder')}
                mode={folderFormMode}
            />

            {/* Delete Folder Modal */}
            <CrudDeleteModal
                isOpen={isFolderDeleteModalOpen}
                onClose={() => setIsFolderDeleteModalOpen(false)}
                onConfirm={handleFolderDeleteConfirm}
                itemName={currentFolder?.name || ''}
                entityName={t('folder')}
            />
        </PageTemplate>
    );
}
