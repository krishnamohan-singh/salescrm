import React, { useEffect, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Plus, Calendar } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/toaster';

interface CustomPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  is_active: boolean;
  sort_order: number;
}

interface PageProps {
  pages: any;
  flash?: {
    success?: string;
    error?: string;
  };
  filters?: any;
  globalSettings?: any;
}

export default function CustomPagesIndex() {
  const { t } = useTranslation();
  const { pages, filters: pageFilters = {}, globalSettings } = usePage<PageProps>().props;
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPage, setDeletingPage] = useState<CustomPage | null>(null);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = () => searchTerm !== '';
  const activeFilterCount = () => searchTerm ? 1 : 0;

  const [pageInitialState, setPageInitialState] = useState(true);

    useEffect(() => {
        if (!pageInitialState) applyFilters();
        setPageInitialState(false);
    }, [searchTerm]);

  const applyFilters = () => {
    router.get(route('landing-page.custom-pages.index'), {
      page: 1,
      search: searchTerm || undefined,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleResetFilters = () => {
    router.get(route('landing-page.custom-pages.index'));
  };

  const handleEdit = (page: CustomPage) => {
    router.get(route('landing-page.custom-pages.edit', page.id));
  };

  const handleDelete = (page: CustomPage) => {
    setDeletingPage(page);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!globalSettings?.is_demo) {
      toast.loading(t('Deleting page...'));
    }

    router.delete(route('landing-page.custom-pages.destroy', deletingPage.id), {
      onSuccess: (page) => {
        setIsDeleteModalOpen(false);
        setDeletingPage(null);
        if (!globalSettings?.is_demo) {
          toast.dismiss();
        }
        if (page.props.flash?.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash?.error) {
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
          toast.error(t('Failed to delete page'));
        }
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const handleAction = (action: string, item: CustomPage) => {
    if (action === 'edit') {
      handleEdit(item);
    } else if (action === 'delete') {
      handleDelete(item);
    }
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'desc' ? 'asc' : 'desc';
    router.get(route('landing-page.custom-pages.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (value: string) => <div className="font-medium">{value}</div>
    },
    {
      key: 'content',
      label: 'Content',
      render: (value: string) => {
        const plainText = value.replace(/<[^>]*>/g, '');
        return <div className="max-w-xs truncate" title={plainText}>{plainText.substring(0, 100)}...</div>;
      }
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value: boolean) => {
        const statusClass = value
          ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
          : 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${statusClass}`}>
            {value ? 'Active' : 'Inactive'}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: string) => (
        <div className="flex items-center gap-1.5 text-gray-500 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{window.appSettings?.formatDateTime(value, false) || new Date(value).toLocaleDateString()}</span>
        </div>
      )
    }
  ];

  const actions = [
    {
      label: 'Edit',
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500'
    },
    {
      label: 'Delete',
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500'
    }
  ];

  return (
    <PageTemplate
      title="Custom Pages"
      description={t('Manage your custom pages and their content.')}
      url="/custom-pages"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Landing Page'), href: route('landing-page') },
        { title: t('Custom Pages') }
      ]}
      actions={[
        {
          label: 'Add Page',
          icon: <Plus className="w-4 h-4 mr-2" />,
          variant: 'default',
          onClick: () => router.get(route('landing-page.custom-pages.create'))
        }
      ]}
      noPadding
    >
     <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <SearchAndFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearch={handleSearch}
          filters={[]}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          onResetFilters={handleResetFilters}

        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={pages?.data || pages || []}
          from={pages?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
        />

        {pages?.links && (
          <Pagination
            from={pages?.from || 0}
            to={pages?.to || 0}
            total={pages?.total || 0}
            links={pages?.links}
            entityName="pages"
            onPageChange={(url) => router.get(url)}
            currentPerPage={pageFilters.per_page?.toString() || "10"}
            onPerPageChange={(value) => {
              router.get(route('landing-page.custom-pages.index'), {
                page: 1,
                per_page: parseInt(value) !== 10 ? parseInt(value) : undefined,
                search: searchTerm || undefined,
                ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
              }, { preserveState: true, preserveScroll: true });
            }}
          />
        )}
      </div>

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingPage(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={deletingPage?.title || ''}
        entityName="page"
      />

      <Toaster />
    </PageTemplate>
  );
}
