import { useState } from 'react';
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
    quantity: string;
    unit_weight: string;
}

interface Errors { [key: string]: string; }

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

function SectionHeader({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-2 mb-5 pb-2 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
    );
}

export default function DeliveryOrderEdit() {
    const { t } = useTranslation();
    const {
        deliveryOrder,
        accounts = [],
        contacts = [],
        salesOrders = [],
        products = [],
        shippingProviderTypes = [],
        users = [],
    } = usePage().props as any;

    const [form, setFormData] = useState({
        name: deliveryOrder.name || '',
        description: deliveryOrder.description || '',
        sales_order_id: deliveryOrder.sales_order_id ? String(deliveryOrder.sales_order_id) : '',
        account_id: deliveryOrder.account_id ? String(deliveryOrder.account_id) : '',
        contact_id: deliveryOrder.contact_id ? String(deliveryOrder.contact_id) : '',
        shipping_provider_type_id: deliveryOrder.shipping_provider_type_id ? String(deliveryOrder.shipping_provider_type_id) : '',
        delivery_date: deliveryOrder.delivery_date ? deliveryOrder.delivery_date.split('T')[0] : new Date().toISOString().split('T')[0],
        expected_delivery_date: deliveryOrder.expected_delivery_date ? deliveryOrder.expected_delivery_date.split('T')[0] : '',
        status: deliveryOrder.status || 'pending',
        shipping_cost: deliveryOrder.shipping_cost ? String(deliveryOrder.shipping_cost) : '',
        delivery_address: deliveryOrder.delivery_address || '',
        delivery_city: deliveryOrder.delivery_city || '',
        delivery_state: deliveryOrder.delivery_state || '',
        delivery_postal_code: deliveryOrder.delivery_postal_code || '',
        delivery_country: deliveryOrder.delivery_country || '',
        delivery_notes: deliveryOrder.delivery_notes || '',
        assigned_to: deliveryOrder.assigned_to ? String(deliveryOrder.assigned_to) : '',
    });

    const [productRows, setProductRows] = useState<ProductRow[]>(
        deliveryOrder.products?.length
            ? deliveryOrder.products.map((p: any) => ({
                id: crypto.randomUUID(),
                product_id: String(p.id),
                quantity: String(p.pivot?.quantity || 1),
                unit_weight: String(p.pivot?.unit_weight || 0),
            }))
            : [{ id: crypto.randomUUID(), product_id: '', quantity: '1', unit_weight: '0' }]
    );

    const [errors, setErrors] = useState<Errors>({});
    const [processing, setProcessing] = useState(false);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Delivery Orders'), href: route('delivery-orders.index') },
        { title: t('Edit') },
    ];

    const set = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => { const e = { ...prev }; delete e[name]; return e; });
    };

    const handleSalesOrderChange = async (id: string) => {
        set('sales_order_id', id);
        if (!id) return;
        try {
            const res = await fetch(route('api.delivery-orders.sales-orders.details', id));
            const data = await res.json();
            if (!data.error) {
                setFormData(prev => ({
                    ...prev,
                    sales_order_id: id,
                    account_id: data.account_id ? String(data.account_id) : prev.account_id,
                    contact_id: data.contact_id ? String(data.contact_id) : prev.contact_id,
                    shipping_provider_type_id: data.shipping_provider_type_id ? String(data.shipping_provider_type_id) : prev.shipping_provider_type_id,
                }));
                if (data.products?.length) {
                    setProductRows(data.products.map((p: any) => ({
                        id: crypto.randomUUID(),
                        product_id: String(p.product_id),
                        quantity: String(p.quantity || 1),
                        unit_weight: String(p.unit_weight || 0),
                    })));
                }
                setErrors(prev => {
                    const e = { ...prev };
                    delete e.sales_order_id; delete e.account_id; delete e.contact_id; delete e.products;delete e.shipping_provider_type_id;
                    return e;
                });
            }
        } catch {}
    };

    const setRow = (id: string, field: keyof ProductRow, value: string) => {
        setProductRows(prev => prev.map(r => r.id !== id ? r : { ...r, [field]: value }));
        if (field === 'product_id' && value) setErrors(prev => { const e = { ...prev }; delete e.products; return e; });
    };

    const totalWeight = productRows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0) * (parseFloat(r.unit_weight) || 0), 0);

    const handleSubmit = () => {
        const errs: Errors = {};
        if (!form.name.trim())                   errs.name = t('Name is required');
        if (!form.sales_order_id)                errs.sales_order_id = t('Sales Order is required');
        if (!form.account_id)                    errs.account_id = t('Account is required');
        if (!form.contact_id)                    errs.contact_id = t('Contact is required');
        if (!form.shipping_provider_type_id)     errs.shipping_provider_type_id = t('Shipping Provider is required');
        if (!form.delivery_date)                 errs.delivery_date = t('Delivery Date is required');
        if (!form.delivery_address.trim())       errs.delivery_address = t('Delivery Address is required');
        if (!form.delivery_city.trim())          errs.delivery_city = t('City is required');
        if (!form.delivery_state.trim())         errs.delivery_state = t('State is required');
        if (!form.delivery_postal_code.trim())   errs.delivery_postal_code = t('Postal Code is required');
        if (!form.delivery_country.trim())       errs.delivery_country = t('Country is required');
        if (!form.assigned_to)                   errs.assigned_to = t('Assigned To is required');
        if (!productRows.length || productRows.every(r => !r.product_id))
                                                 errs.products = t('At least one product is required');
        productRows.forEach((r, i) => {
            if (!r.product_id) errs[`products.${i}.product_id`] = t('Product is required');
            if (r.product_id && (!r.quantity || parseFloat(r.quantity) < 1)) errs[`products.${i}.quantity`] = t('Min 1');
            if (r.product_id && (!r.unit_weight || parseFloat(r.unit_weight) < 0)) errs[`products.${i}.unit_weight`] = t('Required');
        });

        if (Object.keys(errs).length) { setErrors(errs); return; }

        if ((window as any).isDemo) { router.put(route('delivery-orders.update', deliveryOrder.id), {}); return; }
        setProcessing(true);
        toast.loading(t('Saving...'));

        router.put(route('delivery-orders.update', deliveryOrder.id), {
            ...form,
            shipping_cost: form.shipping_cost ? parseFloat(form.shipping_cost) : 0,
            products: productRows.filter(r => r.product_id).map(({ id, ...rest }) => rest),
        }, {
            onSuccess: () => { toast.dismiss(); },
            onError: (errs: any) => { toast.dismiss(); setErrors(errs); setProcessing(false); },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <PageTemplate
            title={t('Edit Delivery Order')}
            description={t('Update delivery order details and related information')}
            breadcrumbs={breadcrumbs}
            url="/delivery-orders"
            noPadding
            actions={[{ label: t('Back'), icon: <ArrowLeft className="h-4 w-4 mr-2" />, variant: 'outline', onClick: () => router.visit(route('delivery-orders.index')) }]}
        >
            <div className="space-y-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 rounded-lg border border-gray-200 dark:border-gray-700">

                {/* ── Order Details ── */}
                <div>
                    <SectionHeader title={t('Order Details')} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Delivery Order Name')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.name}
                                onChange={e => set('name', e.target.value)}
                                placeholder={t('e.g. Q1 Hardware Delivery')}
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            <FieldError message={errors.name} />
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">{t('Description')}</Label>
                            <Textarea
                                value={form.description}
                                onChange={e => set('description', e.target.value)}
                                rows={2}
                                placeholder={t('Optional notes about this delivery...')}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Sales Order')} <span className="text-red-500">*</span>
                            </Label>
                            <Select value={form.sales_order_id} onValueChange={handleSalesOrderChange}>
                                <SelectTrigger className={errors.sales_order_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select sales order')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {salesOrders.map((so: any) => (
                                        <SelectItem key={so.id} value={String(so.id)}>
                                            {so.order_number} – {so.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.sales_order_id} />
                        </div>

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
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Shipping Provider')} <span className="text-red-500">*</span>
                            </Label>
                            <Select value={form.shipping_provider_type_id} onValueChange={v => set('shipping_provider_type_id', v)}>
                                <SelectTrigger className={errors.shipping_provider_type_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select shipping provider')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {shippingProviderTypes.map((s: any) => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.shipping_provider_type_id} />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Delivery Date')} <span className="text-red-500">*</span>
                            </Label>
                            <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                            <Input
                                type="date"
                                value={form.delivery_date}
                                onChange={e => set('delivery_date', e.target.value)}
                                className={`cursor-pointer ${errors.delivery_date ? 'border-red-500' : ''}`}
                            />
                            </div>
                            <FieldError message={errors.delivery_date} />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">{t('Expected Delivery Date')}</Label>
                            <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                            <Input
                                type="date"
                                value={form.expected_delivery_date}
                                onChange={e => set('expected_delivery_date', e.target.value)}
                                className="cursor-pointer"
                            />
                            </div>
                            <FieldError message={errors.expected_delivery_date} />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">{t('Status')}</Label>
                            <Select value={form.status} onValueChange={v => set('status', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                                    <SelectItem value="in_transit">{t('In Transit')}</SelectItem>
                                    <SelectItem value="delivered">{t('Delivered')}</SelectItem>
                                    <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">{t('Shipping Cost')}</Label>
                            <div className="relative">
                                <Input
                                    type="number" min="0" step="0.01"
                                    value={form.shipping_cost}
                                    onChange={e => set('shipping_cost', e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
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

                {/* ── Products ── */}
                <div className="-mx-6">
                    <div className="flex items-center justify-between px-6 py-3 border-t border-b bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                                {t('Products')}
                            </h2>
                            {errors.products && <span className="text-xs text-red-500 font-normal">{errors.products}</span>}
                        </div>
                        <Button
                            type="button" size="sm"
                            onClick={() => setProductRows(p => [...p, { id: crypto.randomUUID(), product_id: '', quantity: '1', unit_weight: '0' }])}
                        >
                            <Plus className="h-4 w-4 mr-1" /> {t('Add Product')}
                        </Button>
                    </div>

                    {productRows.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg mx-6 my-4">
                            <p className="text-sm text-gray-400">{t('No products added yet. Click "Add Product" to begin.')}</p>
                        </div>
                    ) : (
                        <>
                        <div className="overflow-x-auto overflow-y-auto max-h-72">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10">
                                    <tr className="border-b bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        <th className="px-4 py-3 text-left min-w-[220px]">{t('Product')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-28">{t('Quantity')} <span className="text-red-500">*</span></th>
                                        <th className="px-4 py-3 text-left w-36">{t('Unit Weight (kg)')}</th>
                                        <th className="px-4 py-3 text-left w-36">{t('Total Weight (kg)')}</th>
                                        <th className="px-4 py-3 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {productRows.map((row, i) => {
                                        const lineWeight = (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_weight) || 0);
                                        return (
                                            <tr key={row.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:text-gray-100">
                                                <td className="px-4 py-3 min-w-[220px]">
                                                    <Select value={row.product_id} onValueChange={v => setRow(row.id, 'product_id', v)}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select product')} />
                                                        </SelectTrigger>
                                                        <SelectContent searchable>
                                                            {products.filter((p: any) => {
                                                                const taken = productRows.filter(r => r.id !== row.id).map(r => r.product_id);
                                                                return !taken.includes(String(p.id));
                                                            }).map((p: any) => (
                                                                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {i === 0 && products.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('products.index')} className="underline font-medium">{t('Products')}</a></p>}
                                                </td>
                                                <td className="py-3 pr-4 w-28">
                                                    <Input
                                                        type="number" min="1"
                                                        value={row.quantity}
                                                        onChange={e => setRow(row.id, 'quantity', e.target.value)}
                                                        className={errors[`products.${i}.quantity`] ? 'border-red-500 text-left' : 'text-left'}
                                                    />
                                                    {errors[`products.${i}.quantity`] && <p className="text-xs text-red-500 mt-1">{errors[`products.${i}.quantity`]}</p>}
                                                </td>
                                                <td className="py-3 pr-4 w-36">
                                                    <Input
                                                        type="number" min="0" step="0.01"
                                                        value={row.unit_weight}
                                                        onChange={e => setRow(row.id, 'unit_weight', e.target.value)}
                                                        className={errors[`products.${i}.unit_weight`] ? 'border-red-500 text-left' : 'text-left'}
                                                    />
                                                    {errors[`products.${i}.unit_weight`] && <p className="text-xs text-red-500 mt-1">{errors[`products.${i}.unit_weight`]}</p>}
                                                </td>
                                                <td className="py-3 pr-4 w-36 text-sm font-medium text-gray-700 dark:text-gray-200">
                                                    {lineWeight.toFixed(2)} kg
                                                </td>
                                                <td className="py-3 w-10">
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
                        {totalWeight >= 0 && productRows.some(r => r.product_id) && (
                            <div className="flex justify-end px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <div className="w-64">
                                    <div className="flex justify-between text-base font-bold text-gray-900 dark:text-gray-100 border-t pt-2">
                                        <span>{t('Total Weight')}</span>
                                        <span className="text-green-600 text-lg">{totalWeight.toFixed(2)} kg</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>

                {/* ── Delivery Address ── */}
                <div className="-mx-6"><div className="border-t border-gray-200 dark:border-gray-700" /></div>
                <div className="mt-6">
                    <SectionHeader title={t('Delivery Address')} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Delivery Address')} <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                value={form.delivery_address}
                                onChange={e => set('delivery_address', e.target.value)}
                                rows={2}
                                placeholder={t('e.g. 123 Main St, Suite 100')}
                                className={errors.delivery_address ? 'border-red-500' : ''}
                            />
                            <FieldError message={errors.delivery_address} />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('DeliveryCity')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.delivery_city}
                                onChange={e => set('delivery_city', e.target.value)}
                                placeholder={t('e.g. New York')}
                                className={errors.delivery_city ? 'border-red-500' : ''}
                            />
                            <FieldError message={errors.delivery_city} />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Delivery State')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.delivery_state}
                                onChange={e => set('delivery_state', e.target.value)}
                                placeholder={t('e.g. NY')}
                                className={errors.delivery_state ? 'border-red-500' : ''}
                            />
                            <FieldError message={errors.delivery_state} />
                        </div>
 
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Delivery Country')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.delivery_country}
                                onChange={e => set('delivery_country', e.target.value)}
                                placeholder={t('e.g. United States')}
                                className={errors.delivery_country ? 'border-red-500' : ''}
                            />
                            <FieldError message={errors.delivery_country} />
                        </div>
                        
                        <div className="space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('Delivery Postal Code')} <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={form.delivery_postal_code}
                                onChange={e => set('delivery_postal_code', e.target.value)}
                                placeholder={t('e.g. 10001')}
                                className={errors.delivery_postal_code ? 'border-red-500' : ''}
                            />
                            <FieldError message={errors.delivery_postal_code} />
                        </div>

                        

                        <div className="md:col-span-2 space-y-1.5">
                            <Label className="text-sm font-semibold text-gray-900 dark:text-white">{t('Delivery Notes')}</Label>
                            <Textarea
                                value={form.delivery_notes}
                                onChange={e => set('delivery_notes', e.target.value)}
                                rows={3}
                                placeholder={t('e.g. Leave at reception, handle with care...')}
                            />
                        </div>

                    </div>
                </div>

                {/* ── Actions ── */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button type="button" variant="outline" onClick={() => window.history.back()}>
                        {t('Cancel')}
                    </Button>
                    <Button type="button" disabled={processing} onClick={handleSubmit}>
                        {processing ? t('Saving...') : t('Save')}
                    </Button>
                </div>

            </div>
        </PageTemplate>
    );
}
