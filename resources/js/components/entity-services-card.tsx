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
import { Layers, Plus, Trash2, ExternalLink, DollarSign, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';

interface EntityServicesCardProps {
    parentModule: 'lead' | 'account' | 'opportunity';
    parentId: number;
    parentName: string;
    services?: Array<any>;
    activeServices?: Array<{ id: number; name: string; code?: string; base_price?: number; price?: number; billing_cycle?: string }>;
    permissions?: string[];
}

export function EntityServicesCard({
    parentModule,
    parentId,
    parentName,
    services = [],
    activeServices = [],
    permissions = [],
}: EntityServicesCardProps) {
    const { t } = useTranslation();

    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [status, setStatus] = useState('active');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [unmappingServiceId, setUnmappingServiceId] = useState<number | null>(null);

    const canEdit =
        parentModule === 'lead' ? hasPermission(permissions, 'edit-leads') :
        parentModule === 'account' ? hasPermission(permissions, 'edit-accounts') :
        hasPermission(permissions, 'edit-opportunities');

    const formatCurrency = (amount: number) =>
        window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

    const getBillingCycleLabel = (cycle?: string) => {
        switch (cycle) {
            case 'hourly': return t('Hourly');
            case 'daily': return t('Daily');
            case 'monthly': return t('Monthly');
            case 'quarterly': return t('Quarterly');
            case 'yearly': return t('Yearly');
            default: return t('One-Time');
        }
    };

    const handleOpenMapModal = () => {
        setSelectedServiceId('');
        setPrice('');
        setQuantity('1');
        setStatus('active');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setNotes('');
        setIsMapModalOpen(true);
    };

    const handleServiceSelect = (serviceId: string) => {
        setSelectedServiceId(serviceId);
        const s = activeServices.find((item) => String(item.id) === serviceId);
        if (s) {
            setPrice(String(s.base_price ?? s.price ?? 0));
        }
    };

    const handleAttach = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedServiceId) {
            toast.error(t('Please select a service'));
            return;
        }

        setIsSubmitting(true);

        const routeName =
            parentModule === 'lead' ? 'leads.services.attach' :
            parentModule === 'account' ? 'accounts.services.attach' :
            'opportunities.services.attach';

        const payload: any = {
            service_id: Number(selectedServiceId),
            notes: notes.trim() || null,
        };

        if (parentModule === 'opportunity') {
            const qty = Math.max(1, parseInt(quantity) || 1);
            const unitPrice = parseFloat(price) || 0;
            payload.quantity = qty;
            payload.unit_price = unitPrice;
            payload.total_price = qty * unitPrice;
        } else {
            payload.price = price !== '' ? parseFloat(price) : null;
            if (parentModule === 'account') {
                payload.status = status;
                payload.start_date = startDate || null;
                payload.end_date = endDate || null;
            }
        }

        router.post(route(routeName, parentId), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                setIsMapModalOpen(false);
                toast.success(t('Service mapped successfully!'));
            },
            onError: (errs) => {
                setIsSubmitting(false);
                const first = Object.values(errs)[0];
                toast.error(first ? String(first) : t('Failed to map service'));
            },
        });
    };

    const handleDetach = (serviceId: number) => {
        if (!confirm(t('Are you sure you want to remove this service association?'))) {
            return;
        }

        setUnmappingServiceId(serviceId);

        const routeName =
            parentModule === 'lead' ? 'leads.services.detach' :
            parentModule === 'account' ? 'accounts.services.detach' :
            'opportunities.services.detach';

        router.delete(route(routeName, { [parentModule]: parentId, service: serviceId }), {
            preserveScroll: true,
            onSuccess: () => {
                setUnmappingServiceId(null);
                toast.success(t('Service removed successfully!'));
            },
            onError: () => {
                setUnmappingServiceId(null);
                toast.error(t('Failed to remove service'));
            },
        });
    };

    return (
        <>
            <Card className="shadow-sm">
                <CardHeader className="border-b py-3 px-4">
                    <CardTitle className="flex items-center justify-between text-sm font-semibold">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <span>{t('Services & Offerings')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {services.length}
                            </span>
                            {canEdit && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 text-xs flex items-center gap-1"
                                    onClick={handleOpenMapModal}
                                >
                                    <Plus className="h-3 w-3" />
                                    {t('Map Service')}
                                </Button>
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {services.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                <Layers className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-medium text-foreground">{t('No services mapped yet')}</p>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                {t('Associate IT, software, or business services with this {{module}} to track interested offerings, contracts, or service scope.', { module: parentModule })}
                            </p>
                            {canEdit && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenMapModal}
                                    className="mt-2 text-xs"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    {t('Map First Service')}
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {services.map((service) => {
                                const pivot = service.pivot || {};
                                const itemPrice = pivot.price !== null && pivot.price !== undefined ? pivot.price : service.price;

                                return (
                                    <div key={service.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-sm text-foreground truncate">
                                                    {service.name}
                                                </span>
                                                {service.code && (
                                                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                        {service.code}
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                                    {getBillingCycleLabel(service.billing_cycle)}
                                                </span>
                                                {parentModule === 'account' && pivot.status && (
                                                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                                                        pivot.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                                                        pivot.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                                                        'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                                    }`}>
                                                        {pivot.status}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Details & Pricing */}
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-0.5">
                                                {parentModule === 'opportunity' ? (
                                                    <span className="font-medium text-foreground">
                                                        {t('Qty')}: <span className="font-mono">{pivot.quantity || 1}</span> × {formatCurrency(pivot.unit_price || itemPrice)} = <span className="font-semibold text-emerald-600 font-mono">{formatCurrency(pivot.total_price || itemPrice)}</span>
                                                    </span>
                                                ) : (
                                                    <span className="font-semibold text-emerald-600 font-mono">
                                                        {formatCurrency(itemPrice)}
                                                    </span>
                                                )}

                                                {parentModule === 'account' && (pivot.start_date || pivot.end_date) && (
                                                    <span className="flex items-center gap-1 text-[11px]">
                                                        <Calendar className="h-3 w-3" />
                                                        {pivot.start_date ? window.appSettings?.formatDateTime(pivot.start_date, false) : '—'}
                                                        {' → '}
                                                        {pivot.end_date ? window.appSettings?.formatDateTime(pivot.end_date, false) : t('Ongoing')}
                                                    </span>
                                                )}
                                            </div>

                                            {pivot.notes && (
                                                <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                                                    "{pivot.notes}"
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {hasPermission(permissions, 'view-services') && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <a
                                                                href={route('services.show', service.id)}
                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>{t('View Service in Catalog')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}

                                            {canEdit && (
                                                <TooltipProvider delayDuration={200}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={unmappingServiceId === service.id}
                                                                onClick={() => handleDetach(service.id)}
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">
                                                            <p>{t('Remove Association')}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Map Service Modal */}
            <Dialog open={isMapModalOpen} onOpenChange={(open) => !open && setIsMapModalOpen(false)}>
                <DialogContent className="max-w-md p-0">
                    <DialogHeader className="p-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold">
                                    {t('Map Service to {{name}}', { name: parentName })}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    {t('Select an offering from your services catalog to associate.')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleAttach} className="p-6 space-y-4">
                        <div className="space-y-1.5">
                            <Label required className="text-xs font-semibold">{t('Service')}</Label>
                            <Select value={selectedServiceId} onValueChange={handleServiceSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select a service...')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeServices.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            <div className="flex items-center justify-between gap-3 w-full">
                                                <span>{s.name}</span>
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {formatCurrency(s.base_price ?? s.price ?? 0)}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {parentModule === 'opportunity' ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label required className="text-xs font-semibold">{t('Quantity / Units')}</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label required className="text-xs font-semibold">{t('Unit Price ($)')}</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2 p-2.5 rounded-lg bg-muted/50 border flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{t('Total Price')}</span>
                                    <span className="font-bold text-foreground font-mono text-sm">
                                        {formatCurrency((parseInt(quantity) || 1) * (parseFloat(price) || 0))}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">{t('Agreed / Custom Price ($)')}</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder={t('Leave blank to use catalog rate')}
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                />
                            </div>
                        )}

                        {parentModule === 'account' && (
                            <>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t('Contract / Delivery Status')}</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active / Contracted')}</SelectItem>
                                            <SelectItem value="pending">{t('Pending Start')}</SelectItem>
                                            <SelectItem value="completed">{t('Delivered / Completed')}</SelectItem>
                                            <SelectItem value="suspended">{t('Suspended')}</SelectItem>
                                            <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">{t('Start Date')}</Label>
                                        <Input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">{t('End Date')}</Label>
                                        <Input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{t('Notes & Scope Details')}</Label>
                            <Textarea
                                rows={3}
                                placeholder={t('Specify any special terms, client requirements, or deliverables...')}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <DialogFooter className="pt-3 border-t">
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
                                disabled={isSubmitting}
                                className="bg-primary text-primary-foreground gap-1.5"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{isSubmitting ? t('Saving...') : t('Map Service')}</span>
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
