import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router, Link } from '@inertiajs/react';
import { ArrowLeft, Edit, Layers, DollarSign, Clock, Users, Building2, TrendingUp, Tag, FileText, ExternalLink, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';

export default function ServiceShow() {
    const { t } = useTranslation();
    const { service, auth } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const canEdit = hasPermission(permissions, 'edit-services');

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Services'), href: route('services.index') },
        { title: service.name },
    ];

    const formatCurrency = (amount: number) =>
        window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

    const getBillingCycleLabel = (cycle?: string) => {
        switch (cycle) {
            case 'hourly': return t('Hourly Rate');
            case 'daily': return t('Daily Rate');
            case 'monthly': return t('Monthly Recurring');
            case 'quarterly': return t('Quarterly Recurring');
            case 'yearly': return t('Annual Retainer');
            default: return t('One-Time Fixed');
        }
    };

    const leads = service.leads || [];
    const accounts = service.accounts || [];
    const opportunities = service.opportunities || [];

    const actions = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 mr-2" />,
            variant: 'outline' as const,
            onClick: () => router.visit(route('services.index')),
        },
        ...(canEdit ? [{
            label: t('Edit Service'),
            icon: <Edit className="h-4 w-4 mr-2" />,
            variant: 'default' as const,
            onClick: () => router.visit(route('services.edit', service.id)),
        }] : []),
    ];

    return (
        <PageTemplate
            title={service.name}
            description={t('Service catalog details and CRM mappings')}
            breadcrumbs={breadcrumbs}
            actions={actions}
            noPadding
        >
            <div className="space-y-6">
                {/* Top Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        {
                            label: t('Standard Rate'),
                            value: `${formatCurrency(service.price)}`,
                            subtext: getBillingCycleLabel(service.billing_cycle),
                            icon: DollarSign,
                            iconCls: 'text-emerald-600',
                            blobCls: 'bg-emerald-50 dark:bg-emerald-900/30',
                        },
                        {
                            label: t('Mapped Leads'),
                            value: leads.length,
                            subtext: t('Prospects interested'),
                            icon: Users,
                            iconCls: 'text-blue-600',
                            blobCls: 'bg-blue-50 dark:bg-blue-900/30',
                        },
                        {
                            label: t('Mapped Accounts'),
                            value: accounts.length,
                            subtext: t('Contracted clients'),
                            icon: Building2,
                            iconCls: 'text-purple-600',
                            blobCls: 'bg-purple-50 dark:bg-purple-900/30',
                        },
                        {
                            label: t('Mapped Opportunities'),
                            value: opportunities.length,
                            subtext: t('In active pipeline'),
                            icon: TrendingUp,
                            iconCls: 'text-orange-600',
                            blobCls: 'bg-orange-50 dark:bg-orange-900/30',
                        },
                    ].map(({ label, value, subtext, icon: Icon, iconCls, blobCls }) => (
                        <Card key={label} className="relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                            <CardContent className="relative p-4">
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                                        <p className="text-lg font-bold text-foreground truncate font-mono leading-snug">{value}</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">{subtext}</p>
                                    </div>
                                    <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5 flex-shrink-0`}>
                                        <Icon className={`h-5 w-5 ${iconCls}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Service Details */}
                    <Card className="shadow-sm lg:col-span-1">
                        <CardHeader className="border-b py-3 px-4">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Layers className="h-4 w-4 text-primary" />
                                <span>{t('Service Information')}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4 text-xs">
                            <div className="space-y-1">
                                <span className="text-muted-foreground">{t('Service Code')}</span>
                                <p className="font-mono font-medium text-foreground">{service.code || '—'}</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-muted-foreground">{t('Status')}</span>
                                <div>
                                    <Badge variant={service.status === 'active' ? 'default' : 'secondary'}>
                                        {service.status === 'active' ? t('Active') : t('Inactive')}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-muted-foreground">{t('Category')}</span>
                                <p className="font-medium text-foreground">{service.category?.name || '—'}</p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-muted-foreground">{t('Tax Rate')}</span>
                                <p className="font-medium text-foreground">
                                    {service.tax ? `${service.tax.name} (${service.tax.rate}%)` : '—'}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <span className="text-muted-foreground">{t('Assigned Lead / Owner')}</span>
                                <p className="font-medium text-foreground">{service.assigned_user?.name || t('Unassigned')}</p>
                            </div>

                            {service.description && (
                                <div className="space-y-1 pt-2 border-t">
                                    <span className="text-muted-foreground font-semibold">{t('Description & Scope')}</span>
                                    <p className="text-foreground leading-relaxed whitespace-pre-line text-xs">
                                        {service.description}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right Column: Mapped Entities Tabs */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card className="shadow-sm">
                            <CardHeader className="border-b py-3 px-4">
                                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-primary" />
                                        <span>{t('Mapped CRM Relationships')}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {leads.length + accounts.length + opportunities.length} {t('total mappings')}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <Tabs defaultValue="leads" className="w-full space-y-4">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="leads" className="flex items-center gap-1.5 text-xs">
                                            <Users className="h-3.5 w-3.5" />
                                            <span>{t('Leads')}</span>
                                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                                                {leads.length}
                                            </Badge>
                                        </TabsTrigger>
                                        <TabsTrigger value="accounts" className="flex items-center gap-1.5 text-xs">
                                            <Building2 className="h-3.5 w-3.5" />
                                            <span>{t('Accounts')}</span>
                                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                                                {accounts.length}
                                            </Badge>
                                        </TabsTrigger>
                                        <TabsTrigger value="opportunities" className="flex items-center gap-1.5 text-xs">
                                            <TrendingUp className="h-3.5 w-3.5" />
                                            <span>{t('Opportunities')}</span>
                                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                                                {opportunities.length}
                                            </Badge>
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Leads Tab Content */}
                                    <TabsContent value="leads" className="space-y-3">
                                        {leads.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-8">
                                                {t('No leads are currently mapped to this service.')}
                                            </p>
                                        ) : (
                                            <div className="divide-y divide-border rounded-lg border">
                                                {leads.map((lead: any) => (
                                                    <div key={lead.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                                                        <div className="min-w-0">
                                                            <Link href={route('leads.show', lead.id)} className="font-semibold text-foreground hover:text-primary hover:underline">
                                                                {lead.name}
                                                            </Link>
                                                            <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                                                                {lead.email && <span>{lead.email}</span>}
                                                                {lead.lead_status?.name && (
                                                                    <>
                                                                        <span>·</span>
                                                                        <span className="text-primary font-medium">{lead.lead_status.name}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {lead.pivot?.notes && (
                                                                <p className="italic text-[11px] text-muted-foreground mt-0.5">"{lead.pivot.notes}"</p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 flex-shrink-0">
                                                            <span className="font-semibold font-mono text-emerald-600">
                                                                {formatCurrency(lead.pivot?.price || service.price)}
                                                            </span>
                                                            <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                                                                <Link href={route('leads.show', lead.id)}>
                                                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* Accounts Tab Content */}
                                    <TabsContent value="accounts" className="space-y-3">
                                        {accounts.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-8">
                                                {t('No accounts are currently contracted or mapped to this service.')}
                                            </p>
                                        ) : (
                                            <div className="divide-y divide-border rounded-lg border">
                                                {accounts.map((account: any) => (
                                                    <div key={account.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                                                        <div className="min-w-0">
                                                            <Link href={route('accounts.show', account.id)} className="font-semibold text-foreground hover:text-primary hover:underline">
                                                                {account.name}
                                                            </Link>
                                                            <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                                                    {account.pivot?.status || 'active'}
                                                                </Badge>
                                                                {account.pivot?.start_date && (
                                                                    <span className="flex items-center gap-1 text-[11px]">
                                                                        <Calendar className="h-3 w-3" />
                                                                        {account.pivot.start_date}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 flex-shrink-0">
                                                            <span className="font-semibold font-mono text-emerald-600">
                                                                {formatCurrency(account.pivot?.price || service.price)}
                                                            </span>
                                                            <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                                                                <Link href={route('accounts.show', account.id)}>
                                                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* Opportunities Tab Content */}
                                    <TabsContent value="opportunities" className="space-y-3">
                                        {opportunities.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-8">
                                                {t('No opportunities are currently proposing this service.')}
                                            </p>
                                        ) : (
                                            <div className="divide-y divide-border rounded-lg border">
                                                {opportunities.map((opp: any) => (
                                                    <div key={opp.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                                                        <div className="min-w-0">
                                                            <Link href={route('opportunities.show', opp.id)} className="font-semibold text-foreground hover:text-primary hover:underline">
                                                                {opp.name}
                                                            </Link>
                                                            <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                                                                {opp.opportunity_stage?.name && (
                                                                    <span className="text-blue-600 font-medium">{opp.opportunity_stage.name}</span>
                                                                )}
                                                                <span>·</span>
                                                                <span>{t('Qty')}: {opp.pivot?.quantity || 1}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 flex-shrink-0">
                                                            <span className="font-semibold font-mono text-emerald-600">
                                                                {formatCurrency(opp.pivot?.total_price || opp.pivot?.unit_price || service.price)}
                                                            </span>
                                                            <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                                                                <Link href={route('opportunities.show', opp.id)}>
                                                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </PageTemplate>
    );
}
