import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { List, Megaphone, Star, Clock, Calendar, Tag, Eye, XCircle, BarChart2, TrendingUp, ArrowRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { hasPermission } from '@/utils/authorization';
import { useTranslation } from 'react-i18next';

export default function AnnouncementDashboard() {
    const { t } = useTranslation();
    const { auth, announcements = [] } = usePage().props as any;
    const permissions = auth?.permissions || [];
    const initialTab = (() => { const p = new URLSearchParams(window.location.search).get('tab'); return ['all','featured','upcoming','expired'].includes(p ?? '') ? p : 'all'; })() as 'all' | 'featured' | 'upcoming' | 'expired';
    const [activeTab, setActiveTab] = useState<'all' | 'featured' | 'upcoming' | 'expired'>(initialTab);

    const handleTabChange = (tab: 'all' | 'featured' | 'upcoming' | 'expired') => {
        setActiveTab(tab);
        const url = new URL(window.location.href);
        tab === 'all' ? url.searchParams.delete('tab') : url.searchParams.set('tab', tab);
        window.history.replaceState(null, '', url.toString());
    };

    useEffect(() => {
        const main = document.querySelector('main[data-slot="sidebar-inset"]') as HTMLElement | null;
        if (main) main.style.overflow = 'visible';
        return () => { if (main) main.style.overflow = ''; };
    }, []);

    const now = new Date();

    const active   = announcements.filter((a: any) => a.status === 'active');
    const expired  = announcements.filter((a: any) => a.status === 'expired');
    const featured = announcements.filter((a: any) => a.is_featured);
    const upcoming = announcements.filter((a: any) => a.start_date && new Date(a.start_date) > now);

    const categoryMap: Record<string, number> = {};
    announcements.forEach((a: any) => {
        const name = a.category?.name || t('Uncategorized');
        categoryMap[name] = (categoryMap[name] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

    const tabData = [
        { value: 'all',      label: t('All'),      list: announcements, icon: <Megaphone className="h-3.5 w-3.5" /> },
        { value: 'featured', label: t('Featured'), list: featured,      icon: <Star className="h-3.5 w-3.5" /> },
        { value: 'upcoming', label: t('Upcoming'), list: upcoming,      icon: <Clock className="h-3.5 w-3.5" /> },
        { value: 'expired',  label: t('Expired'),  list: expired,       icon: <XCircle className="h-3.5 w-3.5" /> },
    ];

    const displayed = tabData.find(tab => tab.value === activeTab)?.list ?? announcements;
    const sorted = [...displayed].sort((a: any, b: any) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const getStatusBadge = (status: string) => {
        const map: Record<string, string> = {
            active:   'bg-green-50 text-green-700 ring-green-600/20',
            inactive: 'bg-red-50 text-red-700 ring-red-600/20',
            expired:  'bg-gray-50 text-gray-700 ring-gray-600/20',
        };
        const cls = map[status] ?? map.inactive;
        return (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${cls}`}>
                {status?.charAt(0).toUpperCase() + status?.slice(1)}
            </span>
        );
    };

    return (
        <PageTemplate
            title={t('Announcement Dashboard')}
            description={t('Company-wide announcements and notices')}
            actions={[
                ...(hasPermission(permissions, 'manage-announcements') ? [{
                    label: t('List View'),
                    icon: <List className="h-4 w-4 me-2" />,
                    variant: 'outline',
                    onClick: () => router.get(route('announcements.index'))
                }] : []),
            ]}
            breadcrumbs={[
                { title: t('Dashboard'), href: route('dashboard') },
                { title: t('Announcements'), href: route('announcements.index') },
                { title: t('Dashboard') }
            ]}
            noPadding
        >
            <div className="flex flex-col lg:flex-row gap-4 lg:items-start">

                {/* ── Mobile: Stats strip (shown only on mobile, above feed) ── */}
                <div className="lg:hidden grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                        { label: t('Total'),    count: announcements.length, color: 'bg-blue-500' },
                        { label: t('Active'),   count: active.length,        color: 'bg-green-500' },
                        { label: t('Featured'), count: featured.length,      color: 'bg-yellow-500' },
                        { label: t('Expired'),  count: expired.length,       color: 'bg-gray-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${s.color}`} />
                            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{s.label}</span>
                            <span className="text-xs font-bold text-gray-900 dark:text-gray-100 ml-auto">{s.count}</span>
                        </div>
                    ))}
                </div>

                {/* ── Left: Feed ─────────────────────────────────────────── */}
                <div className="flex-1 min-w-0 space-y-4">

                    {/* Tab switcher + feed */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700 scrollbar-none">
                            {tabData.map(tab => (
                                <button key={tab.value} onClick={() => handleTabChange(tab.value as any)}
                                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                                        activeTab === tab.value
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}>
                                    {tab.icon}{tab.label}
                                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                                        activeTab === tab.value ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>{tab.list.length}</span>
                                </button>
                            ))}
                        </div>

                        <div className="overflow-y-auto lg:max-h-[700px]">
                        <div className="p-3 space-y-2">
                            {sorted.length === 0 ? (
                                <div className="flex flex-col items-center py-14 text-center">
                                    <Megaphone className="h-10 w-10 text-gray-200 dark:text-gray-700 mb-2" />
                                    <p className="text-sm text-muted-foreground">{t('No announcements')}</p>
                                </div>
                            ) : sorted.map((a: any) => (
                                <div key={a.id} className={`p-3 sm:p-4 border rounded-lg transition-colors ${
                                    a.is_featured
                                        ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/10 dark:border-yellow-700'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}>
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{a.title}</h3>
                                                {a.is_featured && (
                                                    <span className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20">
                                                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{t('Featured')}
                                                    </span>
                                                )}
                                                {a.category?.name && (
                                                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                                                        <Tag className="h-3 w-3" />{a.category.name}
                                                    </span>
                                                )}
                                            </div>
                                            {hasPermission(permissions, 'view-announcements') && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button onClick={() => router.get(route('announcements.show', a.id))}
                                                                className="text-gray-400 cursor-pointer">
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{t('View')}</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2"
                                            dangerouslySetInnerHTML={{ __html: a.content }} />
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3 shrink-0" />
                                                {a.start_date && <span>{window.appSettings?.formatDateTime(a.start_date, false)}</span>}
                                                {a.end_date && (
                                                    <>
                                                        <ArrowRight className="h-3 w-3 text-gray-300" />
                                                        <span>{window.appSettings?.formatDateTime(a.end_date, false)}</span>
                                                    </>
                                                )}
                                            </div>
                                            {a.creator && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="shrink-0 cursor-default">
                                                                {a.creator.avatar ? (
                                                                    <img src={a.creator.avatar} className="h-6 w-6 rounded-full object-cover" />
                                                                ) : (
                                                                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                                                                        {a.creator.name?.charAt(0).toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="font-medium">{a.creator.name}</div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </div>
                    </div>
                </div>

                {/* ── Right: Sidebar ──────────────────────────────────────── */}
                <div className="hidden lg:block w-64 shrink-0 space-y-4 sticky top-6" style={{ alignSelf: 'flex-start' }}>

                    {/* Stats */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                            <BarChart2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">{t('Overview')}</span>
                        </div>
                        <div className="p-4 space-y-3">
                            {[
                                { label: t('Total'),    count: announcements.length, color: 'bg-blue-500' },
                                { label: t('Active'),   count: active.length,        color: 'bg-green-500' },
                                { label: t('Featured'), count: featured.length,      color: 'bg-yellow-500' },
                                { label: t('Upcoming'), count: upcoming.length,      color: 'bg-purple-500' },
                                { label: t('Expired'),  count: expired.length,       color: 'bg-gray-400' },
                            ].map(s => (
                                <div key={s.label} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full ${s.color}`} />
                                        <span className="text-sm text-gray-600 dark:text-gray-300">{s.label}</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Category breakdown */}
                    {categoryBreakdown.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-semibold">{t('By Category')}</span>
                            </div>
                            <div className="overflow-y-auto" style={{ maxHeight: categoryBreakdown.length > 5 ? '205px' : 'none' }}>
                                <div className="px-4 pt-4 pb-3 space-y-2.5">
                                    {categoryBreakdown.map(([name, count]) => {
                                        const pct = announcements.length > 0 ? Math.round((count / announcements.length) * 100) : 0;
                                        return (
                                            <div key={name}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{name}</span>
                                                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 ml-2">{count}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageTemplate>
    );
}
