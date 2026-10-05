import { usePage, useForm, router } from '@inertiajs/react';
import { ArrowLeft, Megaphone, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTemplate } from '@/components/page-template';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';

export default function CampaignCreate() {
    const { t } = useTranslation();
    const { campaignTypes = [], targetLists = [], users = [] } = usePage().props as any;

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        budget: '',
        actual_cost: '',
        expected_response: '',
        campaign_type_id: '',
        target_list_id: '',
        assigned_to: '',
        status: 'active',
    });

    const set = (field: string, value: string) => {
        setData(field as any, value);
        clearErrors(field as any);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};

        if (!data.name.trim()) errs.name = t('Campaign Name is required');
        if (!data.start_date) errs.start_date = t('Start Date is required');
        if (!data.end_date) errs.end_date = t('End Date is required');
        if (!data.campaign_type_id) errs.campaign_type_id = t('Campaign Type is required');
        if (!data.target_list_id) errs.target_list_id = t('Target List is required');
        if (!data.assigned_to) errs.assigned_to = t('Assign To is required');

        if (Object.keys(errs).length > 0) {
            Object.entries(errs).forEach(([k, v]) => setError(k as any, v));
            return;
        }

        toast.loading(t('Creating campaign...'));
        post(route('campaigns.store'), {
            onSuccess: () => toast.dismiss(),
            onError: (errs) => {
                toast.dismiss();
                const first = Object.values(errs)[0] as string;
                if (first) toast.error(first);
            },
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Campaigns'), href: route('campaigns.index') },
        { title: t('Create') },
    ];

    return (
        <PageTemplate
            title={t('Create Campaign')}
            description={t('Fill in the details to create a new Campaigns')}
            breadcrumbs={breadcrumbs}
            actions={[{
                label: t('Back'),
                icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                variant: 'outline',
                onClick: () => router.visit(route('campaigns.index')),
            }]}
            noPadding
        >
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Card 1 — Campaign Information */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-3 border-b bg-gray-50 dark:bg-gray-800">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {t('Campaign Information')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

                        <div className="md:col-span-2 space-y-1">
                            <Label className="text-sm font-medium" required>{t('Campaign Name')}</Label>
                            <Input
                                value={data.name}
                                onChange={e => set('name', e.target.value)}
                                className={errors.name ? 'border-red-500' : ''}
                                placeholder={t('e.g. Q1 Email Blast, Summer Promo')}
                            />
                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium" required>{t('Campaign Type')}</Label>
                            <Select value={data.campaign_type_id} onValueChange={v => set('campaign_type_id', v)}>
                                <SelectTrigger className={errors.campaign_type_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select campaign type')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {campaignTypes.map((type: any) => (
                                        <SelectItem key={type.id} value={String(type.id)}>{type.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.campaign_type_id && <p className="text-xs text-red-500">{errors.campaign_type_id}</p>}
                            {campaignTypes.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('campaign-types.index')} className="underline font-medium">{t('Campaign Types')}</a></p>}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium" required>{t('Target List')}</Label>
                            <Select value={data.target_list_id} onValueChange={v => set('target_list_id', v)}>
                                <SelectTrigger className={errors.target_list_id ? 'border-red-500' : ''}>
                                    <SelectValue placeholder={t('Select target list')} />
                                </SelectTrigger>
                                <SelectContent searchable>
                                    {targetLists.map((list: any) => (
                                        <SelectItem key={list.id} value={String(list.id)}>{list.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.target_list_id && <p className="text-xs text-red-500">{errors.target_list_id}</p>}
                            {targetLists.length === 0 && <p className="text-xs mt-1">{t('Click here to add')} <a href={route('target-lists.index')} className="underline font-medium">{t('Target Lists')}</a></p>}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium" required>{t('Start Date')}</Label>
                            <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                            <Input
                                type="date"
                                value={data.start_date}
                                onChange={e => set('start_date', e.target.value)}
                                className={`cursor-pointer ${errors.start_date ? 'border-red-500' : ''}`}
                            />
                            </div>
                            {errors.start_date && <p className="text-xs text-red-500">{errors.start_date}</p>}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium" required>{t('End Date')}</Label>
                            <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                            <Input
                                type="date"
                                value={data.end_date}
                                onChange={e => set('end_date', e.target.value)}
                                className={`cursor-pointer ${errors.end_date ? 'border-red-500' : ''}`}
                            />
                            </div>
                            {errors.end_date && <p className="text-xs text-red-500">{errors.end_date}</p>}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium">{t('Status')}</Label>
                            <Select value={data.status} onValueChange={v => set('status', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t('Active')}</SelectItem>
                                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium" required>{t('Assign To')}</Label>
                            <Select value={data.assigned_to} onValueChange={v => set('assigned_to', v)}>
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

                        <div className="md:col-span-2 space-y-1">
                            <Label className="text-sm font-medium">{t('Description')}</Label>
                            <Textarea
                                value={data.description}
                                onChange={e => set('description', e.target.value)}
                                rows={3}
                                placeholder={t('Enter campaign description...')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Card 2 — Budget & Performance */}
                <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-3 border-b bg-gray-50 dark:bg-gray-800">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                         
                            {t('Budget & Performance')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">

                        <div className="space-y-1">
                            <Label className="text-sm font-medium">{t('Budget')}</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <Input
                                    type="number" step="0.01" min="0"
                                    value={data.budget}
                                    onChange={e => set('budget', e.target.value)}
                                    placeholder="0.00"
                                    className="pl-7"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium">{t('Actual Cost')}</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                <Input
                                    type="number" step="0.01" min="0"
                                    value={data.actual_cost}
                                    onChange={e => set('actual_cost', e.target.value)}
                                    placeholder="0.00"
                                    className="pl-7"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-sm font-medium">{t('Expected Response')}</Label>
                            <Input
                                type="number" min="0"
                                value={data.expected_response}
                                onChange={e => set('expected_response', e.target.value)}
                                placeholder="e.g. 500"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3 pb-6">
                    <Button type="button" variant="outline" onClick={() => router.visit(route('campaigns.index'))}>
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
