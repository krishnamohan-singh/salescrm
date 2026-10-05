import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Copy, ShoppingCart } from 'lucide-react';
import axios from 'axios';

type DiscountType = 'percentage' | 'fixed' | '';

interface ProductLine {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_type: DiscountType;
    discount_value: number;
}

interface FormData {
    name: string;
    description: string;
    quote_id: string;
    account_id: string;
    billing_contact_id: string;
    shipping_contact_id: string;
    shipping_provider_type_id: string;
    order_date: string;
    delivery_date: string;
    status: string;
    assigned_to: string;
    billing_address: string;
    billing_city: string;
    billing_state: string;
    billing_country: string;
    billing_postal_code: string;
    shipping_address: string;
    shipping_city: string;
    shipping_state: string;
    shipping_country: string;
    shipping_postal_code: string;
    products: ProductLine[];
}

interface Errors {
    [key: string]: string;
}

const fmt = (n: number) =>
    window.appSettings?.formatCurrency(n) ?? `$${n.toFixed(2)}`;

function SearchSelect({ value, onChange, options, placeholder, emptyNote, error }: {
    value: string; onChange: (v: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string; emptyNote?: { link: string; linkText: string };
    error?: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
    const selected = options.find(o => o.value === value);

    useEffect(() => {
        if (!open) setSearch('');
    }, [open]);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(p => !p)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md bg-white text-left focus:outline-none focus:ring-1 focus:ring-gray-400 ${error ? 'border-red-500' : 'border-gray-300'}`}
            >
                <span className={selected ? 'text-gray-900' : 'text-gray-400'}>{selected?.label || placeholder || t('Select...')}</span>
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                    <div className="p-2 border-b">
                        <input
                            autoFocus
                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none"
                            placeholder={t('Search...')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 text-center">
                                {emptyNote ? (
                                    <span>{t('No records found.')} <a href={emptyNote.link} className="text-gray-600 underline">{t('Add')} {emptyNote.linkText}</a></span>
                                ) : t('No options found')}
                            </div>
                        ) : (
                            filtered.map(o => (
                                <button
                                    key={o.value}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${o.value === value ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-900'}`}
                                    onClick={() => { onChange(o.value); setOpen(false); }}
                                >
                                    {o.label}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div>
            <Label className="text-sm font-medium text-gray-700 mb-1 block">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            {children}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export default function SalesOrderEdit() {
    const { t } = useTranslation();
    const { salesOrder, accounts, contacts, quotes, products, shippingProviderTypes, users } = usePage().props as any;

    const toDate = (d: string) => d ? d.split('T')[0] : '';

    const [form, setForm] = useState<FormData>({
        name: salesOrder.name || '',
        description: salesOrder.description || '',
        quote_id: String(salesOrder.quote_id || ''),
        account_id: String(salesOrder.account_id || ''),
        billing_contact_id: String(salesOrder.billing_contact_id || ''),
        shipping_contact_id: String(salesOrder.shipping_contact_id || ''),
        shipping_provider_type_id: String(salesOrder.shipping_provider_type_id || ''),
        order_date: toDate(salesOrder.order_date),
        delivery_date: toDate(salesOrder.delivery_date),
        status: salesOrder.status || 'draft',
        assigned_to: String(salesOrder.assigned_to || ''),
        billing_address: salesOrder.billing_address || '',
        billing_city: salesOrder.billing_city || '',
        billing_state: salesOrder.billing_state || '',
        billing_country: salesOrder.billing_country || '',
        billing_postal_code: salesOrder.billing_postal_code || '',
        shipping_address: salesOrder.shipping_address || '',
        shipping_city: salesOrder.shipping_city || '',
        shipping_state: salesOrder.shipping_state || '',
        shipping_country: salesOrder.shipping_country || '',
        shipping_postal_code: salesOrder.shipping_postal_code || '',
        products: salesOrder.products?.length ? salesOrder.products.map((p: any) => ({
            id: crypto.randomUUID(),
            product_id: String(p.id),
            quantity: parseInt(p.pivot?.quantity) || 1,
            unit_price: parseFloat(p.pivot?.unit_price) || 0,
            discount_type: (p.pivot?.discount_type === 'none' ? '' : p.pivot?.discount_type) || '' as DiscountType,
            discount_value: parseFloat(p.pivot?.discount_value) || 0,
        })) : [{ id: crypto.randomUUID(), product_id: '', quantity: 1, unit_price: 0, discount_type: '' as DiscountType, discount_value: 0 }],
    });
    const [errors, setErrors] = useState<Errors>({});
    const [submitting, setSubmitting] = useState(false);
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [showShipping, setShowShipping] = useState(true);

    const set = (field: keyof FormData, value: any) => {
        setForm(p => ({ ...p, [field]: value }));
        setErrors(p => { const n = { ...p }; delete n[field]; return n; });
    };

    const setLine = (id: string, field: keyof ProductLine, value: any) => {
        setForm(p => ({
            ...p,
            products: p.products.map(l => {
                if (l.id !== id) return l;
                const updated = { ...l, [field]: value };
                if (field === 'product_id') {
                    const prod = products?.find((p: any) => String(p.id) === String(value));
                    if (prod) updated.unit_price = parseFloat(prod.price) || 0;
                }
                return updated;
            })
        }));
        if (field === 'product_id' && value) {
            const idx = form.products.findIndex(l => l.id === id);
            setErrors(p => { const n = { ...p }; delete n.products; if (idx >= 0) delete n[`products.${idx}.product_id`]; return n; });
        }
    };

    const addLine = () => setForm(p => ({
        ...p,
        products: [...p.products, { id: crypto.randomUUID(), product_id: '', quantity: 1, unit_price: 0, discount_type: '' as DiscountType, discount_value: 0 }]
    }));

    const removeLine = (id: string) => setForm(p => ({
        ...p,
        products: p.products.length <= 1 ? p.products : p.products.filter(l => l.id !== id)
    }));

    const handleQuoteChange = useCallback(async (quoteId: string) => {
        set('quote_id', quoteId);
        if (!quoteId) return;
        setLoadingQuote(true);
        try {
            const { data } = await axios.get(route('api.quotes.details', quoteId));
            setForm(p => ({
                ...p,
                quote_id: quoteId,
                account_id: String(data.account_id || ''),
                billing_contact_id: String(data.billing_contact_id || ''),
                shipping_contact_id: String(data.shipping_contact_id || ''),
                shipping_provider_type_id: String(data.shipping_provider_type_id || ''),
                billing_address: data.billing_address || '',
                billing_city: data.billing_city || '',
                billing_state: data.billing_state || '',
                billing_country: data.billing_country || '',
                billing_postal_code: data.billing_postal_code || '',
                shipping_address: data.shipping_address || '',
                shipping_city: data.shipping_city || '',
                shipping_state: data.shipping_state || '',
                shipping_country: data.shipping_country || '',
                shipping_postal_code: data.shipping_postal_code || '',
                products: data.products?.length ? data.products.map((pr: any) => ({
                    id: crypto.randomUUID(),
                    product_id: String(pr.product_id),
                    quantity: pr.quantity || 1,
                    unit_price: parseFloat(pr.unit_price) || 0,
                    discount_type: pr.discount_type === 'none' ? '' : (pr.discount_type || ''),
                    discount_value: parseFloat(pr.discount_value) || 0,
                })) : p.products,
            }));
            setErrors(p => {
                    const n = { ...p };
                    delete n.account_id; delete n.billing_contact_id; delete n.shipping_contact_id;
                    delete n.shipping_provider_type_id;
                    delete n.billing_address; delete n.billing_city; delete n.billing_state;
                    delete n.billing_country; delete n.billing_postal_code;
                    if (data.products?.length) {
                        delete n.products;
                        data.products.forEach((_: any, i: number) => delete n[`products.${i}.product_id`]);
                    }
                    return n;
                });
        } catch {
            toast.error(t('Failed to load quote details'));
        } finally {
            setLoadingQuote(false);
        }
    }, []);

    const copyBillingToShipping = () => {
        setForm(p => ({
            ...p,
            shipping_address: p.billing_address,
            shipping_city: p.billing_city,
            shipping_state: p.billing_state,
            shipping_country: p.billing_country,
            shipping_postal_code: p.billing_postal_code,
        }));
        toast.success(t('Billing address copied to shipping'));
    };

    const calcLine = (l: ProductLine) => {
        const gross = l.quantity * l.unit_price;
        let discount = 0;
        if (l.discount_type === 'percentage') discount = (gross * l.discount_value) / 100;
        else if (l.discount_type === 'fixed') discount = Math.min(l.discount_value, gross);
        const net = gross - discount;
        const prod = products?.find((p: any) => String(p.id) === String(l.product_id));
        const tax = prod?.tax ? (net * prod.tax.rate) / 100 : 0;
        return { gross, discount, net, tax, total: net };
    };

    const totals = form.products.reduce((acc, l) => {
        const c = calcLine(l);
        return { discount: acc.discount + c.discount, subtotal: acc.subtotal + c.net, tax: acc.tax + c.tax };
    }, { discount: 0, subtotal: 0, tax: 0 });

    const validate = (): boolean => {
        const e: Errors = {};
        if (!form.name.trim()) e.name = t('Name is required');
        if (!form.quote_id) e.quote_id = t('Quote is required');
        if (!form.account_id) e.account_id = t('Account is required');
        if (!form.billing_contact_id) e.billing_contact_id = t('Billing contact is required');
        if (!form.shipping_contact_id) e.shipping_contact_id = t('Shipping contact is required');
        if (!form.shipping_provider_type_id) e.shipping_provider_type_id = t('Shipping provider is required');
        if (!form.order_date) e.order_date = t('Order date is required');
        if (!form.assigned_to) e.assigned_to = t('Assigned user is required');
        if (!form.billing_address.trim()) e.billing_address = t('Billing address is required');
        if (!form.billing_city.trim()) e.billing_city = t('Billing city is required');
        if (!form.billing_state.trim()) e.billing_state = t('Billing state is required');
        if (!form.billing_country.trim()) e.billing_country = t('Billing country is required');
        if (!form.billing_postal_code.trim()) e.billing_postal_code = t('Billing postal code is required');
        if (!form.products.length || form.products.every(l => !l.product_id)) e.products = t('At least one product is required');
        form.products.forEach((l, i) => {
            if (!l.product_id) e[`products.${i}.product_id`] = t('Product is required');
        });
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) { return; }
        if ((window as any).isDemo) { router.put(route('sales-orders.update', salesOrder.id), {}); return; }
        setSubmitting(true);
        const payload = {
            ...form,
            products: form.products.filter(l => l.product_id).map(({ id, discount_type, ...rest }) => ({
                ...rest,
                discount_type: discount_type || 'none',
            })),
        };
        router.put(route('sales-orders.update', salesOrder.id), payload, {
            onSuccess: () => {
                toast.dismiss();
            },
            onError: (errs) => {
                setSubmitting(false);
                toast.dismiss();
                setErrors(errs as Errors);
            },
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Sales Orders'), href: route('sales-orders.index') },
        { title: t('Edit') },
    ];

    const quoteOptions = (quotes || []).map((q: any) => ({ value: String(q.id), label: `${q.quote_number} – ${q.name}` }));
    const accountOptions = (accounts || []).map((a: any) => ({ value: String(a.id), label: a.name }));
    const contactOptions = (contacts || []).map((c: any) => ({ value: String(c.id), label: c.name }));
    const providerOptions = (shippingProviderTypes || []).map((s: any) => ({ value: String(s.id), label: s.name }));
    const userOptions = (users || []).map((u: any) => ({ value: String(u.id), label: `${u.name} (${u.email})` }));
    const productOptions = (products || []).map((p: any) => ({
        value: String(p.id),
        label: p.name
    }));

    return (
        <PageTemplate title={t('Edit Sales Order')} description={t('Update sales order details and related information')} url="/sales-orders" breadcrumbs={breadcrumbs} fullWidth
            noPadding 
            actions={[{ label: t('Back'), icon: <ArrowLeft className="h-4 w-4 mr-2" />, variant: 'outline', onClick: () => router.visit(route('sales-orders.index', salesOrder.id)) }]}
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Info */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <CardHeader className="pb-3 border-b bg-gray-50 dark:bg-gray-800">
                        <CardTitle className="text-base font-semibold">
                            {t('Order Information')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <Field label={t('Order Name')} required error={errors.name}>
                                <Input value={form.name} onChange={e => set('name', e.target.value)}
                                    placeholder={t('e.g. Annual Hardware Order 2025')}
                                    className={errors.name ? 'border-red-500' : ''} />
                            </Field>
                        </div>
                        <div className="md:col-span-2">
                            <Field label={t('Description')} error={errors.description}>
                                <Textarea value={form.description} onChange={e => set('description', e.target.value)}
                                    placeholder={t('Describe the purpose or details of this order...')} rows={2} />
                            </Field>
                        </div>
                        <Field label={t('Quote')} required error={errors.quote_id}>
                            <div className="relative">
                                <Select value={form.quote_id} onValueChange={handleQuoteChange}>
                                    <SelectTrigger className={errors.quote_id ? 'border-red-500' : ''}>
                                        <SelectValue placeholder={t('Select a quote')} />
                                    </SelectTrigger>
                                    <SelectContent searchable>
                                        {quoteOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {loadingQuote && <span className="absolute right-8 top-2.5 text-xs text-gray-400 animate-pulse">{t('Loading...')}</span>}
                            </div>
                        </Field>
                        <Field label={t('Account')} required error={errors.account_id}>
                            <Select value={form.account_id} onValueChange={v => set('account_id', v)}>
                                <SelectTrigger className={errors.account_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select account')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {accountOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={t('Order Date')} required error={errors.order_date}>
                            <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                            <Input type="date" value={form.order_date} onChange={e => set('order_date', e.target.value)}
                                className={`cursor-pointer ${errors.order_date ? 'border-red-500' : ''}`} />
                            </div>
                        </Field>
                        <Field label={t('Delivery Date')} error={errors.delivery_date}>
                            <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                            <Input type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} className="cursor-pointer" />
                            </div>
                        </Field>
                        <Field label={t('Status')} error={errors.status}>
                            <Select value={form.status} onValueChange={v => set('status', v)}>
                                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[['draft', t('Draft')], ['confirmed', t('Confirmed')], ['processing', t('Processing')], ['shipped', t('Shipped')], ['delivered', t('Delivered')], ['cancelled', t('Cancelled')]].map(([v, l]) => (
                                        <SelectItem key={v} value={v}>{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={t('Assign To')} required error={errors.assigned_to}>
                            <Select value={form.assigned_to} onValueChange={v => set('assigned_to', v)}>
                                <SelectTrigger className={errors.assigned_to ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select user')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {userOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </CardContent>
                </Card>

                {/* Contacts & Shipping Provider */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <CardHeader className="pb-3 border-b bg-gray-50 dark:bg-gray-800">
                        <CardTitle className="text-base font-semibold">
                            {t('Contacts & Shipping Provider')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field label={t('Billing Contact')} required error={errors.billing_contact_id}>
                            <Select value={form.billing_contact_id} onValueChange={v => set('billing_contact_id', v)}>
                                <SelectTrigger className={errors.billing_contact_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select billing contact')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {contactOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={t('Shipping Contact')} required error={errors.shipping_contact_id}>
                            <Select value={form.shipping_contact_id} onValueChange={v => set('shipping_contact_id', v)}>
                                <SelectTrigger className={errors.shipping_contact_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select shipping contact')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {contactOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label={t('Shipping Provider')} required error={errors.shipping_provider_type_id}>
                            <Select value={form.shipping_provider_type_id} onValueChange={v => set('shipping_provider_type_id', v)}>
                                <SelectTrigger className={errors.shipping_provider_type_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select provider')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {providerOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                    </CardContent>
                </Card>

                {/* Products */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <CardHeader className="pb-3 border-b bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">
                                {t('Products')}
                                {errors.products && <span className="text-xs text-red-500 font-normal ml-2">{errors.products}</span>}
                            </CardTitle>
                            <Button type="button" size="sm" onClick={addLine}>
                                <Plus className="h-4 w-4 mr-1" /> {t('Add Product')}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        <th className="px-4 py-3 text-left min-w-[200px]">{t('Product')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-24">{t('Qty')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-32">{t('Unit Price')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-32">{t('Discount Type')}</th>
                                        <th className="px-4 py-3 text-left w-28">{t('Discount Val')}</th>
                                        <th className="px-4 py-3 text-left w-28">{t('Tax')}</th>
                                        <th className="px-4 py-3 text-left w-28">{t('Total')}</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.products.map((line, idx) => {
                                        const c = calcLine(line);
                                        const usedIds = form.products.filter(l => l.id !== line.id && l.product_id).map(l => l.product_id);
                                        const lineProductOptions = productOptions.filter(o => !usedIds.includes(o.value) || o.value === line.product_id);
                                        return (
                                            <tr key={line.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 w-48">
                                                    <Select value={line.product_id} onValueChange={v => setLine(line.id, 'product_id', v)}>
                                                        <SelectTrigger className={errors[`products.${idx}.product_id`] ? 'border-red-500 w-full' : 'w-full'}>
                                                            <SelectValue placeholder={t('Select product')} />
                                                        </SelectTrigger>
                                                        <SelectContent searchable>
                                                            {lineProductOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors[`products.${idx}.product_id`] && <p className="text-xs text-red-500 mt-1">{errors[`products.${idx}.product_id`]}</p>}
                                                    {idx === 0 && productOptions.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('products.index')} className="underline font-medium">{t('Products')}</a></p>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Input type="number" min="1" value={line.quantity}
                                                        onChange={e => setLine(line.id, 'quantity', parseInt(e.target.value) || 1)} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Input type="number" min="0" step="0.01" value={line.unit_price}
                                                        onChange={e => setLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                        placeholder="0.00" />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Select value={line.discount_type || 'none'} onValueChange={val => setLine(line.id, 'discount_type', (val === 'none' ? '' : val) as DiscountType)}>
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder={t('None')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">{t('None')}</SelectItem>
                                                            <SelectItem value="percentage">{t('Percentage (%)')}</SelectItem>
                                                            <SelectItem value="fixed">{t('Fixed Amount')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Input type="number" min="0" step="0.01" value={line.discount_value}
                                                        disabled={!line.discount_type}
                                                        onChange={e => setLine(line.id, 'discount_value', parseFloat(e.target.value) || 0)}
                                                        className="disabled:opacity-40"
                                                        placeholder="0" />
                                                </td>
                                                <td className="px-4 py-3 text-left whitespace-nowrap">
                                                    {(() => { const prod = products?.find((p: any) => String(p.id) === String(line.product_id)); return (<span className="text-sm font-medium text-muted-foreground">{prod?.tax ? `${prod.tax.name} (${parseFloat(prod.tax.rate).toFixed(2)}%)` : t('No Tax')}</span>); })()}
                                                </td>
                                                <td className="px-4 py-3 text-left font-medium font-mono">{fmt(c.net + c.tax)}</td>
                                                <td className="px-4 py-3 text-left">
                                                    <button type="button" onClick={() => removeLine(line.id)}
                                                        disabled={form.products.length <= 1}
                                                        className="p-1.5 rounded text-gray-500 hover:bg-gray-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                                                        <Trash2 className="h-4 w-4 text-gray-500" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end p-4 border-t">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>{t('Subtotal')}</span>
                                    <span className="font-medium font-mono">{fmt(totals.subtotal + totals.discount)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>{t('Discount')}</span>
                                    <span className="font-medium font-mono">-{fmt(totals.discount)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>{t('Tax')}</span>
                                    <span className="font-medium font-mono">{fmt(totals.tax)}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold text-gray-900 dark:text-gray-100 border-t pt-2">
                                    <span>{t('Grand Total')}</span>
                                    <span className="text-green-600 text-lg font-mono">{fmt(totals.subtotal + totals.tax)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Billing & Shipping */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <CardHeader className="pb-3 border-b bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold">
                                {t('Billing & Shipping Address')}
                            </CardTitle>
                            <button type="button" onClick={() => setShowShipping(p => !p)}
                                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                {showShipping ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                {showShipping ? t('Collapse') : t('Expand')}
                            </button>
                        </div>
                    </CardHeader>
                    {showShipping && (
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Billing */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('Billing Address')}</h3>
                                        <Button type="button" variant="outline" size="sm" onClick={copyBillingToShipping} className="text-xs">
                                            <Copy className="h-3 w-3 mr-1" /> {t('Copy to Shipping')}
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        <Field label={t('Billing Address')} required error={errors.billing_address}>
                                            <Textarea value={form.billing_address} onChange={e => set('billing_address', e.target.value)}
                                                placeholder={t('e.g. 123 Main St, Suite 100')} rows={2}
                                                className={errors.billing_address ? 'border-red-500' : ''} />
                                        </Field>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label={t('City')} required error={errors.billing_city}>
                                                <Input value={form.billing_city} onChange={e => set('billing_city', e.target.value)}
                                                    placeholder="New York" className={errors.billing_city ? 'border-red-500' : ''} />
                                            </Field>
                                            <Field label={t('State')} required error={errors.billing_state}>
                                                <Input value={form.billing_state} onChange={e => set('billing_state', e.target.value)}
                                                    placeholder="NY" className={errors.billing_state ? 'border-red-500' : ''} />
                                            </Field>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label={t('Country')} required error={errors.billing_country}>
                                                <Input value={form.billing_country} onChange={e => set('billing_country', e.target.value)}
                                                    placeholder="United States" className={errors.billing_country ? 'border-red-500' : ''} />
                                            </Field>
                                            <Field label={t('Postal Code')} required error={errors.billing_postal_code}>
                                                <Input value={form.billing_postal_code} onChange={e => set('billing_postal_code', e.target.value)}
                                                    placeholder="10001" className={errors.billing_postal_code ? 'border-red-500' : ''} />
                                            </Field>
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping */}
                                <div>
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('Shipping Address')}</h3>
                                    <div className="space-y-3">
                                        <Field label={t('Shipping Address')} error={errors.shipping_address}>
                                            <Textarea value={form.shipping_address} onChange={e => set('shipping_address', e.target.value)}
                                                placeholder={t('e.g. 456 Elm St, Warehouse B')} rows={2} />
                                        </Field>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label={t('City')} error={errors.shipping_city}>
                                                <Input value={form.shipping_city} onChange={e => set('shipping_city', e.target.value)} placeholder="Los Angeles" />
                                            </Field>
                                            <Field label={t('State')} error={errors.shipping_state}>
                                                <Input value={form.shipping_state} onChange={e => set('shipping_state', e.target.value)} placeholder="CA" />
                                            </Field>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Field label={t('Country')} error={errors.shipping_country}>
                                                <Input value={form.shipping_country} onChange={e => set('shipping_country', e.target.value)} placeholder="United States" />
                                            </Field>
                                            <Field label={t('Postal Code')} error={errors.shipping_postal_code}>
                                                <Input value={form.shipping_postal_code} onChange={e => set('shipping_postal_code', e.target.value)} placeholder="90001" />
                                            </Field>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pb-6">
                    <Button type="button" variant="outline" onClick={() => router.visit(route('sales-orders.show', salesOrder.id))}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? t('Saving...') : t('Save')}
                    </Button>
                </div>
            </form>
        </PageTemplate>
    );
}
