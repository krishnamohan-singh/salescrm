import '../css/app.css';
import '../css/dark-mode.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import { LayoutProvider } from './contexts/LayoutContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { BrandProvider } from './contexts/BrandContext';
import { ModalStackProvider } from './contexts/ModalStackContext';
import { initializeTheme } from './hooks/use-appearance';
import { CustomToast, toast } from './components/custom-toast';
import { initializeGlobalSettings } from './utils/globalSettings';
import { initPerformanceMonitoring, lazyLoadImages } from './utils/performance';
import { getCookie, isDemoMode } from './utils/cookie-utils';
import i18n from './i18n'; // Import i18n configuration
import './utils/axios-config'; // Import axios configuration
import './utils/routes'; // Import route helper
import { getCsrfToken, syncCsrfToken, refreshCsrfToken } from './utils/csrf';

// Initialize performance monitoring
initPerformanceMonitoring();

// Initialize lazy loading of images when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    lazyLoadImages();
});

// Add event listener for theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    // Re-apply theme when system preference changes
    let savedTheme = null;

    if (isDemoMode()) {
        savedTheme = getCookie('themeSettings');
    }

    if (savedTheme) {
        const themeSettings = JSON.parse(savedTheme);
        if (themeSettings.appearance === 'system') {
            initializeTheme();
        }
    }
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    // title: (title) => title ? `${title} - ${appName}` : appName,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        // Make page data globally available for axios interceptor
        try {
            (window as any).page = props.initialPage;
            if (props.initialPage.props?.csrf_token) {
                syncCsrfToken(props.initialPage.props.csrf_token as string);
            }
        } catch (e) {
        }

        // Set demo mode globally
        try {
            (window as any).isDemo = props.initialPage.props?.is_demo || false;
        } catch (e) {
            // Ignore errors
        }

        // Sync language from database when not in demo mode
        const syncLanguage = (pageProps: any) => {
            const userLanguage = pageProps?.props?.userLanguage;

            if (userLanguage) {
                // Always force LTR to prevent sidebar issues
                document.documentElement.dir = 'ltr';
                document.documentElement.setAttribute('dir', 'ltr');

                if (i18n.language !== userLanguage) {
                    i18n.changeLanguage(userLanguage);
                }
            }
        };

        // Initial language sync
        syncLanguage(props.initialPage);

        // Initialize global settings from shared data
        const globalSettings = props.initialPage.props.globalSettings || {};
        if (Object.keys(globalSettings).length > 0) {
            initializeGlobalSettings(globalSettings);
        }

        // Create a memoized render function to prevent unnecessary re-renders
        const renderApp = (appProps: any) => {
            const currentGlobalSettings = appProps.initialPage.props.globalSettings || {};
            const user = appProps.initialPage.props.auth?.user;

            return (
                <ModalStackProvider>
                    <LayoutProvider>
                        <SidebarProvider>
                            <BrandProvider globalSettings={currentGlobalSettings} user={user}>
                                <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
                                    <App {...appProps} />
                                </Suspense>
                                <CustomToast />
                            </BrandProvider>
                        </SidebarProvider>
                    </LayoutProvider>
                </ModalStackProvider>
            );
        };

        // Initial render
        root.render(renderApp(props));

        // Listen for navigation events to update global settings, language, and CSRF token
        router.on('navigate', (event) => {
            try {
                // Update global page data and CSRF token on navigation
                (window as any).page = event.detail.page;
                if (event.detail.page.props?.csrf_token) {
                    syncCsrfToken(event.detail.page.props.csrf_token as string);
                }

                if (event.detail.page.props.globalSettings) {
                    initializeGlobalSettings(event.detail.page.props.globalSettings);
                }

                // Re-render with updated props including globalSettings
                root.render(renderApp({ initialPage: event.detail.page }));

                // Sync language from database on navigation AFTER render
                setTimeout(() => {
                    syncLanguage(event.detail.page);
                }, 0);

                // Force dark mode check on navigation
                let savedTheme = null;

                if (isDemoMode()) {
                    savedTheme = getCookie('themeSettings');
                }

                if (savedTheme) {
                    const themeSettings = JSON.parse(savedTheme);
                    const isDark = themeSettings.appearance === 'dark' ||
                        (themeSettings.appearance === 'system' &&
                            window.matchMedia('(prefers-color-scheme: dark)').matches);
                    document.documentElement.classList.toggle('dark', isDark);
                    document.body.classList.toggle('dark', isDark);
                }
            } catch (e) {
            }
        });

        // Always attach fresh X-CSRF-TOKEN to every Inertia request
        router.on('before', (event) => {
            const token = getCsrfToken();
            if (token) {
                event.detail.visit.headers = {
                    ...event.detail.visit.headers,
                    'X-CSRF-TOKEN': token,
                };
            }
        });

        // Intercept 419 Page Expired errors globally so users never see the raw error modal
        router.on('invalid', (event) => {
            if (event.detail.response?.status === 419) {
                event.preventDefault();
                toast.error(i18n.t('Your session or security token expired. Refreshing page...'));
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        });

        // Periodic background keep-alive ping to keep session active while tab is open
        if (typeof window !== 'undefined' && !(window as any).__sessionKeepAliveStarted) {
            (window as any).__sessionKeepAliveStarted = true;
            setInterval(() => {
                refreshCsrfToken();
            }, 10 * 60 * 1000); // every 10 minutes
        }
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// // Initialize direction from cookies (demo mode) or database (live mode)
// const initializeDirection = () => {
//     let savedDirection = null;

//     if (isDemoMode()) {
//         savedDirection = getCookie('layoutDirection');
//     } else {
//         // In live mode, get from globalSettings
//         const globalSettings = (window as any).page?.props?.globalSettings;
//         // const globalSettings = (window as any).props.globalSettings || {};
//         if (globalSettings?.layoutDirection) {
//             savedDirection = globalSettings.layoutDirection;
//         }
//     }

//     if (savedDirection) {
//         const domsavedDirection = savedDirection === 'right' ? 'rtl' : 'ltr';
//         document.documentElement.dir = domsavedDirection;
//         document.documentElement.setAttribute('dir', domsavedDirection);
//     }
// };

// // Initialize direction on page load
// initializeDirection();
