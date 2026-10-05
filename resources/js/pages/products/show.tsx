import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { ArrowLeft, Package, ChevronLeft, ChevronRight, ZoomIn, Download, DollarSign, Layers, Tag, Bookmark, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useInitials } from '@/hooks/use-initials';

export default function ProductShow() {
    const { t } = useTranslation();
    const { product, mainImage, additionalImages } = usePage().props as any;
    const getInitials = useInitials();
    const images: any[] = additionalImages || [];
    const [adIndex, setAdIndex] = useState(0);

    const handlePrev = () => setAdIndex((i) => (i - 1 + images.length) % images.length);
    const handleNext = () => setAdIndex((i) => (i + 1) % images.length);

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Items'), href: route('products.index') },
        { title: t('View Product') },
    ];

    const formatCurrency = (amount: number) =>
        window.appSettings?.formatCurrency(Number(amount || 0)) || `$${Number(amount || 0).toFixed(2)}`;

    const pageActions = [
        {
            label: t('Back'),
            icon: <ArrowLeft className="h-4 w-4 me-2" />,
            variant: 'outline',
            onClick: () => router.visit(route('products.index')),
        },
    ];

    return (
        <PageTemplate title={product.name} description={t('Product details and related information')} noPadding  breadcrumbs={breadcrumbs} actions={pageActions}>
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6">

                {/* ── Left Column ── */}
                <div className="space-y-4">

                    {/* Main Image — always fixed */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-2 pt-4 px-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                {t('Product Image')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className="flex items-center justify-center bg-muted rounded-lg min-h-[220px]">
                                {mainImage ? (
                                    <img
                                        src={mainImage}
                                        alt={product.name}
                                        className="max-h-[220px] max-w-full object-contain rounded-lg"
                                    />
                                ) : (
                                    <Package className="h-20 w-20 text-muted-foreground/30" />
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Images — independent carousel */}
                    {images.length > 0 && (
                        <Card className="shadow-sm">
                            <CardHeader className="pb-2 pt-4 px-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        {t('Additional Images')}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {adIndex + 1}/{images.length}
                                        </span>
                                        <a
                                            href={images[adIndex]?.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1 hover:bg-muted rounded"
                                        >
                                            <ZoomIn className="h-4 w-4 text-muted-foreground" />
                                        </a>
                                        <a
                                            href={images[adIndex]?.url}
                                            download
                                            className="p-1 hover:bg-muted rounded"
                                        >
                                            <Download className="h-4 w-4 text-muted-foreground" />
                                        </a>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                {/* Carousel viewer */}
                                <div className="relative flex items-center justify-center bg-muted rounded-lg min-h-[300px] mb-3">
                                    {images.length > 1 && (
                                        <button
                                            onClick={handlePrev}
                                            className="absolute start-2 z-10 p-1 bg-card rounded-full shadow hover:bg-muted"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                    )}
                                    <img
                                        src={images[adIndex]?.url}
                                        alt={`${product.name} ${adIndex + 1}`}
                                        className="max-h-[300px] max-w-full object-contain rounded-lg"
                                    />
                                    {images.length > 1 && (
                                        <button
                                            onClick={handleNext}
                                            className="absolute end-2 z-10 p-1 bg-card rounded-full shadow hover:bg-muted"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                {/* Thumbnails */}
                                <div className="flex gap-2 overflow-x-auto py-1">
                                    {images.map((img: any, idx: number) => (
                                        <button
                                            key={img.id}
                                            onClick={() => setAdIndex(idx)}
                                            className={`flex-shrink-0 w-14 h-14 rounded border-2 overflow-hidden transition-all ${
                                                adIndex === idx
                                                    ? 'border-primary'
                                                    : 'border-border hover:border-muted-foreground'
                                            }`}
                                        >
                                            <img
                                                src={img.thumb_url || img.url}
                                                alt={`thumb-${idx}`}
                                                className="w-full h-full object-contain p-1"
                                            />
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ── Right Column ── */}
                <div className="space-y-4">

                    {/* Summary Stat Cards */}
                    <div className="grid grid-cols-4 gap-3">
                        {([
                            { label: t('Sale Price'), value: formatCurrency(product.price), icon: DollarSign, iconCls: 'text-emerald-600', blobCls: 'bg-emerald-50 dark:bg-emerald-900/30' },
                            { label: t('Brand'), value: product.brand?.name || '—', icon: Bookmark, iconCls: 'text-blue-600', blobCls: 'bg-blue-50 dark:bg-blue-900/30' },
                            { label: t('Stock'), value: product.stock_quantity ?? '—', icon: Layers, iconCls: 'text-orange-600', blobCls: 'bg-orange-50 dark:bg-orange-900/30' },
                            { label: t('Category'), value: product.category?.name || '—', icon: Tag, iconCls: 'text-purple-600', blobCls: 'bg-purple-50 dark:bg-purple-900/30' },
                        ] as const).map(({ label, value, icon: Icon, iconCls, blobCls }) => (
                            <Card key={label} className="relative overflow-hidden">
                                <div className={`absolute top-0 end-0 w-20 h-20 ${blobCls} rounded-bl-full`} />
                                <CardContent className="relative p-3">
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0 pe-1">
                                            <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                                            <p className="text-sm font-bold text-foreground truncate leading-snug font-mono">{value}</p>
                                        </div>
                                        <div className={`relative z-10 p-2 ${blobCls} rounded-lg mt-0.5 flex-shrink-0`}>
                                            <Icon className={`h-4 w-4 ${iconCls}`} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Basic Information + Additional Information — side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Card className="shadow-sm">
                            <CardHeader className="border-b py-3.5 px-5">
                                <CardTitle className="flex items-center text-base font-semibold">
                                    <FileText className="h-4 w-4 me-2 text-muted-foreground" />
                                    {t('Basic Information')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('Status')}</p>
                                    <div>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                            product.status === 'active'
                                                ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                            {product.status === 'active' ? t('Active') : t('Inactive')}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-muted-foreground">{t('SKU')}</p>
                                    <p className="text-sm font-medium text-foreground font-mono">{product.sku || '—'}</p>
                                </div>
                              
                                {product.tax && (
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-medium text-muted-foreground">{t('Tax')}</p>
                                        <p className="text-sm font-medium text-foreground">
                                            {product.tax.name}{product.tax.type === 'percentage' ? ` (${product.tax.rate}%)` : ` (`}<span className="font-mono">{product.tax.type !== 'percentage' ? formatCurrency(product.tax.rate) : ''}</span>{product.tax.type !== 'percentage' ? `)` : ''}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader className="border-b py-3.5 px-5">
                                <CardTitle className="flex items-center text-base font-semibold">
                                    <Users className="h-4 w-4 me-2 text-muted-foreground" />
                                    {t('Additional Information')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-5 space-y-4">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('Assigned To')}</p>
                                    {product.assigned_user ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-8 h-8 flex-shrink-0">
                                                <AvatarImage src={product.assigned_user.avatar} alt={product.assigned_user.name} />
                                                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(product.assigned_user.name || '')}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{product.assigned_user.name}</p>
                                                {product.assigned_user.email && <p className="text-xs text-muted-foreground truncate">{product.assigned_user.email}</p>}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{t('Unassigned')}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">{t('Created By')}</p>
                                    {product.creator ? (
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-8 h-8 flex-shrink-0">
                                                <AvatarImage src={product.creator.avatar} alt={product.creator.name} />
                                                <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">{getInitials(product.creator.name || '')}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{product.creator.name}</p>
                                                {product.creator.email && <p className="text-xs text-muted-foreground truncate">{product.creator.email}</p>}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">{t('Unknown')}</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Description */}
                    {product.description && (
                        <Card className="shadow-sm">
                            <CardHeader className="border-b py-3.5 px-5">
                                <CardTitle className="flex items-center text-lg font-semibold">
                                    <FileText className="h-5 w-5 me-3 text-muted-foreground" />
                                    {t('Description')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="px-5 py-4 max-h-[150px] overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
                                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{product.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </PageTemplate>
    );
}
