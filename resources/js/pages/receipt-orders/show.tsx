import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, DollarSign, Calendar, Package, FileText, Building2, ClipboardCheck, Eye, ShoppingCart, User, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';
import { hasPermission } from '@/utils/authorization';

export default function ShowReceiptOrder() {
    const { t } = useTranslation();
    const { receiptOrder, auth } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const getInitials = useInitials();

    useEffect(() => {
        const main = document.querySelector('main[data-slot="sidebar-inset"]') as HTMLElement | null;
        if (main) main.style.overflowX = 'visible';
        return () => { if (main) main.style.overflowX = ''; };
    }, []);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Receipt Orders'), href: route('receipt-orders.index') },
        { title: t('View Receipt Order') }
    ];

    const getStatusBadge = (status: string) => {
        const statusColors: Record<string, string> = {
            pending:   'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400',
            received:  'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400',
            partial:   'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-400',
            completed: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400',
            cancelled: 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/30 dark:text-red-400',
        };
        return (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[status] || statusColors.pending}`}>
                {t(status?.charAt(0).toUpperCase() + status?.slice(1))}
            </span>
        );
    };

    const formatDate = (d: string) => {
        if (!d) return t('-');
        return window.appSettings?.formatDateTime(d, false) || new Date(d).toLocaleDateString();
    };

    const formatCurrency = (amount: number) =>
        window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

    const calculateTotals = () => {
        let subtotal = 0, totalTax = 0, totalDiscount = 0;
        receiptOrder.products?.forEach((p: any) => {
            const lineTotal = Number(p.pivot?.total_price || 0);
            const discount  = Number(p.pivot?.discount_amount || 0);
            const afterDisc = lineTotal - discount;
            subtotal       += afterDisc;
            totalDiscount  += discount;
            if (p.tax) totalTax += (afterDisc * Number(p.tax.rate || 0)) / 100;
        });
        return { subtotal, totalTax, totalDiscount, grandTotal: subtotal + totalTax };
    };

    const { subtotal, totalTax, totalDiscount, grandTotal } = calculateTotals();

    return (
        <PageTemplate
            title={receiptOrder.name}
            description={t('Receipt order details and related information')}
            breadcrumbs={breadcrumbs}
            noPadding
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 me-2" />,
                    variant: 'outline',
                    onClick: () => router.visit(route('receipt-orders.index'))
                }
            ]}
        >
            <div className="flex gap-6 items-start">
            {/* Left Column */}
            <div className="flex-1 min-w-0 space-y-6">

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {([
                        { label: t('Receipt Number'), value: receiptOrder.receipt_number || '—', icon: FileText, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
                        { label: t('Receipt Date'), value: formatDate(receiptOrder.receipt_date), icon: Calendar, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                        { label: t('Expected Date'), value: formatDate(receiptOrder.expected_date), icon: Calendar, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
                    ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                        <Card key={label} className="relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                            <CardContent className="relative p-4">
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                                        <p className="text-lg font-bold text-foreground truncate leading-snug">{value}</p>
                                    </div>
                                    <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5 flex-shrink-0`}>
                                        <Icon className={`h-5 w-5 ${iconCls}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

              

                {/* Products */}
                <Card className="shadow-sm overflow-hidden">
                    <CardHeader className="border-b py-3.5 px-5">
                        <CardTitle className="flex items-center text-lg font-semibold">
                            <ShoppingCart className="h-5 w-5 mr-3 text-muted-foreground" />
                            {t('Products')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {receiptOrder.products && receiptOrder.products.length > 0 ? (
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
                                        {receiptOrder.products.map((product: any, index: number) => {
                                            const qty         = product.pivot?.quantity || 0;
                                            const unitPrice   = product.pivot?.unit_price || 0;
                                            const discountAmt = Number(product.pivot?.discount_amount) || 0;
                                            const lineTotal   = Number(product.pivot?.total_price) || (qty * unitPrice);
                                            const afterDisc   = lineTotal - discountAmt;
                                            const taxAmount   = product.tax ? (afterDisc * Number(product.tax.rate)) / 100 : 0;
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
                                                        <p className="text-sm font-semibold text-foreground">{qty}</p>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        <p className="text-sm font-semibold font-mono text-foreground">{formatCurrency(unitPrice)}</p>
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center">
                                                        {product.pivot?.discount_type && product.pivot.discount_type !== 'none' && discountAmt > 0 ? (
                                                            <>
                                                                <p className="text-sm font-semibold text-foreground">
                                                                    {product.pivot.discount_type === 'percentage' ? `${Number(product.pivot.discount_value)}%` : <span className="font-mono">{formatCurrency(Number(product.pivot.discount_value))}</span>}
                                                                </p>
                                                                <p className="text-xs font-mono text-red-500 mt-0.5">-{formatCurrency(discountAmt)}</p>
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
                                                        {discountAmt > 0 ? (
                                                            <>
                                                                <p className="text-xs font-mono line-through text-muted-foreground">{formatCurrency(lineTotal)}</p>
                                                                <p className="text-sm font-bold font-mono text-emerald-600">{formatCurrency(afterDisc + taxAmount)}</p>
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
                                            <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(receiptOrder.subtotal ?? subtotal)}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3 border-b">
                                            <span className="text-sm text-muted-foreground font-medium">{t('Discount')}</span>
                                            <span className="text-sm font-semibold font-mono text-red-500">-{formatCurrency(receiptOrder.discount_amount || totalDiscount)}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3 border-b">
                                            <span className="text-sm text-muted-foreground font-medium">{t('Total Tax')}</span>
                                            <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(receiptOrder.tax_amount ?? totalTax)}</span>
                                        </div>
                                        <div className="flex items-center justify-between px-4 py-3">
                                            <span className="text-sm font-bold text-foreground">{t('Grand Total')}</span>
                                            <span className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(receiptOrder.total_amount ?? grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                    <Package className="h-8 w-8 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">{t('No products added to this receipt order')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notes & Description */}
                <div className="space-y-6">
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
                                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{receiptOrder.notes || t('-')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <FileText className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Description')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[150px] overflow-y-auto">
                                <div className="px-5 py-4">
                                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{receiptOrder.description || t('-')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>{/* end left column */}

            {/* Right Sticky Sidebar */}
            <div className="w-[300px] flex-shrink-0 space-y-4 sticky top-[70px] self-start">

                {/* Summary */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b py-3.5 px-5">
                        <CardTitle className="flex items-center text-base font-semibold">
                            <ClipboardCheck className="h-4 w-4 mr-2 text-emerald-600" />
                            {t('Summary')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">{t('Total Amount')}</p>
                                <p className="text-2xl font-bold font-mono text-foreground">{formatCurrency(receiptOrder.total_amount)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                                {getStatusBadge(receiptOrder.status)}
                            </div>
                        </div>
                        <div className="space-y-2">
                            {hasPermission(permissions, 'edit-receipt-orders') && (
                                <Button variant="outline" className="w-full" onClick={() => router.visit(route('receipt-orders.edit', receiptOrder.id))}>
                                    <Edit className="h-4 w-4 mr-2" />{t('Edit Receipt Order')}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Customer Info */}
                {(receiptOrder.contact || receiptOrder.account) && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-base font-semibold">
                                <User className="h-4 w-4 mr-2 text-emerald-600" />
                                {t('Customer Info')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {receiptOrder.contact && (
                                <div className="px-4 pt-3 pb-3">
                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                        <User className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Contact')}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <UserInitials name={receiptOrder.contact.name} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{receiptOrder.contact.name}</p>
                                                {receiptOrder.contact.email && <p className="text-xs text-muted-foreground truncate">{receiptOrder.contact.email}</p>}
                                            </div>
                                        </div>
                                        {hasPermission(permissions, 'view-contacts') && (
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={route('contacts.show', receiptOrder.contact.id)} className="ml-3 flex-shrink-0">
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
                            {receiptOrder.contact && receiptOrder.account && <div className="border-t mx-0" />}
                            {receiptOrder.account && (
                                <div className="px-4 pt-3 pb-3">
                                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                        <Building2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Account')}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <UserInitials name={receiptOrder.account.name} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{receiptOrder.account.name}</p>
                                                {receiptOrder.account.email && <p className="text-xs text-muted-foreground truncate">{receiptOrder.account.email}</p>}
                                            </div>
                                        </div>
                                        {hasPermission(permissions, 'view-accounts') && (
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Link href={route('accounts.show', receiptOrder.account.id)} className="ml-3 flex-shrink-0">
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

                {/* Assigned To */}
                {(receiptOrder.assigned_user || receiptOrder.creator) && (
                <Card className="shadow-sm">
                    <CardHeader className="border-b py-3.5 px-5">
                        <CardTitle className="flex items-center text-base font-semibold">
                            <User className="h-4 w-4 mr-2 text-emerald-600" />
                            {t('Assigned To')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {receiptOrder.assigned_user && (
                            <div className="px-4 pt-3 pb-3">
                                <p className="text-xs text-muted-foreground mb-2">{t('Assigned To')}</p>
                                <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="w-9 h-9 flex-shrink-0">
                                        <AvatarImage src={receiptOrder.assigned_user.avatar} alt={receiptOrder.assigned_user.name} />
                                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(receiptOrder.assigned_user.name || '')}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{receiptOrder.assigned_user.name}</p>
                                        {receiptOrder.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{receiptOrder.assigned_user.email}</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                        {receiptOrder.assigned_user && receiptOrder.creator && <div className="border-t mx-0" />}
                        {receiptOrder.creator && (
                            <div className="px-4 pt-3 pb-3">
                                <p className="text-xs text-muted-foreground mb-2">{t('Created By')}</p>
                                <div className="flex items-center gap-2 min-w-0">
                                    <Avatar className="w-9 h-9 flex-shrink-0">
                                        <AvatarImage src={receiptOrder.creator.avatar} alt={receiptOrder.creator.name} />
                                        <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(receiptOrder.creator.name || '')}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{receiptOrder.creator.name}</p>
                                        {receiptOrder.creator.email && <p className="text-xs text-muted-foreground truncate">{receiptOrder.creator.email}</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                )}

                {/* Related Records */}
                {(receiptOrder.purchase_order || receiptOrder.return_order) && (
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-base font-semibold">
                                <Package className="h-4 w-4 mr-2 text-gray-600" />
                                {t('Related Records')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-2">
                            {receiptOrder.purchase_order && hasPermission(permissions, 'view-purchase-orders') && (
                                <Link href={route('purchase-orders.show', receiptOrder.purchase_order.id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">{t('Purchase Order')}</p>
                                        <p className="text-sm font-medium text-foreground truncate">{receiptOrder.purchase_order.name}</p>
                                    </div>
                                    <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </Link>
                            )}
                            {receiptOrder.return_order && hasPermission(permissions, 'view-return-orders') && (
                                <Link href={route('return-orders.show', receiptOrder.return_order.id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">{t('Return Order')}</p>
                                        <p className="text-sm font-medium text-foreground truncate">{receiptOrder.return_order.name}</p>
                                    </div>
                                    <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                )}

            </div>{/* end right sidebar */}
            </div>{/* end flex */}

        </PageTemplate>
    );
}
