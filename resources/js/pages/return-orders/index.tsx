import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { Plus, Download, FileDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';

export default function ReturnOrders() {
  const { t } = useTranslation();
  const getInitials = useInitials();
  const { auth, returnOrders, allUsers = [], filters: pageFilters = {}, flash = {} } = usePage().props as any;
  const permissions = auth?.permissions || [];

    useEffect(() => {
        if (flash?.error) toast.error(flash.error);
        else if (flash?.success) toast.success(flash.success);
    }, [flash]);

  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
  const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  const hasActiveFilters = () => {
    return searchTerm !== '' || selectedStatus !== 'all' || selectedAssignee !== 'all';
  };

  const activeFilterCount = () => {
    return (searchTerm ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    router.get(route('return-orders.index'), {
      page: 1,
      search: searchTerm || undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
      sort_field: pageFilters.sort_field || undefined,
      sort_direction: pageFilters.sort_direction || undefined,
      ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    router.get(route('return-orders.index'), {
      page: 1,
      search: searchTerm || undefined,
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
        router.get(route('return-orders.show', item.id));
        break;
      case 'edit':
        router.get(route('return-orders.edit', item.id));
        break;
      case 'delete':
        setIsDeleteModalOpen(true);
        break;
    }
  };

  const handleAddNew = () => {
    router.get(route('return-orders.create'));
      
  };

  const handleDeleteConfirm = () => {
    toast.loading(t('Deleting return order...'));
router.delete(route('return-orders.destroy', currentItem.id), {
  onSuccess: () => {
    setIsDeleteModalOpen(false);
    toast.dismiss();
  },
  onError: (errors) => {
    toast.dismiss();
    toast.error(
      t('Failed to delete: {{errors}}', {
        errors: Object.values(errors).join(', ')
      })
    );
  }
});
  };

  const pageInitialState = useState(true);
  useEffect(() => {
      if (pageInitialState[0]) { pageInitialState[1](false); return; }
      applyFilters();
  }, [searchTerm, selectedStatus, selectedAssignee]);

  const handleResetFilters = () => {

    router.get(route('return-orders.index'));
  };

  const pageActions = [];

  if (hasPermission(permissions, 'export-return-orders')) {
    pageActions.push({
      label: t('Export'),
      icon: <FileDown className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: () => window.location.href = route('return-order.export')
    });
  }

  if (hasPermission(permissions, 'create-return-orders')) {
    pageActions.push({
      label: t('Add Return Order'),
      icon: <Plus className="h-4 w-4 mr-2" />,
      variant: 'default',
      onClick: () => handleAddNew()
    });
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Return Orders') }
  ];

  const columns = [
    {
      key: 'return_number',
      label: t('Return Number'),
      sortable: true,
      className: 'whitespace-nowrap',
      render: (value: string, item: any) => (
        <Link href={route('return-orders.show', item.id)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors duration-200 border border-blue-200 cursor-pointer whitespace-nowrap" style={{ color: '#1d4ed8' }} onMouseEnter={e => (e.currentTarget.style.color = '#1d4ed8')} onMouseLeave={e => (e.currentTarget.style.color = '#1d4ed8')}>{value}</Link>
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
      key: 'sales_order',
      label: t('Sales Order'),
      className: 'whitespace-nowrap',
      render: (value: any) => <span className="whitespace-nowrap">{value?.order_number || t('-')}</span>
    },
    {
      key: 'status',
      label: t('Status'),
      className: 'whitespace-nowrap',
      render: (value: string) => {
        const statusColors = {
          pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
          approved: 'bg-blue-50 text-blue-700 ring-blue-600/20',
          shipped: 'bg-purple-50 text-purple-700 ring-purple-600/20',
          received: 'bg-green-50 text-green-700 ring-green-600/20',
          processed: 'bg-green-50 text-green-700 ring-green-600/20',
          cancelled: 'bg-red-50 text-red-700 ring-red-600/20'
        };
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${statusColors[value as keyof typeof statusColors] || statusColors.pending}`}>
            {t(value?.charAt(0).toUpperCase() + value?.slice(1)) || t('Pending')}
          </span>
        );
      }
    },
    {
      key: 'total_amount',
      label: t('Total Amount'),
      className: 'whitespace-nowrap',
      render: (value: any) => <span className="whitespace-nowrap font-mono">{window.appSettings?.formatCurrency(Number(value || 0)) || `$${Number(value || 0).toFixed(2)}`}</span>
    },
    {
      key: 'return_date',
      label: t('Return Date'),
      sortable: true,
      className: 'whitespace-nowrap',
      type: 'date'
    }
  ];

  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500',
      requiredPermission: 'view-return-orders'
    },
    {
      label: t('Edit'),
      icon: 'Edit',
      action: 'edit',
      className: 'text-amber-500',
      requiredPermission: 'edit-return-orders'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500',
      requiredPermission: 'delete-return-orders'
    }
  ];

  const statusOptions = [
    { value: 'all', label: t('All Status') },
    { value: 'pending', label: t('Pending') },
    { value: 'approved', label: t('Approved') },
    { value: 'shipped', label: t('Shipped') },
    { value: 'received', label: t('Received') },
    { value: 'processed', label: t('Processed') },
    { value: 'cancelled', label: t('Cancelled') },
  ];

  return (
    <PageTemplate
      title={t("Return Orders")}
      description={t("Manage your return orders.")}
      url="/return-orders"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
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
              name: 'assigned_to',
              label: t('Assigned To'),
              type: 'select',
              searchable: true,
              value: selectedAssignee,
              onChange: setSelectedAssignee,
              options: [
                { value: 'all', label: t('All Users') },
                ...allUsers.map((user: any) => ({ value: user.id.toString(), label: user.name }))
              ]
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
          data={returnOrders?.data || []}
          from={returnOrders?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'view-return-orders',
            create: 'create-return-orders',
            edit: 'edit-return-orders',
            delete: 'delete-return-orders'
          }}
        />
        </div>

        <Pagination
          from={returnOrders?.from || 0}
          to={returnOrders?.to || 0}
          total={returnOrders?.total || 0}
          links={returnOrders?.links}
          entityName={t("return orders")}
          onPageChange={(url) => router.get(url)}
          currentPerPage={pageFilters.per_page?.toString() || "10"}
          onPerPageChange={(value) => {
            router.get(route('return-orders.index'), {
              page: 1,
              search: searchTerm || undefined,
              status: selectedStatus !== 'all' ? selectedStatus : undefined,
              assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
            }, { preserveState: true, preserveScroll: true });
          }}
        />
      </div>

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentItem?.name || ''}
        entityName={t('return order')}
      />
    </PageTemplate>
  );
}
