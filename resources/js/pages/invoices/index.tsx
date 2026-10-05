import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { Plus, Eye, Edit, Trash2, Download, FileDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { hasPermission } from '@/utils/authorization';
import { CrudTable } from '@/components/CrudTable';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudFormModal } from '@/components/CrudFormModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Pagination } from '@/components/ui/pagination';
import { SearchAndFilterBar } from '@/components/ui/search-and-filter-bar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle } from 'lucide-react';
import { Calendar } from 'lucide-react';
import { capitalize, getDisplayUrl } from '@/utils/helper';

export default function Invoices() {
    const { t } = useTranslation();
    const getInitials = useInitials();
    const { flash } = usePage().props as any;

    useEffect(() => {
        if (flash?.success) toast.success(t(flash.success));
        else if (flash?.error) toast.error(t(flash.error));
        else if (flash?.warning) toast.warning ? toast.warning(t(flash.warning)) : toast.error(t(flash.warning));
    }, [flash]);

    const { auth, invoices, accounts, allAccounts, contacts, salesOrders, quotes, opportunities, products, availableSalesOrders, users = [], allUsers = [], filters: pageFilters = {}, publicUrlBase, encryptedInvoiceIds, pendingPayments = [] } = usePage().props as any;
    const permissions = auth?.permissions || [];

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [selectedAccount, setSelectedAccount] = useState(pageFilters.account_id || 'all');
    const [selectedAssignee, setSelectedAssignee] = useState(pageFilters.assigned_to || 'all');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [currentPayment, setCurrentPayment] = useState<any>(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const [showReminderHistoryModal, setShowReminderHistoryModal] = useState(false);
    const [reminderHistory, setReminderHistory] = useState<any[]>([]);



    const hasActiveFilters = () => {
        return searchTerm !== '' || selectedStatus !== 'all' || selectedAccount !== 'all' || selectedAssignee !== 'all';
    };

    const activeFilterCount = () => {
        return (searchTerm ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0) + (selectedAccount !== 'all' ? 1 : 0) + (selectedAssignee !== 'all' ? 1 : 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        router.get(route('invoices.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
            sort_field: pageFilters.sort_field || undefined,
            sort_direction: pageFilters.sort_direction || undefined,
            ...(parseInt(pageFilters.per_page) !== 10 && pageFilters.per_page && { per_page: pageFilters.per_page }),
        }, { preserveState: true, preserveScroll: true });
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        router.get(route('invoices.index'), {
            page: 1,
            search: searchTerm || undefined,
            status: selectedStatus !== 'all' ? selectedStatus : undefined,
            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
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
                router.get(route('invoices.show', item.id));
                break;
            case 'edit':
                router.visit(route('invoices.edit', item.id));
                break;
            case 'delete':
                setIsDeleteModalOpen(true);
                break;
            case 'toggle-status':
                setIsStatusModalOpen(true);
                break;

            case 'copy-link':
                handleCopyInvoiceLink(item);
                break;
            case 'send-reminder':
                handleSendReminder(item, 'email');
                break;
            case 'reminder-history':
                handleReminderHistory(item);
                break;
        }
    };

    const handleAddNew = () => {
        router.visit(route('invoices.create'));
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting invoice...'));

        router.delete(route('invoices.destroy', currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
            },
            onError: (errors) => {
                toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(`Failed to delete invoice: ${Object.values(errors).join(', ')}`);
                }
            }
        });
    };

    const handleStatusChange = (formData: any) => {
        router.put(route('invoices.toggle-status', currentItem.id), formData, {
            onSuccess: () => {
                setIsStatusModalOpen(false);
            },
            onError: (errors) => {
                toast.error(t('Failed to update: {{errors}}', { errors: Object.values(errors).join(', ') }));
            }
        });
    };

    const handleToggleStatus = (invoice: any) => {
        const newStatus = invoice.status === 'draft' ? 'sent' : 'draft';
        toast.loading(`${newStatus === 'sent' ? t('Sending') : t('Setting to draft')} invoice...`);

        router.put(route('invoices.toggle-status', invoice.id), {}, {
            onSuccess: (page) => {
                toast.dismiss();
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                }
            },
            onError: (errors) => {
                toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(`Failed to update status: ${Object.values(errors).join(', ')}`);
                }
            }
        });
    };

    const handleCopyInvoiceLink = (invoice: any) => {
        const baseUrl = publicUrlBase?.endsWith('/') ? publicUrlBase.slice(0, -1) : publicUrlBase;
        const encryptedId = encryptedInvoiceIds[invoice.id];
        const invoiceUrl = `${baseUrl}/invoices/public/${encryptedId}`;
        navigator.clipboard.writeText(invoiceUrl).then(() => {
            toast.success(t('Invoice link copied to clipboard!'));
        }).catch(() => {
            toast.error(t('Failed to copy invoice link'));
        });
    };

    const handleSendReminder = (invoice: any, type: string) => {
        toast.loading(t('Sending payment reminder...'));

        router.post(route('invoices.send-reminder', invoice.id), { type }, {
            onSuccess: () => {
                toast.dismiss();
            },
            onError: (errors) => {
                toast.dismiss();
                if (typeof errors === 'string') {
                    toast.error(errors);
                } else {
                    toast.error(`Failed to send reminder: ${Object.values(errors).join(', ')}`);
                }
            }
        });
    };

    const handleReminderHistory = async (invoice: any) => {
        try {
            const response = await fetch(route('invoices.reminder-history', invoice.id));
            const data = await response.json();
            setReminderHistory(data.reminders || []);
            setShowReminderHistoryModal(true);
        } catch (error) {
            toast.error(t('Failed to load reminder history'));
        }
    };

    const handleApprovePayment = async (payment: any) => {
        toast.loading(t('Approving payment...'));
        try {
            const response = await fetch(route('invoice-payments.approve', payment.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });
            const data = await response.json();
            toast.dismiss();
            if (data.success) {
                if (data.message) {
                    toast.success(t(data.message));
                } else {
                    toast.success(t('Payment approved successfully'));
                }
                router.reload({ only: ['pendingPayments', 'invoices'] });
            } else {
                if (data.message) {
                    toast.error(t(data.message));
                } else {
                    toast.error(t('Failed to approve payment'));
                }
            }
        } catch (error) {
            toast.dismiss();
            toast.error(t('Failed to approve payment'));
        }
    };

    const handleRejectPayment = (payment: any) => {
        setCurrentPayment(payment);
        setShowRejectModal(true);
    };

    const handleRejectConfirm = async () => {
        toast.loading(t('Rejecting payment...'));
        try {
            const response = await fetch(route('invoice-payments.reject', currentPayment.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ notes: rejectNotes })
            });
            const data = await response.json();
            toast.dismiss();
            if (data.success) {
                if (data.message) {
                    toast.success(t(data.message));
                } else {
                    toast.success(t('Payment rejected successfully'));
                }
                setShowRejectModal(false);
                setRejectNotes('');
                router.reload({ only: ['pendingPayments', 'invoices'] });
            } else {
                if (data.message) {
                    toast.error(t(data.message));
                } else {
                    toast.error(t('Failed to reject payment'));
                }
            }
        } catch (error) {
            toast.dismiss();
            toast.error(t('Failed to reject payment'));
        }
    };





    const pageInitialState = useState(true);
    useEffect(() => {
        if (pageInitialState[0]) { pageInitialState[1](false); return; }
        applyFilters();
    }, [searchTerm, selectedStatus, selectedAccount, selectedAssignee]);

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        setSelectedAccount('all');
        setSelectedAssignee('all');
        router.get(route('invoices.index'));
    };

    const pageActions = [];

    // Add export button
    if (hasPermission(permissions, 'export-invoices')) {
        pageActions.push({
            label: t('Export'),
            icon: <FileDown className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => window.location.href = route('invoice.export')
        });
    }

    if (hasPermission(permissions, 'create-invoices')) {
        pageActions.push({
            label: t('Add Invoice'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => handleAddNew()
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Invoices') }
    ];

    const columns = [
        {
            key: 'invoice_number',
            label: t('Invoice Number'),
            sortable: true,
            className: 'whitespace-nowrap',
            render: (value: string, item: any) => (
                <Link href={route('invoices.show', item.id)} className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-colors duration-200 border border-blue-200 cursor-pointer whitespace-nowrap" style={{ color: '#1d4ed8' }} onMouseEnter={e => (e.currentTarget.style.color = '#1d4ed8')} onMouseLeave={e => (e.currentTarget.style.color = '#1d4ed8')}>{value}</Link>
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
            key: 'total_amount',
            label: t('Total Amount'),
            className: 'whitespace-nowrap',
            render: (value: any) => <span className="whitespace-nowrap font-mono">{window.appSettings?.formatCurrency(Number(value || 0)) || `$${Number(value || 0).toFixed(2)}`}</span>
        },
        {
            key: 'status',
            label: t('Status'),
            className: 'whitespace-nowrap',
            render: (value: string) => {
                const statusColors = {
                    draft: 'bg-gray-50 text-gray-700 ring-gray-600/20',
                    sent: 'bg-blue-50 text-blue-700 ring-blue-600/20',
                    pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
                    paid: 'bg-green-50 text-green-700 ring-green-600/20',
                    partially_paid: 'bg-orange-50 text-orange-700 ring-orange-600/20',
                    overdue: 'bg-red-50 text-red-700 ring-red-600/20',
                    cancelled: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                };
                const getStatusLabel = (status: string) => {
                    switch (status) {
                        case 'draft': return t('Draft');
                        case 'sent': return t('Sent');
                        case 'pending': return t('Pending');
                        case 'paid': return t('Paid');
                        case 'partially_paid': return t('Partially Paid');
                        case 'overdue': return t('Overdue');
                        case 'cancelled': return t('Cancelled');
                        default: return t('Draft');
                    }
                };
                return (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${statusColors[value as keyof typeof statusColors] || statusColors.draft}`}>
                        {getStatusLabel(value)}
                    </span>
                );
            }
        },
        // {
        //     key: 'due_date',
        //     label: t('Due Date'),
        //     sortable: true,
        //     className: 'whitespace-nowrap',
        //     render: (value: string, item: any) => (
        //         <span className={`whitespace-nowrap ${item.status === 'overdue' ? 'text-red-600' : ''}`}>
        //             {window.appSettings?.formatDateTime(value, false) || '-'}
        //         </span>
        //     )
        // }
        {
    key: 'due_date',
    label: t('Due Date'),
    sortable: true,
    className: 'whitespace-nowrap',
    render: (value: string, item: any) => (
        <span className={`flex items-center gap-2 whitespace-nowrap ${
            item.status === 'overdue' ? 'text-red-600' : 'text-gray-500'
        }`}>
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{window.appSettings?.formatDateTime(value, false) || '-'}</span>
        </span>
    )
}
    ];

    const actions = [
        {
            label: t('Send Reminder'),
            icon: 'Mail',
            action: 'send-reminder',
            className: 'text-purple-500',
            requiredPermission: 'send-reminder-invoices',
            condition: (item: any) => ['pending', 'overdue', 'partially_paid'].includes(item.status)
        },
        // {
        //     label: t('Reminder History'),
        //     icon: 'History',
        //     action: 'reminder-history',
        //     className: 'text-indigo-500',
        //     requiredPermission: 'view-invoices'
        // },
        {
            label: t('Copy Invoice Link'),
            icon: 'Copy',
            action: 'copy-link',
            className: 'text-purple-500',
            requiredPermission: 'view-invoices'
        },
        {
            label: t('Change Status'),
            icon: 'RefreshCw',
            action: 'toggle-status',
            className: 'text-amber-500',
            requiredPermission: 'toggle-status-invoices'
        },
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500',
            requiredPermission: 'view-invoices'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500',
            requiredPermission: 'edit-invoices'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500',
            requiredPermission: 'delete-invoices'
        }
    ];

    const statusOptions = [
        { value: 'all', label: t('All Statuses') },
        { value: 'draft', label: t('Draft') },
        { value: 'sent', label: t('Sent') },
        { value: 'pending', label: t('Pending') },
        { value: 'paid', label: t('Paid') },
        { value: 'partially_paid', label: t('Partially Paid') },
        { value: 'overdue', label: t('Overdue') },
        { value: 'cancelled', label: t('Cancelled') }
    ];

    return (
        <PageTemplate
            title={t("Invoices")}
            description={t("Manage your invoices.")}
            url="/invoices"
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
                            name: 'account_id',
                            label: t('Account'),
                            type: 'select',
                            searchable: true,
                            value: selectedAccount,
                            onChange: setSelectedAccount,
                            options: [
                                { value: 'all', label: t('All Accounts') },
                                ...allAccounts?.map((acc: any) => ({ value: acc.id.toString(), label: acc.name })) || []
                            ]
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
                                ...allUsers.map((user: any) => ({ value: user.id.toString(), label: user.name }))
                            ]
                        }
                    ]}
                    hasActiveFilters={hasActiveFilters}
                    activeFilterCount={activeFilterCount}
                    onResetFilters={handleResetFilters}
                />
            </div>

            {/* Pending Invoice Payments Section */}
            {pendingPayments.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('Pending Invoice Payments')}</h3>
                    <div className="space-y-3">
                        {pendingPayments.map((payment: any) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-4">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                Invoice #{payment.invoice.invoice_number}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {payment.payment_method === 'bank' ? t('Bank Transfer') : payment.payment_method} -
                                                <span className="font-mono">{window.appSettings?.formatCurrency(Number(payment.amount)) || `$${Number(payment.amount).toFixed(2)}`}</span> ({payment.payment_type})
                                            </p>
                                            {payment.receipt_path && (
                                                <a href={getDisplayUrl(payment.receipt_path)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                                                    {t('View Receipt')}
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {t('Requested')}: {window.appSettings?.formatDateTime(payment.created_at, false) || new Date(payment.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600 border-green-600 hover:bg-green-50"
                                        onClick={() => handleApprovePayment(payment)}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        {t('Approve')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600 border-red-600 hover:bg-red-50"
                                        onClick={() => handleRejectPayment(payment)}
                                    >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        {t('Reject')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={invoices?.data || []}
                    from={invoices?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={permissions}
                    entityPermissions={{
                        view: 'view-invoices',
                        create: 'create-invoices',
                        edit: 'edit-invoices',
                        delete: 'delete-invoices'
                    }}
                />
                </div>

                <Pagination
                    from={invoices?.from || 0}
                    to={invoices?.to || 0}
                    total={invoices?.total || 0}
                    links={invoices?.links}
                    entityName={t("invoices")}
                    onPageChange={(url) => router.get(url)}
                    currentPerPage={pageFilters.per_page?.toString() || "10"}
                    onPerPageChange={(value) => {
                        router.get(route('invoices.index'), {
                            page: 1,
                            search: searchTerm || undefined,
                            status: selectedStatus !== 'all' ? selectedStatus : undefined,
                            account_id: selectedAccount !== 'all' ? selectedAccount : undefined,
                            assigned_to: selectedAssignee !== 'all' ? selectedAssignee : undefined,
                            sort_field: pageFilters.sort_field || undefined,
                            sort_direction: pageFilters.sort_direction || undefined,
                            ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
                        }, { preserveState: true, preserveScroll: true });
                    }}
                />
            </div>


            <CrudFormModal
                isOpen={isStatusModalOpen}
                onClose={() => setIsStatusModalOpen(false)}
                onSubmit={handleStatusChange}
                formConfig={{
                    fields: [
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            required: true,
                            options: [
                                { value: 'draft', label: t('Draft') },
                                { value: 'sent', label: t('Sent') },
                                { value: 'pending', label: t('Pending') },
                                { value: 'paid', label: t('Paid') },
                                { value: 'partially_paid', label: t('Partially Paid') },
                                { value: 'overdue', label: t('Overdue') },
                                { value: 'cancelled', label: t('Cancelled') }
                            ]
                        }
                    ],
                    modalSize: 'sm'
                }}
                initialData={currentItem ? { status: currentItem.status } : null}
                title={t('Change Invoice Status')}
                mode='edit'
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('invoice')}
            />

            {/* Reject Payment Modal */}
            <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Reject Payment')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            {t('Are you sure you want to reject this payment for Invoice #{{invoiceNumber}}?', { invoiceNumber: currentPayment?.invoice?.invoice_number })}
                        </p>
                        <div>
                            <Label htmlFor="reject-notes">{t('Rejection Notes (Optional)')}</Label>
                            <Textarea
                                id="reject-notes"
                                value={rejectNotes}
                                onChange={(e) => setRejectNotes(e.target.value)}
                                placeholder={t('Enter reason for rejection...')}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button variant="destructive" onClick={handleRejectConfirm}>
                                {t('Reject Payment')}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Reminder History Modal */}
            <Dialog open={showReminderHistoryModal} onOpenChange={setShowReminderHistoryModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t('Invoice Payment Reminder History')}</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 overflow-y-auto flex-1">
                        {reminderHistory.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">{t('No reminders sent yet')}</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">{t('Sent At')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">{t('Type')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">{t('Sent By')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {reminderHistory.map((reminder: any, index: number) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {window.appSettings?.formatDateTime(reminder.created_at, false) || new Date(reminder.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-purple-50 text-purple-700 ring-purple-600/20">
                                                        {capitalize(reminder.type)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reminder.sent_by?.name || t('-')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </PageTemplate>
    );
}
