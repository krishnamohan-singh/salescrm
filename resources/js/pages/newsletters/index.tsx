import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { router, usePage } from '@inertiajs/react';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { Mail, Calendar } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';

export default function NewslettersIndex() {
    const { t } = useTranslation();
    const { newsletters, filters: pageFilters = {} } = usePage().props as any;

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentNewsletter, setCurrentNewsletter] = useState<any>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('newsletters.index'), {
            page: 1,
            search: searchTerm || undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page })
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('newsletters.index'), {
            page: 1,
            search: searchTerm || undefined,
            sort_field: field,
            sort_direction: direction,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page })
        }, { preserveState: true, preserveScroll: true });
    };

    const pageInitialState = useState(true);
    useEffect(() => {
        if (pageInitialState[0]) { pageInitialState[1](false); return; }
        applyFilters();
    }, [searchTerm]);

    const handleResetFilters = () => {
        setSearchTerm('');
        router.get(route('newsletters.index'));
    };

    const handleAction = (action: string, item: any) => {
        if (action === 'delete') {
            setCurrentNewsletter(item);
            setIsDeleteModalOpen(true);
        }
    };

    const handleDeleteConfirm = () => {
        router.delete(route('newsletters.destroy', currentNewsletter.id), {
            onSuccess: () => {
                toast.success(t('Newsletter subscription deleted successfully'));
                setIsDeleteModalOpen(false);
            },
            onError: () => {
                toast.error(t('Failed to delete newsletter subscription'));
                setIsDeleteModalOpen(false);
            }
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Landing Page'), href: route('landing-page') },
        { title: t('Newsletters') }
    ];

    const columns = [
        {
            key: 'email',
            label: t('Email'),
            sortable: true
        },
        {
            key: 'created_at',
            label: t('Subscribed At'),
            sortable: true,
            render: (value: string) => (
                <div className="flex items-center gap-1.5 text-gray-500 whitespace-nowrap">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{window.appSettings?.formatDateTime(value, false) || '-'}</span>
                </div>
            )
        }
    ];

    const actions = [
        { label: t('Delete'), icon: 'Trash2', action: 'delete', className: 'text-red-500' }
    ];

    return (
        <PageTemplate
            title={t('Newsletters')}
            description={t('Manage your newsletter subscriptions.')}
            url="/newsletters"
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
                <SearchAndFilterBar
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    onSearch={handleSearch}
                    filters={[]}
                    hasActiveFilters={() => searchTerm !== ''}
                    activeFilterCount={() => searchTerm ? 1 : 0}
                    onResetFilters={handleResetFilters}
                />
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={newsletters?.data || []}
                    from={newsletters?.from || 1}
                    onAction={handleAction}
                    onSort={handleSort}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    permissions={[]}
                    entityPermissions={{ view: '', create: '', edit: '', delete: '' }}
                />

                <Pagination
                    from={newsletters?.from || 0}
                    to={newsletters?.to || 0}
                    total={newsletters?.total || 0}
                    links={newsletters?.links}
                    entityName={t('subscriptions')}
                    onPageChange={(url) => router.get(url)}
                    currentPerPage={pageFilters.per_page?.toString() || '10'}
                    onPerPageChange={(value) => {
                        router.get(route('newsletters.index'), {
                            page: 1,
                            search: searchTerm || undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) })
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentNewsletter?.email || ''}
                entityName="newsletter subscription"
            />
        </PageTemplate>
    );
}
