import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Copy,
    Check,
    RefreshCw,
    Play,
    ExternalLink,
    Code2,
    Webhook as WebhookIcon,
    Key,
    Shield,
    Activity,
    Users,
    CheckCircle2,
    XCircle,
    Info,
    HelpCircle,
    Sliders,
    Sparkles,
    Trash2,
    Layers,
    ArrowUpRight,
    Search,
    ChevronRight,
    Terminal,
} from 'lucide-react';

interface IntegrationConfig {
    id: number;
    type: string;
    name: string;
    is_active: boolean;
    webhook_token: string;
    webhook_url: string;
    api_key: string;
    secret_key: string;
    default_lead_status_id: number | null;
    default_lead_source_id: number | null;
    default_account_industry_id: number | null;
    default_assigned_to: number | null;
    configuration: Record<string, any> | null;
    total_received: number;
    successful_count: number;
    failed_count: number;
    last_received_at: string | null;
}

export default function LeadIntegrations() {
    const { t } = useTranslation();
    const {
        integrations = {} as Record<string, IntegrationConfig>,
        leadStatuses = [],
        leadSources = [],
        accountIndustries = [],
        users = [],
        logs: initialLogs = { data: [] },
        stats = { total_received: 0, total_successful: 0, total_failed: 0, active_channels: 0 },
        baseUrl = '',
    } = usePage().props as any;

    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('facebook');
    const [selectedLogPayload, setSelectedLogPayload] = useState<any | null>(null);
    const [isPayloadModalOpen, setIsPayloadModalOpen] = useState(false);
    const [testLoading, setTestLoading] = useState<string | null>(null);
    const [codeLanguage, setCodeLanguage] = useState<'curl' | 'js' | 'php' | 'python'>('curl');

    // Local form states for editable integrations
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        const initial: Record<string, any> = {};
        Object.keys(integrations).forEach((type) => {
            const item = integrations[type];
            initial[type] = {
                is_active: item?.is_active ?? true,
                default_lead_status_id: item?.default_lead_status_id ? String(item.default_lead_status_id) : '',
                default_lead_source_id: item?.default_lead_source_id ? String(item.default_lead_source_id) : '',
                default_account_industry_id: item?.default_account_industry_id ? String(item.default_account_industry_id) : '',
                default_assigned_to: item?.default_assigned_to ? String(item.default_assigned_to) : '',
                secret_key: item?.secret_key || '',
                configuration: { ...(item?.configuration || {}) },
            };
        });
        return initial;
    });

    const copyToClipboard = (text: string, keyIdentifier: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(keyIdentifier);
        toast.success(t('Copied to clipboard!'));
        setTimeout(() => setCopiedKey(null), 2500);
    };

    const handleFormChange = (type: string, field: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value,
            },
        }));
    };

    const handleConfigChange = (type: string, configKey: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [type]: {
                ...prev[type],
                configuration: {
                    ...prev[type]?.configuration,
                    [configKey]: value,
                },
            },
        }));
    };

    const handleSave = (type: string) => {
        const integration = integrations[type];
        if (!integration) return;

        const payload = formData[type];
        toast.loading(t('Saving integration settings...'));

        router.put(
            route('lead-integrations.update', integration.id),
            {
                is_active: payload.is_active,
                default_lead_status_id: payload.default_lead_status_id ? Number(payload.default_lead_status_id) : null,
                default_lead_source_id: payload.default_lead_source_id ? Number(payload.default_lead_source_id) : null,
                default_account_industry_id: payload.default_account_industry_id ? Number(payload.default_account_industry_id) : null,
                default_assigned_to: payload.default_assigned_to ? Number(payload.default_assigned_to) : null,
                secret_key: payload.secret_key,
                configuration: payload.configuration,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.dismiss();
                    toast.success(t('Integration settings saved successfully!'));
                },
                onError: (errors) => {
                    toast.dismiss();
                    toast.error(t('Failed to save settings: {{msg}}', { msg: Object.values(errors)[0] as string }));
                },
            }
        );
    };

    const handleRegenerate = (type: string, target: 'webhook_token' | 'api_key' | 'secret_key') => {
        const integration = integrations[type];
        if (!integration) return;

        if (!confirm(t('Are you sure you want to regenerate this token? Any external service currently pointing to the old URL or key will need to be updated.'))) {
            return;
        }

        toast.loading(t('Regenerating token...'));
        router.post(
            route('lead-integrations.regenerate-token', integration.id),
            { target },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.dismiss();
                    toast.success(t('Token regenerated successfully!'));
                },
                onError: () => {
                    toast.dismiss();
                    toast.error(t('Failed to regenerate token.'));
                },
            }
        );
    };

    const handleSendTestLead = async (type: string) => {
        const integration = integrations[type];
        if (!integration) return;

        setTestLoading(type);
        toast.loading(t('Sending simulated test lead...'));

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch(route('lead-integrations.send-test', integration.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    'Accept': 'application/json',
                },
            });

            const data = await res.json();
            toast.dismiss();

            if (res.ok && data.success) {
                toast.success(t('Test Lead created successfully! View lead #{{id}} in Leads list.', { id: data.lead?.id }));
                router.reload({ only: ['logs', 'stats', 'integrations'] });
            } else {
                toast.error(data.error || t('Failed to process test lead.'));
            }
        } catch (err: any) {
            toast.dismiss();
            toast.error(t('Network error sending test lead: {{msg}}', { msg: err.message }));
        } finally {
            setTestLoading(null);
        }
    };

    const handleClearLogs = () => {
        if (!confirm(t('Are you sure you want to clear all integration history logs?'))) return;

        router.delete(route('lead-integrations.clear-logs'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(t('Integration logs cleared.'));
            },
        });
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Lead Management'), href: route('leads.index') },
        { title: t('Lead Integrations') },
    ];

    const pageActions = [
        {
            label: t('View Leads'),
            icon: <Users className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('leads.index')),
        },
    ];

    const fbIntegration = integrations.facebook;
    const gadsIntegration = integrations.google_ads;
    const webhookIntegration = integrations.webhook;
    const apiIntegration = integrations.api;

    const fbForm = formData.facebook || {};
    const gadsForm = formData.google_ads || {};
    const webhookForm = formData.webhook || {};
    const apiForm = formData.api || {};

    const successRate = stats.total_received > 0
        ? Math.round((stats.total_successful / stats.total_received) * 100)
        : 100;

    return (
        <PageTemplate
            title={t('Lead Integrations')}
            description={t('Connect Facebook Lead Ads, Google Ads Lead Forms, Incoming Webhooks, and REST APIs to automatically capture leads into your CRM.')}
            url="/lead-integrations"
            breadcrumbs={breadcrumbs}
            actions={pageActions}
        >
            <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border shadow-xs bg-linear-to-br from-blue-50/50 via-card to-card dark:from-blue-950/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Ingested Leads')}</CardTitle>
                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total_received}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Captured across all channels')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-xs bg-linear-to-br from-emerald-50/50 via-card to-card dark:from-emerald-950/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Success Rate')}</CardTitle>
                            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{successRate}%</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {stats.total_successful} {t('successful')} · {stats.total_failed} {t('failed')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-xs bg-linear-to-br from-indigo-50/50 via-card to-card dark:from-indigo-950/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Active Channels')}</CardTitle>
                            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Layers className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.active_channels} / 4</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Facebook, Google Ads, Webhook, API')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border shadow-xs bg-linear-to-br from-purple-50/50 via-card to-card dark:from-purple-950/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground">{t('Instant Ingestion')}</CardTitle>
                            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                <Sparkles className="h-4 w-4" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{t('Real-Time')}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('Auto-assigned with alerts & logs')}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Tabs Container */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/60">
                        <TabsTrigger value="facebook" className="py-2.5 gap-2 data-[state=active]:bg-background">
                            <div className="h-4 w-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold text-[10px]">f</div>
                            <span>{t('Facebook Lead Ads')}</span>
                            {fbIntegration?.is_active && <span className="h-2 w-2 rounded-full bg-emerald-500 ml-auto" />}
                        </TabsTrigger>

                        <TabsTrigger value="google_ads" className="py-2.5 gap-2 data-[state=active]:bg-background">
                            <div className="h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-[10px]">G</div>
                            <span>{t('Google Ads')}</span>
                            {gadsIntegration?.is_active && <span className="h-2 w-2 rounded-full bg-emerald-500 ml-auto" />}
                        </TabsTrigger>

                        <TabsTrigger value="webhook" className="py-2.5 gap-2 data-[state=active]:bg-background">
                            <WebhookIcon className="h-4 w-4 text-orange-500" />
                            <span>{t('Custom Webhook')}</span>
                            {webhookIntegration?.is_active && <span className="h-2 w-2 rounded-full bg-emerald-500 ml-auto" />}
                        </TabsTrigger>

                        <TabsTrigger value="api" className="py-2.5 gap-2 data-[state=active]:bg-background">
                            <Code2 className="h-4 w-4 text-purple-500" />
                            <span>{t('REST API')}</span>
                            {apiIntegration?.is_active && <span className="h-2 w-2 rounded-full bg-emerald-500 ml-auto" />}
                        </TabsTrigger>

                        <TabsTrigger value="logs" className="py-2.5 gap-2 data-[state=active]:bg-background">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <span>{t('Sync History & Logs')}</span>
                            {stats.total_received > 0 && (
                                <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0 h-5">
                                    {stats.total_received}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* ─────────────────────────────────────────────────────────────
                        1. FACEBOOK LEAD ADS TAB
                    ───────────────────────────────────────────────────────────── */}
                    <TabsContent value="facebook" className="space-y-6">
                        <Card className="border shadow-xs">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-[#1877F2]/10 text-[#1877F2] flex items-center justify-center font-bold text-lg">
                                            f
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {t('Meta / Facebook Lead Ads Webhook')}
                                                {fbForm.is_active ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                        {t('Active')}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">{t('Disabled')}</Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                {t('Automatically import leads from Meta Instant Forms (Facebook & Instagram) directly into your pipeline in real time.')}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="fb-toggle" className="text-sm cursor-pointer">{t('Status')}</Label>
                                        <Switch
                                            id="fb-toggle"
                                            checked={fbForm.is_active}
                                            onCheckedChange={(checked) => handleFormChange('facebook', 'is_active', checked)}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={testLoading === 'facebook'}
                                        onClick={() => handleSendTestLead('facebook')}
                                        className="gap-2"
                                    >
                                        <Play className="h-3.5 w-3.5 text-blue-600" />
                                        {testLoading === 'facebook' ? t('Testing...') : t('Send Test Lead')}
                                    </Button>
                                    <Button size="sm" onClick={() => handleSave('facebook')}>
                                        {t('Save Changes')}
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6 pt-6">
                                {/* Webhook Credentials */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center justify-between">
                                            <span>{t('Callback URL')}</span>
                                            <span className="text-xs text-muted-foreground">{t('Paste this into Meta Webhook URL')}</span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={fbIntegration?.webhook_url || ''}
                                                className="bg-muted/50 font-mono text-xs"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(fbIntegration?.webhook_url || '', 'fb_url')}
                                                title={t('Copy URL')}
                                            >
                                                {copiedKey === 'fb_url' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleRegenerate('facebook', 'webhook_token')}
                                                title={t('Regenerate URL Token')}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center justify-between">
                                            <span>{t('Verify Token')}</span>
                                            <span className="text-xs text-muted-foreground">{t('Paste this into Meta Verify Token')}</span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={fbForm.configuration?.verify_token || fbForm.secret_key || ''}
                                                onChange={(e) => handleConfigChange('facebook', 'verify_token', e.target.value)}
                                                className="font-mono text-xs"
                                                placeholder={t('Enter or generate verify token')}
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(fbForm.configuration?.verify_token || fbForm.secret_key || '', 'fb_verify')}
                                                title={t('Copy Verify Token')}
                                            >
                                                {copiedKey === 'fb_verify' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            {t('Meta App Secret (Optional)')}
                                        </Label>
                                        <Input
                                            type="password"
                                            value={fbForm.configuration?.app_secret || ''}
                                            onChange={(e) => handleConfigChange('facebook', 'app_secret', e.target.value)}
                                            placeholder={t('Optional - for HMAC sha256 signature verification')}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            {t('Page Access Token (Optional)')}
                                        </Label>
                                        <Input
                                            type="password"
                                            value={fbForm.configuration?.access_token || ''}
                                            onChange={(e) => handleConfigChange('facebook', 'access_token', e.target.value)}
                                            placeholder={t('Optional - to auto-fetch lead details from Graph API')}
                                        />
                                    </div>
                                </div>

                                {/* Default Pipeline Classification */}
                                <div className="border rounded-xl p-5 bg-muted/20 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Sliders className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-semibold">{t('Default Pipeline Assignment for Facebook Leads')}</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Status')}</Label>
                                            <Select
                                                value={fbForm.default_lead_status_id}
                                                onValueChange={(val) => handleFormChange('facebook', 'default_lead_status_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select status')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadStatuses.map((s: any) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Source')}</Label>
                                            <Select
                                                value={fbForm.default_lead_source_id}
                                                onValueChange={(val) => handleFormChange('facebook', 'default_lead_source_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select source')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadSources.map((s: any) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Industry')}</Label>
                                            <Select
                                                value={fbForm.default_account_industry_id}
                                                onValueChange={(val) => handleFormChange('facebook', 'default_account_industry_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select industry')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accountIndustries.map((i: any) => (
                                                        <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Assign To')}</Label>
                                            <Select
                                                value={fbForm.default_assigned_to}
                                                onValueChange={(val) => handleFormChange('facebook', 'default_assigned_to', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select sales rep')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map((u: any) => (
                                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Step-by-Step Meta Setup Guide */}
                                <div className="border rounded-xl p-5 bg-card space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Info className="h-4 w-4 text-blue-500" />
                                        <h4 className="text-sm font-semibold">{t('How to configure Meta Webhooks for Lead Ads')}</h4>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                                        <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                                            <div className="font-semibold text-foreground">1. Meta Developer Portal</div>
                                            <p>{t('Go to developers.facebook.com and open your Meta App or create a Business app.')}</p>
                                        </div>

                                        <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                                            <div className="font-semibold text-foreground">2. Add Webhook Product</div>
                                            <p>{t('Select "Webhooks" from the left menu. Choose "Page" as the webhook object.')}</p>
                                        </div>

                                        <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                                            <div className="font-semibold text-foreground">3. Enter Callback Details</div>
                                            <p>{t('Paste the Callback URL and Verify Token above. Click "Verify and Save".')}</p>
                                        </div>

                                        <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                                            <div className="font-semibold text-foreground">4. Subscribe to leadgen</div>
                                            <p>{t('Subscribe to the "leadgen" subscription field for your Facebook Page.')}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ─────────────────────────────────────────────────────────────
                        2. GOOGLE ADS LEAD FORM TAB
                    ───────────────────────────────────────────────────────────── */}
                    <TabsContent value="google_ads" className="space-y-6">
                        <Card className="border shadow-xs">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg">
                                            G
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {t('Google Ads Lead Form Webhook')}
                                                {gadsForm.is_active ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                        {t('Active')}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">{t('Disabled')}</Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                {t('Capture leads generated from Google Search, Display, Discovery, and YouTube Lead Form extensions.')}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="gads-toggle" className="text-sm cursor-pointer">{t('Status')}</Label>
                                        <Switch
                                            id="gads-toggle"
                                            checked={gadsForm.is_active}
                                            onCheckedChange={(checked) => handleFormChange('google_ads', 'is_active', checked)}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={testLoading === 'google_ads'}
                                        onClick={() => handleSendTestLead('google_ads')}
                                        className="gap-2"
                                    >
                                        <Play className="h-3.5 w-3.5 text-amber-600" />
                                        {testLoading === 'google_ads' ? t('Testing...') : t('Send Test Lead')}
                                    </Button>
                                    <Button size="sm" onClick={() => handleSave('google_ads')}>
                                        {t('Save Changes')}
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6 pt-6">
                                {/* Credentials */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center justify-between">
                                            <span>{t('Google Ads Webhook URL')}</span>
                                            <span className="text-xs text-muted-foreground">{t('Paste in Google Ads Lead Form')}</span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={gadsIntegration?.webhook_url || ''}
                                                className="bg-muted/50 font-mono text-xs"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(gadsIntegration?.webhook_url || '', 'gads_url')}
                                                title={t('Copy URL')}
                                            >
                                                {copiedKey === 'gads_url' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleRegenerate('google_ads', 'webhook_token')}
                                                title={t('Regenerate URL Token')}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center justify-between">
                                            <span>{t('Google Key')}</span>
                                            <span className="text-xs text-muted-foreground">{t('Paste in Google Ads "Key"')}</span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={gadsForm.configuration?.google_key || gadsForm.secret_key || ''}
                                                onChange={(e) => handleConfigChange('google_ads', 'google_key', e.target.value)}
                                                className="font-mono text-xs"
                                                placeholder={t('Enter Google Key')}
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(gadsForm.configuration?.google_key || gadsForm.secret_key || '', 'gads_key')}
                                                title={t('Copy Google Key')}
                                            >
                                                {copiedKey === 'gads_key' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleRegenerate('google_ads', 'secret_key')}
                                                title={t('Regenerate Key')}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Default Pipeline Classification */}
                                <div className="border rounded-xl p-5 bg-muted/20 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Sliders className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-semibold">{t('Default Pipeline Assignment for Google Ads Leads')}</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Status')}</Label>
                                            <Select
                                                value={gadsForm.default_lead_status_id}
                                                onValueChange={(val) => handleFormChange('google_ads', 'default_lead_status_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select status')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadStatuses.map((s: any) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Source')}</Label>
                                            <Select
                                                value={gadsForm.default_lead_source_id}
                                                onValueChange={(val) => handleFormChange('google_ads', 'default_lead_source_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select source')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadSources.map((s: any) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Industry')}</Label>
                                            <Select
                                                value={gadsForm.default_account_industry_id}
                                                onValueChange={(val) => handleFormChange('google_ads', 'default_account_industry_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select industry')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accountIndustries.map((i: any) => (
                                                        <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Assign To')}</Label>
                                            <Select
                                                value={gadsForm.default_assigned_to}
                                                onValueChange={(val) => handleFormChange('google_ads', 'default_assigned_to', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select sales rep')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map((u: any) => (
                                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Field Mapping & Setup Guide */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="border rounded-xl p-5 bg-card space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Info className="h-4 w-4 text-amber-500" />
                                            <h4 className="text-sm font-semibold">{t('How to configure Google Ads Lead Forms')}</h4>
                                        </div>
                                        <ol className="list-decimal list-inside space-y-2 text-xs text-muted-foreground">
                                            <li>{t('Sign in to your Google Ads account.')}</li>
                                            <li>{t('Navigate to Ads & assets > Assets > Lead form.')}</li>
                                            <li>{t('Scroll down to "Export leads from Google Ads" section.')}</li>
                                            <li>{t('Select "Manage your leads with a webhook".')}</li>
                                            <li>{t('Paste the Google Ads Webhook URL and the Google Key from above.')}</li>
                                            <li>{t('Click "Send test data" in Google Ads to verify delivery.')}</li>
                                        </ol>
                                    </div>

                                    <div className="border rounded-xl p-5 bg-card space-y-3">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            <h4 className="text-sm font-semibold">{t('Supported Google Ads User Columns')}</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-2 rounded bg-muted/40"><code className="font-semibold text-primary">FULL_NAME</code> &rarr; Lead Name</div>
                                            <div className="p-2 rounded bg-muted/40"><code className="font-semibold text-primary">EMAIL</code> &rarr; Email Address</div>
                                            <div className="p-2 rounded bg-muted/40"><code className="font-semibold text-primary">PHONE_NUMBER</code> &rarr; Phone Number</div>
                                            <div className="p-2 rounded bg-muted/40"><code className="font-semibold text-primary">COMPANY_NAME</code> &rarr; Company</div>
                                            <div className="p-2 rounded bg-muted/40"><code className="font-semibold text-primary">JOB_TITLE</code> &rarr; Position</div>
                                            <div className="p-2 rounded bg-muted/40"><code className="font-semibold text-primary">STREET_ADDRESS</code> &rarr; Address</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ─────────────────────────────────────────────────────────────
                        3. CUSTOM INCOMING WEBHOOK TAB
                    ───────────────────────────────────────────────────────────── */}
                    <TabsContent value="webhook" className="space-y-6">
                        <Card className="border shadow-xs">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-lg">
                                            <WebhookIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {t('Incoming Custom Webhook for Leads')}
                                                {webhookForm.is_active ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                        {t('Active')}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">{t('Disabled')}</Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                {t('Receive leads from Elementor, WordPress forms, Zapier, Make, Typeform, Webflow, or custom landing pages.')}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="wh-toggle" className="text-sm cursor-pointer">{t('Status')}</Label>
                                        <Switch
                                            id="wh-toggle"
                                            checked={webhookForm.is_active}
                                            onCheckedChange={(checked) => handleFormChange('webhook', 'is_active', checked)}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={testLoading === 'webhook'}
                                        onClick={() => handleSendTestLead('webhook')}
                                        className="gap-2"
                                    >
                                        <Play className="h-3.5 w-3.5 text-orange-600" />
                                        {testLoading === 'webhook' ? t('Testing...') : t('Send Test Webhook')}
                                    </Button>
                                    <Button size="sm" onClick={() => handleSave('webhook')}>
                                        {t('Save Changes')}
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6 pt-6">
                                {/* Webhook Endpoint */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center justify-between">
                                            <span>{t('Incoming Webhook URL (POST)')}</span>
                                            <span className="text-xs text-muted-foreground">{t('Send JSON or Form-Data')}</span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={webhookIntegration?.webhook_url || ''}
                                                className="bg-muted/50 font-mono text-xs"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(webhookIntegration?.webhook_url || '', 'wh_url')}
                                                title={t('Copy URL')}
                                            >
                                                {copiedKey === 'wh_url' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleRegenerate('webhook', 'webhook_token')}
                                                title={t('Regenerate URL Token')}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium">{t('Secret Key (Optional Verification)')}</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">{t('Require Header')}</span>
                                                <Switch
                                                    checked={webhookForm.configuration?.secret_header_enabled || false}
                                                    onCheckedChange={(checked) => handleConfigChange('webhook', 'secret_header_enabled', checked)}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={webhookForm.secret_key || ''}
                                                onChange={(e) => handleFormChange('webhook', 'secret_key', e.target.value)}
                                                className="font-mono text-xs"
                                                placeholder={t('Secret string')}
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(webhookForm.secret_key || '', 'wh_secret')}
                                                title={t('Copy Secret')}
                                            >
                                                {copiedKey === 'wh_secret' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleRegenerate('webhook', 'secret_key')}
                                                title={t('Regenerate Secret')}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Pipeline Assignments */}
                                <div className="border rounded-xl p-5 bg-muted/20 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Sliders className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-semibold">{t('Default Pipeline Assignment for Incoming Webhook Leads')}</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Status')}</Label>
                                            <Select
                                                value={webhookForm.default_lead_status_id}
                                                onValueChange={(val) => handleFormChange('webhook', 'default_lead_status_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select status')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadStatuses.map((s: any) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Source')}</Label>
                                            <Select
                                                value={webhookForm.default_lead_source_id}
                                                onValueChange={(val) => handleFormChange('webhook', 'default_lead_source_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select source')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadSources.map((s: any) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Industry')}</Label>
                                            <Select
                                                value={webhookForm.default_account_industry_id}
                                                onValueChange={(val) => handleFormChange('webhook', 'default_account_industry_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select industry')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accountIndustries.map((i: any) => (
                                                        <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Assign To')}</Label>
                                            <Select
                                                value={webhookForm.default_assigned_to}
                                                onValueChange={(val) => handleFormChange('webhook', 'default_assigned_to', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select sales rep')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map((u: any) => (
                                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Code Samples & Snippets */}
                                <div className="border rounded-xl p-5 bg-card space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Terminal className="h-4 w-4 text-primary" />
                                            <h4 className="text-sm font-semibold">{t('Webhook Request Examples')}</h4>
                                        </div>

                                        <div className="flex gap-1 bg-muted p-1 rounded-lg text-xs">
                                            {(['curl', 'js', 'php', 'python'] as const).map((lang) => (
                                                <button
                                                    key={lang}
                                                    onClick={() => setCodeLanguage(lang)}
                                                    className={`px-3 py-1 rounded-md font-mono transition-colors ${
                                                        codeLanguage === lang
                                                            ? 'bg-background shadow-xs text-foreground font-semibold'
                                                            : 'text-muted-foreground hover:text-foreground'
                                                    }`}
                                                >
                                                    {lang.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <pre className="p-4 rounded-lg bg-muted/60 dark:bg-muted/20 border font-mono text-xs overflow-x-auto text-foreground">
                                            {codeLanguage === 'curl' && `curl -X POST "${webhookIntegration?.webhook_url}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555-0199",
    "company": "Acme Ventures",
    "notes": "Inquiry submitted through landing page",
    "value": 2500
  }'`}

                                            {codeLanguage === 'js' && `fetch("${webhookIntegration?.webhook_url}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+1 555-0199",
    company: "Acme Ventures",
    notes: "Submitted from Web form"
  })
})
.then(res => res.json())
.then(data => console.log(data));`}

                                            {codeLanguage === 'php' && `<?php
$ch = curl_init("${webhookIntegration?.webhook_url}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'name'    => 'Jane Doe',
    'email'   => 'jane@example.com',
    'phone'   => '+1 555-0199',
    'company' => 'Acme Ventures',
]));
$response = curl_exec($ch);
curl_close($ch);`}

                                            {codeLanguage === 'python' && `import requests

url = "${webhookIntegration?.webhook_url}"
payload = {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1 555-0199",
    "company": "Acme Ventures"
}
response = requests.post(url, json=payload)
print(response.json())`}
                                        </pre>

                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="absolute top-2 right-2 h-7 text-xs gap-1"
                                            onClick={() => {
                                                const snippet = codeLanguage === 'curl'
                                                    ? `curl -X POST "${webhookIntegration?.webhook_url}" -H "Content-Type: application/json" -d '{"name": "Jane Doe", "email": "jane@example.com", "phone": "+1 555-0199"}'`
                                                    : `fetch("${webhookIntegration?.webhook_url}", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Jane Doe", email: "jane@example.com" }) });`;
                                                copyToClipboard(snippet, 'snippet');
                                            }}
                                        >
                                            {copiedKey === 'snippet' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                            {t('Copy')}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ─────────────────────────────────────────────────────────────
                        4. REST API INTEGRATION TAB
                    ───────────────────────────────────────────────────────────── */}
                    <TabsContent value="api" className="space-y-6">
                        <Card className="border shadow-xs">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-lg">
                                            <Code2 className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {t('Lead REST API Integration')}
                                                {apiForm.is_active ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                        {t('Active')}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">{t('Disabled')}</Badge>
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                {t('Secure programmatic access to create, list, and fetch leads using Bearer Token or X-API-Key authentication.')}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="api-toggle" className="text-sm cursor-pointer">{t('Status')}</Label>
                                        <Switch
                                            id="api-toggle"
                                            checked={apiForm.is_active}
                                            onCheckedChange={(checked) => handleFormChange('api', 'is_active', checked)}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={testLoading === 'api'}
                                        onClick={() => handleSendTestLead('api')}
                                        className="gap-2"
                                    >
                                        <Play className="h-3.5 w-3.5 text-purple-600" />
                                        {testLoading === 'api' ? t('Testing...') : t('Test API Call')}
                                    </Button>
                                    <Button size="sm" onClick={() => handleSave('api')}>
                                        {t('Save Changes')}
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6 pt-6">
                                {/* API Key Credentials */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center justify-between">
                                            <span>{t('API Key (Bearer Token)')}</span>
                                            <span className="text-xs text-muted-foreground">{t('Keep this secret')}</span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={apiIntegration?.api_key || ''}
                                                className="bg-muted/50 font-mono text-xs"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(apiIntegration?.api_key || '', 'api_key')}
                                                title={t('Copy API Key')}
                                            >
                                                {copiedKey === 'api_key' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleRegenerate('api', 'api_key')}
                                                title={t('Regenerate API Key')}
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            {t('Base API URL')}
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                readOnly
                                                value={`${baseUrl}/api/v1`}
                                                className="bg-muted/50 font-mono text-xs"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={() => copyToClipboard(`${baseUrl}/api/v1`, 'base_api_url')}
                                                title={t('Copy Base URL')}
                                            >
                                                {copiedKey === 'base_api_url' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Default Pipeline Classification */}
                                <div className="border rounded-xl p-5 bg-muted/20 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Sliders className="h-4 w-4 text-primary" />
                                        <h3 className="text-sm font-semibold">{t('Default Pipeline Assignment for API Created Leads')}</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Status')}</Label>
                                            <Select
                                                value={apiForm.default_lead_status_id}
                                                onValueChange={(val) => handleFormChange('api', 'default_lead_status_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select status')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadStatuses.map((s: any) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Source')}</Label>
                                            <Select
                                                value={apiForm.default_lead_source_id}
                                                onValueChange={(val) => handleFormChange('api', 'default_lead_source_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select source')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {leadSources.map((s: any) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Default Industry')}</Label>
                                            <Select
                                                value={apiForm.default_account_industry_id}
                                                onValueChange={(val) => handleFormChange('api', 'default_account_industry_id', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select industry')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {accountIndustries.map((i: any) => (
                                                        <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">{t('Assign To')}</Label>
                                            <Select
                                                value={apiForm.default_assigned_to}
                                                onValueChange={(val) => handleFormChange('api', 'default_assigned_to', val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select sales rep')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {users.map((u: any) => (
                                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* API Endpoints Documentation */}
                                <div className="border rounded-xl p-5 bg-card space-y-5">
                                    <div className="flex items-center gap-2">
                                        <Code2 className="h-4 w-4 text-purple-500" />
                                        <h4 className="text-sm font-semibold">{t('Interactive REST API Endpoints')}</h4>
                                    </div>

                                    <div className="space-y-4">
                                        {/* POST /api/v1/leads */}
                                        <div className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-mono text-xs">POST</Badge>
                                                    <code className="text-sm font-semibold">/api/v1/leads</code>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{t('Create new lead')}</span>
                                            </div>

                                            <div className="bg-muted/40 p-3 rounded text-xs font-mono">
                                                <div><strong>Headers:</strong> Authorization: Bearer {apiIntegration?.api_key || 'YOUR_API_KEY'}</div>
                                                <div className="mt-2"><strong>Payload:</strong></div>
                                                <pre className="text-xs text-muted-foreground mt-1">
{`{
  "name": "Jane Doe",               // Required
  "email": "jane@example.com",       // Recommended
  "phone": "+1 555-0100",           // Recommended
  "company": "Acme Innovations",
  "position": "VP Marketing",
  "value": 5000,
  "notes": "Custom API integration inquiry",
  "lead_status_id": 1,              // Optional (defaults to pipeline setting)
  "lead_source_id": 2,              // Optional
  "account_industry_id": 1          // Optional
}`}
                                                </pre>
                                            </div>
                                        </div>

                                        {/* GET /api/v1/leads */}
                                        <div className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-mono text-xs">GET</Badge>
                                                    <code className="text-sm font-semibold">/api/v1/leads</code>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{t('List leads with pagination & search')}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Query params: <code>?search=query&lead_status_id=1&per_page=20</code>
                                            </p>
                                        </div>

                                        {/* GET /api/v1/leads/meta */}
                                        <div className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-blue-600 hover:bg-blue-600 text-white font-mono text-xs">GET</Badge>
                                                    <code className="text-sm font-semibold">/api/v1/leads/meta</code>
                                                </div>
                                                <span className="text-xs text-muted-foreground">{t('Fetch valid Status IDs, Sources, Industries, and Users')}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {t('Returns all available IDs so external CRM bridges or sync scripts know the correct foreign keys to pass.')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ─────────────────────────────────────────────────────────────
                        5. SYNC HISTORY & LIVE LOGS TAB
                    ───────────────────────────────────────────────────────────── */}
                    <TabsContent value="logs" className="space-y-6">
                        <Card className="border shadow-xs">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-blue-500" />
                                        {t('Integration Logs & Ingestion History')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t('Real-time audit log of all incoming requests from Facebook, Google Ads, Webhooks, and API.')}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.reload({ only: ['logs', 'stats'] })}
                                        className="gap-1.5"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        {t('Refresh')}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleClearLogs}
                                        className="gap-1.5"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {t('Clear Logs')}
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-6">
                                {initialLogs.data && initialLogs.data.length > 0 ? (
                                    <div className="border rounded-xl overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/40">
                                                <TableRow>
                                                    <TableHead className="w-[100px]">{t('Status')}</TableHead>
                                                    <TableHead>{t('Integration')}</TableHead>
                                                    <TableHead>{t('Result Message')}</TableHead>
                                                    <TableHead>{t('Associated Lead')}</TableHead>
                                                    <TableHead>{t('IP Address')}</TableHead>
                                                    <TableHead>{t('Timestamp')}</TableHead>
                                                    <TableHead className="text-right">{t('Action')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {initialLogs.data.map((log: any) => (
                                                    <TableRow key={log.id} className="hover:bg-muted/30">
                                                        <TableCell>
                                                            {log.status === 'success' ? (
                                                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1 font-medium">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    {t('Success')}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="destructive" className="gap-1 font-medium">
                                                                    <XCircle className="h-3 w-3" />
                                                                    {t('Failed')}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-semibold text-xs flex items-center gap-1.5">
                                                                {log.integration_type === 'facebook' && (
                                                                    <span className="h-2 w-2 rounded-full bg-[#1877F2]" />
                                                                )}
                                                                {log.integration_type === 'google_ads' && (
                                                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                                                )}
                                                                {log.integration_type === 'webhook' && (
                                                                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                                                                )}
                                                                {log.integration_type === 'api' && (
                                                                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                                                                )}
                                                                {log.integration_type === 'facebook' && 'Facebook Ads'}
                                                                {log.integration_type === 'google_ads' && 'Google Ads'}
                                                                {log.integration_type === 'webhook' && 'Custom Webhook'}
                                                                {log.integration_type === 'api' && 'REST API'}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs max-w-xs truncate text-muted-foreground">
                                                            {log.response_message || '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {log.lead ? (
                                                                <a
                                                                    href={route('leads.show', log.lead.id)}
                                                                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                                                                >
                                                                    {log.lead.name}
                                                                    <ArrowUpRight className="h-3 w-3" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                                            {log.ip_address || '—'}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {new Date(log.created_at).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 text-xs"
                                                                onClick={() => {
                                                                    setSelectedLogPayload(log.payload);
                                                                    setIsPayloadModalOpen(true);
                                                                }}
                                                            >
                                                                {t('View Payload')}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground space-y-2">
                                        <Activity className="h-10 w-10 mx-auto opacity-30" />
                                        <div className="text-sm font-medium">{t('No integration events logged yet.')}</div>
                                        <p className="text-xs max-w-md mx-auto">
                                            {t('Use the "Send Test Lead" button on any integration tab to test and view the first live log event.')}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Payload Inspection Modal */}
            <Dialog open={isPayloadModalOpen} onOpenChange={setIsPayloadModalOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Code2 className="h-5 w-5 text-primary" />
                            {t('Raw Ingestion Payload')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Inspected JSON payload received from external integration request.')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto bg-muted/40 p-4 rounded-lg font-mono text-xs border">
                        <pre className="text-foreground whitespace-pre-wrap break-all">
                            {JSON.stringify(selectedLogPayload, null, 2)}
                        </pre>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(selectedLogPayload, null, 2), 'payload_json')}
                        >
                            {copiedKey === 'payload_json' ? <Check className="h-4 w-4 mr-1 text-emerald-500" /> : <Copy className="h-4 w-4 mr-1" />}
                            {t('Copy JSON')}
                        </Button>
                        <Button size="sm" onClick={() => setIsPayloadModalOpen(false)}>
                            {t('Close')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}
