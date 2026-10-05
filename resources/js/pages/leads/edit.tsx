import { PageTemplate } from '@/components/page-template';
import { usePage, useForm, router } from '@inertiajs/react';
import { ArrowLeft, User, Layers, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

export default function LeadEdit() {
    const { t } = useTranslation();
    const {
        lead,
        leadStatuses = [],
        leadSources = [],
        accountIndustries = [],
        campaigns = [],
        users = [],
    } = usePage().props as any;

    const { data, setData, setError, clearErrors, put, processing, errors } = useForm({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        account_name: lead.account_name || '',
        account_industry_id: String(lead.account_industry_id || ''),
        website: lead.website || '',
        position: lead.position || '',
        value: lead.value || '',
        lead_status_id: String(lead.lead_status_id || ''),
        lead_source_id: String(lead.lead_source_id || ''),
        address: lead.address || '',
        campaign_id: String(lead.campaign_id || ''),
        notes: lead.notes || '',
        assigned_to: String(lead.assigned_to || ''),
        status: lead.status || 'active',
    });

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Lead Management') },
        { title: t('Leads'), href: route('leads.index') },
        { title: t('Edit') },
    ];

    const handleInputChange = (name: string, value: string) => {
        setData(name as any, value);
        clearErrors(name as any);
    };

    const requiredFields: { name: keyof typeof data; label: string }[] = [
        { name: 'name', label: t('Lead Name') },
        { name: 'email', label: t('Email') },
        { name: 'phone', label: t('Phone') },
        { name: 'account_industry_id', label: t('Account Industry') },
        { name: 'lead_status_id', label: t('Lead Status') },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const clientErrors: Record<string, string> = {};

        requiredFields.forEach(({ name, label }) => {
            if (!data[name]) clientErrors[name] = `${label} is required`;
        });

        if (data.website && !/^https?:\/\/.+/.test(data.website)) {
            clientErrors['website'] = t('Website must start with http:// or https://');
        }

        if (Object.keys(clientErrors).length > 0) {
            Object.entries(clientErrors).forEach(([key, msg]) => setError(key as any, msg));
            return;
        }

        toast.loading(t('Updating lead...'));

        put(route('leads.update', lead.id), {
            onSuccess: () => toast.dismiss(),
            onError: () => toast.dismiss(),
        });
    };

    return (
        <PageTemplate
            title={t('Edit Lead')}
            description={t('Edit lead details and related information')}
            breadcrumbs={breadcrumbs}
            actions={[
                {
                    label: t('Back'),
                    icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                    variant: 'outline',
                    onClick: () => router.visit(route('leads.index')),
                },
            ]}
            noPadding
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* TOP SECTION: CONTACT & PIPELINE CARDS */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">

                    {/* Contact & Company Information */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 flex flex-col h-full">
                        <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4 bg-gray-50/75 dark:border-gray-700 dark:bg-gray-700/50">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('Contact & Company Details')}</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Personal and organization information')}</p>
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-between">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium" required>
                                        {t('Lead Name')}
                                    </Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className={errors.name ? 'border-red-500' : ''}
                                        placeholder={t('eg. John Smith')}
                                    />
                                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium" required>
                                        {t('Email')}
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className={errors.email ? 'border-red-500' : ''}
                                        placeholder={t('eg. john@example.com')}
                                    />
                                    {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-sm font-medium" required>
                                        {t('Phone')}
                                    </Label>
                                    <Input
                                        id="phone"
                                        value={data.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        className={errors.phone ? 'border-red-500' : ''}
                                        placeholder={t('eg. +1 234 567 8900')}
                                    />
                                    {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="position" className="text-sm font-medium">
                                        {t('Position')}
                                    </Label>
                                    <Input
                                        id="position"
                                        value={data.position}
                                        onChange={(e) => handleInputChange('position', e.target.value)}
                                        className={errors.position ? 'border-red-500' : ''}
                                        placeholder={t('eg. CEO, Manager, Developer')}
                                    />
                                    {errors.position && <p className="text-xs text-red-500">{errors.position}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="company" className="text-sm font-medium">
                                        {t('Company')}
                                    </Label>
                                    <Input
                                        id="company"
                                        value={data.company}
                                        onChange={(e) => handleInputChange('company', e.target.value)}
                                        className={errors.company ? 'border-red-500' : ''}
                                        placeholder={t('eg. Acme Corp')}
                                    />
                                    {errors.company && <p className="text-xs text-red-500">{errors.company}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="account_name" className="text-sm font-medium">
                                        {t('Account Name')}
                                    </Label>
                                    <Input
                                        id="account_name"
                                        value={data.account_name}
                                        onChange={(e) => handleInputChange('account_name', e.target.value)}
                                        className={errors.account_name ? 'border-red-500' : ''}
                                        placeholder={t('eg. Acme Corp')}
                                    />
                                    {errors.account_name && <p className="text-xs text-red-500">{errors.account_name}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="website" className="text-sm font-medium">
                                        {t('Website')}
                                    </Label>
                                    <Input
                                        id="website"
                                        value={data.website}
                                        onChange={(e) => handleInputChange('website', e.target.value)}
                                        className={errors.website ? 'border-red-500' : ''}
                                        placeholder="eg. https://example.com"
                                    />
                                    {errors.website && <p className="text-xs text-red-500">{errors.website}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address" className="text-sm font-medium">
                                        {t('Address')}
                                    </Label>
                                    <Input
                                        id="address"
                                        value={data.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        className={errors.address ? 'border-red-500' : ''}
                                        placeholder={t('eg. 123 Main St, City, Country')}
                                    />
                                    {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pipeline, Classification & Assignment */}
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 flex flex-col h-full">
                        <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4 bg-gray-50/75 dark:border-gray-700 dark:bg-gray-700/50">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('Pipeline & Classification')}</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{t('Lead status, source, value, and assignment')}</p>
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-between">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium" required>
                                        {t('Account Industry')}
                                    </Label>
                                    <Select value={data.account_industry_id} onValueChange={(value) => handleInputChange('account_industry_id', value)}>
                                        <SelectTrigger className={errors.account_industry_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={t('Select industry')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            {accountIndustries.map((i: any) => (
                                                <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.account_industry_id && <p className="text-xs text-red-500">{errors.account_industry_id}</p>}
                                    {accountIndustries.length === 0 && (
                                        <p className="text-xs mt-1">
                                            {t('Click here to add')} <a href={route('account-industries.index')} className="underline font-medium">{t('Account Industries')}</a>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium" required>
                                        {t('Lead Status')}
                                    </Label>
                                    <Select value={data.lead_status_id} onValueChange={(value) => handleInputChange('lead_status_id', value)}>
                                        <SelectTrigger className={errors.lead_status_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={t('Select status')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            {leadStatuses.map((s: any) => (
                                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.lead_status_id && <p className="text-xs text-red-500">{errors.lead_status_id}</p>}
                                    {leadStatuses.length === 0 && (
                                        <p className="text-xs mt-1">
                                            {t('Click here to add')} <a href={route('lead-statuses.index')} className="underline font-medium">{t('Lead Statuses')}</a>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        {t('Lead Source')}
                                    </Label>
                                    <Select value={data.lead_source_id} onValueChange={(value) => handleInputChange('lead_source_id', value)}>
                                        <SelectTrigger className={errors.lead_source_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={t('Select source')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            {leadSources.map((s: any) => (
                                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.lead_source_id && <p className="text-xs text-red-500">{errors.lead_source_id}</p>}
                                    {leadSources.length === 0 && (
                                        <p className="text-xs mt-1">
                                            {t('Click here to add')} <a href={route('lead-sources.index')} className="underline font-medium">{t('Lead Sources')}</a>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        {t('Campaign')}
                                    </Label>
                                    <Select value={data.campaign_id} onValueChange={(value) => handleInputChange('campaign_id', value)}>
                                        <SelectTrigger className={errors.campaign_id ? 'border-red-500' : ''}>
                                            <SelectValue placeholder={t('Select campaign')} />
                                        </SelectTrigger>
                                        <SelectContent searchable>
                                            {campaigns.map((c: any) => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.campaign_id && <p className="text-xs text-red-500">{errors.campaign_id}</p>}
                                    {campaigns.length === 0 && (
                                        <p className="text-xs mt-1">
                                            {t('Click here to add')} <a href={route('campaigns.index')} className="underline font-medium">{t('Campaigns')}</a>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="value" className="text-sm font-medium">
                                        {t('Lead Value')}
                                    </Label>
                                    <Input
                                        id="value"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.value}
                                        onChange={(e) => handleInputChange('value', e.target.value)}
                                        className={errors.value ? 'border-red-500' : ''}
                                        placeholder={t('eg. 5000')}
                                    />
                                    {errors.value && <p className="text-xs text-red-500">{errors.value}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        {t('Assign To')}
                                    </Label>
                                    <Select value={data.assigned_to} onValueChange={(value) => handleInputChange('assigned_to', value)}>
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
                                    {users.length === 0 && (
                                        <p className="text-xs mt-1">
                                            {t('Click here to add')} <a href={route('users.index')} className="underline font-medium">{t('Users')}</a>
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label className="text-sm font-medium">{t('Status')}</Label>
                                    <Select value={data.status} onValueChange={(value) => handleInputChange('status', value)}>
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
                        </div>
                    </div>
                </div>

                {/* BOTTOM SECTION: NOTES */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4 bg-gray-50/75 dark:border-gray-700 dark:bg-gray-700/50">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('Additional Notes')}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('Remarks, requirements, or conversation context')}</p>
                        </div>
                    </div>
                    <div className="p-6">
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
                                placeholder={t('Enter any additional notes about this lead...')}
                            />
                            {errors.notes && <p className="text-xs text-red-500">{errors.notes}</p>}
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end items-center gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => router.visit(route('leads.index'))}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={processing} className="min-w-[120px]">
                        {processing ? t('Saving...') : t('Save')}
                    </Button>
                </div>
            </form>
        </PageTemplate>
    );
}
