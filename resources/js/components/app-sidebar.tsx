import { NavMain } from '@/components/nav-main';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader} from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { useSidebarSettings } from '@/contexts/SidebarContext';
import { useBrand } from '@/contexts/BrandContext';
import { type NavItem } from '@/types';
import { Folder, LayoutGrid, ShoppingBag, Users, Settings, FileText, Briefcase, Calendar, CreditCard, Ticket, Gift, CalendarDays, Image, Building2, Phone, TrendingUp, Package, Megaphone, DollarSign, Palette, Mail, Activity, NotebookPen, MegaphoneIcon, TicketPercent, Search, X, ListTodo, CheckSquare, CalendarCheck, Target } from 'lucide-react';
import AppLogo from './app-logo';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { usePage, Link } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';
import { getDisplayUrl } from '@/utils/helper';


export function AppSidebar() {
    const { t, i18n } = useTranslation();
    const { auth, globalSettings } = usePage().props as any;
    const userRole = (auth.user?.type || auth.user?.role || '').toLowerCase();
    const permissions = auth?.permissions || [];

    // Get current direction
    const isRtl = document.documentElement.dir === 'rtl';

    // Business switch handler removed

    const getSuperAdminNavItems = (): NavItem[] => [
        {
            title: t('Dashboard'),
            href: route('dashboard'),
            icon: LayoutGrid,
            group: t('Overview'),
        },
        {
            title: t('Companies'),
            href: route('companies.index'),
            icon: Briefcase,
            group: t('Management'),
        },
        {
            title: t('Media Library'),
            href: route('media-library'),
            icon: Image,
            group: t('Management'),
        },


        {
            title: t('Plans'),
            icon: CreditCard,
            group: t('Management'),
            children: [
                {
                    title: t('Plans'),
                    href: route('plans.index')
                },
                {
                    title: t('Plan Request'),
                    href: route('plan-requests.index')
                },
                {
                    title: t('Plan Orders'),
                    href: route('plan-orders.index')
                }
            ]
        },
        {
            title: t('Coupons'),
            href: route('coupons.index'),
            icon: TicketPercent,
            group: t('Management'),
        },

        {
            title: t('Currency'),
            href: route('currencies.index'),
            icon: DollarSign,
            group: t('Management'),
        },
        {
            title: t('Referral Program'),
            href: route('referral.index'),
            icon: Gift,
            group: t('Management'),
        },
        {
            title: t('Landing Page'),
            icon: Palette,
            group: t('Management'),
            children: [
                {
                    title: t('Landing Page'),
                    href: route('landing-page')
                },
                {
                    title: t('Custom Pages'),
                    href: route('landing-page.custom-pages.index')
                },
                {
                    title: t('Contact Inquiries'),
                    href: route('contact-messages.index')
                },
                {
                    title: t('Newsletters'),
                    href: route('newsletters.index')
                },
            ]
        },
        {
            title: t('Email Templates'),
            href: route('email-templates.index'),
            icon: Mail,
            group: t('System Control'),
        },
        {
            title: t('Settings'),
            href: route('settings'),
            icon: Settings,
            group: t('System Control'),
        }
    ];

    const getCompanyNavItems = (): NavItem[] => {
        const items: NavItem[] = [];

        // ── 1. Overview ──────────────────────────────────────────────
        if (hasPermission(permissions, 'manage-dashboard')) {
            items.push({
                title: t('Dashboard'),
                href: route('dashboard'),
                icon: LayoutGrid,
                group: t('Overview'),
            });
        }

        if (hasPermission(permissions, 'manage-meetings') || hasPermission(permissions, 'manage-calls') || hasPermission(permissions, 'manage-project-tasks')) {
            items.push({
                title: t('Calendar'),
                href: route('calendar.index'),
                icon: Calendar,
                group: t('Overview'),
            });
        }

        if (hasPermission(permissions, 'manage-reports')) {
            items.push({
                title: t('Reports'),
                icon: TrendingUp,
                group: t('Overview'),
                children: [
                    { title: t('Lead Reports'), href: route('reports.leads') },
                    { title: t('Sales Reports'), href: route('reports.sales') },
                    { title: t('Product Reports'), href: route('reports.product-reports') },
                    { title: t('Contact Reports'), href: route('reports.customers') },
                    { title: t('Project Reports'), href: route('reports.projects') },
                ]
            });
        }

        const isCompany = ['company', 'admin'].includes(userRole);
        if (isCompany || hasPermission(permissions, 'manage-user-performance') || hasPermission(permissions, 'view-user-performance')) {
            items.push({
                title: t('User Performance'),
                href: route('user-performance.index'),
                icon: Activity,
                group: t('Overview'),
            });
        }

        // Attendance & Timesheet Management
        const canViewAttendance = isCompany || 
            hasPermission(permissions, 'manage-attendance') || 
            hasPermission(permissions, 'view-attendance') || 
            hasPermission(permissions, 'view-all-attendance') ||
            hasPermission(permissions, 'create-attendance');

        if (canViewAttendance) {
            const canViewAllAtt = isCompany || 
                hasPermission(permissions, 'manage-attendance') || 
                hasPermission(permissions, 'view-all-attendance');

            const attChildren = [];
            attChildren.push({ title: t('Live Attendance'), href: route('attendance.index') });
            if (canViewAllAtt) {
                attChildren.push({ title: t('Monthly Timesheet'), href: route('attendance.timesheet') });
            }
            attChildren.push({ title: t('My Attendance'), href: route('attendance.my-attendance') });
            attChildren.push({ title: t('Attendance Requests'), href: route('attendance.requests') });

            items.push({
                title: t('Attendance & Timesheet'),
                icon: CalendarCheck,
                group: t('Overview'),
                children: attChildren,
            });
        }

        // ── 2. CRM ───────────────────────────────────────────────────
        const leadChildren = [];
        if (hasPermission(permissions, 'manage-leads')) {
            leadChildren.push({ title: t('Leads'), href: route('leads.index') });
        }
        if (hasPermission(permissions, 'manage-lead-sources')) {
            leadChildren.push({ title: t('Lead Sources'), href: route('lead-sources.index') });
        }
        if (hasPermission(permissions, 'manage-lead-statuses')) {
            leadChildren.push({ title: t('Lead Status'), href: route('lead-statuses.index') });
        }
        if (leadChildren.length > 0) {
            items.push({ title: t('Lead Management'), icon: Users, group: t('CRM'), children: leadChildren });
        }

        // Universal Task Management
        const taskChildren = [];
        if (isCompany || hasPermission(permissions, 'manage-tasks') || hasPermission(permissions, 'view-tasks') || hasPermission(permissions, 'view-all-tasks') || hasPermission(permissions, 'manage-all-tasks')) {
            taskChildren.push({ title: t('Tasks & Follow-ups'), href: route('tasks.index') });
        }
        if (isCompany || hasPermission(permissions, 'manage-task-statuses') || hasPermission(permissions, 'manage-tasks')) {
            taskChildren.push({ title: t('Task Statuses'), href: route('task-statuses.index') });
            taskChildren.push({ title: t('Task Types'), href: route('task-types.index') });
            taskChildren.push({ title: t('Task Priorities'), href: route('task-priorities.index') });
        }
        if (taskChildren.length > 0) {
            items.push({ title: t('Task Management'), icon: CheckSquare, group: t('CRM'), children: taskChildren });
        }

        // Target & Day Plans Management (Company and authorized team members)
        const targetChildren = [];
        if (isCompany || hasPermission(permissions, 'manage-targets') || hasPermission(permissions, 'view-targets') || hasPermission(permissions, 'view-all-targets') || hasPermission(permissions, 'manage-all-targets')) {
            targetChildren.push({ title: t('Target Overview'), href: route('targets.index') });
            targetChildren.push({ title: t('Sales Targets'), href: route('targets.list') });
            targetChildren.push({ title: t('Funnel & Analytics'), href: route('targets.analytics') });
        }
        if (isCompany || hasPermission(permissions, 'create-targets') || hasPermission(permissions, 'allocate-targets') || hasPermission(permissions, 'manage-targets') || hasPermission(permissions, 'manage-all-targets')) {
            targetChildren.push({ title: t('Allocate Target'), href: route('targets.create') });
        }
        if (isCompany || hasPermission(permissions, 'manage-sales-day-plans') || hasPermission(permissions, 'view-sales-day-plans') || hasPermission(permissions, 'create-sales-day-plans') || hasPermission(permissions, 'view-all-sales-day-plans') || hasPermission(permissions, 'manage-all-sales-day-plans')) {
            targetChildren.push({ title: t('Daily Sales Plans'), href: route('sales-day-plans.index') });
            if (isCompany || hasPermission(permissions, 'create-sales-day-plans') || hasPermission(permissions, 'manage-sales-day-plans')) {
                targetChildren.push({ title: t('My Daily Plan'), href: route('sales-day-plans.create') });
            }
        }
        if (targetChildren.length > 0) {
            items.push({ title: t('Targets & Day Plans'), icon: Target, group: t('CRM'), children: targetChildren });
        }

        const opportunityChildren = [];
        if (hasPermission(permissions, 'manage-opportunities')) {
            opportunityChildren.push({ title: t('Opportunities'), href: route('opportunities.index') });
        }
        if (hasPermission(permissions, 'manage-opportunity-sources')) {
            opportunityChildren.push({ title: t('Opportunity Sources'), href: route('opportunity-sources.index') });
        }
        if (hasPermission(permissions, 'manage-opportunity-stages')) {
            opportunityChildren.push({ title: t('Opportunity Stages'), href: route('opportunity-stages.index') });
        }
        if (opportunityChildren.length > 0) {
            items.push({ title: t('Opportunity Management'), icon: TrendingUp, group: t('CRM'), children: opportunityChildren });
        }

        const accountChildren = [];
        if (hasPermission(permissions, 'manage-accounts')) {
            accountChildren.push({ title: t('Accounts'), href: route('accounts.index') });
        }
        if (hasPermission(permissions, 'manage-account-types')) {
            accountChildren.push({ title: t('Account Types'), href: route('account-types.index') });
        }
        if (hasPermission(permissions, 'manage-account-industries')) {
            accountChildren.push({ title: t('Account Industries'), href: route('account-industries.index') });
        }
        if (accountChildren.length > 0) {
            items.push({ title: t('Account Management'), icon: Building2, group: t('CRM'), children: accountChildren });
        }

        if (hasPermission(permissions, 'manage-contacts')) {
            items.push({ title: t('Contacts'), href: route('contacts.index'), icon: Users, group: t('CRM') });
        }

        const campaignChildren = [];
        if (hasPermission(permissions, 'manage-campaigns')) {
            campaignChildren.push({ title: t('Campaigns'), href: route('campaigns.index') });
        }
        if (hasPermission(permissions, 'manage-target-lists')) {
            campaignChildren.push({ title: t('Target Lists'), href: route('target-lists.index') });
        }
        if (hasPermission(permissions, 'manage-campaign-types')) {
            campaignChildren.push({ title: t('Campaign Types'), href: route('campaign-types.index') });
        }
        if (campaignChildren.length > 0) {
            items.push({ title: t('Campaign Management'), icon: Megaphone, group: t('CRM'), children: campaignChildren });
        }

        if (hasPermission(permissions, 'manage-cases')) {
            items.push({ title: t('Cases'), href: route('cases.index'), icon: FileText, group: t('CRM') });
        }

        // ── 3. Sales ─────────────────────────────────────────────────
        if (hasPermission(permissions, 'manage-quotes')) {
            items.push({ title: t('Quotes'), href: route('quotes.index'), icon: FileText, group: t('Sales') });
        }

        if (hasPermission(permissions, 'manage-sales-orders')) {
            items.push({ title: t('Sales Orders'), href: route('sales-orders.index'), icon: ShoppingBag, group: t('Sales') });
        }

        if (hasPermission(permissions, 'manage-invoices')) {
            items.push({ title: t('Invoices'), href: route('invoices.index'), icon: FileText, group: t('Sales') });
        }

        if (hasPermission(permissions, 'manage-receipt-orders')) {
            items.push({ title: t('Receipt Orders'), href: route('receipt-orders.index'), icon: FileText, group: t('Sales') });
        }

        // ── 4. Procurement & Fulfillment ─────────────────────────────
        if (hasPermission(permissions, 'manage-purchase-orders')) {
            items.push({ title: t('Purchase Orders'), href: route('purchase-orders.index'), icon: ShoppingBag, group: t('Procurement & Fulfillment') });
        }

        if (hasPermission(permissions, 'manage-delivery-orders')) {
            items.push({ title: t('Delivery Orders'), href: route('delivery-orders.index'), icon: Ticket, group: t('Procurement & Fulfillment') });
        }

        if (hasPermission(permissions, 'manage-return-orders')) {
            items.push({ title: t('Return Orders'), href: route('return-orders.index'), icon: FileText, group: t('Procurement & Fulfillment') });
        }

        if (hasPermission(permissions, 'manage-shipping-provider-types')) {
            items.push({ title: t('Shipping Provider Types'), href: route('shipping-provider-types.index'), icon: Ticket, group: t('Procurement & Fulfillment') });
        }

        // ── 5. Catalog ───────────────────────────────────────────────
        const productSetupChildren = [];
        if (hasPermission(permissions, 'manage-taxes')) {
            productSetupChildren.push({ title: t('Taxes'), href: route('taxes.index') });
        }
        if (hasPermission(permissions, 'manage-brands')) {
            productSetupChildren.push({ title: t('Brands'), href: route('brands.index') });
        }
        if (hasPermission(permissions, 'manage-categories')) {
            productSetupChildren.push({ title: t('Categories'), href: route('categories.index') });
        }
        if (hasPermission(permissions, 'manage-products')) {
            items.push({ title: t('Products'), href: route('products.index'), icon: ShoppingBag, group: t('Catalog') });
        }
        if (productSetupChildren.length > 0) {
            items.push({ title: t('Product Setup'), icon: Package, group: t('Catalog'), children: productSetupChildren });
        }


        // ── 6. Collaboration ─────────────────────────────────────────
        if (hasPermission(permissions, 'manage-meetings')) {
            items.push({ title: t('Meetings'), href: route('meetings.index'), icon: CalendarDays, group: t('Collaboration') });
        }

        if (hasPermission(permissions, 'manage-calls')) {
            items.push({ title: t('Calls'), href: route('calls.index'), icon: Phone, group: t('Collaboration') });
        }

        if (hasPermission(permissions, 'manage-stream')) {
            items.push({ title: t('Streams'), href: route('stream.index'), icon: Activity, group: t('Collaboration') });
        }

        if (hasPermission(permissions, 'manage-notes')) {
            items.push({ title: t('Notes'), href: route('notes.index'), icon: NotebookPen, group: t('Collaboration') });
        }

        const announcementChildren = [];
        if (hasPermission(permissions, 'manage-announcements')) {
            announcementChildren.push({ title: t('Announcements'), href: route('announcements.index') });
        }
        if (hasPermission(permissions, 'manage-announcement-categories')) {
            announcementChildren.push({ title: t('Categories'), href: route('announcement-categories.index') });
        }
        if (announcementChildren.length > 0) {
            items.push({ title: t('Announcements'), icon: MegaphoneIcon, group: t('Collaboration'), children: announcementChildren });
        }

        // ── 7. Projects ──────────────────────────────────────────────
        const projectChildren = [];
        if (hasPermission(permissions, 'manage-projects')) {
            projectChildren.push({ title: t('Projects'), href: route('projects.index') });
        }
        if (hasPermission(permissions, 'manage-project-tasks')) {
            projectChildren.push({ title: t('Project Tasks'), href: route('project-tasks.index') });
        }
        if (hasPermission(permissions, 'manage-task-statuses')) {
            projectChildren.push({ title: t('Task Status'), href: route('task-statuses.index') });
        }
        if (projectChildren.length > 0) {
            items.push({ title: t('Project Management'), icon: Briefcase, group: t('Projects'), children: projectChildren });
        }

        // ── 8. Documents ─────────────────────────────────────────────
        const documentChildren = [];
        if (hasPermission(permissions, 'manage-documents')) {
            documentChildren.push({ title: t('Documents'), href: route('documents.index') });
        }
        if (hasPermission(permissions, 'manage-document-types')) {
            documentChildren.push({ title: t('Types'), href: route('document-types.index') });
        }
        if (documentChildren.length > 0) {
            items.push({ title: t('Document Management'), icon: Folder, group: t('Documents'), children: documentChildren });
        }

        if (hasPermission(permissions, 'manage-media')) {
            items.push({ title: t('Media Library'), href: route('media-library'), icon: Image, group: t('Documents') });
        }

        // ── 9. System Control ────────────────────────────────────────
        const staffChildren = [];
        if (hasPermission(permissions, 'manage-users')) {
            staffChildren.push({ title: t('Users'), href: route('users.index') });
        }
        if (hasPermission(permissions, 'manage-roles')) {
            staffChildren.push({ title: t('Roles'), href: route('roles.index') });
        }
        if (staffChildren.length > 0) {
            items.push({ title: t('Staff'), icon: Users, group: t('System Control'), children: staffChildren });
        }

        const planChildren = [];
        if (hasPermission(permissions, 'manage-plans')) {
            planChildren.push({ title: t('Plans'), href: route('plans.index') });
        }
        if (hasPermission(permissions, 'manage-plan-requests')) {
            planChildren.push({ title: t('Plan Requests'), href: route('plan-requests.index') });
        }
        if (hasPermission(permissions, 'manage-plan-orders')) {
            planChildren.push({ title: t('Plan Orders'), href: route('plan-orders.index') });
        }
        if (planChildren.length > 0) {
            items.push({ title: t('Plans'), icon: CreditCard, group: t('System Control'), children: planChildren });
        }

        if (hasPermission(permissions, 'manage-referral')) {
            items.push({ title: t('Referral Program'), href: route('referral.index'), icon: Gift, group: t('System Control') });
        }

        if (hasPermission(permissions, 'manage-notification-templates')) {
            items.push({ title: t('Notification Templates'), href: route('notification-templates.index'), icon: Mail, group: t('System Control') });
        }

        if (hasPermission(permissions, 'manage-settings')) {
            items.push({ title: t('Settings'), href: route('settings'), icon: Settings, group: t('System Control') });
        }

        return items;
    };

    const mainNavItems = (userRole === 'superadmin' || userRole === 'super admin' || userRole === 'super-admin') ? getSuperAdminNavItems() : getCompanyNavItems();

    const { position, effectivePosition } = useLayout();
    const { variant, collapsible, style } = useSidebarSettings();
    const { logoLight, logoDark, favicon, updateBrandSettings } = useBrand();
    const [sidebarStyle, setSidebarStyle] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {

        // Apply styles based on sidebar style
        if (style === 'colored') {
            setSidebarStyle({ backgroundColor: 'var(--primary)', color: 'white' });
        } else if (style === 'gradient') {
            setSidebarStyle({
                background: 'linear-gradient(to bottom, var(--primary), color-mix(in srgb, var(--primary), transparent 20%))',
                color: 'white'
            });
        } else {
            setSidebarStyle({});
        }
    }, [style]);

    const filterNavItems = (items: NavItem[], query: string): NavItem[] => {
        if (!query.trim()) return items;
        const q = query.toLowerCase();
        const result: NavItem[] = [];
        items.forEach(item => {
            if (item.children) {
                const matchedChildren = item.children.filter(child =>
                    child.title.toLowerCase().includes(q)
                );
                if (item.title.toLowerCase().includes(q)) {
                    result.push(item);
                } else if (matchedChildren.length > 0) {
                    result.push({ ...item, children: matchedChildren, defaultOpen: true });
                }
            } else {
                if (item.title.toLowerCase().includes(q)) {
                    result.push(item);
                }
            }
        });
        return result;
    };

    const filteredNavItems = filterNavItems(mainNavItems, searchQuery);

    // Get the first available menu item's href for logo link
    const getFirstAvailableHref = () => {
        if (filteredNavItems.length === 0) return route('dashboard');

        const firstItem = filteredNavItems[0];
        if (firstItem.href) {
            return firstItem.href;
        } else if (firstItem.children && firstItem.children.length > 0) {
            return firstItem.children[0].href || route('dashboard');
        }
        return route('dashboard');
    };

    return (
        <Sidebar
            side={effectivePosition}
            collapsible={collapsible}
            variant={variant}
            className={style !== 'plain' ? 'sidebar-custom-style' : ''}
        >
            <SidebarHeader className={style !== 'plain' ? 'sidebar-styled' : ''} style={sidebarStyle}>
                <div className="flex justify-center items-center p-2">
                    <Link href={getFirstAvailableHref()} prefetch className="flex items-center justify-center">
                        {/* Logo for expanded sidebar */}
                        <div className="group-data-[collapsible=icon]:hidden flex items-center">
                            {(() => {
                                const isDark = document.documentElement.classList.contains('dark');
                                const currentLogo = isDark ? logoLight : logoDark;
                                const displayUrl = getDisplayUrl(currentLogo) ?? currentLogo;

                                return displayUrl ? (
                                    <img
                                        key={`${currentLogo}-${Date.now()}`}
                                        src={displayUrl}
                                        alt="Logo"
                                        className="w-auto transition-all duration-200"
                                        onError={() => updateBrandSettings({ [isDark ? 'logoLight' : 'logoDark']: '' })}
                                    />
                                ) : (
                                    <div className="h-12 text-inherit font-semibold flex items-center text-lg tracking-tight">
                                        WorkDo
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Icon for collapsed sidebar */}
                        <div className="h-8 w-8 hidden group-data-[collapsible=icon]:block">
                            {(() => {
                                const displayFavicon = favicon ? getDisplayUrl(favicon) : '';

                                return displayFavicon ? (
                                    <img
                                        key={`${favicon}-${Date.now()}`}
                                        src={displayFavicon}
                                        alt="Icon"
                                        className="h-8 w-8 transition-all duration-200"
                                        onError={() => updateBrandSettings({ favicon: '' })}
                                    />
                                ) : (
                                    <div className="h-8 w-8 bg-primary text-white rounded flex items-center justify-center font-bold shadow-sm">
                                        W
                                    </div>
                                );
                            })()}
                        </div>
                    </Link>
                </div>

                {/* Search Input */}
                <div className="group-data-[collapsible=icon]:hidden px-2 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('Search menu...')}
                            className="w-full rounded-md border-1 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-1.5 pl-8 pr-7 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Business Switcher removed */}
            </SidebarHeader>

            <SidebarContent style={sidebarStyle} className={`h-full ${style !== 'plain' ? 'sidebar-styled' : ''}`}>
                <NavMain searchQuery={searchQuery} items={filteredNavItems} position={effectivePosition} />
            </SidebarContent>


           <SidebarFooter className='p-3'>
                {/* Plan Active UI — SaaS + Company only */}
                {userRole === 'company' && (() => {
                    const user = auth.user;
                    const plan = user?.plan;

                    const planName = plan?.name ?? t('No Plan');
                    const isActive = user?.plan_is_active === 1;
                    const isTrial = user?.is_trial;

                    const expireDate = isTrial == 1 ? user?.trial_expire_date : (user?.plan_expire_date ||  globalSettings?.planExirationDate);
                    const daysLeft = expireDate
                        ? Math.ceil((new Date(expireDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : null;
                    const isExpired = daysLeft == null || daysLeft <= 0;
                    const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;

                    return (
                        <div className="group-data-[collapsible=icon]:hidden">
                            <div
                                className={`relative rounded-xl overflow-hidden ${isExpired ? 'rounded-lg border bg-card text-card-foreground shadow-sm bg-gradient-to-r from-red-500 to-red-400' : 'bg-primary border-t border-t-[color-mix(in_srgb,var(--primary),white_20%)]'}`}
                            >
                                {/* Decorative circles */}
                                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                                <div className="absolute -bottom-3 -left-3 w-10 h-10 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />

                                <div className="relative p-5">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                                <CreditCard className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold leading-tight mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('Current Plan')}</p>
                                                <p className="text-sm font-bold text-white leading-tight">{planName}</p>
                                            </div>
                                        </div>
                                        {/* Status badge */}
                                        <span
                                            className="text-xs font-bold px-3 py-1 rounded-full tracking-wide"
                                            style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: 'white', border: '1px solid rgba(255,255,255,0.35)' }}
                                        >
                                            {isExpired ? t('Expired') : isTrial == 1 ? t('Trial') : t('Active')}
                                        </span>
                                    </div>

                                    {/* Divider */}
                                    <div className="mb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }} />

                                    {/* Expiry info */}
                                    <div className="mb-3 space-y-1.5">
                                        {expireDate ? (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                                        {isExpired ? t('Expired on') : isTrial == 1 ? t('Trial expires') : t('Plan expires')}
                                                    </span>
                                                    <span className="text-xs font-bold text-white">
                                                        {window.appSettings?.formatDateTime(expireDate, false) || new Date(expireDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>{!isExpired ? t('Days left') : t('Days since expiration')}</span>
                                                    <span className="text-xs font-bold text-white">
                                                        {isExpired ? -daysLeft : daysLeft} {t('days')}
                                                    </span>
                                                </div>
                                                {/* Progress bar */}
                                                {!isExpired && daysLeft !== null && daysLeft <= 30 && (
                                                    <div className="mt-1">
                                                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                                                            <div
                                                                className="h-full rounded-full transition-all"
                                                                style={{ width: `${Math.max(5, (daysLeft / 30) * 100)}%`, backgroundColor: 'rgba(255,255,255,0.9)' }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>{t('Status')}</span>
                                                <span className="text-xs font-bold text-white">
                                                    {isActive ? t('No expiry') : t('Inactive')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Upgrade button */}
                                    <Link
                                        href={route('plans.index')}
                                        className={`flex items-center justify-center gap-1.5 w-full text-xs font-semibold py-2 px-3 rounded-lg transition-all duration-200 ${isExpired? 'text-red-500 hover:!text-red-500' : 'text-primary hover:text-primary'}`}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.95)'}}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'white')}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)')}
                                    >
                                        <CreditCard className="h-3.5 w-3.5" />
                                        <span>{isExpired || !isActive ? t('Renew Plan') : t('Upgrade Plan')}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </SidebarFooter>

        </Sidebar>
    );
}
