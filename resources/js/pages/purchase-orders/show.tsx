import { PageTemplate } from '@/components/page-template';
import { usePage, Link, router } from '@inertiajs/react';
import { ArrowLeft, Calendar, DollarSign, Package, Building2, Truck, FileText, Trash2, Send, Edit, MessageCircle, ClipboardList, Eye, FileEdit, CheckCircle, XCircle, Loader, User, MapPin } from 'lucide-react';
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { formatRelativeTime } from '@/utils/helper';
import { hasPermission } from '@/utils/authorization';
import UserInitials from '@/components/user-initials';
import { useInitials } from '@/hooks/use-initials';

export default function PurchaseOrderShow() {
  const { t } = useTranslation();
  const { purchaseOrder, streamItems, auth } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const getInitials = useInitials();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Purchase Orders'), href: route('purchase-orders.index') },
    { title: t('View Purchase Order ') }
  ];

  const PO_STATUS_STEPS = ['draft', 'sent', 'confirmed', 'received', 'cancelled'];
  const currentStatusIndex = PO_STATUS_STEPS.indexOf(purchaseOrder.status);

  const poStatusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; ring: string }> = {
    draft:     { label: t('Draft'),     icon: FileEdit,    color: 'text-gray-600',   bg: 'bg-gray-50 dark:bg-gray-800/40',       ring: 'ring-gray-500/20'   },
    sent:      { label: t('Sent'),      icon: Send,        color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20',       ring: 'ring-blue-600/20'   },
    confirmed: { label: t('Confirmed'), icon: CheckCircle, color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20',     ring: 'ring-green-600/20'  },
    received:  { label: t('Received'),  icon: Package,     color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20',   ring: 'ring-purple-600/20' },
    cancelled: { label: t('Cancelled'), icon: XCircle,     color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20',         ring: 'ring-red-600/20'    },
  };

  const formatCurrency = (amount: number) => window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

  const formatDate = (dateString: string) => {
    if (!dateString) return t('-');
    return window.appSettings?.formatDateTime(dateString, false) || new Date(dateString).toLocaleDateString();
  };

  const calculateProductTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    purchaseOrder.products?.forEach((product: any) => {
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

  useEffect(() => {
    const main = document.querySelector('main[data-slot="sidebar-inset"]') as HTMLElement | null;
    if (main) main.style.overflowX = 'visible';
    return () => { if (main) main.style.overflowX = ''; };
  }, []);

  const getStatusBadge = (status: string) => {
    const cfg = poStatusConfig[status] || poStatusConfig.draft;
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cfg.bg} ${cfg.color} ${cfg.ring}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <PageTemplate
      title={purchaseOrder.order_number}
      description={t('Purchase order details and related information')}
      breadcrumbs={breadcrumbs}
      actions={[
        {
          label: t('Back'),
          icon: <ArrowLeft className="h-4 w-4 me-2" />,
          variant: 'outline',
          onClick: () => router.visit(route('purchase-orders.index'))
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
                  <CardTitle className="text-lg font-bold">{purchaseOrder.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 py-5">
              {/* Order Progress */}
              <p className="text-xs font-semibold text-muted-foreground mb-3">{t('Order Progress')}</p>
              <div className="flex items-center flex-wrap gap-y-2">
                {PO_STATUS_STEPS.map((step, i) => {
                  const s = poStatusConfig[step];
                  const StepIcon = s.icon;
                  const isActive = step === purchaseOrder.status;
                  const isDone   = i < currentStatusIndex && purchaseOrder.status !== 'cancelled';
                  const isLast   = i === PO_STATUS_STEPS.length - 1;
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                          isActive ? `${s.bg} border-current ${s.color}` :
                          isDone   ? 'bg-primary/10 border-primary text-primary' :
                                     'bg-muted border-border text-muted-foreground'
                        }`}>
                          <StepIcon className="h-4 w-4" />
                        </div>
                        <span className={`text-[10px] font-medium whitespace-nowrap ${
                          isActive ? s.color : isDone ? 'text-primary' : 'text-muted-foreground'
                        }`}>
                          {s.label}
                        </span>
                      </div>
                      {!isLast && (
                        <div className={`flex-1 h-0.5 mb-4 mx-1 ${
                          i < currentStatusIndex && purchaseOrder.status !== 'cancelled' ? 'bg-primary' : 'bg-border'
                        }`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {/* Billing & Shipping Address */}
              <div className="grid grid-cols-2 gap-6 mt-5 pt-5 border-t">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-3">{t('Billing Address')}</p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground">{t('Address')}</p>
                        <p className="text-sm font-medium text-foreground">{purchaseOrder.billing_address || t('-')}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground">{t('City')}</p>
                        <p className="text-sm font-medium text-foreground">{purchaseOrder.billing_city || t('-')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground">{t('State')}</p>
                        <p className="text-sm font-medium text-foreground">{purchaseOrder.billing_state || t('-')}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground">{t('Postal Code')}</p>
                        <p className="text-sm font-medium text-foreground">{purchaseOrder.billing_postal_code || t('-')}</p>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Country')}</p>
                      <p className="text-sm font-medium text-foreground">{purchaseOrder.billing_country || t('-')}</p>
                    </div>
                  </div>
                </div>
                <div className="border-s ps-6">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">{t('Shipping Address')}</p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground">{t('Address')}</p>
                        <p className="text-sm font-medium text-foreground">{purchaseOrder.shipping_address || t('-')}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground">{t('City')}</p>
                        <p className="text-sm font-medium text-foreground">{purchaseOrder.shipping_city || t('-')}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground">{t('State')}</p>
                        <p className="text-sm font-medium text-foreground">{purchaseOrder.shipping_state || t('-')}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-muted-foreground">{t('Postal Code')}</p>
                        <p className="text-sm font-medium text-foreground">{purchaseOrder.shipping_postal_code || t('-')}</p>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{t('Country')}</p>
                      <p className="text-sm font-medium text-foreground">{purchaseOrder.shipping_country || t('-')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* ── Products ── */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b py-3.5 px-5">
            <CardTitle className="flex items-center text-lg font-semibold">
              <Package className="h-5 w-5 me-3 text-muted-foreground" />
              {t('Products')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {purchaseOrder.products && purchaseOrder.products.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted border-b hover:!bg-muted">
                        <TableHead className="py-2.5 font-semibold">{t('Product')}</TableHead>
                        <TableHead className="py-2.5 font-semibold text-center">{t('Quantity')}</TableHead>
                        <TableHead className="py-2.5 font-semibold text-center">{t('Unit Price')}</TableHead>
                        <TableHead className="py-2.5 font-semibold text-center">{t('Discount')}</TableHead>
                        <TableHead className="py-2.5 font-semibold text-center">{t('Tax')}</TableHead>
                        <TableHead className="py-2.5 font-semibold text-end">{t('Total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrder.products.map((product: any, index: number) => {
                        const qty         = product.pivot?.quantity || 0;
                        const unitPrice   = product.pivot?.unit_price || 0;
                        const discountAmt = Number(product.pivot?.discount_amount) || 0;
                        const lineTotal   = Number(product.pivot?.total_price) || (qty * unitPrice);
                        const afterDisc   = lineTotal - discountAmt;
                        const taxAmount   = product.tax ? (afterDisc * Number(product.tax.rate)) / 100 : 0;
                        return (
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
                            <TableCell className="py-3 text-end">
                              <p className="text-sm font-bold font-mono text-emerald-600">{formatCurrency(afterDisc + taxAmount)}</p>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {/* Totals Panel */}
                <div className="flex flex-col items-start sm:items-end gap-4 px-4 sm:px-6 py-5 border-t bg-muted/10">
                  <div className="w-full sm:max-w-sm border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <span className="text-sm text-muted-foreground font-medium">{t('Subtotal')}</span>
                      <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(purchaseOrder.subtotal ?? subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <span className="text-sm text-muted-foreground font-medium">{t('Discount')}</span>
                      <span className="text-sm font-semibold font-mono text-red-500">-{formatCurrency(purchaseOrder.discount_amount || totalDiscount)}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <span className="text-sm text-muted-foreground font-medium">{t('Total Tax')}</span>
                      <span className="text-sm font-semibold font-mono text-foreground">{formatCurrency(purchaseOrder.tax_amount ?? totalTax)}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-bold text-foreground">{t('Grand Total')}</span>
                      <span className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(purchaseOrder.total_amount ?? grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{t('No products added to this purchase order')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Description ── */}
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
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{purchaseOrder.description || t('-')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Activity Stream ── */}
        {hasPermission(permissions, 'view-stream') && (
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-lg font-semibold">
                <MessageCircle className="h-5 w-5 me-3 text-muted-foreground" />
                {t('Activity Stream')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {hasPermission(permissions, 'create-purchase-orders') && (
                <div className="px-5 pt-4 pb-4 border-b">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (newComment.trim()) {
                      router.post(route('purchase-orders.comments.store', purchaseOrder.id), { comment: newComment }, { preserveScroll: true, onSuccess: () => setNewComment('') });
                    }
                  }}>
                    <div className="flex items-start gap-3">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Avatar className="w-9 h-9 flex-shrink-0 mt-1 cursor-default">
                              <AvatarImage src={auth?.user?.avatar} alt={auth?.user?.name || 'User'} />
                              <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(auth?.user?.name || 'U')}</AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>{auth?.user?.name || t('Me')}</p></TooltipContent>
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
                          case 'created':  return 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400';
                          case 'updated':  return 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400';
                          case 'deleted':  return 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400';
                          case 'assigned': return 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-400';
                          case 'comment':  return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400';
                          default:         return 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-800/40 dark:text-gray-400';
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
                                  <Avatar className="w-9 h-9 flex-shrink-0 relative z-10 cursor-default">
                                    <AvatarImage src={activity.user?.avatar} alt={activity.user?.name || 'U'} />
                                    <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">{getInitials(activity.user?.name || 'U')}</AvatarFallback>
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
                                  {activity.activity_type === 'comment' && activity.user_id === auth?.user?.id && hasPermission(permissions, 'edit-purchase-orders') && (
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
                                        router.put(route('purchase-orders.comments.update-activity', { purchaseOrder: purchaseOrder.id, activity: activity.id }), { comment: editCommentText }, { preserveScroll: true });
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
                    <MessageCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm">{t('No activities found')}</p>
                  </div>
                )}
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
                  <p className="text-2xl font-bold font-mono text-foreground">{formatCurrency(purchaseOrder.total_amount)}</p>
                </div>
              
              </div>
              <div className="space-y-2">
                {hasPermission(permissions, 'edit-purchase-orders') && (
                  <Button variant="outline" className="w-full" onClick={() => router.visit(route('purchase-orders.edit', purchaseOrder.id))}>
                    <Edit className="h-4 w-4 me-2" />{t('Edit Purchase Order')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vendor / Account Info */}
          {purchaseOrder.account && (
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-base font-semibold">
                  <User className="h-4 w-4 me-2 text-emerald-600" />
                  {t('Customer Info')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="px-4 pt-3 pb-3">
                  <p className="text-[10px] text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Account')}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <UserInitials name={purchaseOrder.account.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{purchaseOrder.account.name}</p>
                        {purchaseOrder.account.email && <p className="text-xs text-muted-foreground truncate">{purchaseOrder.account.email}</p>}
                      </div>
                    </div>
                    {hasPermission(permissions, 'view-accounts') && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={route('accounts.show', purchaseOrder.account.id)} className="ms-3 flex-shrink-0">
                              <Eye className="h-4 w-4 text-gray-500" />
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                {(purchaseOrder.billing_contact || purchaseOrder.shipping_contact) && (
                  <>
                    <div className="border-t mx-0" />
                    <div className="px-4 pt-3 pb-3 space-y-3">
                      {purchaseOrder.billing_contact && (
                        <div>
                          <p className="text-[10px] text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Billing Contact')}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <UserInitials name={purchaseOrder.billing_contact.name} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{purchaseOrder.billing_contact.name}</p>
                                {purchaseOrder.billing_contact.email && <p className="text-xs text-muted-foreground truncate">{purchaseOrder.billing_contact.email}</p>}
                              </div>
                            </div>
                            {hasPermission(permissions, 'view-contacts') && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link href={route('contacts.show', purchaseOrder.billing_contact.id)} className="ms-3 flex-shrink-0">
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
                      {purchaseOrder.shipping_contact && (
                        <div>
                          <p className="text-[10px] text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-gray-500 shrink-0" />{t('Shipping Contact')}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <UserInitials name={purchaseOrder.shipping_contact.name} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{purchaseOrder.shipping_contact.name}</p>
                                {purchaseOrder.shipping_contact.email && <p className="text-xs text-muted-foreground truncate">{purchaseOrder.shipping_contact.email}</p>}
                              </div>
                            </div>
                            {hasPermission(permissions, 'view-contacts') && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Link href={route('contacts.show', purchaseOrder.shipping_contact.id)} className="ms-3 flex-shrink-0">
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
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* PO Details */}
          <Card className="shadow-sm">
            <CardHeader className="border-b py-3.5 px-5">
              <CardTitle className="flex items-center text-base font-semibold">
                <FileText className="h-4 w-4 me-2 text-emerald-600" />
                {t('Order Details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Order Number')}</p>
                  <p className="text-sm font-medium text-foreground">{purchaseOrder.order_number}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Order Date')}</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(purchaseOrder.order_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Expected Delivery')}</p>
                  <p className="text-sm font-medium text-foreground">{purchaseOrder.expected_delivery_date ? formatDate(purchaseOrder.expected_delivery_date) : t('-')}</p>
                </div>
              </div>
              {purchaseOrder.assigned_user && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">{t('Assigned To')}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={purchaseOrder.assigned_user.avatar} alt={purchaseOrder.assigned_user.name} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(purchaseOrder.assigned_user.name || '')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{purchaseOrder.assigned_user.name}</p>
                      {purchaseOrder.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{purchaseOrder.assigned_user.email}</p>}
                    </div>
                  </div>
                </div>
              )}
              {purchaseOrder.creator && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">{t('Created By')}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={purchaseOrder.creator.avatar} alt={purchaseOrder.creator.name} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(purchaseOrder.creator.name || '')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{purchaseOrder.creator.name}</p>
                      {purchaseOrder.creator.email && <p className="text-xs text-muted-foreground truncate">{purchaseOrder.creator.email}</p>}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Records */}
          {(purchaseOrder.sales_order || purchaseOrder.shipping_provider_type) && (
            <Card className="shadow-sm">
              <CardHeader className="border-b py-3.5 px-5">
                <CardTitle className="flex items-center text-base font-semibold">
                  <Package className="h-4 w-4 me-2 text-gray-600" />
                  {t('Related Records')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-2">
                {purchaseOrder.sales_order && hasPermission(permissions, 'view-sales-orders') && (
                  <Link href={route('sales-orders.show', purchaseOrder.sales_order.id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Sales Order')}</p>
                      <p className="text-sm font-medium text-foreground truncate">{purchaseOrder.sales_order.name}</p>
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
                {purchaseOrder.shipping_provider_type && hasPermission(permissions, 'view-shipping-provider-types') && (
                  <Link href={route('shipping-provider-types.show', purchaseOrder.shipping_provider_type.id)} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{t('Shipping Provider')}</p>
                      <p className="text-sm font-medium text-foreground truncate">{purchaseOrder.shipping_provider_type.name}</p>
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

      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          router.delete(route('purchase-orders.delete-activity', { purchaseOrder: purchaseOrder.id, activity: currentActivity.id }), { preserveScroll: true });
          setIsDeleteModalOpen(false);
        }}
        itemName={t('this activity')}
        entityName={t('activity')}
      />

      <CrudDeleteModal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setIsDeleteAllModalOpen(false)}
        onConfirm={() => {
          router.delete(route('purchase-orders.delete-activities', purchaseOrder.id), { preserveScroll: true });
          setIsDeleteAllModalOpen(false);
        }}
        itemName={t('all activities for {{name}}', { name: purchaseOrder.name })}
        entityName={t('activities')}
      />
    </PageTemplate>
  );
}
