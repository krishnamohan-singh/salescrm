import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import {
  ArrowLeft, Package, Truck, Weight,
  Hash, FileText, StickyNote, User, Calendar,
  Edit, Building2, Eye, Clock, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
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

export default function DeliveryOrderShow() {
  const { t } = useTranslation();
  const { deliveryOrder, auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Delivery Orders'), href: route('delivery-orders.index') },
    { title: t('View Delivery Order') },
  ];

  const statusConfig: Record<string, { label: string; cls: string; dot: string; icon: React.ReactNode }> = {
    pending:    { label: t('Pending'),    cls: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400', dot: 'bg-yellow-400', icon: <Clock className="h-3.5 w-3.5" /> },
    in_transit: { label: t('In Transit'), cls: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400',           dot: 'bg-blue-400',   icon: <Truck className="h-3.5 w-3.5" /> },
    delivered:  { label: t('Delivered'),  cls: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400',       dot: 'bg-green-400',  icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    cancelled:  { label: t('Cancelled'),  cls: 'bg-red-50 text-red-700 ring-red-600/10 dark:bg-red-900/30 dark:text-red-400',                 dot: 'bg-red-400',    icon: <XCircle className="h-3.5 w-3.5" /> },
  };

  const cfg = statusConfig[deliveryOrder.status] ?? { label: deliveryOrder.status, cls: 'bg-gray-50 text-gray-700 ring-gray-600/20', dot: 'bg-gray-400', icon: <AlertCircle className="h-3.5 w-3.5" /> };

  const formatCurrency = (amount: number) =>
    window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

  const formatDate = (d: string) => {
    if (!d) return t('-');
    return window.appSettings?.formatDateTime(d, false) || new Date(d).toLocaleDateString();
  };

  useEffect(() => {
    const main = document.querySelector('main[data-slot="sidebar-inset"]') as HTMLElement | null;
    if (main) main.style.overflowX = 'visible';
    return () => { if (main) main.style.overflowX = ''; };
  }, []);

  return (
    <PageTemplate
      title={deliveryOrder.delivery_number}
      description={t('Delivery order details and related information')}
      url={route('delivery-orders.index')}
      breadcrumbs={breadcrumbs}
      actions={[
        {
          label: t('Back'),
          icon: <ArrowLeft className="h-4 w-4 me-2" />,
          variant: 'outline',
          onClick: () => router.visit(route('delivery-orders.index')),
        },
      ]}
      noPadding
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Left Column ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Hero Card */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold">{deliveryOrder.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3">{t('Delivery Address')}</p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Address')}</p>
                      <p className="text-sm font-medium text-foreground">{deliveryOrder.delivery_address || t('-')}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('City')}</p>
                      <p className="text-sm font-medium text-foreground">{deliveryOrder.delivery_city || t('-')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('State')}</p>
                      <p className="text-sm font-medium text-foreground">{deliveryOrder.delivery_state || t('-')}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Postal Code')}</p>
                      <p className="text-sm font-medium text-foreground">{deliveryOrder.delivery_postal_code || t('-')}</p>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground">{t('Country')}</p>
                    <p className="text-sm font-medium text-foreground">{deliveryOrder.delivery_country || t('-')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

     

          {/* Notes + Description */}
          <div className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <StickyNote className="h-5 w-5 me-3 text-muted-foreground" />
                  {t('Delivery Notes')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[150px] overflow-y-auto">
                  <div className="px-5 py-4">
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{deliveryOrder.delivery_notes || t('-')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{deliveryOrder.description || t('-')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <Package className="h-5 w-5 me-3 text-muted-foreground" />
                {t('Products')}
                {deliveryOrder.products?.length > 0 && (
                  <span className="ms-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {deliveryOrder.products.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {deliveryOrder.products && deliveryOrder.products.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted border-b hover:!bg-muted">
                          <TableHead className="py-2.5 font-semibold">{t('Product')}</TableHead>
                          <TableHead className="py-2.5 font-semibold text-center">{t('Quantity')}</TableHead>
                          <TableHead className="py-2.5 font-semibold text-center">{t('Unit Weight')}</TableHead>
                          <TableHead className="py-2.5 font-semibold text-end">{t('Total Weight')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deliveryOrder.products.map((product: any, index: number) => (
                          <TableRow key={index} className="hover:bg-muted/50 border-b">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3 min-w-0">
                                {product.main_image_url ? (
                                  <a href={product.main_image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                    <img src={product.main_image_url} alt={product.name} className="w-11 h-11 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity" />
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
                              <p className="text-sm font-semibold text-foreground">{product.pivot?.quantity ?? 0}</p>
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              <p className="text-sm font-semibold text-foreground">{product.pivot?.unit_weight ?? 0} kg</p>
                            </TableCell>
                            <TableCell className="py-3 text-end">
                              <p className="text-sm font-bold text-emerald-600">{product.pivot?.total_weight ?? 0} kg</p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-end justify-end gap-4 px-6 py-5 border-t bg-muted/10">
                    <div className="w-full max-w-sm border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm font-bold text-foreground">{t('Total Weight')}</span>
                        <span className="text-lg font-bold text-emerald-600">{deliveryOrder.total_weight ?? 0} kg</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{t('No products added to this delivery order')}</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>{/* end left column */}

        {/* ── Right Sticky Sidebar ── */}
        <div className="w-full lg:w-[300px] lg:flex-shrink-0 space-y-4 lg:sticky lg:top-6">

          {/* Summary & Actions */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-base font-semibold">
                <Truck className="h-4 w-4 me-2 text-emerald-600" />
                {t('Summary & Actions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('Shipping Cost')}</p>
                  <p className="text-2xl font-bold font-mono text-foreground">{formatCurrency(deliveryOrder.shipping_cost)}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {hasPermission(permissions, 'edit-delivery-orders') && (
                  <Button variant="outline" className="w-full" onClick={() => router.visit(route('delivery-orders.edit', deliveryOrder.id))}>
                    <Edit className="h-4 w-4 me-2" />{t('Edit Delivery Order')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          {(deliveryOrder.contact || deliveryOrder.account) && (
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-base font-semibold">
                  <User className="h-4 w-4 me-2 text-emerald-600" />
                  {t('Customer Info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {deliveryOrder.contact && (
                  <div className="px-4 pt-3 pb-3">
                    <p className="text-[10px] text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Contact')}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserInitials name={deliveryOrder.contact.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{deliveryOrder.contact.name}</p>
                          {deliveryOrder.contact.email && <p className="text-xs text-muted-foreground truncate">{deliveryOrder.contact.email}</p>}
                        </div>
                      </div>
                      {hasPermission(permissions, 'view-contacts') && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={route('contacts.show', deliveryOrder.contact.id)} className="ms-3 flex-shrink-0">
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
                {deliveryOrder.contact && deliveryOrder.account && <div className="border-t mx-0" />}
                {deliveryOrder.account && (
                  <div className="px-4 pt-3 pb-3">
                    <p className="text-[10px] text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Account')}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <UserInitials name={deliveryOrder.account.name} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{deliveryOrder.account.name}</p>
                          {deliveryOrder.account.email && <p className="text-xs text-muted-foreground truncate">{deliveryOrder.account.email}</p>}
                        </div>
                      </div>
                      {hasPermission(permissions, 'view-accounts') && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={route('accounts.show', deliveryOrder.account.id)} className="ms-3 flex-shrink-0">
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

          {/* DO Details */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-base font-semibold">
                <FileText className="h-4 w-4 me-2 text-emerald-600" />
                {t('Order Details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Delivery Number')}</p>
                  <p className="text-sm font-medium text-foreground font-mono">{deliveryOrder.delivery_number}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Delivery Date')}</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(deliveryOrder.delivery_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Expected Delivery')}</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(deliveryOrder.expected_delivery_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Tracking Number')}</p>
                  <p className="text-sm font-medium text-foreground font-mono">{deliveryOrder.tracking_number || t('-')}</p>
                </div>
              </div>
              {deliveryOrder.assigned_user && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">{t('Assigned To')}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={deliveryOrder.assigned_user.avatar} alt={deliveryOrder.assigned_user.name} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(deliveryOrder.assigned_user.name || '')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{deliveryOrder.assigned_user.name}</p>
                      {deliveryOrder.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{deliveryOrder.assigned_user.email}</p>}
                    </div>
                  </div>
                </div>
              )}
              {deliveryOrder.creator && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">{t('Created By')}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={deliveryOrder.creator.avatar} alt={deliveryOrder.creator.name} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(deliveryOrder.creator.name || '')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{deliveryOrder.creator.name}</p>
                      {deliveryOrder.creator.email && <p className="text-xs text-muted-foreground truncate">{deliveryOrder.creator.email}</p>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Records */}
          {(deliveryOrder.sales_order || deliveryOrder.shipping_provider_type) && (
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-base font-semibold">
                  <Package className="h-4 w-4 me-2 text-gray-600" />
                  {t('Related Records')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                {deliveryOrder.sales_order && hasPermission(permissions, 'view-sales-orders') && (
                  <Link href={route('sales-orders.show', deliveryOrder.sales_order.id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Sales Order')}</p>
                      <p className="text-sm font-medium text-foreground truncate">{deliveryOrder.sales_order.name}</p>
                    </div>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Eye className="h-3.5 w-3.5 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Link>
                )}
                {deliveryOrder.shipping_provider_type && hasPermission(permissions, 'view-shipping-provider-types') && (
                  <Link href={route('shipping-provider-types.show', deliveryOrder.shipping_provider_type.id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Shipping Provider')}</p>
                      <p className="text-sm font-medium text-foreground truncate">{deliveryOrder.shipping_provider_type.name}</p>
                    </div>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Eye className="h-3.5 w-3.5 text-gray-500" />
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