import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { ArrowLeft, Calendar, Package, User, Building2, FileText, Truck, Edit, Eye, Hash } from 'lucide-react';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';
import { hasPermission } from '@/utils/authorization';

export default function ReturnOrderShow() {
  const { t } = useTranslation();
  const { returnOrder, auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Return Orders'), href: route('return-orders.index') },
    { title: t('View Return Order') }
  ];

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      processed: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400',
      received:  'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400',
      approved:  'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400',
      shipped:   'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-400',
      cancelled: 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/30 dark:text-red-400',
      pending:   'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[status] || statusColors.pending}`}>
        {t(status?.charAt(0).toUpperCase() + status?.slice(1)) || t('Pending')}
      </span>
    );
  };

  const getReasonLabel = (reason: string) => {
    const reasonLabels: Record<string, string> = {
      defective:  t('Defective'),
      wrong_item: t('Wrong Item'),
      damaged:    t('Damaged'),
      not_needed: t('Not Needed'),
      other:      t('Other'),
    };
    return reasonLabels[reason] || reason;
  };

  const formatCurrency = (amount: number) =>
    window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

  const formatDate = (dateString: string) => {
    if (!dateString) return t('-');
    return window.appSettings?.formatDateTime(dateString, false) || new Date(dateString).toLocaleDateString();
  };

  useEffect(() => {
    const main = document.querySelector('main[data-slot="sidebar-inset"]') as HTMLElement | null;
    if (main) main.style.overflowX = 'visible';
    return () => { if (main) main.style.overflowX = ''; };
  }, []);

  return (
    <PageTemplate
      title={returnOrder.name}
      description={t('Return order details and related information')}
      breadcrumbs={breadcrumbs}
      actions={[
        {
          label: t('Back'),
          icon: <ArrowLeft className="h-4 w-4 me-2" />,
          variant: 'outline',
          onClick: () => router.visit(route('return-orders.index'))
        },
       
      ]}
      noPadding
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Left Column ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {([
              { label: t('Return Number'), value: returnOrder.return_number || '—', icon: FileText, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
              { label: t('Return Date'), value: formatDate(returnOrder.return_date), icon: Calendar, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
              { label: t('Return Reason'), value: returnOrder.reason ? getReasonLabel(returnOrder.reason) : '—', icon: FileText, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
            ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
              <Card key={label} className="relative overflow-hidden">
                <div className={`absolute top-0 end-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                <CardContent className="relative p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pe-2">
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
                <Package className="h-5 w-5 me-3 text-muted-foreground" />
                {t('Products')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {returnOrder.products && returnOrder.products.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted border-b hover:!bg-muted">
                        <TableHead className="py-2.5 font-semibold">{t('Product')}</TableHead>
                        <TableHead className="py-2.5 font-semibold text-center">{t('Quantity')}</TableHead>
                        <TableHead className="py-2.5 font-semibold text-center">{t('Unit Price')}</TableHead>
                        <TableHead className="py-2.5 font-semibold text-center">{t('Tax')}</TableHead>
                        <TableHead className="py-2.5 font-semibold text-right">{t('Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnOrder.products.map((product: any, index: number) => {
                        const lineTotal = Number(product.pivot.total_price) || 0;
                        const discountAmount = Number(product.pivot.discount_amount) || 0;
                        const finalTotal = lineTotal - discountAmount;
                        const taxAmount = product.tax ? (finalTotal * Number(product.tax.rate)) / 100 : 0;
                        return (
                          <TableRow key={index} className="hover:bg-muted/50 border-b">
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
                              <p className="text-sm font-bold font-mono text-emerald-600">{formatCurrency(finalTotal + taxAmount)}</p>
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
                        <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(returnOrder.subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 border-b">
                        <span className="text-sm text-muted-foreground font-medium">{t('Total Tax')}</span>
                        <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(returnOrder.tax_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm font-bold text-foreground">{t('Grand Total')}</span>
                        <span className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(returnOrder.total_amount)}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{t('No products added to this return order')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <FileText className="h-5 w-5 me-3 text-muted-foreground" />
                {t('Description')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[150px] overflow-y-auto">
                <div className="px-5 py-4">
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{returnOrder.description || t('-')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reason Description */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <FileText className="h-5 w-5 me-3 text-muted-foreground" />
                {t('Reason Description')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[150px] overflow-y-auto">
                <div className="px-5 py-4">
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{returnOrder.reason_description || t('-')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {returnOrder.notes && (
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <FileText className="h-5 w-5 me-3 text-muted-foreground" />
                  {t('Notes')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[150px] overflow-y-auto">
                  <div className="px-5 py-4">
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{returnOrder.notes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>{/* end left column */}

        {/* ── Right Sticky Sidebar ── */}
        <div className="w-full lg:w-[300px] lg:flex-shrink-0 space-y-4 lg:sticky lg:top-6">

          {/* Summary & Actions */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-base font-semibold">
                <FileText className="h-4 w-4 me-2 text-emerald-600" />
                {t('Summary & Actions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('Total Amount')}</p>
                  <p className="text-2xl font-bold font-mono text-foreground">{formatCurrency(returnOrder.total_amount)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {getStatusBadge(returnOrder.status)}
                </div>
              </div>
              <div className="space-y-2">
                {hasPermission(permissions, 'edit-return-orders') && (
                  <Button variant="outline" className="w-full" onClick={() => router.visit(route('return-orders.edit', returnOrder.id))}>
                    <Edit className="h-4 w-4 me-2" />{t('Edit Return Order')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          {(returnOrder.contact || returnOrder.account) && (
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-base font-semibold">
                  <User className="h-4 w-4 me-2 text-emerald-600" />
                  {t('Customer Info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {returnOrder.contact && (
                  <div className="px-4 pt-3 pb-3">
                    <p className="text-[10px] text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Contact')}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserInitials name={returnOrder.contact.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{returnOrder.contact.name}</p>
                          {returnOrder.contact.email && <p className="text-xs text-muted-foreground truncate">{returnOrder.contact.email}</p>}
                        </div>
                      </div>
                      {hasPermission(permissions, 'view-contacts') && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={route('contacts.show', returnOrder.contact.id)} className="ms-3 flex-shrink-0">
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
                {returnOrder.contact && returnOrder.account && <div className="border-t mx-0" />}
                {returnOrder.account && (
                  <div className="px-4 pt-3 pb-3">
                    <p className="text-[10px] text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Account')}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserInitials name={returnOrder.account.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{returnOrder.account.name}</p>
                          {returnOrder.account.email && <p className="text-xs text-muted-foreground truncate">{returnOrder.account.email}</p>}
                        </div>
                      </div>
                      {hasPermission(permissions, 'view-accounts') && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={route('accounts.show', returnOrder.account.id)} className="ms-3 flex-shrink-0">
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

          {/* RO Details */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-base font-semibold">
                <FileText className="h-4 w-4 me-2 text-emerald-600" />
                {t('Order Details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {returnOrder.tracking_number && (
                <div className="flex items-start gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('Tracking Number')}</p>
                    <p className="text-sm font-medium text-foreground font-mono">{returnOrder.tracking_number}</p>
                  </div>
                </div>
              )}
              {returnOrder.tracking_number && returnOrder.assigned_user && <div className="border-t" />}
              {returnOrder.assigned_user && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t('Assigned To')}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={returnOrder.assigned_user.avatar} alt={returnOrder.assigned_user.name} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(returnOrder.assigned_user.name || '')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{returnOrder.assigned_user.name}</p>
                      {returnOrder.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{returnOrder.assigned_user.email}</p>}
                    </div>
                  </div>
                </div>
              )}
              {returnOrder.creator && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{t('Created By')}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={returnOrder.creator.avatar} alt={returnOrder.creator.name} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(returnOrder.creator.name || '')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{returnOrder.creator.name}</p>
                      {returnOrder.creator.email && <p className="text-xs text-muted-foreground truncate">{returnOrder.creator.email}</p>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Records */}
          {(returnOrder.sales_order || returnOrder.shipping_provider_type) && (
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-base font-semibold">
                  <Package className="h-4 w-4 me-2 text-gray-600" />
                  {t('Related Records')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                {returnOrder.sales_order && hasPermission(permissions, 'view-sales-orders') && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Sales Order')}</p>
                      <p className="text-sm font-medium text-foreground truncate">{returnOrder.sales_order.name}</p>
                    </div>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={route('sales-orders.show', returnOrder.sales_order.id)} className="ms-3 flex-shrink-0">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
                {returnOrder.shipping_provider_type && hasPermission(permissions, 'view-shipping-provider-types') && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Shipping Provider Type')}</p>
                      <p className="text-sm font-medium text-foreground truncate">{returnOrder.shipping_provider_type.name}</p>
                    </div>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={route('shipping-provider-types.show', returnOrder.shipping_provider_type.id)} className="ms-3 flex-shrink-0">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>{/* end right sidebar */}
      </div>{/* end flex */}
    </PageTemplate>
  );
}
