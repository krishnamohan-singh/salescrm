import { PageTemplate } from '@/components/page-template';
import { usePage, useForm, router } from '@inertiajs/react';
import { ArrowLeft, Trash2, Plus, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

export default function OpportunityEdit() {
    const { t } = useTranslation();
    const {
        opportunity,
        accounts = [],
        contacts = [],
        opportunityStages = [],
        opportunitySources = [],
        products: productOptions = [],
        users = [],
    } = usePage().props as any;

    const { data, setData, setError, clearErrors, put, processing, errors } = useForm({
        name: opportunity.name || '',
        description: opportunity.description || '',
        close_date: opportunity.close_date ? opportunity.close_date.split('T')[0].split(' ')[0] : '',
        account_id: String(opportunity.account_id || ''),
        contact_id: String(opportunity.contact_id || ''),
        opportunity_stage_id: String(opportunity.opportunity_stage_id || ''),
        opportunity_source_id: String(opportunity.opportunity_source_id || ''),
        notes: opportunity.notes || '',
        assigned_to: String(opportunity.assigned_to || ''),
        status: opportunity.status || 'active',
        products: (opportunity.products || []).map((p: any) => ({
            product_id: String(p.id),
            quantity: String(p.pivot.quantity),
            unit_price: String(p.pivot.unit_price),
        })),
    });

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Opportunity Management') },
        { title: t('Opportunities'), href: route('opportunities.index') },
        { title: t('Edit') },
    ];

    const handleInputChange = (name: string, value: string) => {
        setData(name as any, value);
        clearErrors(name as any);
    };

    const addProductRow = () => {
        setData('products', [...data.products, { product_id: '', quantity: '1', unit_price: '' }]);
    };

    const removeProductRow = (index: number) => {
        if (data.products.length <= 1) return;
        setData('products', data.products.filter((_, i) => i !== index));
    };

    const updateProductRow = (index: number, field: string, value: string) => {
        const updated = data.products.map((row, i) => {
            if (i !== index) return row;
            const newRow = { ...row, [field]: value };
            if (field === 'product_id') {
                const product = productOptions.find((p: any) => String(p.id) === value);
                if (product) newRow.unit_price = String(product.price);
            }
            return newRow;
        });
        setData('products', updated);
        clearErrors(`products.${index}.${field}` as any);
    };

    const getProductTax = (productId: string) => {
        const product = productOptions.find((p: any) => String(p.id) === productId);
        return product?.tax || null;
    };

    const calcLineTotal = (row: any) => (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0);
    const calcTaxAmount = (row: any) => {
        const tax = getProductTax(row.product_id);
        return tax ? (calcLineTotal(row) * tax.rate) / 100 : 0;
    };

    const subtotal = data.products.reduce((s, r) => s + calcLineTotal(r), 0);
    const totalTax = data.products.reduce((s, r) => s + calcTaxAmount(r), 0);
    const grandTotal = subtotal + totalTax;
    const fmt = (v: number) => window.appSettings?.formatCurrency(v) || `$${v.toFixed(2)}`;

    const requiredFields: { name: keyof typeof data; label: string }[] = [
        { name: 'name', label: t('Opportunity Name') },
        { name: 'account_id', label: t('Account') },
        { name: 'contact_id', label: t('Contact') },
        { name: 'opportunity_stage_id', label: t('Stage') },
        { name: 'opportunity_source_id', label: t('Source') },
        { name: 'assigned_to', label: t('Assign To') },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clientErrors: Record<string, string> = {};

        requiredFields.forEach(({ name, label }) => {
            if (!data[name]) clientErrors[name] = `${label} is required`;
        });

        if (data.products.length === 0) {
            clientErrors['products'] = t('At least one product is required');
        } else {
            data.products.forEach((row, i) => {
                if (!row.product_id) clientErrors[`products.${i}.product_id`] = t('Product is required');
                if (!row.quantity || parseFloat(row.quantity) < 1) clientErrors[`products.${i}.quantity`] = t('Min 1');
                if (row.unit_price === '' || parseFloat(row.unit_price) < 0) clientErrors[`products.${i}.unit_price`] = t('Required');
            });
        }

        if (Object.keys(clientErrors).length > 0) {
            Object.entries(clientErrors).forEach(([key, msg]) => setError(key as any, msg));
            return;
        }

        toast.loading(t('Updating opportunity...'));
        put(route('opportunities.update', opportunity.id), {
            onSuccess: () => toast.dismiss(),
            onError: () => toast.dismiss(),
        });
    };

    return (
        <PageTemplate
            title={t('Edit Opportunity')}
            description={t('Edit opportunity details and related information')}
            breadcrumbs={breadcrumbs}
            actions={[{
                label: t('Back'),
                icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                variant: 'outline',
                onClick: () => router.visit(route('opportunities.index')),
            }]}
            noPadding
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* ROW 1 — Basic Information + Classification */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">

                    {/* Basic Information */}
                    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 flex flex-col h-full">
                        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Basic Information')}</h2>
                        </div>
                        <div className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium" required>
                                    {t('Opportunity Name')}
                                </Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className={errors.name ? 'border-red-500' : ''}
                                    placeholder={t('eg. Enterprise Software Deal')}
                                />
                                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-medium">
                                    {t('Description')}
                                </Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    className={errors.description ? 'border-red-500' : ''}
                                    rows={3}
                                    placeholder={t('Enter opportunity description...')}
                                />
                                {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="close_date" className="text-sm font-medium">
                                        {t('Close Date')}
                                    </Label>
                                    <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                                    <Input
                                        id="close_date"
                                        type="date"
                                        value={data.close_date}
                                        onChange={(e) => handleInputChange('close_date', e.target.value)}
                                        className={`cursor-pointer ${errors.close_date ? 'border-red-500' : ''}`}
                                    />
                                    </div>
                                    {errors.close_date && <p className="text-xs text-red-500">{errors.close_date}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">{t('Status')}</Label>
                                    <Select value={data.status} onValueChange={(v) => handleInputChange('status', v)}>
                                        <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.status && <p className="text-xs text-red-500">{errors.status}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes" className="text-sm font-medium">
                                    {t('Notes')}
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={data.notes}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                    className={errors.notes ? 'border-red-500' : ''}
                                    rows={3}
                                    placeholder={t('Enter any additional notes...')}
                                />
                                {errors.notes && <p className="text-xs text-red-500">{errors.notes}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Classification */}
                    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 flex flex-col h-full">
                        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Classification')}</h2>
                        </div>
                        <div className="space-y-4 p-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium" required>{t('Account')}</Label>
                                <Select value={data.account_id} onValueChange={(v) => handleInputChange('account_id', v)}>
                                    <SelectTrigger className={errors.account_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select account')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {accounts.map((a: any) => (
                                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.account_id && <p className="text-xs text-red-500">{errors.account_id}</p>}
                                {accounts.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('accounts.index')} className="underline font-medium">{t('Accounts')}</a></p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium" required>{t('Contact')}</Label>
                                <Select value={data.contact_id} onValueChange={(v) => handleInputChange('contact_id', v)}>
                                    <SelectTrigger className={errors.contact_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select contact')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {contacts.map((c: any) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.contact_id && <p className="text-xs text-red-500">{errors.contact_id}</p>}
                                {contacts.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('contacts.index')} className="underline font-medium">{t('Contacts')}</a></p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium" required>{t('Stage')}</Label>
                                <Select value={data.opportunity_stage_id} onValueChange={(v) => handleInputChange('opportunity_stage_id', v)}>
                                    <SelectTrigger className={errors.opportunity_stage_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select stage')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {opportunityStages.map((s: any) => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.opportunity_stage_id && <p className="text-xs text-red-500">{errors.opportunity_stage_id}</p>}
                                {opportunityStages.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('opportunity-stages.index')} className="underline font-medium">{t('Opportunity Stages')}</a></p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium" required>{t('Source')}</Label>
                                <Select value={data.opportunity_source_id} onValueChange={(v) => handleInputChange('opportunity_source_id', v)}>
                                    <SelectTrigger className={errors.opportunity_source_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select source')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {opportunitySources.map((s: any) => (
                                            <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.opportunity_source_id && <p className="text-xs text-red-500">{errors.opportunity_source_id}</p>}
                                {opportunitySources.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('opportunity-sources.index')} className="underline font-medium">{t('Opportunity Sources')}</a></p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROW 2 — Products */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 dark:border-gray-700 dark:bg-gray-700 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Products')}</h2>
                        <Button type="button" size="sm" onClick={addProductRow}>
                            <Plus className="h-4 w-4 mr-1" />
                            {t('Add Product')}
                        </Button>
                    </div>
                    <div className="p-6">
                        {errors.products && <p className="text-xs text-red-500 mb-3">{errors.products}</p>}

                        {data.products.length === 0 ? (
                            <div
                                className="flex flex-col items-center justify-center py-14 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                                onClick={addProductRow}
                            >
                                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                    <PackagePlus className="h-7 w-7 text-primary" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">{t('No products added yet')}</p>
                                <p className="text-xs text-muted-foreground mt-1">{t('Click here or use the Add Product button above')}</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-t border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                            <th className="px-3 py-2 text-left">{t('Product')} <span className="text-red-500">*</span></th>
                                            <th className="px-3 py-2 text-left w-16">{t('Qty')} <span className="text-red-500">*</span></th>
                                            <th className="px-3 py-2 text-left w-20">{t('Unit Price')} <span className="text-red-500">*</span></th>
                                            <th className="px-3 py-2 text-left w-40">{t('Tax')}</th>
                                            <th className="px-3 py-2 text-left w-32">{t('Line Total')}</th>
                                            <th className="px-3 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.products.map((row, i) => {
                                            const lineTotal = calcLineTotal(row);
                                            const taxAmt = calcTaxAmount(row);
                                            const tax = getProductTax(row.product_id);
                                            return (
                                                <tr key={i} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="px-3 py-2 w-48">
                                                        <Select value={row.product_id} onValueChange={(v) => updateProductRow(i, 'product_id', v)}>
                                                            <SelectTrigger className={errors[`products.${i}.product_id`] ? 'border-red-500' : ''}>
                                                                <SelectValue placeholder={t('Select product')} />
                                                            </SelectTrigger>
                                                            <SelectContent searchable>
                                                                {productOptions.filter((p: any) => !data.products.some((r, ri) => ri !== i && String(r.product_id) === String(p.id))).map((p: any) => (
                                                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {errors[`products.${i}.product_id`] && <p className="text-xs text-red-500 mt-1">{errors[`products.${i}.product_id`]}</p>}
                                                        {i === 0 && productOptions.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('products.index')} className="underline font-medium">{t('Products')}</a></p>}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <Input
                                                            type="number" min="1"
                                                            value={row.quantity}
                                                            onChange={(e) => updateProductRow(i, 'quantity', e.target.value)}
                                                            className={`text-left w-full ${errors[`products.${i}.quantity`] ? 'border-red-500' : ''}`}
                                                            placeholder="1"
                                                        />
                                                        {errors[`products.${i}.quantity`] && <p className="text-xs text-red-500 mt-1">{errors[`products.${i}.quantity`]}</p>}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <Input
                                                            type="number" step="0.01" min="0"
                                                            value={row.unit_price}
                                                            onChange={(e) => updateProductRow(i, 'unit_price', e.target.value)}
                                                            className={`text-left w-full ${errors[`products.${i}.unit_price`] ? 'border-red-500' : ''}`}
                                                            placeholder="0.00"
                                                        />
                                                        {errors[`products.${i}.unit_price`] && <p className="text-xs text-red-500 mt-1">{errors[`products.${i}.unit_price`]}</p>}
                                                    </td>
                                                    <td className="px-3 py-2 text-left">
                                                        <span className="text-sm font-medium text-muted-foreground">
                                                            {tax ? `${tax.name} (${parseFloat(tax.rate).toFixed(2)}%)` : t('No Tax')}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-left">
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">{fmt(lineTotal + taxAmt)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-left">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeProductRow(i)}
                                                            disabled={data.products.length <= 1}
                                                            className="h-8 w-8 flex items-center justify-center rounded-md text-gray-500 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-gray-500" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Totals panel — card footer */}
                    {data.products.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
                            <div className="w-72 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('Subtotal')}</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">{fmt(subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('Tax')}</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white font-mono">{fmt(totalTax)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-600 pt-2">
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{t('Grand Total')}</span>
                                    <span className="text-base font-bold text-green-600 dark:text-green-400 font-mono">{fmt(grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ROW 3 — Assignment */}
                <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('Assignment')}</h2>
                    </div>
                    <div className="space-y-4 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium" required>{t('Assign To')}</Label>
                                <Select value={data.assigned_to} onValueChange={(v) => handleInputChange('assigned_to', v)}>
                                    <SelectTrigger className={errors.assigned_to ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select user')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {users.map((u: any) => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.email})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.assigned_to && <p className="text-xs text-red-500">{errors.assigned_to}</p>}
                                {users.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('users.index')} className="underline font-medium">{t('Users')}</a></p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline" onClick={() => router.visit(route('opportunities.index'))}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing ? t('Saving...') : t('Save')}
                    </Button>
                </div>
            </form>
        </PageTemplate>
    );
}
