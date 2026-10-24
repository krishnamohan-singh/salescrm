import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { ArrowLeft, Layers, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

export default function ServiceEdit() {
    const { t } = useTranslation();
    const { service, categories = [], taxes = [], users = [] } = usePage().props as any;

    const [name, setName] = useState(service.name || '');
    const [code, setCode] = useState(service.code || '');
    const [categoryId, setCategoryId] = useState(service.category_id ? String(service.category_id) : '');
    const [taxId, setTaxId] = useState(service.tax_id ? String(service.tax_id) : '');
    const [price, setPrice] = useState(service.price !== undefined ? String(service.price) : '');
    const [billingCycle, setBillingCycle] = useState(service.billing_cycle || 'one_time');
    const [status, setStatus] = useState(service.status || 'active');
    const [assignedTo, setAssignedTo] = useState(service.assigned_to ? String(service.assigned_to) : '');
    const [description, setDescription] = useState(service.description || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Services'), href: route('services.index') },
        { title: service.name, href: route('services.show', service.id) },
        { title: t('Edit Service') },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};

        if (!name.trim()) errs.name = t('Service name is required');
        if (price === '' || isNaN(Number(price)) || Number(price) < 0) {
            errs.price = t('Please enter a valid price (minimum 0)');
        }

        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            return;
        }

        setIsSubmitting(true);
        router.put(route('services.update', service.id), {
            name: name.trim(),
            code: code.trim() || null,
            category_id: categoryId ? Number(categoryId) : null,
            tax_id: taxId ? Number(taxId) : null,
            price: parseFloat(price) || 0,
            billing_cycle: billingCycle,
            status: status,
            assigned_to: assignedTo ? Number(assignedTo) : null,
            description: description.trim() || null,
        }, {
            onError: (formErrors) => {
                setIsSubmitting(false);
                setErrors(formErrors);
                toast.error(t('Please fix the errors in the form.'));
            },
            onSuccess: () => {
                setIsSubmitting(false);
                toast.success(t('Service updated successfully!'));
            },
        });
    };

    return (
        <PageTemplate
            title={t('Edit Service: {{name}}', { name: service.name })}
            description={t('Update service details, pricing, and status')}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.visit(route('services.index')),
                },
            ]}
            noPadding
        >
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
                <Card className="shadow-sm">
                    <CardHeader className="border-b py-4 px-6">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Layers className="h-5 w-5 text-primary" />
                            <span>{t('Service Details')}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 md:col-span-2">
                                <Label htmlFor="service-name" required className="text-xs font-semibold">
                                    {t('Service Name')}
                                </Label>
                                <Input
                                    id="service-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={errors.name ? 'border-red-500' : ''}
                                />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="service-code" className="text-xs font-semibold">
                                    {t('Service Code / SKU')}
                                </Label>
                                <Input
                                    id="service-code"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className={errors.code ? 'border-red-500' : ''}
                                />
                                {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">{t('Category')}</Label>
                                <Select value={categoryId} onValueChange={setCategoryId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select category (optional)')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((c: any) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="service-price" required className="text-xs font-semibold">
                                    {t('Standard Base Price ($)')}
                                </Label>
                                <Input
                                    id="service-price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className={errors.price ? 'border-red-500' : ''}
                                />
                                {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">{t('Billing Period')}</Label>
                                <Select value={billingCycle} onValueChange={setBillingCycle}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="one_time">{t('One-Time (Project/Fixed)')}</SelectItem>
                                        <SelectItem value="hourly">{t('Hourly Rate')}</SelectItem>
                                        <SelectItem value="daily">{t('Daily Rate')}</SelectItem>
                                        <SelectItem value="monthly">{t('Monthly Recurring')}</SelectItem>
                                        <SelectItem value="quarterly">{t('Quarterly Recurring')}</SelectItem>
                                        <SelectItem value="yearly">{t('Yearly / Annual Retainer')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">{t('Tax Rate')}</Label>
                                <Select value={taxId} onValueChange={setTaxId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Select tax (optional)')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {taxes.map((tx: any) => (
                                            <SelectItem key={tx.id} value={String(tx.id)}>
                                                {tx.name} ({tx.rate}%)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">{t('Status')}</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('Active (Available for mapping)')}</SelectItem>
                                        <SelectItem value="inactive">{t('Inactive (Archived)')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">{t('Service Lead / Assignee')}</Label>
                                <Select value={assignedTo} onValueChange={setAssignedTo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Assign to user (optional)')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>
                                                {u.name} ({u.email})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5 pt-2">
                            <Label htmlFor="service-description" className="text-xs font-semibold">
                                {t('Scope of Work / Description')}
                            </Label>
                            <Textarea
                                id="service-description"
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.visit(route('services.index'))}
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
                        <span>{isSubmitting ? t('Saving...') : t('Update Service')}</span>
                    </Button>
                </div>
            </form>
        </PageTemplate>
    );
}
