import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, useForm, router } from '@inertiajs/react';
import { ArrowLeft, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

function SectionTitle({ title, extra }: { title: string; extra?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
            {extra}
        </div>
    );
}

export default function AccountEdit() {
    const { t } = useTranslation();
    const { account, accountTypes = [], accountIndustries = [], users = [] } = usePage().props as any;

    const { data, setData, setError, clearErrors, put, processing, errors } = useForm({
        name: account.name ?? '',
        email: account.email ?? '',
        phone: account.phone ?? '',
        website: account.website ?? '',
        account_type_id: String(account.account_type_id ?? ''),
        account_industry_id: String(account.account_industry_id ?? ''),
        billing_address: account.billing_address ?? '',
        billing_city: account.billing_city ?? '',
        billing_state: account.billing_state ?? '',
        billing_postal_code: account.billing_postal_code ?? '',
        billing_country: account.billing_country ?? '',
        shipping_address: account.shipping_address ?? '',
        shipping_city: account.shipping_city ?? '',
        shipping_state: account.shipping_state ?? '',
        shipping_postal_code: account.shipping_postal_code ?? '',
        shipping_country: account.shipping_country ?? '',
        assigned_to: String(account.assigned_to ?? ''),
        status: account.status ?? 'active',
    });

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Account Management') },
        { title: t('Accounts'), href: route('accounts.index') },
        { title: t('Edit') },
    ];

    const set = (name: string, value: string) => {
        setData(name as any, value);
        clearErrors(name as any);
    };

    const copyBillingToShipping = () => {
        setData((prev: any) => ({
            ...prev,
            shipping_address: prev.billing_address,
            shipping_city: prev.billing_city,
            shipping_state: prev.billing_state,
            shipping_postal_code: prev.billing_postal_code,
            shipping_country: prev.billing_country,
        }));
        toast.success(t('Billing address copied to shipping'));
    };

    const requiredFields: { name: keyof typeof data; label: string }[] = [
        { name: 'name', label: t('Account Name') },
        { name: 'email', label: t('Email') },
        { name: 'phone', label: t('Phone') },
        { name: 'account_type_id', label: t('Account Type') },
        { name: 'account_industry_id', label: t('Industry') },
        { name: 'assigned_to', label: t('Assign To') },
        { name: 'billing_address', label: t('Street Address') },
        { name: 'billing_city', label: t('City') },
        { name: 'billing_state', label: t('State / Province') },
        { name: 'billing_postal_code', label: t('Postal Code') },
        { name: 'billing_country', label: t('Country') },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const clientErrors: Record<string, string> = {};
        requiredFields.forEach(({ name, label }) => {
            if (!data[name]) clientErrors[name] = `${label} ${t('is required')}`;
        });
        if (data.phone && !/^[+\d\s\-().]+$/.test(data.phone)) {
            clientErrors['phone'] = t('Phone number can only contain digits, spaces, +, -, (, )');
        }
        if (data.website && !/^https?:\/\/.+/.test(data.website)) {
            clientErrors['website'] = t('Website must start with http:// or https://');
        }
        if (Object.keys(clientErrors).length > 0) {
            Object.entries(clientErrors).forEach(([k, v]) => setError(k as any, v));
            return;
        }
        const toastId = toast.loading(t('Updating account...'));

        put(route('accounts.update', account.id), {

            onSuccess: () => {

                toast.dismiss(toastId);
                router.visit(route('accounts.index'));

            },

            onError: () => {

                toast.dismiss(toastId);

                toast.error(t('Please fix the errors before submitting.'));

            },

        });
    };

    return (
        <PageTemplate
            title={t('Edit Account')}
            description={t('Edit Account details and related information')}
            breadcrumbs={breadcrumbs}
            actions={[{
                label: t('Back'),
                icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                variant: 'outline',
                onClick: () => router.visit(route('accounts.index')),
            }]}
            noPadding
        >
            <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6 rounded-lg border border-gray-200 dark:border-gray-700">

                {/* ── Basic Information ── */}
                <div>
                    <SectionTitle title={t('Basic Information')} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="name" required>{t('Account Name')}</Label>
                            <Input id="name" value={data.name} onChange={(e) => set('name', e.target.value)} className={errors.name ? 'border-red-500' : ''} placeholder={t('e.g. Acme Corporation')} />
                            <FieldError message={errors.name} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="email" required>{t('Email')}</Label>
                            <Input id="email" type="email" value={data.email} onChange={(e) => set('email', e.target.value)} className={errors.email ? 'border-red-500' : ''} placeholder={t('e.g. contact@acmecorp.com')} />
                            <FieldError message={errors.email} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="phone" required>{t('Phone')}</Label>
                            <Input id="phone" value={data.phone} onChange={(e) => set('phone', e.target.value)} className={errors.phone ? 'border-red-500' : ''} placeholder={t('e.g. +1 234 567 8900')} />
                            <FieldError message={errors.phone} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="website">{t('Website')}</Label>
                            <Input id="website" value={data.website} onChange={(e) => set('website', e.target.value)} className={errors.website ? 'border-red-500' : ''} placeholder="e.g. https://acmecorp.com" />
                            <FieldError message={errors.website} />
                        </div>
                    </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* ── Classification & Assignment ── */}
                <div>
                    <SectionTitle title={t('Classification & Assignment')} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-1.5">
                            <Label required>{t('Account Type')}</Label>
                            <Select value={data.account_type_id} onValueChange={(v) => set('account_type_id', v)}>
                                <SelectTrigger className={errors.account_type_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select account type')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {accountTypes.map((item: any) => (
                                        <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.account_type_id} />
                            {accountTypes.length === 0 && (
                                <p className="text-xs mt-1">{t('Click here to add')} <a href={route('account-types.index')} className="underline font-medium">{t('Account Types')}</a></p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label required>{t('Assign To')}</Label>
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
                            <FieldError message={errors.assigned_to} />
                            {users.length === 0 && (
                                <p className="text-xs mt-1">{t('Click here to add')} <a href={route('users.index')} className="underline font-medium">{t('Users')}</a></p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label required>{t('Industry')}</Label>
                            <Select value={data.account_industry_id} onValueChange={(v) => set('account_industry_id', v)}>
                                <SelectTrigger className={errors.account_industry_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select industry')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {accountIndustries.map((item: any) => (
                                        <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError message={errors.account_industry_id} />
                            {accountIndustries.length === 0 && (
                                <p className="text-xs mt-1">{t('Click here to add')} <a href={route('account-industries.index')} className="underline font-medium">{t('Industries')}</a></p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label>{t('Status')}</Label>
                            <Select value={data.status} onValueChange={(v) => set('status', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t('Active')}</SelectItem>
                                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* ── Billing & Shipping Address side by side ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Billing */}
                    <div>
                        <SectionTitle title={t('Billing Address')} />
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="billing_address" required>{t('Billing Address')}</Label>
                                <Textarea id="billing_address" value={data.billing_address} onChange={(e) => set('billing_address', e.target.value)} className={errors.billing_address ? 'border-red-500' : ''} rows={2} placeholder={t('e.g. 123 Main Street, Suite 100')} />
                                <FieldError message={errors.billing_address} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="billing_city" required>{t('Billing City')}</Label>
                                    <Input id="billing_city" value={data.billing_city} onChange={(e) => set('billing_city', e.target.value)} className={errors.billing_city ? 'border-red-500' : ''} placeholder={t('e.g. New York')} />
                                    <FieldError message={errors.billing_city} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="billing_state" required>{t('Billing State')}</Label>
                                    <Input id="billing_state" value={data.billing_state} onChange={(e) => set('billing_state', e.target.value)} className={errors.billing_state ? 'border-red-500' : ''} placeholder={t('e.g. NY')} />
                                    <FieldError message={errors.billing_state} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="billing_country" required>{t('Billing Country')}</Label>
                                    <Input id="billing_country" value={data.billing_country} onChange={(e) => set('billing_country', e.target.value)} className={errors.billing_country ? 'border-red-500' : ''} placeholder={t('e.g. United States')} />
                                    <FieldError message={errors.billing_country} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="billing_postal_code" required>{t('Billing Postal Code')}</Label>
                                    <Input id="billing_postal_code" value={data.billing_postal_code} onChange={(e) => set('billing_postal_code', e.target.value)} className={errors.billing_postal_code ? 'border-red-500' : ''} placeholder={t('e.g. 10001')} />
                                    <FieldError message={errors.billing_postal_code} />
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Shipping */}
                    <div>
                        <SectionTitle
                            title={
                                <span className="flex items-center gap-2">
                                    {t('Shipping Address')}
                                    <span className="text-sm font-normal text-gray-400">({t('Optional')})</span>
                                </span> as any
                            }
                            extra={
                                <Button type="button" variant="outline" size="sm" onClick={copyBillingToShipping} className="text-xs">
                                    <Copy className="h-3 w-3 mr-1" /> {t('Copy to Shipping')}
                                </Button>
                            }
                        />
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="shipping_address">{t('Shipping Address')}</Label>
                                <Textarea id="shipping_address" value={data.shipping_address} onChange={(e) => set('shipping_address', e.target.value)} rows={2} placeholder={t('e.g. 456 Elm Street')} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="shipping_city">{t('Shipping City')}</Label>
                                    <Input id="shipping_city" value={data.shipping_city} onChange={(e) => set('shipping_city', e.target.value)} placeholder={t('e.g. Los Angeles')} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="shipping_state">{t('Shipping State')}</Label>
                                    <Input id="shipping_state" value={data.shipping_state} onChange={(e) => set('shipping_state', e.target.value)} placeholder={t('e.g. CA')} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="shipping_country">{t('Shipping Country')}</Label>
                                    <Input id="shipping_country" value={data.shipping_country} onChange={(e) => set('shipping_country', e.target.value)} placeholder={t('e.g. United States')} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="shipping_postal_code">{t('Shipping Postal Code')}</Label>
                                    <Input id="shipping_postal_code" value={data.shipping_postal_code} onChange={(e) => set('shipping_postal_code', e.target.value)} placeholder={t('e.g. 90001')} />
                                </div>

                            </div>
                        </div>
                    </div>

                </div>

                {/* ── Actions ── */}
                <div className="flex justify-end gap-3 pt-1">
                    <Button type="button" variant="outline" onClick={() => router.visit(route('accounts.index'))}>
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
