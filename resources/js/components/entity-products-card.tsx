import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShoppingBag, Package, Plus, Trash2, ExternalLink, DollarSign, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';

interface EntityProductsCardProps {
    parentModule: 'lead' | 'account' | 'opportunity';
    parentId: number;
    parentName: string;
    products?: Array<any>;
    activeProducts?: Array<{
        id: number;
        name: string;
        sku?: string;
        price?: number;
        category?: { id: number; name: string };
        tax?: { id: number; name: string; rate: number };
        main_image_url?: string;
    }>;
    permissions?: string[];
}

export function EntityProductsCard({
    parentModule,
    parentId,
    parentName,
    products = [],
    activeProducts = [],
    permissions = [],
}: EntityProductsCardProps) {
    const { t } = useTranslation();

    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [status, setStatus] = useState('active');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [unmappingProductId, setUnmappingProductId] = useState<number | null>(null);

    const canEdit =
        parentModule === 'lead' ? hasPermission(permissions, 'edit-leads') :
        parentModule === 'account' ? hasPermission(permissions, 'edit-accounts') :
        hasPermission(permissions, 'edit-opportunities');

    const formatCurrency = (amount: number) =>
        window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

    const handleOpenMapModal = () => {
        setSelectedProductId('');
        setUnitPrice('');
        setQuantity('1');
        setStatus('active');
        setNotes('');
        setIsMapModalOpen(true);
    };

    const handleProductSelect = (productId: string) => {
        setSelectedProductId(productId);
        const p = activeProducts.find((item) => String(item.id) === productId);
        if (p) {
            setUnitPrice(String(p.price ?? 0));
        }
    };

    const handleAttach = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId) {
            toast.error(t('Please select a product'));
            return;
        }

        setIsSubmitting(true);

        const routeName =
            parentModule === 'lead' ? 'leads.products.attach' :
            parentModule === 'account' ? 'accounts.products.attach' :
            'opportunities.products.attach';

        const qty = Math.max(1, parseInt(quantity) || 1);
        const priceNum = parseFloat(unitPrice) || 0;

        const payload: any = {
            product_id: Number(selectedProductId),
            quantity: qty,
            unit_price: priceNum,
            notes: notes.trim() || null,
        };

        if (parentModule === 'account') {
            payload.status = status;
        }

        router.post(route(routeName, parentId), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                setIsMapModalOpen(false);
                toast.success(t('Product tagged successfully!'));
            },
            onError: (errs) => {
                setIsSubmitting(false);
                const first = Object.values(errs)[0];
                toast.error(first ? String(first) : t('Failed to tag product'));
            },
        });
    };

    const handleDetach = (productId: number) => {
        if (!confirm(t('Are you sure you want to remove this product tag?'))) {
            return;
        }

        setUnmappingProductId(productId);

        const routeName =
            parentModule === 'lead' ? 'leads.products.detach' :
            parentModule === 'account' ? 'accounts.products.detach' :
            'opportunities.products.detach';

        router.delete(route(routeName, { [parentModule]: parentId, product: productId }), {
            preserveScroll: true,
            onSuccess: () => {
                setUnmappingProductId(null);
                toast.success(t('Product removed successfully!'));
            },
            onError: () => {
                setUnmappingProductId(null);
                toast.error(t('Failed to remove product'));
            },
        });
    };

    const totalCalculated = (parseInt(quantity) || 1) * (parseFloat(unitPrice) || 0);

    return (
        <Card className="shadow-sm overflow-hidden">
            <CardHeader className="border-b py-3.5 px-5">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-lg font-semibold text-foreground">
                        <ShoppingBag className="h-5 w-5 mr-3 text-amber-600 dark:text-amber-500" />
                        {t('Tagged Products (Catalogue)')}
                        {products.length > 0 && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 px-2.5 py-0.5 text-xs font-bold">
                                {products.length} {products.length === 1 ? t('item') : t('items')}
                            </span>
                        )}
                    </CardTitle>

                    {canEdit && (
                        <Button
                            size="sm"
                            onClick={handleOpenMapModal}
                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs text-xs font-semibold h-8"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {t('Tag Product')}
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {products && products.length > 0 ? (
                    <div className="divide-y divide-border">
                        {products.map((product: any) => {
                            const pivot = product.pivot || {};
                            const qty = pivot.quantity || 1;
                            const uPrice = pivot.unit_price !== null && pivot.unit_price !== undefined ? pivot.unit_price : product.price;
                            const lineTotal = pivot.total_price !== null && pivot.total_price !== undefined ? pivot.total_price : (qty * uPrice);

                            return (
                                <div
                                    key={product.id}
                                    className="p-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                        <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/60 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                                            {product.main_image_url ? (
                                                <img src={product.main_image_url} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                                            ) : (
                                                <Package className="h-5 w-5" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-sm font-bold text-foreground">
                                                    {product.name}
                                                </h4>
                                                {product.sku && (
                                                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                                        SKU: {product.sku}
                                                    </span>
                                                )}
                                                {product.category?.name && (
                                                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                                                        {product.category.name}
                                                    </span>
                                                )}
                                                {parentModule === 'account' && pivot.status && (
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                        pivot.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                        pivot.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                        pivot.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                                        'bg-sky-50 text-sky-700 border border-sky-200'
                                                    }`}>
                                                        {pivot.status}
                                                    </span>
                                                )}
                                            </div>

                                            {pivot.notes && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                                                    "{pivot.notes}"
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pricing & Actions */}
                                    <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                                        <div className="text-left md:text-right">
                                            <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(lineTotal)}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {qty} × {formatCurrency(uPrice)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <TooltipProvider delayDuration={200}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                            onClick={() => router.get(route('products.show', product.id))}
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top">
                                                        <p>{t('View Product in Catalogue')}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            {canEdit && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={unmappingProductId === product.id}
                                                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                                onClick={() => handleDetach(product.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>{t('Remove product tag')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-12 px-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground/50">
                            <ShoppingBag className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">{t('No Products Tagged')}</h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            {t('Tag products from your catalogue to this {{module}} to track interested or purchased inventory.', { module: parentModule })}
                        </p>
                        {canEdit && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleOpenMapModal}
                                className="mt-4 text-xs font-semibold border-dashed"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1 text-amber-600" />
                                {t('Tag First Product')}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>

            {/* Dialog: Tag Product from Catalogue */}
            <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <ShoppingBag className="h-5 w-5 text-amber-600" />
                            {t('Tag Product to {{name}}', { name: parentName })}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {t('Select an active product from your Catalogue and specify quantity and agreed pricing.')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAttach} className="space-y-4 py-2">
                        {/* Product selection */}
                        <div className="space-y-1.5">
                            <Label htmlFor="product_id" className="text-xs font-semibold">
                                {t('Select Product from Catalogue')} <span className="text-rose-500">*</span>
                            </Label>
                            <Select value={selectedProductId} onValueChange={handleProductSelect}>
                                <SelectTrigger id="product_id" className="text-xs">
                                    <SelectValue placeholder={t('Choose a product...')} />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                    {activeProducts.length > 0 ? (
                                        activeProducts.map((prod) => (
                                            <SelectItem key={prod.id} value={String(prod.id)} className="text-xs">
                                                <div className="flex items-center justify-between w-full gap-4">
                                                    <span>{prod.name} {prod.sku && `(${prod.sku})`}</span>
                                                    <span className="font-mono text-emerald-600 font-semibold">{formatCurrency(prod.price ?? 0)}</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <div className="p-3 text-center text-xs text-muted-foreground">
                                            {t('No active products found in catalogue')}
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Quantity and Unit Price */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="product_quantity" className="text-xs font-semibold">
                                    {t('Quantity')}
                                </Label>
                                <Input
                                    id="product_quantity"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="product_unit_price" className="text-xs font-semibold">
                                    {t('Unit Price')}
                                </Label>
                                <Input
                                    id="product_unit_price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        {/* Total Preview */}
                        <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">{t('Estimated Total')}:</span>
                            <span className="text-sm font-bold font-mono text-emerald-600">
                                {formatCurrency(totalCalculated)}
                            </span>
                        </div>

                        {parentModule === 'account' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="product_status" className="text-xs font-semibold">
                                    {t('Status')}
                                </Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger id="product_status" className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active / Contracted')}</SelectItem>
                                        <SelectItem value="delivered">{t('Delivered')}</SelectItem>
                                        <SelectItem value="pending">{t('Pending Delivery')}</SelectItem>
                                        <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <Label htmlFor="product_notes" className="text-xs font-semibold">
                                {t('Notes / Custom terms')}
                            </Label>
                            <Textarea
                                id="product_notes"
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t('Special discounts, warranty, delivery instructions...')}
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsMapModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || !selectedProductId}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                            >
                                {isSubmitting ? t('Tagging...') : t('Tag Product')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
