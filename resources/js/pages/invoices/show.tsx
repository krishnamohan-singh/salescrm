import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, Calendar, Clock, DollarSign, Package, User, FileText, Plus, Bell,Trash2, Send, Edit, Check, X, Eye, MessageCircle, ShoppingCart, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatRelativeTime, getDisplayUrl } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';

export default function InvoiceShow() {
    const { t } = useTranslation();
    const { invoice, streamItems, pendingPayments, invoiceReminders, availableSalesOrders, auth, flash } = usePage().props as any;
    const isCompany = auth?.user?.type === 'company';
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();
    const [isAssignSalesOrderModalOpen, setIsAssignSalesOrderModalOpen] = useState(false);
    const [selectedSalesOrderId, setSelectedSalesOrderId] = useState('empty');
    const [showStream, setShowStream] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
    const [currentActivity, setCurrentActivity] = useState<any>(null);
    const [isRejectPaymentModalOpen, setIsRejectPaymentModalOpen] = useState(false);
    const [currentPayment, setCurrentPayment] = useState<any>(null);
    const [newComment, setNewComment] = useState('');
    const [editingComment, setEditingComment] = useState<number | null>(null);
    const [editCommentText, setEditCommentText] = useState('');

    const [reminderHistory, setReminderHistory] = useState<any[]>([]);
    useEffect(() => {
        fetch(route('invoices.reminder-history', invoice.id))
            .then(r => r.json())
            .then(data => setReminderHistory(data.reminders || []))
            .catch(() => {});
    }, [invoice.id]);

    useEffect(() => {
        const main = document.querySelector('main[data-slot="sidebar-inset"]') as HTMLElement | null;
        if (main) main.style.overflowX = 'visible';
        return () => { if (main) main.style.overflowX = ''; };
    }, []);

    // Calculate paid amount from completed payments
    const paidAmount = invoice.payments?.reduce((total: number, payment: any) => {
        const amount = parseFloat(payment.amount) || 0;
        return payment.status === 'completed' ? total + amount : total;
    }, 0) || 0;

    // Calculate due amount
    const dueAmount = Math.max(0, (parseFloat(invoice.total_amount) || 0) - paidAmount);

    const handleRejectPaymentConfirm = (reason: string) => {
        router.post(route('invoice.payments.reject', currentPayment.payment_id), { reason }, {
            preserveScroll: true,
            onSuccess: (page) => {
                setIsRejectPaymentModalOpen(false);
                setCurrentPayment(null);
                if (page.props.flash.success) {
                    toast.success(t(page.props.flash.success));
                } else if (page.props.flash.error) {
                    toast.error(t(page.props.flash.error));
                } else {
                    toast.success(t('Payment rejected successfully'));
                }
            },
            onError: (errors) => {
                toast.error(typeof errors === 'string' ? errors : t('Failed to reject payment'));
            }
        });
    };

    const handleAssignSalesOrder = (formData?: any) => {
        const salesOrderId = formData?.sales_order_id || selectedSalesOrderId;
        if (!salesOrderId || salesOrderId === 'empty') {
            toast.error(t('Please select a sales order'));
            return;
        }

        toast.loading(t('Assigning sales order...'));

        router.put(route('invoices.add-sales-order', invoice.id), {
            sales_order_id: salesOrderId
        }, {
            onSuccess: (page) => {
                setIsAssignSalesOrderModalOpen(false);
                setSelectedSalesOrderId('empty');
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
                    toast.error(`Failed to assign sales order: ${Object.values(errors).join(', ')}`);
                }
            }
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Invoices'), href: route('invoices.index') },
        { title: t('View Invoice') }
    ];

    const getStatusBadge = (status: string) => {
        const statusColors = {
            draft: 'bg-gray-50 text-gray-600 ring-gray-500/10',
            sent: 'bg-blue-50 text-blue-700 ring-blue-700/10',
            paid: 'bg-green-50 text-green-700 ring-green-600/20',
            partially_paid: 'bg-orange-50 text-orange-800 ring-orange-600/20',
            overdue: 'bg-red-50 text-red-700 ring-red-600/10',
            cancelled: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
        };

        return (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
                {status === 'partially_paid' ? t('Partially Paid') : (status?.charAt(0).toUpperCase() + status?.slice(1) || t('Draft'))}
            </span>
        );
    };

    const formatCurrency = (amount: number) => window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

    const formatDate = (dateString: string) => {
        if (!dateString) return t('-');
        return window.appSettings?.formatDateTime(dateString, false) || new Date(dateString).toLocaleDateString();
    };

    const handleSendReminder = () => {
        toast.loading(t('Sending payment reminder...'));
        router.post(route('invoices.send-reminder', invoice.id), { type: 'email' }, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: (page: any) => {
                toast.dismiss();
                if (page.props.flash?.success) toast.success(t(page.props.flash.success));
                else if (page.props.flash?.error) toast.error(t(page.props.flash.error));
                fetch(route('invoices.reminder-history', invoice.id))
                    .then(r => r.json())
                    .then(data => setReminderHistory(data.reminders || []))
                    .catch(() => {});
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

    const calculateProductTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let totalDiscount = 0;

        invoice.products?.forEach((product: any) => {
            const lineTotal = Number(product.pivot.total_price) || 0;
            const discountAmount = Number(product.pivot.discount_amount) || 0;
            const finalLineTotal = lineTotal - discountAmount;

            subtotal += finalLineTotal;
            totalDiscount += discountAmount;

            if (product.tax) {
                totalTax += (finalLineTotal * Number(product.tax.rate)) / 100;
            }
        });

        return { subtotal, totalTax, totalDiscount, grandTotal: subtotal + totalTax };
    };

    const { subtotal, totalTax, totalDiscount, grandTotal } = calculateProductTotals();

    return (
        <PageTemplate
            title={invoice.invoice_number}
            description={t('Invoice details and related information')}
            breadcrumbs={breadcrumbs}
            noPadding
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.visit(route('invoices.index'))
                },
                ...(!invoice.sales_order ? [{
                    label: t('Assign Sales Order'),
                    icon: <Plus className="h-4 w-4 mr-2" />,
                    variant: 'default',
                    onClick: () => setIsAssignSalesOrderModalOpen(true)
                }] : [])
            ]}
        >
            <div className="flex gap-6 items-start">
            {/* Left Column */}
            <div className="flex-1 min-w-0 space-y-6">
                {/* Hero Card */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b py-3.5 px-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg font-bold">{invoice.name}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{invoice.description || t('No description provided')}</p>
                            </div>
                           
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <p className="text-xs font-semibold text-muted-foreground mb-3">{t('Billing Address')}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-2">
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground">{t('Address')}</p>
                                <p className="text-sm font-medium text-foreground">{invoice.billing_address || t('-')}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground">{t('City')}</p>
                                <p className="text-sm font-medium text-foreground">{invoice.billing_city || t('-')}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground">{t('State')}</p>
                                <p className="text-sm font-medium text-foreground">{invoice.billing_state || t('-')}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground">{t('Postal Code')}</p>
                                <p className="text-sm font-medium text-foreground">{invoice.billing_postal_code || t('-')}</p>
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-medium text-muted-foreground">{t('Country')}</p>
                                <p className="text-sm font-medium text-foreground">{invoice.billing_country || t('-')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

               

                {/* Products */}
                <Card className="shadow-sm overflow-hidden">
                    <CardHeader className="border-b py-3.5 px-5">
                        <CardTitle className="flex items-center text-lg font-semibold">
                            <ShoppingCart className="h-5 w-5 mr-3 text-muted-foreground" />
                            {t('Products')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {invoice.products && invoice.products.length > 0 ? (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#F0F0F1] dark:bg-gray-800 border-b hover:!bg-[#F0F0F1] dark:hover:!bg-gray-800">
                                            <TableHead className="py-2.5 font-semibold">{t('Product')}</TableHead>
                                            <TableHead className="py-2.5 font-semibold text-center">{t('Quantity')}</TableHead>
                                            <TableHead className="py-2.5 font-semibold text-center">{t('Unit Price')}</TableHead>
                                            <TableHead className="py-2.5 font-semibold text-center">{t('Discount')}</TableHead>
                                            <TableHead className="py-2.5 font-semibold text-center">{t('Tax')}</TableHead>
                                            <TableHead className="py-2.5 font-semibold text-right">{t('Total')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invoice.products.map((product: any, index: number) => {
                                            const lineTotal = Number(product.pivot.total_price) || 0;
                                            const discountAmount = Number(product.pivot.discount_amount) || 0;
                                            const finalTotal = lineTotal - discountAmount;
                                            const taxAmount = product.tax ? (finalTotal * Number(product.tax.rate)) / 100 : 0;
                                            return (
                                                <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 border-b">
                                                    <TableCell className="py-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {product.main_image_url ? (
                                                                <a href={product.main_image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                                                    <img src={product.main_image_url} alt={product.name} className="w-11 h-11 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity cursor-pointer" />
                                                                </a>
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                                                                    <Package className="h-4 w-4 text-muted-foreground/40" />
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-foreground truncate">{product.name}</p>
                                                                {product.sku && <p className="text-xs text-muted-foreground mt-0.5">SKU: {product.sku}</p>}
                                                                {product.category?.name && (
                                                                    <span className="mt-1 inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                                                                        {product.category.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        <p className="text-sm font-semibold text-foreground">{product.pivot.quantity}</p>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        <p className="text-sm font-semibold font-mono text-foreground">{formatCurrency(product.pivot.unit_price)}</p>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        {product.pivot.discount_type && product.pivot.discount_type !== 'none' && product.pivot.discount_value > 0 ? (
                                                            <>
                                                                <p className="text-sm font-semibold text-foreground">{product.pivot.discount_type === 'percentage' ? `${Number(product.pivot.discount_value)}%` : <span className="font-mono">{formatCurrency(Number(product.pivot.discount_value))}</span>}</p>
                                                                <p className="text-xs font-mono text-red-500 mt-0.5">-{formatCurrency(discountAmount)}</p>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        {product.tax ? (
                                                            <>
                                                                <p className="text-sm font-semibold text-foreground">{product.tax.name} ({parseFloat(product.tax.rate).toFixed(2)}%)</p>
                                                                <p className="text-xs font-mono text-muted-foreground mt-0.5">{formatCurrency(taxAmount)}</p>
                                                            </>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-right">
                                                        {discountAmount > 0 ? (
                                                            <>
                                                                <p className="text-xs font-mono line-through text-muted-foreground">{formatCurrency(lineTotal)}</p>
                                                                <p className="text-sm font-bold font-mono text-emerald-600">{formatCurrency(finalTotal + taxAmount)}</p>
                                                            </>
                                                        ) : (
                                                            <p className="text-sm font-bold font-mono text-emerald-600">{formatCurrency(lineTotal + taxAmount)}</p>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>

                                <div className="flex flex-col md:flex-row items-start md:items-end justify-end gap-4 px-6 py-5 border-t bg-muted/10">
                                    <div className="w-full max-w-sm border rounded-xl overflow-hidden">
                                        <div className="flex items-center justify-between px-4 py-3 border-b">
                                            <span className="text-sm text-muted-foreground font-medium">{t('Subtotal')}</span>
                                            <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(subtotal + totalDiscount)}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3 border-b">
                                            <span className="text-sm text-muted-foreground font-medium">{t('Discount')}</span>
                                            <span className="text-sm font-semibold font-mono text-red-500">-{formatCurrency(totalDiscount)}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3 border-b">
                                            <span className="text-sm text-muted-foreground font-medium">{t('Total Tax')}</span>
                                            <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(totalTax)}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3 ">
                                            <span className="text-sm font-bold text-foreground">{t('Grand Total')}</span>
                                            <span className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                    <Package className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">{t('No products added to this invoice')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                 {/* Notes + Terms */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Notes')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[150px] overflow-y-auto">
                                <div className="px-5 py-4">
                                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{invoice.notes || t('-')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Terms')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[150px] overflow-y-auto">
                                <div className="px-5 py-4">
                                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{invoice.terms || t('-')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Pending Payments */}
                {pendingPayments && pendingPayments.length > 0 && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <DollarSign className="h-5 w-5 mr-3 text-gray-500" />
                                {t('Pending Payments')} ({pendingPayments.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-[#F0F0F1] dark:bg-gray-800 border-b hover:!bg-[#F0F0F1] dark:hover:!bg-gray-800">
                                        <TableHead className="py-2.5 font-semibold">{t('Date')}</TableHead>
                                        <TableHead className="py-2.5 font-semibold">{t('Method')}</TableHead>
                                        <TableHead className="py-2.5 font-semibold">{t('Type')}</TableHead>
                                        <TableHead className="py-2.5 font-semibold text-right">{t('Amount')}</TableHead>
                                        <TableHead className="py-2.5 font-semibold">{t('Payment ID')}</TableHead>
                                        <TableHead className="py-2.5 font-semibold text-center">{t('Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingPayments.map((payment: any, index: number) => (
                                        <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 border-b">
                                            <TableCell className="py-3">{formatDate(payment.created_at)}</TableCell>
                                            <TableCell className="py-3 capitalize">{payment.payment_method}</TableCell>
                                            <TableCell className="py-3 capitalize">{payment.payment_type}</TableCell>
                                            <TableCell className="py-3 text-right font-semibold font-mono">{formatCurrency(payment.amount)}</TableCell>
                                            <TableCell className="py-3 font-mono text-sm">{payment.payment_id}</TableCell>
                                            <TableCell className="py-3">
                                                <div className="flex justify-center gap-1">
                                                    {payment.receipt_path && (
                                                        <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(getDisplayUrl(payment.receipt_path), '_blank')}>
                                                                        <Eye className="h-4 w-4 text-gray-500" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top"><p>{t('View Receipt')}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    <TooltipProvider delayDuration={200}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => {
                                                                    router.post(route('invoice.payments.approve', payment.payment_id), {}, {
                                                                        preserveScroll: true,
                                                                        onSuccess: (page) => {
                                                                            if (page.props.flash.success) toast.success(t(page.props.flash.success));
                                                                            if (page.props.flash.error) toast.error(t(page.props.flash.error));
                                                                        },
                                                                        onError: () => toast.error(t('Failed to approve payment'))
                                                                    });
                                                                }}>
                                                                    <Check className="h-4 w-4 text-gray-500" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top"><p>{t('Approve')}</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider delayDuration={200}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => { setCurrentPayment(payment); setIsRejectPaymentModalOpen(true); }}>
                                                                    <X className="h-4 w-4 text-gray-500" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top"><p>{t('Reject')}</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Reminder History */}
                {reminderHistory.length > 0 && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <Bell className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Reminder History')} ({reminderHistory.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[287px] overflow-y-auto">
                            <table className="w-full caption-bottom text-sm text-foreground">
                                <thead className="[&_tr]:border-b">
                                    <tr className="bg-[#F0F0F1] dark:bg-gray-800 border-b hover:!bg-[#F0F0F1] dark:hover:!bg-gray-800">
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 text-left font-semibold text-muted-foreground dark:text-gray-300">{t('Sent By')}</th>
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 text-left font-semibold text-muted-foreground dark:text-gray-300">{t('Type')}</th>
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 text-left font-semibold text-muted-foreground dark:text-gray-300">{t('Date')}</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {reminderHistory.map((reminder: any, i: number) => (
                                        <tr key={i} className="border-b transition-colors hover:bg-muted/50 dark:border-gray-700 dark:bg-gray-900">
                                            <td className="py-3 px-4 align-middle text-sm font-medium text-foreground">{reminder.sent_by?.name || t('-')}</td>
                                            <td className="py-3 px-4 align-middle capitalize">
                                                <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400">
                                                    {reminder.type || 'email'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 align-middle">
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                    {window.appSettings?.formatDateTime(reminder.created_at, true) || new Date(reminder.created_at).toLocaleString()}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Payment History */}
                {invoice.payments && invoice.payments.length > 0 && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <DollarSign className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Payment History')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[385px] overflow-y-auto">
                            <table className="w-full caption-bottom text-sm text-foreground">
                                <thead>
                                    <tr className="bg-[#F0F0F1] dark:bg-gray-800 border-b hover:!bg-[#F0F0F1] dark:hover:!bg-gray-800">
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 text-left font-semibold text-muted-foreground dark:text-gray-300 w-[170px]">{t('Date')}</th>
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 text-left font-semibold text-muted-foreground dark:text-gray-300 w-[130px]">{t('Method')}</th>
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 text-left font-semibold text-muted-foreground dark:text-gray-300 w-[110px]">{t('Type')}</th>
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 pr-6 text-right font-semibold text-muted-foreground dark:text-gray-300 w-[140px]">{t('Amount')}</th>
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 pl-6 text-left font-semibold text-muted-foreground dark:text-gray-300 w-[130px]">{t('Status')}</th>
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 text-left font-semibold text-muted-foreground dark:text-gray-300 w-[200px]">{t('Payment ID')}</th>
                                        <th className="sticky top-0 z-10 bg-[#F0F0F1] dark:bg-gray-800 py-2.5 px-4 text-center font-semibold text-muted-foreground dark:text-gray-300 w-[80px]">{t('Receipt')}</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {invoice.payments.map((payment: any, index: number) => (
                                        <tr key={index} className="border-b transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 dark:border-gray-700">
                                            <td className="py-3 px-4 align-middle">
                                                <span className="flex items-center gap-2 whitespace-nowrap text-gray-500">
                                                    <Calendar className="h-4 w-4 shrink-0" />
                                                    <span className="text-sm">{window.appSettings?.formatDateTime(payment.processed_at || payment.created_at, false) || new Date(payment.processed_at || payment.created_at).toLocaleDateString()}</span>
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 align-middle capitalize">{payment.payment_method}</td>
                                            <td className="py-3 px-4 align-middle">
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                    payment.payment_type === 'full' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                    payment.payment_type === 'partial' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                                                    payment.payment_type === 'deposit' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                                                    'bg-gray-50 text-gray-700 ring-gray-600/20'
                                                }`}>
                                                    {payment.payment_type?.charAt(0).toUpperCase() + payment.payment_type?.slice(1)}
                                                </span>
                                            </td>
                                            <td className="text-right py-3 px-4 pr-6 align-middle whitespace-nowrap font-mono">{formatCurrency(payment.amount)}</td>
                                            <td className="py-3 px-4 pl-6 align-middle">
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${payment.status === 'completed' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                        payment.status === 'pending' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' :
                                                            'bg-red-50 text-red-700 ring-red-600/10'
                                                    }`}>
                                                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 align-middle font-mono text-sm">{payment.payment_id || t('-')}</td>
                                            <td className="py-3 px-4 align-middle text-center">
                                                {payment.receipt_path ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-blue-500"
                                                                    onClick={() => {
                                                                        window.open(getDisplayUrl(payment.receipt_path), '_blank');
                                                                    }}
                                                                >
                                                                    <Eye className="h-4 w-4 text-gray-500" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{t('View Receipt')}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : <span className='px-4 py-2'>-</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Activity Stream - moved inside left column so sidebar can stick */}
                {hasPermission(permissions, 'view-stream') && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <MessageCircle className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Activity Stream')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {hasPermission(permissions, 'create-invoices') && (
                                <div className="px-5 pt-4 pb-4 border-b">
                                    <form onSubmit={(e) => {
                                        e.preventDefault();
                                        if (newComment.trim()) {
                                            router.post(route('invoices.comments.store', invoice.id), { comment: newComment }, { preserveScroll: true, onSuccess: () => setNewComment('') });
                                        }
                                    }}>
                                        <div className="flex items-start gap-3">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
                                                            <AvatarImage src={auth?.user?.avatar} alt={auth?.user?.name || 'User'} />
                                                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(auth?.user?.name || 'U')}</AvatarFallback>
                                                        </Avatar>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top"><p>{auth?.user?.name || t('User')}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <div className="flex-1 rounded-xl border shadow-sm overflow-hidden">
                                                <Textarea
                                                    placeholder={t('Write a comment...')}
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    className="border-0 resize-none focus-visible:ring-0 bg-transparent"
                                                    rows={2}
                                                />
                                                <div className="flex items-center justify-end px-3 py-2 border-t bg-muted/30">
                                                    <TooltipProvider delayDuration={200}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button type="submit" size="sm" disabled={!newComment.trim()} className="h-7 px-3">
                                                                    <Send className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top"><p>{t('Send')}</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}
                            <div className="max-h-[520px] overflow-y-auto border-t">
                                {streamItems && streamItems.length > 0 ? (
                                    <div className="py-5 px-5">
                                        {streamItems.map((activity: any, index: number) => {
                                            const getActivityBadgeColor = (type: string): string => {
                                                switch (type) {
                                                    case 'created': return 'bg-green-50 text-green-700 ring-green-600/20';
                                                    case 'updated': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
                                                    case 'deleted': return 'bg-red-50 text-red-700 ring-red-600/20';
                                                    case 'assigned': return 'bg-purple-50 text-purple-700 ring-purple-600/20';
                                                    case 'comment': return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20';
                                                    default: return 'bg-gray-50 text-gray-700 ring-gray-600/20';
                                                }
                                            };
                                            const badgeCls = getActivityBadgeColor(activity.activity_type);
                                            const isEditing = editingComment === activity.id;
                                            return (
                                                <div key={activity.id || index} className="relative flex gap-3 pb-4">
                                                    <div className="flex flex-col items-center flex-shrink-0 w-9">
                                                        <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Avatar className="w-9 h-9 flex-shrink-0 relative z-10">
                                                                        <AvatarImage src={activity.user?.avatar} alt={activity.user?.name || 'U'} />
                                                                        <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold">{getInitials(activity.user?.name || 'U')}</AvatarFallback>
                                                                    </Avatar>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top"><p>{activity.user?.name || t('System')}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        {index < streamItems.length - 1 && (
                                                            <div className="absolute left-[18px] top-9 bottom-0 w-px bg-gray-300 dark:bg-gray-600" />
                                                        )}
                                                    </div>
                                                    <div className={`flex-1 min-w-0 rounded-xl border bg-card shadow-sm overflow-hidden ${isEditing ? 'border-emerald-400 ring-1 ring-emerald-300' : ''}`}>
                                                        <div className={`flex items-center justify-between gap-2 px-4 py-2.5 ${isEditing ? 'bg-emerald-50/60' : 'bg-muted/30'} border-b`}>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-semibold text-foreground">{activity.user?.name || t('System')}</span>
                                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badgeCls}`}>
                                                                    {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">{formatRelativeTime(activity.created_at)}</span>
                                                            </div>
                                                            {!isEditing && (
                                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                                    {activity.activity_type === 'comment' && activity.user_id === auth?.user?.id && hasPermission(permissions, 'edit-invoices') && (
                                                                        <TooltipProvider delayDuration={200}>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground"
                                                                                        onClick={() => { setEditingComment(activity.id); setEditCommentText(activity.description); }}>
                                                                                        <Edit className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top"><p>{t('Edit')}</p></TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}
                                                                    {hasPermission(permissions, 'delete-stream') && (
                                                                        <TooltipProvider delayDuration={200}>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground"
                                                                                        onClick={() => { setCurrentActivity(activity); setIsDeleteModalOpen(true); }}>
                                                                                        <Trash2 className="h-3 w-3" />
                                                                                    </Button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top"><p>{t('Delete')}</p></TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="px-4 py-3">
                                                            {activity.activity_type === 'comment' ? (
                                                                isEditing ? (
                                                                    <div className="space-y-3">
                                                                        <Textarea
                                                                            value={editCommentText}
                                                                            onChange={(e) => setEditCommentText(e.target.value)}
                                                                            className="w-full resize-none border-emerald-300 focus-visible:ring-emerald-400"
                                                                            rows={3}
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <Button size="sm" variant="outline" onClick={() => setEditingComment(null)}>{t('Cancel')}</Button>
                                                                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => {
                                                                                router.put(route('invoices.comments.update-activity', { invoice: invoice.id, activity: activity.id }), { comment: editCommentText }, { preserveScroll: true });
                                                                                setEditingComment(null);
                                                                            }}>{t('Save')}</Button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-foreground">{activity.description}</p>
                                                                )
                                                            ) : activity.description?.includes('into') ? (
                                                                <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: activity.description }} />
                                                            ) : activity.title ? (
                                                                <p className="text-sm text-muted-foreground">{activity.title}</p>
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                                        <p className="text-sm">{t('No activities found')}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                </div>{/* end left column */}

                {/* Right Sticky Sidebar */}
                <div className="w-[300px] flex-shrink-0 space-y-4" style={{ position: 'sticky', top: '24px', alignSelf: 'flex-start' }}>

                    {/* Summary & Actions */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-base font-semibold">
                                <FileText className="h-4 w-4 mr-2 text-emerald-600" />
                                {t('Summary & Actions')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">{t('Balance Due')}</p>
                                    <p className="text-2xl font-bold font-mono text-foreground">{formatCurrency(dueAmount)}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    {getStatusBadge(invoice.status)}
                                    
                                </div>
                            </div>
                            {/* Payment Progress Bar */}
                            {parseFloat(invoice.total_amount) > 0 && (
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>{t('Paid')}: <span className="font-mono">{formatCurrency(paidAmount)}</span></span>
                                        <span>{Math.round((paidAmount / parseFloat(invoice.total_amount)) * 100)}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className="bg-emerald-500 h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, (paidAmount / parseFloat(invoice.total_amount)) * 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{t('of')} <span className="font-mono">{formatCurrency(invoice.total_amount)}</span></p>
                                </div>
                            )}
                            <div className="space-y-2">
                                {['pending', 'overdue', 'partially_paid'].includes(invoice.status) && hasPermission(permissions, 'send-reminder-invoices') && (
                                <Button variant="default" size="sm" className="w-full cursor-pointer" onClick={handleSendReminder}>
                                    <Bell className="h-4 w-4 mr-2" />{t('Send Reminder')}
                                </Button>
                                )}
                                {hasPermission(permissions, 'edit-invoices') && (
                                    <Button variant="outline" className="w-full" onClick={() => router.visit(route('invoices.edit', invoice.id))}>
                                        <Edit className="h-4 w-4 mr-2" />{t('Edit Invoice')}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Info */}
                    {(invoice.contact || invoice.account) && (
                        <Card className="shadow-sm">
                            <CardHeader className="border-b py-3.5 px-5">
                                <CardTitle className="flex items-center text-base font-semibold">
                                    <User className="h-4 w-4 mr-2 text-emerald-600" />
                                    {t('Customer Info')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {invoice.contact && (
                                    <div className="px-4 pt-3 pb-3">
                                        <p className="text-[10px] text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                            <User className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Contact')}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <UserInitials name={invoice.contact.name} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">{invoice.contact.name}</p>
                                                    {invoice.contact.email && <p className="text-xs text-muted-foreground truncate">{invoice.contact.email}</p>}
                                                </div>
                                            </div>
                                            {hasPermission(permissions, 'view-contacts') && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={route('contacts.show', invoice.contact.id)} className="ml-3 flex-shrink-0">
                                                                <Eye className="h-4 w-4 text-gray-500" />
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {invoice.contact && invoice.account && <div className="border-t mx-0" />}
                                {invoice.account && (
                                    <div className="px-4 pt-3 pb-3">
                                        <p className="text-[10px] text-gray-600 mb-2 flex items-center gap-1">
                                                <Building2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                                            {t('Account')}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <UserInitials name={invoice.account.name} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">{invoice.account.name}</p>
                                                    {invoice.account.email && <p className="text-xs text-muted-foreground truncate">{invoice.account.email}</p>}
                                                </div>
                                            </div>
                                            {hasPermission(permissions, 'view-accounts') && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={route('accounts.show', invoice.account.id)} className="ml-3 flex-shrink-0">
                                                                <Eye className="h-4 w-4 text-gray-500" />
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Invoice Details */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-base font-semibold">
                                <FileText className="h-4 w-4 mr-2 text-emerald-600" />
                                {t('Invoice Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-start gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-muted-foreground">{t('Invoice Number')}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-foreground">{invoice.invoice_number}</p>
                                      
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('Invoice Date')}</p>
                                    <p className="text-sm font-medium text-foreground">{formatDate(invoice.invoice_date)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">{t('Due Date')}</p>
                                    <p className="text-sm font-medium text-foreground">{formatDate(invoice.due_date)}</p>
                                </div>
                            </div>
                          
                            {invoice.assigned_user && (
                                <div className="border-t pt-3">
                                    <p className="text-xs text-muted-foreground mb-2">{t('Assigned To')}</p>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="w-8 h-8 flex-shrink-0">
                                            <AvatarImage src={invoice.assigned_user.avatar} alt={invoice.assigned_user.name} />
                                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(invoice.assigned_user.name || '')}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{invoice.assigned_user.name}</p>
                                            {invoice.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{invoice.assigned_user.email}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {invoice.creator && (
                                <div className="border-t pt-3">
                                    <p className="text-xs text-muted-foreground mb-2">{t('Created By')}</p>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="w-8 h-8 flex-shrink-0">
                                            <AvatarImage src={invoice.creator.avatar} alt={invoice.creator.name} />
                                            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(invoice.creator.name || '')}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{invoice.creator.name}</p>
                                            {invoice.creator.email && <p className="text-xs text-muted-foreground truncate">{invoice.creator.email}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Related Records */}
                    {(invoice.sales_order || invoice.quote) && (
                        <Card className="shadow-sm">
                            <CardHeader className="border-b py-3.5 px-5">
                                <CardTitle className="flex items-center text-base font-semibold">
                                    <Package className="h-4 w-4 mr-2 text-gray-600" />
                                    {t('Related Records')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-2">
                                {invoice.sales_order && hasPermission(permissions, 'view-sales-orders') && (
                                    <Link href={route('sales-orders.show', invoice.sales_order.id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">{t('Sales Order')}</p>
                                                <p className="text-sm font-medium text-foreground truncate">{invoice.sales_order.name}</p>
                                            </div>
                                        </div>
                                        <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    </Link>
                                )}
                                {invoice.quote && hasPermission(permissions, 'view-quotes') && (
                                    <Link href={route('quotes.show', invoice.quote.id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="min-w-0">
                                                <p className="text-xs text-muted-foreground">{t('Quote')}</p>
                                                <p className="text-sm font-medium text-foreground truncate">{invoice.quote.name}</p>
                                            </div>
                                        </div>
<Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    )}



                </div>{/* end right sidebar */}
            </div>{/* end flex */}

                <CrudFormModal
                    isOpen={isAssignSalesOrderModalOpen}
                    onClo   se={() => {
                        setIsAssignSalesOrderModalOpen(false);
                        setSelectedSalesOrderId('empty');
                    }}
                    onSubmit={handleAssignSalesOrder}
                    formConfig={{
                        modalSize: 'md',
                        layout: 'vertical',
                        fields: [
                            {
                                name: 'sales_order_id',
                                label: t('Select Sales Order'),
                                type: 'select',
                                required: true,
                                options: [
                                    { value: 'empty', label: t('Select Sales Order') },
                                    ...availableSalesOrders?.map((so: any) => ({
                                        value: so.id.toString(),
                                        label: `${so.order_number} - ${so.name}`
                                    })) || []
                                ]
                            }
                        ]
                    }}
                    initialData={{ sales_order_id: selectedSalesOrderId || 'empty' }}
                    title={t('Assign Sales Order to Invoice')}
                    mode="create"
                    onFieldChange={(field, value) => {
                        if (field === 'sales_order_id') {
                            setSelectedSalesOrderId(value);
                        }
                    }}
                />

                {/* Delete Activity Modal */}
                <CrudDeleteModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={() => {
                        router.delete(route('invoices.delete-activity', { invoice: invoice.id, activity: currentActivity.id }), {
                            preserveScroll: true
                        });
                        setIsDeleteModalOpen(false);
                    }}
                    itemName={t('this activity')}
                    entityName={t('activity')}
                />

                {/* Delete All Activities Modal */}
                <CrudDeleteModal
                    isOpen={isDeleteAllModalOpen}
                    onClose={() => setIsDeleteAllModalOpen(false)}
                    onConfirm={() => {
                        router.delete(route('invoices.delete-activities', invoice.id), {
                            preserveScroll: true
                        });
                        setIsDeleteAllModalOpen(false);
                    }}
                    itemName={t('all activities for {{invoiceName}}', { invoiceName: invoice.name })}
                    entityName={t('activities')}
                />

                {/* Reject Payment Modal */}
                <Dialog open={isRejectPaymentModalOpen} onOpenChange={setIsRejectPaymentModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('Reject Payment')}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleRejectPaymentConfirm(formData.get('reason') as string || '');
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="reason">{t('Rejection Reason (Optional)')}</Label>
                                    <Textarea
                                        id="reason"
                                        name="reason"
                                        placeholder={t('Enter rejection reason...')}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsRejectPaymentModalOpen(false)}>
                                    {t('Cancel')}
                                </Button>
                                <Button type="submit" variant="destructive">
                                    {t('Reject')}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
        </PageTemplate>
    );
}
