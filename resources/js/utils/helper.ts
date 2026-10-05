import { t } from "i18next";

const getBaseUrl = (): string => {
    return window.appSettings?.baseUrl || window.location.origin;
};

const getGlobalSettings = () => {
    return (window as any).page.props.globalSettings;
};

const getDisplayUrl = (path: string, pageProps?: any): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = getBaseUrl();
    // If path already contains screenshots, just prepend domain
    if (path.includes('screenshots')) {
        return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`;
    }

    try {
        const dynamicPath = `${baseUrl}`;
        const globalSettings = (window as any).page.props.globalSettings;
        let imageUrlPrefix = globalSettings?.image_url || (dynamicPath + '/storage/media');

        path = path.replace('storage/media', '');

        // Handle slash concatenation
        const prefixEndsWithSlash = imageUrlPrefix.endsWith('/');
        const pathStartsWithSlash = path.startsWith('/');

        if (prefixEndsWithSlash && pathStartsWithSlash) {
            return imageUrlPrefix + path.substring(1);
        } else if (!prefixEndsWithSlash && !pathStartsWithSlash) {
            return imageUrlPrefix + '/' + path;
        } else {
            return imageUrlPrefix + path;
        }
    }
    catch {
        const fallbackPrefix = `${window.location.origin}`;
        return path.startsWith('/') ? fallbackPrefix + path.substring(1) : fallbackPrefix + path;
    }
};

const isRegistrationEnabled = () => {
    const globalSettings = getGlobalSettings();
    return globalSettings?.registrationEnabled;
}

const getTermsAndConditionsUrl = () => {
    const globalSettings = getGlobalSettings();
    return globalSettings?.termsConditionsPage;
}

const isDisabledEditRole = (role: string) => {
    const roles = ['sales-manager'];
    return roles.includes(role);
}

const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return t('Just now');
    if (diffInMinutes < 60) return t('{{count}} {{unit}} ago', { count: diffInMinutes, unit: diffInMinutes === 1 ? t('minute') : t('minutes') });

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t('{{count}} {{unit}} ago', { count: diffInHours, unit: diffInHours === 1 ? t('hour') : t('hours') });

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('{{count}} {{unit}} ago', { count: diffInDays, unit: diffInDays === 1 ? t('day') : t('days') });

    return window?.appSettings?.formatDateTime(date, false);
};

const getCurrencySymbol = (): string => {
    if (typeof window !== 'undefined') {
        if (window.appSettings?.currencySettings?.currencySymbol) {
            return window.appSettings.currencySettings.currencySymbol;
        }
        const globalSettings = (window as any).page?.props?.globalSettings;
        if (globalSettings?.currencySymbol) {
            return globalSettings.currencySymbol;
        }
    }
    return '$';
};

const formatCurrency = (amount: number | string, options = { showSymbol: true, showCode: false }): string => {
    if (typeof window !== 'undefined' && window.appSettings?.formatCurrency) {
        return window.appSettings.formatCurrency(amount, options);
    }
    const symbol = getCurrencySymbol();
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? `${symbol}0.00` : `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const capitalize = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export { getDisplayUrl, isRegistrationEnabled, getTermsAndConditionsUrl, isDisabledEditRole, formatRelativeTime, capitalize, formatCurrency, getCurrencySymbol };



