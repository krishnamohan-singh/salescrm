import { PageTemplate } from '@/components/page-template';
import { usePage, Link,router } from '@inertiajs/react';
import { ArrowLeft, DollarSign, Calendar, Target, BarChart3, TrendingUp, Users, User, Tag, List, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import UserInitials from '@/components/user-initials';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/authorization';
import { useInitials } from '@/hooks/use-initials';

export default function CampaignShow() {
    const { t } = useTranslation();
    const { campaign, campaignLeads } = usePage().props as any;
    const permissions = (usePage().props as any).auth?.permissions;
    const getInitials = useInitials();

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Campaigns'), href: route('campaigns.index') },
        { title: t('View Campaign') },
    ];

    const formatCurrency = (amount: number) =>
        window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return window.appSettings?.formatDateTime(dateString, false) || new Date(dateString).toLocaleDateString();
    };

    const getResponseRate = () => {
        const expected = campaign.expected_response || 0;
        const actual = campaignLeads?.length || 0;
        if (expected === 0) return '-';
        return `${((actual / expected) * 100).toFixed(1)}%`;
    };

    const remaining = (campaign.budget || 0) - (campaign.actual_cost || 0);
    const budgetUsedPct = campaign.budget > 0 ? Math.min(((campaign.actual_cost || 0) / campaign.budget) * 100, 100) : 0;
    const responsePct = campaign.expected_response > 0 ? Math.min(((campaignLeads?.length || 0) / campaign.expected_response) * 100, 100) : 0;

    const calculateROI = () => {
        const actualCost = campaign.actual_cost || 0;
        const budget = campaign.budget || 0;
        if (budget === 0) return t('-');
        const roi = ((budget - actualCost) / budget) * 100;
        return `${roi.toFixed(1)}%`;
    };

    return (
        <PageTemplate
            title={campaign.name}
            description={(t("Campaign details and related information"))}
            breadcrumbs={breadcrumbs}
            actions={[{
                label: t('Back'),
                icon: <ArrowLeft className="h-4 w-4 mr-2" />,
                variant: 'outline' as const,
                onClick: () => router.visit(route('campaigns.index')),
            }]}
            noPadding
        >
            <div className="space-y-6">

                {/* Header */}
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
                            {campaign.description && (
                                <p className="text-sm text-gray-500 mt-1 max-w-2xl">{campaign.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                                {/* <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{campaign.campaign_type?.name || '-'}</span>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1"><List className="h-3 w-3" />{campaign.target_list?.name || '-'}</span>
                                <span className="text-gray-300">|</span>
                                <span className="flex items-center gap-1"><User className="h-3 w-3" />{campaign.assigned_user?.name || t('Unassigned')}</span> */}
                            </div>
                        </div>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                            campaign.status === 'active'
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : 'bg-red-50 text-red-700 ring-red-600/20'
                        }`}>
                            {campaign.status === 'active' ? t('Active') : t('Inactive')}
                        </span>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {([
                        { label: t('Budget'), value: formatCurrency(campaign.budget), icon: DollarSign, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
                        { label: t('Actual Cost'), value: formatCurrency(campaign.actual_cost), icon: BarChart3, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
                        { label: t('Response Rate'), value: getResponseRate(), icon: TrendingUp, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                        { label: t('Total Leads'), value: `${campaignLeads?.length || 0}`, icon: Users, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
                        { label: t('ROI'), value: calculateROI(), icon: Target, iconCls: 'text-rose-600', blobCls: 'bg-rose-50 dark:bg-rose-900/30' },
                    ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                        <Card key={label} className="relative overflow-hidden">
                            <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                            <CardContent className="relative p-4">
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 pr-2">
                                        <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                                        <p className="text-lg font-bold font-mono text-foreground truncate leading-snug">{value}</p>
                                    </div>
                                    <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5 flex-shrink-0`}>
                                        <Icon className={`h-5 w-5 ${iconCls}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Campaign Details + Budget Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Campaign Information */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <Tag className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Campaign Information')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('Campaign Type')}</label>
                                    <p className="text-sm mt-1 font-medium">{campaign.campaign_type?.name || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('Target List')}</label>
                                    <p className="text-sm mt-1 font-medium">{campaign.target_list?.name || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('Start Date')}</label>
                                    <p className="text-sm mt-1 font-medium">{formatDate(campaign.start_date)}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('End Date')}</label>
                                    <p className="text-sm mt-1 font-medium">{formatDate(campaign.end_date)}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('Assigned To')}</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        {campaign.assigned_user ? (
                                            <>
                                                <Avatar className="h-6 w-6"><AvatarImage src={campaign.assigned_user.avatar} /><AvatarFallback className="text-[10px]">{getInitials(campaign.assigned_user.name)}</AvatarFallback></Avatar>
                                                <span className="text-sm font-medium">{campaign.assigned_user.name}</span>
                                            </>
                                        ) : <span className="text-sm font-medium">{t('Unassigned')}</span>}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('Created By')}</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        {campaign.creator ? (
                                            <>
                                                <Avatar className="h-6 w-6"><AvatarImage src={campaign.creator.avatar} /><AvatarFallback className="text-[10px]">{getInitials(campaign.creator.name)}</AvatarFallback></Avatar>
                                                <span className="text-sm font-medium">{campaign.creator.name}</span>
                                            </>
                                        ) : <span className="text-sm font-medium">-</span>}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('Expected Response')}</label>
                                    <p className="text-sm mt-1 font-medium">{campaign.expected_response || 0}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">{t('Actual Response')}</label>
                                    <p className="text-sm mt-1 font-medium">{campaignLeads?.length || 0} {t('leads')}</p>
                                </div>
                            </div>
                            <div className="border-t pt-4 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    
                                    <span>{t('Created')}: </span>
                                    <Calendar className="h-3 w-3" /><span className="font-medium text-gray-600">{formatDate(campaign.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    
                                    <span>{t('Updated')}: </span>
                                   <Calendar className="h-3 w-3" /> <span className="font-medium text-gray-600">{formatDate(campaign.updated_at)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Budget Analysis */}
                    <Card className="shadow-sm">
                        <CardHeader className="border-b py-3.5 px-5">
                            <CardTitle className="flex items-center text-lg font-semibold">
                                <DollarSign className="h-5 w-5 mr-3 text-muted-foreground" />
                                {t('Budget Analysis')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('Budget')}</p>
                                    <p className="text-base font-bold font-mono text-green-600">{formatCurrency(campaign.budget)}</p>
                                </div>
                                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('Spent')}</p>
                                    <p className="text-base font-bold font-mono text-blue-600">{formatCurrency(campaign.actual_cost)}</p>
                                </div>
                                <div className={`text-center p-4 rounded-lg border ${remaining >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('Remaining')}</p>
                                    <p className={`text-base font-bold font-mono ${remaining >= 0 ? 'text-purple-600' : 'text-red-600'}`}>{formatCurrency(remaining)}</p>
                                </div>
                            </div>

                            {campaign.budget > 0 && (
                                <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                        <span>{t('Budget Used')}</span>
                                        <span className="font-medium">{budgetUsedPct.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full transition-all bg-primary"
                                            style={{ width: `${budgetUsedPct}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {campaign.expected_response > 0 && (
                                <div>
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                                        <span>{t('Response Progress')}</span>
                                        <span className="font-medium">{campaignLeads?.length || 0} / {campaign.expected_response}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full bg-primary transition-all"
                                            style={{ width: `${responsePct}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Campaign Leads */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b py-3.5 px-5">
                        <CardTitle className="flex items-center text-lg font-semibold">
                            <Users className="h-5 w-5 mr-3 text-muted-foreground" />
                            {t('Campaign Leads')}
                            <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                {campaignLeads?.length || 0}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {campaignLeads?.length > 0 ? (
                            <>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-[#F0F0F1] dark:bg-gray-800 text-xs text-muted-foreground">
                                            <th className="px-6 py-3 text-left font-medium">{t('Name')}</th>
                                            <th className="px-6 py-3 text-left font-medium">{t('Assigned To')}</th>
                                            <th className="px-6 py-3 text-left font-medium">{t('Status')}</th>
                                            {hasPermission(permissions, 'view-leads') && (
                                                <th className="px-6 py-3 text-right font-medium">{t('Action')}</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {campaignLeads.slice(0, 10).map((lead: any) => (
                                            <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <UserInitials name={lead.name} />
                                                        <div>
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm">{lead.name}</p>
                                                            <p className="text-xs text-gray-500">{lead.email || '-'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    {lead.assigned_user ? (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8 shrink-0">
                                                                <AvatarImage src={lead.assigned_user.avatar} alt={lead.assigned_user.name} />
                                                                <AvatarFallback className="text-[10px]">{getInitials(lead.assigned_user.name)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300">{lead.assigned_user.name}</p>
                                                                <p className="text-xs text-gray-500">{lead.assigned_user.email || '-'}</p>
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-sm text-gray-500">{t('Unassigned')}</span>}
                                                </td>
                                                <td className="px-6 py-3">
                                                    {lead.lead_status ? (
                                                        <span
                                                            className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset"
                                                            style={{
                                                                backgroundColor: `${lead.lead_status.color}20`,
                                                                color: lead.lead_status.color,
                                                                borderColor: `${lead.lead_status.color}40`,
                                                            }}
                                                        >
                                                            {lead.lead_status.name}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                {hasPermission(permissions, 'view-leads') && (
                                                    <td className="px-6 py-3 text-right">
                                                        <TooltipProvider delayDuration={200}>
                                                          <Tooltip>
                                                            <TooltipTrigger asChild>
                                                              <Link href={route('leads.show', lead.id)}>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                  <Eye className="h-4 w-4 text-gray-500" />
                                                                </Button>
                                                              </Link>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top"><p>{t('View')}</p></TooltipContent>
                                                          </Tooltip>
                                                        </TooltipProvider>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {campaignLeads.length > 10 && (
                                    <div className="px-6 py-3 text-center text-sm text-muted-foreground bg-gray-50 border-t">
                                        +{campaignLeads.length - 10} {t('more leads')}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <Users className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm text-gray-500">{t('No leads created from this campaign yet.')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </PageTemplate>
    );
}
