import { useState, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface ProductRow {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_type: string;
    discount_value: number;
}

interface Errors { [key: string]: string; }

const fmt = (n: number) => window.appSettings?.formatCurrency(n) ?? `$${n.toFixed(2)}`;

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function ReceiptOrderEdit() {
    const { t } = useTranslation();
    const {
        receiptOrder,
        accounts = [],
        contacts = [],
        purchaseOrders = [],
        returnOrders = [],
        products = [],
        users = [],
    } = usePage().props as any;

    const [form, setFormData] = useState({
        name: receiptOrder.name || '',
        description: receiptOrder.description || '',
        purchase_order_id: String(receiptOrder.purchase_order_id || ''),
        return_order_id: String(receiptOrder.return_order_id || ''),
        account_id: String(receiptOrder.account_id || ''),
        contact_id: String(receiptOrder.contact_id || ''),
        receipt_date: receiptOrder.receipt_date ? receiptOrder.receipt_date.substring(0, 10) : '',
        expected_date: receiptOrder.expected_date ? receiptOrder.expected_date.substring(0, 10) : '',
        status: receiptOrder.status || 'pending',
        notes: receiptOrder.notes || '',
        assigned_to: String(receiptOrder.assigned_to || ''),
    });

    const [productRows, setProductRows] = useState<ProductRow[]>(
        (receiptOrder.products || []).map((p: any) => ({
            id: crypto.randomUUID(),
            product_id: String(p.id),
            quantity: p.pivot?.quantity || 1,
            unit_price: p.pivot?.unit_price || p.price || 0,
            discount_type: p.pivot?.discount_type || 'none',
            discount_value: p.pivot?.discount_value || 0,
        }))
    );

    const [errors, setErrors] = useState<Errors>({});
    const [processing, setProcessing] = useState(false);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Receipt Orders'), href: route('receipt-orders.index') },
        { title: t('Edit') },
    ];

    const set = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => { const e = { ...prev }; delete e[name]; return e; });
    };

    const handlePurchaseOrderChange = async (id: string) => {
        set('purchase_order_id', id);
        setFormData(prev => ({ ...prev, return_order_id: '' }));
        if (!id) return;
        try {
            const res = await fetch(route('api.receipt-orders.purchase-orders.details', id));
            const data = await res.json();
            if (!data.error) {
                setFormData(prev => ({
                    ...prev,
                    purchase_order_id: id,
                    account_id: data.account_id ? String(data.account_id) : prev.account_id,
                    contact_id: data.contact_id ? String(data.contact_id) : prev.contact_id,
                }));
                if (data.products?.length) {
                    setProductRows(data.products.map((p: any) => ({
                        id: crypto.randomUUID(),
                        product_id: String(p.product_id),
                        quantity: p.quantity || 1,
                        unit_price: p.unit_price || 0,
                        discount_type: p.discount_type || 'none',
                        discount_value: p.discount_value || 0,
                    })));
                }
                setErrors(prev => {
                    const e = { ...prev };
                    delete e.purchase_order_id;
                    delete e.return_order_id;
                    if (data.account_id) delete e.account_id;
                    if (data.contact_id) delete e.contact_id;
                    if (data.products?.length) delete e.products;
                    return e;
                });
            }
        } catch {}
    };

    const handleReturnOrderChange = async (id: string) => {
        set('return_order_id', id);
        setFormData(prev => ({ ...prev, purchase_order_id: '' }));
        if (!id) return;
        try {
            const res = await fetch(route('api.receipt-orders.return-orders.details', id));
            const data = await res.json();
            if (!data.error) {
                setFormData(prev => ({
                    ...prev,
                    return_order_id: id,
                    account_id: data.account_id ? String(data.account_id) : prev.account_id,
                    contact_id: data.contact_id ? String(data.contact_id) : prev.contact_id,
                }));
                if (data.products?.length) {
                    setProductRows(data.products.map((p: any) => ({
                        id: crypto.randomUUID(),
                        product_id: String(p.product_id),
                        quantity: p.quantity || 1,
                        unit_price: p.unit_price || 0,
                        discount_type: 'none',
                        discount_value: 0,
                    })));
                }
                setErrors(prev => {
                    const e = { ...prev };
                    delete e.purchase_order_id;
                    delete e.return_order_id;
                    if (data.account_id) delete e.account_id;
                    if (data.contact_id) delete e.contact_id;
                    if (data.products?.length) delete e.products;
                    return e;
                });
            }
        } catch {}
    };

    const addProductRow = useCallback(() => {
        setProductRows(p => [...p, { id: crypto.randomUUID(), product_id: '', quantity: 1, unit_price: 0, discount_type: 'none', discount_value: 0 }]);
    }, []);

    const setRow = (id: string, field: keyof ProductRow, value: string | number) => {
        setProductRows(prev => prev.map(r => {
            if (r.id !== id) return r;
            const updated = { ...r, [field]: value };
            if (field === 'product_id') {
                const prod = products.find((p: any) => String(p.id) === String(value));
                if (prod) updated.unit_price = parseFloat(prod.price || 0);
            }
            return updated;
        }));
    };

    const calcLine = (row: ProductRow) => {
        const gross = (Number(row.quantity) || 0) * (Number(row.unit_price) || 0);
        const discVal = Number(row.discount_value) || 0;
        const discount = row.discount_type === 'percentage'
            ? (gross * discVal) / 100
            : row.discount_type === 'fixed'
                ? Math.min(discVal, gross)
                : 0;
        const net = gross - discount;
        const prod = products.find((p: any) => String(p.id) === String(row.product_id));
        const tax = prod?.tax ? (net * prod.tax.rate) / 100 : 0;
        return { gross, discount, net, tax };
    };

    const totals = productRows.reduce((acc, r) => {
        const c = calcLine(r);
        return { discount: acc.discount + c.discount, subtotal: acc.subtotal + c.net, tax: acc.tax + c.tax };
    }, { discount: 0, subtotal: 0, tax: 0 });

    const handleSubmit = () => {
        const errs: Errors = {};
        if (!form.name.trim())                          errs.name = t('Name is required');
        if (!form.purchase_order_id && !form.return_order_id)
                                                        errs.purchase_order_id = t('Either Purchase Order or Return Order is required');
        if (!form.account_id)                           errs.account_id = t('Account is required');
        if (!form.contact_id)                           errs.contact_id = t('Contact is required');
        if (!form.receipt_date)                         errs.receipt_date = t('Receipt Date is required');
        if (!form.assigned_to)                          errs.assigned_to = t('Assigned To is required');
        if (!productRows.length || productRows.every(r => !r.product_id))
                                                        errs.products = t('At least one product is required');

        if (Object.keys(errs).length) { setErrors(errs); toast.error(t('Please fix the errors before submitting.')); return; }

        if ((window as any).isDemo) { router.put(route('receipt-orders.update', receiptOrder.id), {}); return; }
        setProcessing(true);
        toast.loading(t('Updating...'));

        router.put(route('receipt-orders.update', receiptOrder.id), {
            ...form,
            products: productRows.filter(r => r.product_id).map(({ id, discount_type, ...rest }) => ({
                ...rest,
                discount_type: discount_type !== 'none' ? discount_type : null,
            })),
        }, {
            onSuccess: () => { toast.dismiss(); },
            onError: (errs: any) => { toast.dismiss(); setErrors(errs); setProcessing(false); },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <PageTemplate title={t('Edit Receipt Order')} description={t('Update receipt order details and related information')} breadcrumbs={breadcrumbs} url="/receipt-orders"
           
        noPadding actions={[{ label: t('Back'), icon: <ArrowLeft className="h-4 w-4 mr-2" />, variant: 'outline', onClick: () => router.visit(route('receipt-orders.index')) }]}
        >
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">

                {/* Basic Information */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="px-6 pt-5">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('Basic Information')}</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                        {/* Name + Description */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Receipt Order Name')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.name}
                                onChange={e => set('name', e.target.value)}
                                placeholder={t('e.g. Q1 Supplier Receipt')}
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            <FieldError message={errors.name} />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Description')}
                            </Label>
                            <Textarea
                                value={form.description}
                                onChange={e => set('description', e.target.value)}
                                rows={2}
                                placeholder={t('Optional description about this receipt order...')}
                            />
                        </div>

                        {/* Purchase Order + Return Order */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Purchase Order')}
                            </Label>
                            <Select value={form.purchase_order_id} onValueChange={handlePurchaseOrderChange}>
                                <SelectTrigger className={errors.purchase_order_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select purchase order')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {purchaseOrders.map((po: any) => (
                                        <SelectItem key={po.id} value={String(po.id)}>{po.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.purchase_order_id} />
                            {purchaseOrders.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('purchase-orders.index')} className="underline font-medium">{t('Purchase Orders')}</a></p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Return Order')}
                            </Label>
                            <Select value={form.return_order_id} onValueChange={handleReturnOrderChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('Select return order')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {returnOrders.map((ro: any) => (
                                        <SelectItem key={ro.id} value={String(ro.id)}>{ro.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Account + Contact */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Account')} <span className="text-red-500">*</span>
                            </Label>
                            <Select value={form.account_id} onValueChange={v => set('account_id', v)}>
                                <SelectTrigger className={errors.account_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select account')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {accounts.map((a: any) => (
                                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.account_id} />
                            {accounts.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('accounts.index')} className="underline font-medium">{t('Accounts')}</a></p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Contact')} <span className="text-red-500">*</span>
                            </Label>
                            <Select value={form.contact_id} onValueChange={v => set('contact_id', v)}>
                                <SelectTrigger className={errors.contact_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select contact')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {contacts.map((c: any) => (
                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.contact_id} />
                            {contacts.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('contacts.index')} className="underline font-medium">{t('Contacts')}</a></p>}
                        </div>

                        {/* Receipt Date + Expected Date */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Receipt Date')} <span className="text-red-500">*</span>
                            </Label>
                            <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                            <Input
                                type="date"
                                value={form.receipt_date}
                                onChange={e => set('receipt_date', e.target.value)}
                                className={`cursor-pointer ${errors.receipt_date ? 'border-red-500' : ''}`}
                            />
                            </div>
                            <FieldError message={errors.receipt_date} />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Expected Date')}
                            </Label>
                            <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                            <Input
                                type="date"
                                value={form.expected_date}
                                onChange={e => set('expected_date', e.target.value)}
                                className={`cursor-pointer ${errors.expected_date ? 'border-red-500' : ''}`}
                            />
                            </div>
                            <FieldError message={errors.expected_date} />
                        </div>

                        {/* Status + Assigned To */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Status')}
                            </Label>
                            <Select value={form.status} onValueChange={v => set('status', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                                    <SelectItem value="received">{t('Received')}</SelectItem>
                                    <SelectItem value="partial">{t('Partial')}</SelectItem>
                                    <SelectItem value="completed">{t('Completed')}</SelectItem>
                                    <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Assigned To')} <span className="text-red-500">*</span>
                            </Label>
                            <Select value={form.assigned_to} onValueChange={v => set('assigned_to', v)}>
                                <SelectTrigger className={errors.assigned_to ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select user')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {users.map((u: any) => (
                                        <SelectItem key={u.id} value={String(u.id)}>
                                            {u.name} ({u.email})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.assigned_to} />
                        </div>

                    </div>
                </div>

                {/* Products */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50 dark:bg-gray-800">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            {t('Products')}
                            {errors.products && <span className="text-xs text-red-500 font-normal ml-2">{errors.products}</span>}
                        </h2>
                        <Button type="button" size="sm" onClick={addProductRow}>
                            <Plus className="h-4 w-4 mr-1" /> {t('Add Product')}
                        </Button>
                    </div>

                    {productRows.length > 0 && (
                        <div className="overflow-x-auto max-h-72 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10">
                                    <tr className="border-b bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        <th className="px-4 py-3 text-left min-w-[200px]">{t('Product')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-24">{t('Qty')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-32">{t('Unit Price')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-32">{t('Discount Type')}</th>
                                        <th className="px-4 py-3 text-left w-28">{t('Discount Value')}</th>
                                        <th className="px-4 py-3 text-left w-28">{t('Tax')}</th>
                                        <th className="px-4 py-3 text-left w-28">{t('Line Total')}</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {productRows.map((row, i) => {
                                        const c = calcLine(row);
                                        return (
                                            <tr key={row.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 min-w-[200px]">
                                                    <Select value={row.product_id} onValueChange={v => setRow(row.id, 'product_id', v)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select product')} />
                                                        </SelectTrigger>
                                                        <SelectContent searchable>
                                                            {products.filter((p: any) => {
                                                                const selectedIds = productRows.filter(r => r.id !== row.id).map(r => r.product_id);
                                                                return !selectedIds.includes(String(p.id));
                                                            }).map((p: any) => (
                                                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {i === 0 && products.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('products.index')} className="underline font-medium">{t('Products')}</a></p>}
                                                </td>

                                                <td className="px-4 py-3 w-24">
                                                    <Input
                                                        type="number" min="1"
                                                        value={row.quantity}
                                                        onChange={e => setRow(row.id, 'quantity', parseInt(e.target.value) || 1)}
                                                    />
                                                </td>

                                                <td className="px-4 py-3 w-28">
                                                    <Input
                                                        type="number" min="0" step="0.01"
                                                        value={row.unit_price}
                                                        onChange={e => setRow(row.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    />
                                                </td>

                                                <td className="px-4 py-3 w-36">
                                                    <Select value={row.discount_type} onValueChange={v => setRow(row.id, 'discount_type', v)}>
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">{t('None')}</SelectItem>
                                                            <SelectItem value="percentage">{t('Percentage (%)')}</SelectItem>
                                                            <SelectItem value="fixed">{t('Fixed Amount')}</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>

                                                <td className="px-4 py-3 w-28">
                                                    <Input
                                                        type="number" min="0" step="0.01"
                                                        value={row.discount_value}
                                                        disabled={row.discount_type === 'none'}
                                                        onChange={e => setRow(row.id, 'discount_value', parseFloat(e.target.value) || 0)}
                                                        className="disabled:opacity-40"
                                                        placeholder="0"
                                                    />
                                                </td>

                                                <td className="px-4 py-3 w-36 whitespace-nowrap">
                                                    {(() => { const prod = products.find((p: any) => String(p.id) === String(row.product_id)); return (<span className="text-sm font-medium text-muted-foreground">{prod?.tax ? `${prod.tax.name} (${parseFloat(prod.tax.rate).toFixed(2)}%)` : t('No Tax')}</span>); })()}
                                                </td>

                                                <td className="px-4 py-3 w-28 font-medium font-mono">{fmt(c.net + c.tax)}</td>

                                                <td className="px-4 py-3 w-10">
                                                    <button
                                                        type="button"
                                                        onClick={() => setProductRows(p => p.length <= 1 ? p : p.filter(r => r.id !== row.id))}
                                                        disabled={productRows.length <= 1}
                                                        className="p-1 rounded text-gray-500 hover:bg-gray-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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

                    {productRows.length > 0 && (
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
                    )}
                </div>

                {/* Additional Notes */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('Additional Notes')}</h2>
                    <Textarea
                        value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        rows={3}
                        placeholder={t('Enter any additional notes...')}
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 px-6 py-4">
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>
                        {t('Cancel')}
                    </Button>
                    <Button type="button" disabled={processing} onClick={handleSubmit}>
                        {processing ? t('Updating...') : t('Save')}
                    </Button>
                </div>

            </div>
        </PageTemplate>
    );
}
