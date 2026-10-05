import React, { useState, useEffect, useRef } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Printer, Copy, Check, Calendar, DollarSign, Package, User, Clock, Tag, TrendingUp, MessageCircle, Truck } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import UserInitials from '@/components/user-initials';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';

// Import quote templates
import Template1 from './templates/Template1';
import Template2 from './templates/Template2';
import Template3 from './templates/Template3';
import Template4 from './templates/Template4';
import Template5 from './templates/Template5';
import Template6 from './templates/Template6';
import Template7 from './templates/Template7';
import Template8 from './templates/Template8';
import Template9 from './templates/Template9';
import Template10 from './templates/Template10';
import IframePortal, { IframePortalHandles } from '@/components/IframePortal';
import { formatRelativeTime, getDisplayUrl } from '@/utils/helper';

interface Quote {
    id: number;
    quote_number: string;
    name: string;
    description?: string;
    valid_until: string;
    created_at: string;
    updated_at: string;
    status: string;
    subtotal: number;
    total_tax: number;
    total_amount: number;
    billing_address?: string;
    billing_city?: string;
    billing_state?: string;
    billing_postal_code?: string;
    billing_country?: string;
    shipping_address?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_postal_code?: string;
    shipping_country?: string;
    account?: {
        id: number;
        name: string;
        email?: string;
        phone?: string;
    };
    contact?: {
        id: number;
        name: string;
        email?: string;
    };
    billing_contact?: {
        id: number;
        name: string;
        email?: string;
        phone?: string;
    };
    shipping_contact?: {
        id: number;
        name: string;
        email?: string;
        phone?: string;
    };
    shipping_provider_type?: {
        id: number;
        name: string;
    };
    creator?: {
        id: number;
        name: string;
        email?: string;
        avatar?: string;
    };
    assigned_user?: {
        id: number;
        name: string;
        email?: string;
        avatar?: string;
    };
    activities?: any[];
    products: {
        id: number;
        name: string;
        sku?: string;
        main_image_url?: string;
        category?: { name: string };
        pivot: {
            quantity: number;
            unit_price: number;
            total_price: number;
            discount_type?: string;
            discount_value?: number;
            discount_amount?: number;
        };
        tax?: {
            name: string;
            rate: number;
        };
    }[];
}

interface Props {
    quote: Quote;
    templateId?: string;
    color?: string;
    qrEnabled?: boolean;
    settings?: any;
    themeColor?: string;
    customColor?: string;
}

const templateComponents = {
    template1: Template1,
    template2: Template2,
    template3: Template3,
    template4: Template4,
    template5: Template5,
    template6: Template6,
    template7: Template7,
    template8: Template8,
    template9: Template9,
    template10: Template10,
};

export default function PublicQuote({ quote, templateId = 'template1', color = 'ffffff', qrEnabled = false, settings = {}, themeColor = 'blue', customColor = null }: Props) {
    const { t } = useTranslation();
    const { props } = usePage<any>();
    const globalSettings = props.globalSettings;
    const [copied, setCopied] = useState(false);

    const auth = props.auth || {};
    const permissions = auth?.permissions || [];

    // Handle flash messages
    useEffect(() => {
        if (props.flash?.success) {
            toast.success(t(props.flash.success));
        }
        if (props.flash?.error) {
            toast.error(t(props.flash.error));
        }
    }, [props.flash, t]);


    const themeColors = { blue: '#3b82f6', green: '#10b77f', purple: '#8b5cf6', orange: '#f97316', red: '#ef4444' };
    const currentThemeColor = themeColor === 'custom' ? customColor : themeColors[themeColor as keyof typeof themeColors] || '#3b82f6';
    const template = { primary: currentThemeColor, secondary: currentThemeColor };

    const formatCurrency = (amount: number) => {
        const val = window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;
        return <span className="font-mono">{val}</span>;
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return t('-');
        return window.appSettings?.formatDateTime(dateString, false) || new Date(dateString).toLocaleDateString();
    };

    const calculateProductTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let totalDiscount = 0;

        quote.products?.forEach((product: any) => {
            const lineTotal = Number(product.pivot.total_price) || 0;
            const discountAmount = Number(product.pivot.discount_amount) || 0;
            const afterDiscount = lineTotal - discountAmount;

            subtotal += lineTotal;
            totalDiscount += discountAmount;

            if (product.tax) {
                totalTax += (afterDiscount * Number(product.tax.rate)) / 100;
            }
        });

        return { subtotal, totalTax, totalDiscount, grandTotal: subtotal - totalDiscount + totalTax };
    };

    const { subtotal, totalTax, totalDiscount, grandTotal } = calculateProductTotals();

    const iframeRef = useRef<IframePortalHandles>(null);

    const handlePrint = () => {
        iframeRef.current?.print(); // calls the print function inside IframePortal
    };

    // const handlePrint = () => window.print();

    const copyQuoteLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
        }
    };

    const items = quote.products.map(product => {
        const lineTotal = product.pivot.quantity * product.pivot.unit_price;
        const discountAmount = product.pivot.discount_amount || 0;
        const afterDiscount = lineTotal - discountAmount;
        const taxAmount = product.tax ? (afterDiscount * product.tax.rate / 100) : 0;

        return {
            name: product.name,
            quantity: product.pivot.quantity,
            price: product.pivot.unit_price,
            tax: product.tax?.rate || 0,
            discount: discountAmount,
            itemTax: product.tax ? [{
                name: product.tax.name,
                rate: `${product.tax.rate}%`,
                price: formatCurrency(taxAmount)
            }] : []
        };
    });

    const taxesData = quote.products.reduce((acc: any, product) => {
        if (product.tax) {
            const lineTotal = product.pivot.quantity * product.pivot.unit_price;
            const discountAmount = product.pivot.discount_amount || 0;
            const afterDiscount = lineTotal - discountAmount;
            const taxAmount = afterDiscount * product.tax.rate / 100;
            acc[product.tax.name] = (acc[product.tax.name] || 0) + taxAmount;
        }
        return acc;
    }, {});

    const quoteData = {
        ...quote,
        valid_until: formatDate(quote.valid_until || new Date().toISOString()),
        created_at: formatDate(quote.created_at || new Date().toISOString()),
        sub_total: subtotal,
        total_tax: totalTax,
        total_amount: grandTotal,
        totalQuantity: quote.products.reduce((sum, p) => sum + p.pivot.quantity, 0),
        totalRate: quote.products.reduce((sum, p) => sum + (p.pivot.quantity * p.pivot.unit_price), 0),
        totalTaxPrice: totalTax,
        totalDiscount: totalDiscount,
        total_discount: totalDiscount,
    };

    const TemplateComponent = templateComponents[templateId as keyof typeof templateComponents] || Template1;

    const getStatusBadge = (status: string) => {
        const statusColors = {
            draft: 'bg-gray-50 text-gray-600 ring-gray-500/10',
            sent: 'bg-blue-50 text-blue-700 ring-blue-700/10',
            accepted: 'bg-green-50 text-green-700 ring-green-600/20',
            rejected: 'bg-red-50 text-red-700 ring-red-600/10',
            expired: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
        };

        return (
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
                {t(status?.charAt(0).toUpperCase() + status?.slice(1)) || t('Draft')}
            </span>
        );
    };

    return (
        <>
            <Head title={t('Quote {{quoteNumber}}', { quoteNumber: quote.quote_number })}>
                {settings?.favicon && (
                    <link rel="icon" href={getDisplayUrl(settings.favicon, globalSettings)} />
                )}
            </Head>

            <div className="min-h-screen bg-gray-50 dark:from-gray-900 dark:to-gray-800 py-8 print:p-0 print:m-0 print:bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print-container">
                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 print:hidden">
                        <div className="mb-4 sm:mb-0">
                            <h1 className="text-2xl font-bold text-gray-900">{t('Quote Details')} - {quote.quote_number}</h1>
                            <p className="text-gray-600 mt-1">{t('View your quote')}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {hasPermission(permissions, 'view-quotes') && (
                                <button
                                    onClick={copyQuoteLink}
                                    className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                >
                                    {copied ? <Check className="w-4 h-4 mr-2 text-green-600" /> : <Copy className="w-4 h-4 mr-2" />}
                                    {copied ? t('Copied!') : t('Copy Link')}
                                </button>
                            )}
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center px-4 py-2.5 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                                style={{
                                    backgroundColor: currentThemeColor,
                                    ':hover': { filter: 'brightness(0.9)' }
                                }}
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                {t('Print Quote')}
                            </button>
                        </div>
                    </div>

                    {/* Template for Print */}
                    <div className="hidden print:block">
                        <IframePortal ref={iframeRef}>
                            <TemplateComponent
                                quote={quoteData}
                                items={items}
                                taxesData={taxesData}
                                settings={settings}
                                color={color}
                                qr_invoice={qrEnabled ? 'on' : 'off'}
                            />
                        </IframePortal>
                    </div>

                    <div className="mx-auto space-y-6 print:hidden">
                        {/* Header Section */}
                        <div className="bg-white rounded-lg shadow-sm border p-8 print:hidden">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h1 className="text-lg font-bold text-gray-900 leading-tight">{quote.name}</h1>
                                    <p className="text-base text-gray-600 mt-2 leading-relaxed max-w-3xl">{quote.description || t('No description provided')}</p>
                                </div>
                                <div className="text-right ml-6">
                                    {getStatusBadge(quote.status)}
                                    <p className="text-sm font-medium text-gray-700 mt-2 font-mono">{quote.quote_number}</p>
                                </div>
                            </div>
                        </div>

                        {/* Summary Cards — blob style */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {([
                                { label: t('Total Amount'), value: <span className="font-mono">{formatCurrency(quote.total_amount)}</span>, icon: DollarSign, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50' },
                                { label: t('Products'), value: quote.products?.length || 0, icon: Package, iconCls: 'text-blue-600', blobCls: 'bg-blue-50' },
                                { label: t('Valid Until'), value: formatDate(quote.valid_until), icon: Calendar, iconCls: 'text-orange-600', blobCls: 'bg-orange-50' },
                                { label: t('Created'), value: formatDate(quote.created_at), icon: Clock, iconCls: 'text-purple-600', blobCls: 'bg-purple-50' },
                            ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                                <div key={label} className="relative overflow-hidden bg-white rounded-lg shadow-sm border hover:shadow-lg transition-shadow">
                                    <div className={`absolute top-0 right-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                                    <div className="relative p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-bold text-gray-500  tracking-wide mb-1">{label}</p>
                                                <p className="text-lg font-bold text-gray-900 truncate leading-snug">{value}</p>
                                            </div>
                                            <div className={`relative z-10 p-2.5 ${blobCls} rounded-xl mt-0.5 flex-shrink-0`}>
                                                <Icon className={`h-5 w-5 ${iconCls}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quote Information */}
                        <div className="bg-white rounded-lg shadow-sm border">
                            <div className="border-b px-6 py-4">
                                <h3 className="text-lg font-semibold">{t('Quote Information')}</h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">{t('Quote Number')}</label>
                                            <p className="text-sm mt-1">{quote.quote_number}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">{t('Status')}</label>
                                            <div className="mt-1">{getStatusBadge(quote.status)}</div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">{t('Created By')}</label>
                                            {quote.creator ? (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Avatar className="w-8 h-8 flex-shrink-0">
                                                        <AvatarImage src={quote.creator.avatar} alt={quote.creator.name} />
                                                        <AvatarFallback><UserInitials name={quote.creator.name} /></AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{quote.creator.name}</p>
                                                        {quote.creator.email && <p className="text-xs text-gray-500 truncate">{quote.creator.email}</p>}
                                                    </div>
                                                </div>
                                            ) : <p className="text-sm mt-1 text-gray-500">{t('-')}</p>}
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">{t('Assigned To')}</label>
                                            {quote.assigned_user ? (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Avatar className="w-8 h-8 flex-shrink-0">
                                                        <AvatarImage src={quote.assigned_user.avatar} alt={quote.assigned_user.name} />
                                                        <AvatarFallback><UserInitials name={quote.assigned_user.name} /></AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">{quote.assigned_user.name}</p>
                                                        {quote.assigned_user.email && <p className="text-xs text-gray-500 truncate">{quote.assigned_user.email}</p>}
                                                    </div>
                                                </div>
                                            ) : <p className="text-sm mt-1 text-gray-500">{t('-')}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">{t('Valid Until')}</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <p className="text-sm">{formatDate(quote.valid_until)}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">{t('Created')}</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <p className="text-sm">{formatDate(quote.created_at)}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">{t('Subtotal')}</label>
                                            <p className="text-sm mt-1">{formatCurrency(quote.subtotal)}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">{t('Discount Amount')}</label>
                                            <p className="text-sm mt-1">-{formatCurrency(totalDiscount)}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">{t('Total Tax')}</label>
                                            <p className="text-sm mt-1">{formatCurrency(totalTax)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Related Data */}
                        {(quote.account || quote.contact || quote.shipping_provider_type) && (
                            <div className="bg-white rounded-lg shadow-sm border">
                                <div className="border-b px-6 py-4">
                                    <h3 className="flex items-center text-lg font-semibold">
                                        <User className="h-5 w-5 mr-3 text-gray-400" />
                                        {t('Related Data')}
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {quote.account && (
                                            <div className="p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                                                <p className="text-xs font-medium text-gray-500 mb-3">{t('Account')}</p>
                                                <div className="flex items-center gap-2">
                                                    <UserInitials name={quote.account.name} />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{quote.account.name}</p>
                                                        {quote.account.email && <p className="text-xs text-gray-500 truncate">{quote.account.email}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {quote.contact && (
                                            <div className="p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                                                <p className="text-xs font-medium text-gray-500 mb-3">{t('Contact')}</p>
                                                <div className="flex items-center gap-2">
                                                    <UserInitials name={quote.contact.name} />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{quote.contact.name}</p>
                                                        {quote.contact.email && <p className="text-xs text-gray-500 truncate">{quote.contact.email}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {quote.shipping_provider_type && (
                                            <div className="p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                                                <p className="text-xs font-medium text-gray-500 mb-3">{t('Shipping Provider')}</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                                        <Truck className="h-4 w-4 text-orange-500" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{quote.shipping_provider_type.name}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Billing & Shipping Details */}
                        <div className="bg-white rounded-lg shadow-sm border">
                            <div className="border-b px-6 py-4">
                                <h3 className="flex items-center text-lg font-semibold">
                                    <svg className="h-5 w-5 mr-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    {t('Billing & Shipping Details')}
                                </h3>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    {/* Billing */}
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-3">{t('Billing Address')}</p>
                                        {quote.billing_contact && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <UserInitials name={quote.billing_contact.name} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">{quote.billing_contact.name}</p>
                                                    {quote.billing_contact.email && <p className="text-xs text-muted-foreground truncate">{quote.billing_contact.email}</p>}
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-muted-foreground">{t('Address')}</p>
                                                    <p className="text-sm font-medium text-foreground">{quote.billing_address || t('-')}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-muted-foreground">{t('City')}</p>
                                                    <p className="text-sm font-medium text-foreground">{quote.billing_city || t('-')}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-muted-foreground">{t('State')}</p>
                                                    <p className="text-sm font-medium text-foreground">{quote.billing_state || t('-')}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-muted-foreground">{t('Postal Code')}</p>
                                                    <p className="text-sm font-medium text-foreground">{quote.billing_postal_code || t('-')}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-muted-foreground">{t('Country')}</p>
                                                <p className="text-sm font-medium text-foreground">{quote.billing_country || t('-')}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Shipping */}
                                    <div className="sm:border-s sm:ps-6">
                                        <p className="text-xs font-semibold text-muted-foreground mb-3">{t('Shipping Address')}</p>
                                        {quote.shipping_contact && (
                                            <div className="flex items-center gap-2 mb-3">
                                                <UserInitials name={quote.shipping_contact.name} />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">{quote.shipping_contact.name}</p>
                                                    {quote.shipping_contact.email && <p className="text-xs text-muted-foreground truncate">{quote.shipping_contact.email}</p>}
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-muted-foreground">{t('Address')}</p>
                                                    <p className="text-sm font-medium text-foreground">{quote.shipping_address || t('-')}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-muted-foreground">{t('City')}</p>
                                                    <p className="text-sm font-medium text-foreground">{quote.shipping_city || t('-')}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-muted-foreground">{t('State')}</p>
                                                    <p className="text-sm font-medium text-foreground">{quote.shipping_state || t('-')}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-muted-foreground">{t('Postal Code')}</p>
                                                    <p className="text-sm font-medium text-foreground">{quote.shipping_postal_code || t('-')}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-muted-foreground">{t('Country')}</p>
                                                <p className="text-sm font-medium text-foreground">{quote.shipping_country || t('-')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Products Table */}
                        <div className="bg-white rounded-lg shadow-sm border">
                            <div className="border-b px-6 py-4">
                                <h3 className="flex items-center text-lg font-semibold">
                                    <Package className="h-5 w-5 mr-3 text-gray-400" />
                                    {t('Products')}
                                </h3>
                            </div>
                            <div className="p-0">
                                {quote.products && quote.products.length > 0 ? (
                                    <>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-[#F0F0F1] border-b hover:!bg-[#F0F0F1]">
                                                        <TableHead className="py-2.5 font-semibold">{t('Product')}</TableHead>
                                                        <TableHead className="py-2.5 font-semibold text-center">{t('Quantity')}</TableHead>
                                                        <TableHead className="py-2.5 font-semibold text-center">{t('Unit Price')}</TableHead>
                                                        <TableHead className="py-2.5 font-semibold text-center">{t('Discount')}</TableHead>
                                                        <TableHead className="py-2.5 font-semibold text-center">{t('Tax')}</TableHead>
                                                        <TableHead className="py-2.5 font-semibold text-right">{t('Total')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {quote.products.map((product: any, index: number) => {
                                                        const lineTotal = Number(product.pivot.total_price) || 0;
                                                        const discountAmount = Number(product.pivot.discount_amount) || 0;
                                                        const afterDiscount = lineTotal - discountAmount;
                                                        const taxAmount = product.tax ? (afterDiscount * Number(product.tax.rate)) / 100 : 0;
                                                        const finalTotal = afterDiscount + taxAmount;
                                                        return (
                                                            <TableRow key={index} className="hover:bg-gray-50 border-b">
                                                                <TableCell className="py-3">
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        {product.main_image_url ? (
                                                                            <a href={product.main_image_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                                                                <img src={product.main_image_url} alt={product.name} className="w-11 h-11 rounded-lg object-cover border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer" />
                                                                            </a>
                                                                        ) : (
                                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                                                                                <Package className="h-4 w-4 text-gray-300" />
                                                                            </div>
                                                                        )}
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                                                                            {product.sku && <p className="text-xs text-gray-500 mt-0.5">SKU: {product.sku}</p>}
                                                                            {product.category?.name && (
                                                                                <span className="mt-1 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                                                                                    {product.category.name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="py-3 text-center">
                                                                    <p className="text-sm font-semibold text-gray-900">{product.pivot.quantity}</p>
                                                                </TableCell>
                                                                <TableCell className="py-3 text-center">
                                                                    <p className="text-sm font-semibold font-mono text-gray-900">{formatCurrency(product.pivot.unit_price)}</p>
                                                                </TableCell>
                                                                <TableCell className="py-3 text-center">
                                                                    {product.pivot.discount_type && product.pivot.discount_type !== 'none' && product.pivot.discount_value > 0 ? (
                                                                        <>
                                                                            <p className="text-sm font-semibold text-gray-900">
                                                                                {product.pivot.discount_type === 'percentage' ? `${Number(product.pivot.discount_value)}%` : <span className="font-mono">{formatCurrency(Number(product.pivot.discount_value))}</span>}
                                                                            </p>
                                                                            <p className="text-xs font-mono text-red-500 mt-0.5">-{formatCurrency(discountAmount)}</p>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-3 text-center">
                                                                    {product.tax ? (
                                                                        <>
                                                                            <p className="text-sm font-semibold text-gray-900">{product.tax.name} ({parseFloat(product.tax.rate).toFixed(2)}%)</p>
                                                                            <p className="text-xs font-mono text-gray-500 mt-0.5">{formatCurrency(taxAmount)}</p>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="py-3 text-right">
                                                                    <p className="text-sm font-bold font-mono text-emerald-600">{formatCurrency(finalTotal)}</p>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        {/* Summary box */}
                                        <div className="flex justify-end px-6 py-5 border-t bg-gray-50/50">
                                            <div className="w-full max-w-sm border rounded-xl overflow-hidden">
                                                <div className="flex items-center justify-between px-4 py-3 border-b">
                                                    <span className="text-sm text-gray-500 font-medium">{t('Subtotal')}</span>
                                                    <span className="text-sm font-semibold font-mono text-gray-900">{formatCurrency(subtotal)}</span>
                                                </div>
                                                <div className="flex items-center justify-between px-4 py-3 border-b">
                                                    <span className="text-sm text-gray-500 font-medium">{t('Discount')}</span>
                                                    <span className="text-sm font-semibold font-mono text-red-500">-{formatCurrency(totalDiscount)}</span>
                                                </div>
                                                <div className="flex items-center justify-between px-4 py-3 border-b">
                                                    <span className="text-sm text-gray-500 font-medium">{t('Total Tax')}</span>
                                                    <span className="text-sm font-semibold font-mono text-gray-900">{formatCurrency(totalTax)}</span>
                                                </div>
                                                <div className="flex items-center justify-between px-4 py-3">
                                                    <span className="text-sm font-bold text-gray-900">{t('Grand Total')}</span>
                                                    <span className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(grandTotal)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-16 text-gray-500">
                                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                            <Package className="h-8 w-8 text-gray-300" />
                                        </div>
                                        <p className="text-lg font-medium">{t('No products added to this quote')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Activity Stream */}
                        {quote.activities && quote.activities.length > 0 && (
                            <div className="bg-white rounded-lg shadow-sm border">
                                <div className="border-b px-6 py-4">
                                    <h3 className="flex items-center text-lg font-semibold">
                                        <MessageCircle className="h-5 w-5 mr-3 text-gray-400" />
                                        {t('Activity Stream')}
                                    </h3>
                                </div>
                                <div className="p-6 max-h-[520px] overflow-y-auto">
                                    <div className="py-1 space-y-0">
                                        {quote.activities.map((activity: any, index: number) => {
                                            const getActivityBadgeColor = (type: string): string => {
                                                switch (type) {
                                                    case 'created': return 'bg-green-50 text-green-700 ring-green-600/20';
                                                    case 'updated': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
                                                    case 'deleted': return 'bg-red-50 text-red-700 ring-red-600/20';
                                                    case 'assigned': return 'bg-purple-50 text-purple-700 ring-purple-600/20';
                                                    case 'comment': return 'bg-indigo-50 text-indigo-700 ring-indigo-600/20';
                                                    default: return 'bg-gray-50 text-gray-700 ring-gray-600/20';
                                                }
                                            };
                                            const badgeCls = getActivityBadgeColor(activity.activity_type);
                                            return (
                                                <div key={activity.id || index} className="relative flex gap-3 pb-4">
                                                    <div className="flex flex-col items-center flex-shrink-0 w-9">
                                                        <TooltipProvider delayDuration={200}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Avatar className="w-9 h-9 flex-shrink-0 relative z-10">
                                                                        <AvatarImage src={activity.user?.avatar} alt={activity.user?.name || 'U'} />
                                                                        <AvatarFallback><UserInitials name={activity.user?.name || 'U'} /></AvatarFallback>
                                                                    </Avatar>
                                                                </TooltipTrigger>
                                                                <TooltipContent side="top"><p>{activity.user?.name || t('System')}</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        {index < quote.activities.length - 1 && (
                                                            <div className="absolute left-[18px] top-9 bottom-0 w-px bg-gray-300" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 rounded-xl border bg-white shadow-sm overflow-hidden">
                                                        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-semibold text-gray-900">{activity.user?.name || t('System')}</span>
                                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badgeCls}`}>
                                                                    {activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                                                </span>
                                                                <span className="text-xs text-gray-400">{formatRelativeTime(activity.created_at)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="px-4 py-3">
                                                            {activity.description?.includes('into') ? (
                                                                <p className="text-sm text-gray-500" dangerouslySetInnerHTML={{ __html: activity.description }} />
                                                            ) : activity.title ? (
                                                                <p className="text-sm text-gray-500">{activity.title}</p>
                                                            ) : (
                                                                <p className="text-sm text-gray-500">{activity.description}</p>
                                                            )}
                                                        </div>
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
            </div>
        </>
    );
}
