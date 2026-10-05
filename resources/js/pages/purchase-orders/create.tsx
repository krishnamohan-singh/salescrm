import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, useForm,router } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

type ProductRow = {
    id: number;
    product_id: string;
    quantity: string;
    unit_price: string;
    discount_type: string;
    discount_value: string;
};

export default function PurchaseOrderCreate() {
    const { t } = useTranslation();
    const {
        accounts = [],
        contacts = [],
        salesOrders = [],
        products: productOptions = [],
        users = [],
    } = usePage().props as any;

    const { data, setData, setError, clearErrors, post, processing, errors } = useForm({
        name: '',
        description: '',
        sales_order_id: '',
        account_id: '',
        billing_contact_id: '',
        shipping_contact_id: '',
        status: 'draft',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        assigned_to: '',
        billing_address: '',
        billing_city: '',
        billing_state: '',
        billing_postal_code: '',
        billing_country: '',
        shipping_address: '',
        shipping_city: '',
        shipping_state: '',
        shipping_postal_code: '',
        shipping_country: '',
        products: [{ product_id: '', quantity: '1', unit_price: '0', discount_type: 'none', discount_value: '0' }] as ProductRow[],
    });

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Purchase Orders'), href: route('purchase-orders.index') },
        { title: t('Create') },
    ];

    const set = (name: string, value: string) => {
        setData(name as any, value);
        clearErrors(name as any);
    };

    const handleSalesOrderChange = async (id: string) => {
        set('sales_order_id', id);
        if (!id) return;
        try {
            const res = await fetch(route('api.sales-orders.details', id));
            const details = await res.json();
            if (details && !details.error) {
                setData((prev: any) => ({
                    ...prev,
                    sales_order_id: id,
                    account_id: details.account_id ? String(details.account_id) : prev.account_id,
                    billing_contact_id: details.billing_contact_id ? String(details.billing_contact_id) : prev.billing_contact_id,
                    shipping_contact_id: details.shipping_contact_id ? String(details.shipping_contact_id) : prev.shipping_contact_id,
                    billing_address: details.billing_address || '',
                    billing_city: details.billing_city || '',
                    billing_state: details.billing_state || '',
                    billing_postal_code: details.billing_postal_code || '',
                    billing_country: details.billing_country || '',
                    shipping_address: details.shipping_address || '',
                    shipping_city: details.shipping_city || '',
                    shipping_state: details.shipping_state || '',
                    shipping_postal_code: details.shipping_postal_code || '',
                    shipping_country: details.shipping_country || '',
                    products: details.products?.length
                        ? details.products.map((p: any, i: number) => ({
                            id: Date.now() + i,
                            product_id: String(p.product_id),
                            quantity: String(p.quantity || 1),
                            unit_price: String(p.unit_price ?? 0),
                            discount_type: p.discount_type || 'none',
                            discount_value: String(p.discount_value || '0'),
                        }))
                        : prev.products,
                }));
                clearErrors('account_id' as any);
                clearErrors('billing_contact_id' as any);
                clearErrors('shipping_contact_id' as any);
                if (details.products?.length) {
                    clearErrors('products' as any);
                    details.products.forEach((_: any, i: number) => clearErrors(`products.${i}.product_id` as any));
                }
            }
        } catch { }
    };

    const addProductRow = () =>
        setData('products', [...data.products, { id: Date.now(), product_id: '', quantity: '1', unit_price: '0', discount_type: 'none', discount_value: '0' }]);

    const removeProductRow = (id: number) => {
        if (data.products.length <= 1) return;
        setData('products', data.products.filter((r) => r.id !== id));
    };

    const updateProductRow = (id: number, field: string, value: string) => {
        const i = data.products.findIndex((r) => r.id === id);
        const updated = data.products.map((row) => {
            if (row.id !== id) return row;
            const newRow = { ...row, [field]: value };
            if (field === 'product_id') {
                const p = productOptions.find((p: any) => String(p.id) === value);
                if (p) newRow.unit_price = String(p.price);
            }
            return newRow;
        });
        setData('products', updated);
        if (i >= 0) clearErrors(`products.${i}.${field}` as any);
        if (field === 'product_id' && value) clearErrors('products' as any);
    };

    const calcLineTotal = (row: ProductRow) => (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_price) || 0);

    const calcDiscount = (row: ProductRow) => {
        const lineTotal = calcLineTotal(row);
        const val = parseFloat(row.discount_value) || 0;
        if (!val || row.discount_type === 'none') return 0;
        if (row.discount_type === 'percentage') return (lineTotal * val) / 100;
        return Math.min(val, lineTotal);
    };

    const calcTax = (row: ProductRow) => {
        const product = productOptions.find((p: any) => String(p.id) === row.product_id);
        const after = calcLineTotal(row) - calcDiscount(row);
        return product?.tax ? (after * product.tax.rate) / 100 : 0;
    };

    const subtotal = data.products.reduce((s, r) => s + calcLineTotal(r) - calcDiscount(r), 0);
    const totalDiscount = data.products.reduce((s, r) => s + calcDiscount(r), 0);
    const totalTax = data.products.reduce((s, r) => s + calcTax(r), 0);
    const grandTotal = subtotal + totalTax;
    const fmt = (v: number) => window.appSettings?.formatCurrency(v) || `$${v.toFixed(2)}`;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};

        if (!data.name) errs.name = t('Purchase Order Name is required');
        if (!data.sales_order_id) errs.sales_order_id = t('Sales Order is required');
        if (!data.account_id) errs.account_id = t('Account is required');
        if (!data.billing_contact_id) errs.billing_contact_id = t('Billing Contact is required');
        if (!data.shipping_contact_id) errs.shipping_contact_id = t('Shipping Contact is required');
        if (!data.order_date) errs.order_date = t('Order Date is required');
        if (!data.assigned_to) errs.assigned_to = t('Assign To is required');

        if (!data.products.length || data.products.every((r: any) => !r.product_id))
            errs.products = t('At least one product is required');

        data.products.forEach((row, i) => {
            if (!row.product_id) errs[`products.${i}.product_id`] = t('Product is required');
            if (row.product_id && (!row.quantity || parseFloat(row.quantity) < 1)) errs[`products.${i}.quantity`] = t('Min 1');
            if (row.product_id && (row.unit_price === '' || parseFloat(row.unit_price) < 0)) errs[`products.${i}.unit_price`] = t('Required');
        });

        if (Object.keys(errs).length > 0) {
            Object.entries(errs).forEach(([k, v]) => setError(k as any, v));
            return;
        }

        toast.loading(t('Creating purchase order...'));
        post(route('purchase-orders.store'), {
            onSuccess: () => toast.dismiss(),
            onError: () => { toast.dismiss(); },
        });
    };

    return (
        <PageTemplate
            title={t('Create Purchase Order')}
            description={t('Fill in the details to create a new purchase order')}
            breadcrumbs={breadcrumbs}
            actions={[{
                label: t('Back'),
                icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                variant: 'outline',
                onClick: () => router.visit(route('purchase-orders.index'))
            }]}
            noPadding
        >
            <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">

                    {/* ── PURCHASE ORDER DETAILS ── */}
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-base font-bold text-gray-900 dark:text-white">{t('Purchase Order Details')}</p>
                    </div>

                    <div className="px-6 py-5 space-y-4 border-b border-gray-200 dark:border-gray-700">
                        {/* PO Name */}
                        <div className="space-y-1">
                            <Label className="text-sm font-medium" required>{t('Purchase Order Name')}</Label>
                            <Input
                                value={data.name}
                                onChange={(e) => set('name', e.target.value)}
                                className={errors.name ? 'border-red-500' : ''}
                                placeholder={t('e.g. Q3 Raw Materials Restock')}
                            />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>

                        {/* Description */}
                        <div className="space-y-1">
                            <Label className="text-sm font-medium">{t('Description')}</Label>
                            <Textarea
                                value={data.description}
                                onChange={(e) => set('description', e.target.value)}
                                rows={3}
                                placeholder={t('Brief description of this purchase order...')}
                            />
                        </div>

                        {/* Sales Order + Account */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium" required>{t('Sales Order')}</Label>
                                <Select value={data.sales_order_id} onValueChange={handleSalesOrderChange}>
                                    <SelectTrigger className={errors.sales_order_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select sales order')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {salesOrders.map((so: any) => (
                                            <SelectItem key={so.id} value={String(so.id)}>{so.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.sales_order_id && <p className="text-xs text-red-500">{errors.sales_order_id}</p>}
                                {salesOrders.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('sales-orders.index')} className="underline font-medium">{t('Sales Orders')}</a></p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-sm font-medium" required>{t('Account')}</Label>
                                <Select value={data.account_id} onValueChange={(v) => set('account_id', v)}>
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
                        </div>

                        {/* Billing Contact + Shipping Contact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium" required>{t('Billing Contact')}</Label>
                                <Select value={data.billing_contact_id} onValueChange={(v) => set('billing_contact_id', v)}>
                                    <SelectTrigger className={errors.billing_contact_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select billing contact')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {contacts.map((c: any) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.billing_contact_id && <p className="text-xs text-red-500">{errors.billing_contact_id}</p>}
                                {contacts.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('contacts.index')} className="underline font-medium">{t('Contacts')}</a></p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-sm font-medium" required>{t('Shipping Contact')}</Label>
                                <Select value={data.shipping_contact_id} onValueChange={(v) => set('shipping_contact_id', v)}>
                                    <SelectTrigger className={errors.shipping_contact_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select shipping contact')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {contacts.map((c: any) => (
                                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.shipping_contact_id && <p className="text-xs text-red-500">{errors.shipping_contact_id}</p>}
                            </div>
                        </div>

                        {/* Status + Order Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">{t('Status')}</Label>
                                <Select value={data.status} onValueChange={(v) => set('status', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                                        <SelectItem value="sent">{t('Sent')}</SelectItem>
                                        <SelectItem value="confirmed">{t('Confirmed')}</SelectItem>
                                        <SelectItem value="received">{t('Received')}</SelectItem>
                                        <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-sm font-medium" required>{t('Order Date')}</Label>
                                <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                                <Input
                                    type="date"
                                    value={data.order_date}
                                    onChange={(e) => set('order_date', e.target.value)}
                                    className={`cursor-pointer ${errors.order_date ? 'border-red-500' : ''}`}
                                />
                                </div>
                                {errors.order_date && <p className="text-xs text-red-500">{errors.order_date}</p>}
                            </div>
                        </div>

                        {/* Expected Delivery Date + Assign To */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label className="text-sm font-medium">{t('Expected Delivery Date')}</Label>
                                <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                                <Input
                                    type="date"
                                    value={data.expected_delivery_date}
                                    onChange={(e) => set('expected_delivery_date', e.target.value)}
                                    className={`cursor-pointer ${errors.expected_delivery_date ? 'border-red-500' : ''}`}
                                />
                                </div>
                                {errors.expected_delivery_date && <p className="text-xs text-red-500">{errors.expected_delivery_date}</p>}
                            </div>

                            <div className="space-y-1">
                                <Label className="text-sm font-medium" required>{t('Assign To')}</Label>
                                <Select value={data.assigned_to} onValueChange={(v) => set('assigned_to', v)}>
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

                    {/* ── PRODUCTS ── */}
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <p className="text-base font-bold text-gray-900 dark:text-white">{t('Products')}</p>
                        <Button type="button" size="sm" onClick={addProductRow}>
                            <Plus className="h-4 w-4 mr-1" />
                            {t('Add Product')}
                        </Button>
                    </div>

                    <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
                        {errors.products && <p className="text-xs text-red-500 mb-3">{errors.products}</p>}

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        <th className="px-4 py-3 text-left min-w-[180px]">{t('Product')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-24">{t('Qty')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-32">{t('Unit Price')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-36">{t('Discount Type')}</th>
                                        <th className="px-4 py-3 text-left w-28">{t('Discount Val')}</th>
                                        <th className="px-4 py-3 text-left w-32">{t('Tax')}</th>
                                        <th className="px-4 py-3 text-left w-28">{t('Total')}</th>
                                        <th className="px-4 py-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.products.map((row, i) => {
                                        const disc = calcDiscount(row);
                                        const tax = calcTax(row);
                                        const total = calcLineTotal(row) - disc + tax;
                                        return (
                                            <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 min-w-[180px]">
                                                    <Select value={row.product_id} onValueChange={(v) => updateProductRow(row.id, 'product_id', v)}>
                                                        <SelectTrigger className={errors[`products.${i}.product_id`] ? 'border-red-500' : ''}>
                                                            <SelectValue placeholder={t('Select product')} />
                                                        </SelectTrigger>
                                                        <SelectContent searchable>
                                                            {productOptions
                                                                .filter((p: any) => !data.products.some((r, ri) => ri !== i && String(r.product_id) === String(p.id)))
                                                                .map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)
                                                            }
                                                        </SelectContent>
                                                    </Select>
                                                    {errors[`products.${i}.product_id`] && <p className="text-xs text-red-500 mt-1">{errors[`products.${i}.product_id`]}</p>}
                                                    {i === 0 && productOptions.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('products.index')} className="underline font-medium">{t('Products')}</a></p>}
                                                </td>
                                                <td className="px-4 py-3 w-24">
                                                    <Input type="number" min="1" value={row.quantity}
                                                        onChange={(e) => updateProductRow(row.id, 'quantity', e.target.value)}
                                                        className={errors[`products.${i}.quantity`] ? 'border-red-500' : ''} />
                                                    {errors[`products.${i}.quantity`] && <p className="text-xs text-red-500 mt-1">{errors[`products.${i}.quantity`]}</p>}
                                                </td>
                                                <td className="px-4 py-3 w-32">
                                                    <Input type="number" step="0.01" min="0" value={row.unit_price}
                                                        onChange={(e) => updateProductRow(row.id, 'unit_price', e.target.value)}
                                                        placeholder="0"
                                                        className={errors[`products.${i}.unit_price`] ? 'border-red-500' : ''} />
                                                    {errors[`products.${i}.unit_price`] && <p className="text-xs text-red-500 mt-1">{errors[`products.${i}.unit_price`]}</p>}
                                                </td>
                                                <td className="px-4 py-3 w-36">
                                                    <Select value={row.discount_type} onValueChange={(v) => updateProductRow(row.id, 'discount_type', v)}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">{t('None')}</SelectItem>
                                                            <SelectItem value="percentage">{t('Percentage (%)')}</SelectItem>
                                                            <SelectItem value="fixed">{t('Fixed Amount')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-3 w-28">
                                                    <Input type="number" step="0.01" min="0" value={row.discount_value}
                                                        onChange={(e) => updateProductRow(row.id, 'discount_value', e.target.value)}
                                                        disabled={row.discount_type === 'none'}
                                                        placeholder="0" className="disabled:opacity-40" />
                                                </td>
                                                <td className="px-4 py-3 w-32 whitespace-nowrap">
                                                    <span className="text-sm font-medium text-muted-foreground">
                                                        {(() => { const p = productOptions.find((p: any) => String(p.id) === row.product_id); return p?.tax ? `${p.tax.name} (${parseFloat(p.tax.rate).toFixed(2)}%)` : t('No Tax'); })()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 w-28 font-medium font-mono">{fmt(total)}</td>
                                                <td className="px-4 py-3 w-10">
                                                    <button type="button" onClick={() => removeProductRow(row.id)}
                                                        disabled={data.products.length <= 1}
                                                        className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                                                        <Trash2 className="h-4 w-4 text-gray-500" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        {data.products.length > 0 && (
                            <div className="mt-4 flex justify-end">
                                <div className="min-w-[260px] space-y-1.5">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>{t('Subtotal')}</span>
                                        <span className="font-medium font-mono">{fmt(subtotal + totalDiscount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-red-600">
                                        <span>{t('Discount')}</span>
                                        <span className="font-medium font-mono">-{fmt(totalDiscount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>{t('Tax')}</span>
                                        <span className="font-medium font-mono">{fmt(totalTax)}</span>
                                    </div>
                                    <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2">
                                        <span>{t('Grand Total')}</span>
                                        <span className="text-green-600 text-lg font-mono">{fmt(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── ACTIONS ── */}
                    <div className="px-6 py-4 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => router.visit(route('purchase-orders.index'))}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? t('Saving...') : t('Save')}
                        </Button>
                    </div>
                </div>
            </form>
        </PageTemplate>
    );
}
