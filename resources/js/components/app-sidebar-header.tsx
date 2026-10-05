import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { ProfileMenu } from '@/components/profile-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getCookie, setCookie } from '@/utils/cookie-utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { SessionTimer } from '@/components/session-timer';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { t } = useTranslation();
    const { position } = useLayout();
    const { globalSettings } = usePage().props as any;
    const isDemo = globalSettings?.is_demo || false;
    // Determine current mode from DB (non-demo) or cookie (demo)
    const getCurrentMode = (): 'light' | 'dark' => {
        if (isDemo) {
            try {
                const cookie = getCookie('themeSettings');
                if (cookie) {
                    const parsed = JSON.parse(cookie);
                    return parsed.appearance === 'dark' ? 'dark' : 'light';
                }
            } catch { }
            return 'light';
        }
        return (globalSettings?.themeMode === 'dark') ? 'dark' : 'light';
    };

    const [isDark, setIsDark] = useState(() => getCurrentMode() === 'dark');

    // Sync with globalSettings changes (main version)
    useEffect(() => {
        setIsDark(getCurrentMode() === 'dark');
    }, [globalSettings?.themeMode]);

    // Sync with DOM dark class changes (demo version — settings page updates DOM directly)
    useEffect(() => {
        if (!isDemo) return;
        const observer = new MutationObserver(() => {
            const domIsDark = document.documentElement.classList.contains('dark');
            setIsDark(domIsDark);
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, [isDemo]);

    const handleToggle = () => {
        const newMode = isDark ? 'light' : 'dark';
        setIsDark(!isDark);

        // Apply theme directly to DOM
        document.documentElement.classList.toggle('dark', newMode === 'dark');
        document.body.classList.toggle('dark', newMode === 'dark');

        if (isDemo) {
            // Demo: save to cookie directly with new mode value — no router call
            try {
                const existing = getCookie('themeSettings');
                const parsed = existing ? JSON.parse(existing) : {};
                const updated = { ...parsed, appearance: newMode };
                setCookie('themeSettings', JSON.stringify(updated));
            } catch {
                setCookie('themeSettings', JSON.stringify({ appearance: newMode }));
            }
        } else {
            // Main: save to database
            router.post(route('settings.brand.update'), {
                settings: {
                    themeMode: newMode
                }
            }, { preserveScroll: true, preserveState: true });
        }
    };

    return (
        <>
            <header className="border-sidebar-border/50 flex h-14 shrink-0 items-center gap-2 border-b px-[50px] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                        {position === 'left' && <SidebarTrigger className="-ml-1" />}
                        {position === 'right' && <SidebarTrigger className="-mr-1" />}
                        <Breadcrumbs items={breadcrumbs.map(b => ({ label: b.title, href: b.href }))} />
                    </div>
                    <div className="flex items-center gap-2">
                        <SessionTimer />
                        {(usePage().props as any).isImpersonating && (
                            <button
                                onClick={() => router.get(route('impersonate.leave'))}
                                className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 cursor-pointer"
                            >
                                {t("Return Back")}
                            </button>
                        )}
                        {/* Dark/Light Mode Toggle */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size={'icon'}
                                        variant={'outline'}
                                        onClick={handleToggle}
                                        className="border shadow-sm"
                                    >
                                        {isDark
                                            ? <Sun className="h-4 w-4 text-yellow-500" />
                                            : <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        }
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isDark ? t('Switch to Light Mode') : t('Switch to Dark Mode')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <LanguageSwitcher />
                        <ProfileMenu />
                    </div>
                </div>
            </header>
        </>
    );
}
