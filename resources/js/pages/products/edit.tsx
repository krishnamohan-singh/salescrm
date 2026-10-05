import { PageTemplate } from '@/components/page-template';
import { usePage, useForm, router } from '@inertiajs/react';
import { ArrowLeft, Box, Tag, Banknote, Image, UserCheck } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { useState } from 'react';

const STEPS = [
    { number: 1, label: 'Basic Details',   Icon: Box },
    { number: 2, label: 'Pricing & Units', Icon: Banknote },
    { number: 3, label: 'Media Gallery',   Icon: Image },
    { number: 4, label: 'Assignment',      Icon: UserCheck },
];

export default function ProductEdit() {
    const { t } = useTranslation();
    const { product, categories, brands, taxes, users, mainImage, additionalImages, existingSkus } = usePage().props as any;
    const [step, setStep] = useState(1);
    const [mainImageUrl, setMainImageUrl] = useState<string | null>(mainImage?.url || null);

    const validMainImageId = product.main_image_id && mainImage ? product.main_image_id : null;
    const validAdditionalImageIds = product.additional_image_ids && additionalImages
        ? product.additional_image_ids.filter((id: number) => additionalImages.some((img: any) => img.id === id))
        : null;

    const { data, setData, setError, clearErrors, put, processing, errors } = useForm({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        stock_quantity: product.stock_quantity?.toString() || '',
        category_id: product.category_id?.toString() || '',
        brand_id: product.brand_id?.toString() || '',
        tax_id: product.tax_id?.toString() || '',
        status: product.status || 'active',
        assigned_to: product.assigned_to?.toString() || '',
        main_image_id: validMainImageId as number | null,
        additional_image_ids: validAdditionalImageIds as number[] | null,
    });

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Products'), href: route('products.index') },
        { title: t('Edit') },
    ];

    const set = (name: string, value: any) => {
        setData(name as any, value);
        clearErrors(name as any);
    };

    const validateStep = (s: number) => {
        const errs: Record<string, string> = {};
        if (s === 1) {
            if (!data.name) errs.name = t('Name is required');
            if (!data.sku) errs.sku = t('SKU is required');
            else if (existingSkus.map((s: string) => s.toLowerCase()).includes(data.sku.toLowerCase())) errs.sku = t('SKU already exists');
            if (!data.category_id) errs.category_id = t('Category is required');
            if (!data.tax_id) errs.tax_id = t('Tax is required');
            if (!data.brand_id) errs.brand_id = t('Brand is required');
        }
        if (s === 2) {
            if (!data.price) errs.price = t('Price is required');
            if (data.price && parseFloat(data.price) < 0) errs.price = t('Price must be at least 0');
            if (!data.stock_quantity) errs.stock_quantity = t('Stock Quantity is required');
            if (data.stock_quantity && parseFloat(data.stock_quantity) < 0) errs.stock_quantity = t('Stock Quantity must be at least 0');
        }
        if (s === 3) {
            if (!data.main_image_id) errs.main_image_id = t('Main Image is required');
            if (!data.additional_image_ids?.length) errs.additional_image_ids = t('Additional Images are required');
        }
        if (s === 4) {
            if (!data.assigned_to) errs.assigned_to = t('Assign To is required');
        }
        return errs;
    };

    const handleStepClick = (targetStep: number) => {
        if (targetStep <= step) { setStep(targetStep); return; }
        for (let s = 1; s < targetStep; s++) {
            const errs = validateStep(s);
            if (Object.keys(errs).length > 0) {
                Object.entries(errs).forEach(([k, v]) => setError(k as any, v));
                setStep(s);
                return;
            }
        }
        setStep(targetStep);
    };

    const handleNext = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const errs = validateStep(step);
        if (Object.keys(errs).length > 0) {
            Object.entries(errs).forEach(([k, v]) => setError(k as any, v));
            return;
        }
        setStep(s => s + 1);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const allErrs: Record<string, string> = {};
        [1, 2, 3, 4].forEach(s => Object.assign(allErrs, validateStep(s)));
        if (Object.keys(allErrs).length > 0) {
            Object.entries(allErrs).forEach(([k, v]) => setError(k as any, v));
            const firstErrStep = [1, 2, 3, 4].find(s => Object.keys(validateStep(s)).length > 0);
            if (firstErrStep) setStep(firstErrStep);
            Object.values(allErrs).forEach(msg => toast.error(msg));
            return;
        }
        toast.loading(t('Updating product...'));
        put(route('products.update', product.id), {
            onSuccess: () => toast.dismiss(),
            onError: (errs) => {
                toast.dismiss();
                Object.values(errs).forEach((msg: any) => toast.error(msg));
                const firstErrStep = [1, 2, 3, 4].find(s => Object.keys(validateStep(s)).length > 0);
                if (firstErrStep) setStep(firstErrStep);
            },
        });
    };

    const { globalSettings } = usePage().props as any;
    const currencySymbol = globalSettings?.currencySymbol || '$';

    return (
        <PageTemplate
            title={t('Edit Product')}
            url={route('products.index')}
            breadcrumbs={breadcrumbs}
            actions={[{
                label: t('Back'),
                icon: <ArrowLeft className="h-4 w-4 me-1" />,
                variant: 'outline',
                onClick: () => router.visit(route('products.index')),
            }]}
            noPadding
        >
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col xl:flex-row gap-6 items-start">

                    {/* ── Main Form ── */}
                    <div className="flex-1 min-w-0 w-full">

                        {/* Step Wizard Bar */}
                        <div className="bg-card rounded-xl border border-border p-4 mb-4">
                            <div className="flex items-center flex-wrap gap-y-2">
                                {STEPS.map((s, i) => {
                                    const isActive = step === s.number;
                                    const isDone   = step > s.number;
                                    return (
                                        <div key={s.number} className="flex items-center flex-1">
                                            <button
                                                type="button"
                                                onClick={() => handleStepClick(s.number)}
                                                className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors"
                                            >
                                                <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-colors
                                                    ${isActive ? 'border-primary bg-primary/10 text-primary'
                                                    : isDone   ? 'border-primary bg-primary text-primary-foreground'
                                                               : 'border-border bg-muted text-muted-foreground'}`}
                                                >
                                                    <s.Icon className="h-4 w-4" />
                                                </span>
                                                <span className="text-start hidden sm:block">
                                                    <span className="block text-[10px] text-muted-foreground uppercase tracking-wide">STEP {s.number}</span>
                                                    <span className={`block text-xs font-semibold
                                                        ${isActive ? 'text-primary' : isDone ? 'text-primary' : 'text-muted-foreground'}`}>
                                                        {t(s.label)}
                                                    </span>
                                                </span>
                                            </button>
                                            {i < STEPS.length - 1 && (
                                                <span className="flex-1 h-px bg-border mx-1" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Step Content Card */}
                        <div className="bg-card rounded-xl border border-border p-6">

                            {/* ── Step 1: Basic Details ── */}
                            {step === 1 && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label required>{t('Name')}</Label>
                                            <Input
                                                value={data.name}
                                                onChange={e => set('name', e.target.value)}
                                                className={errors.name ? 'border-red-500' : ''}
                                                placeholder={t('Enter Name')}
                                            />
                                            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>{t('SKU')}</Label>
                                            <Input
                                                value={data.sku}
                                                onChange={e => set('sku', e.target.value)}
                                                className={errors.sku ? 'border-red-500' : ''}
                                                placeholder={t('Enter SKU')}
                                            />
                                            {errors.sku && <p className="text-xs text-red-500">{errors.sku}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label required>{t('Category')}</Label>
                                            <Select value={data.category_id} onValueChange={v => set('category_id', v)}>
                                                <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder={t('Select Category')} />
                                                </SelectTrigger>
                                                <SelectContent searchable>
                                                    {categories?.map((c: any) => (
                                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.category_id && <p className="text-xs text-red-500">{errors.category_id}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>{t('Brand')}</Label>
                                            <Select value={data.brand_id} onValueChange={v => set('brand_id', v)}>
                                                <SelectTrigger className={errors.brand_id ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder={t('Select Brand')} />
                                                </SelectTrigger>
                                                <SelectContent searchable>
                                                    {brands?.map((b: any) => (
                                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.brand_id && <p className="text-xs text-red-500">{errors.brand_id}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label required>{t('Tax')}</Label>
                                            <Select value={data.tax_id} onValueChange={v => set('tax_id', v)}>
                                                <SelectTrigger className={errors.tax_id ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder={t('Select Taxes')} />
                                                </SelectTrigger>
                                                <SelectContent searchable>
                                                    {taxes?.map((tax: any) => (
                                                        <SelectItem key={tax.id} value={tax.id.toString()}>
                                                            {tax.name} ({tax?.type === 'percentage' ? tax.rate + '%' : '$' + tax.rate})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.tax_id && <p className="text-xs text-red-500">{errors.tax_id}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>{t('Description')}</Label>
                                        <Textarea
                                            value={data.description}
                                            onChange={e => set('description', e.target.value)}
                                            rows={5}
                                            placeholder={t('Enter description...')}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── Step 2: Pricing & Units ── */}
                            {step === 2 && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label required>{t('Price')}</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={data.price}
                                                onChange={e => set('price', e.target.value)}
                                                className={errors.price ? 'border-red-500' : ''}
                                                placeholder={t('e.g. 29.99')}
                                            />
                                            {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label required>{t('Stock Quantity')}</Label>
                                            <Input
                                                type="number"
                                                value={data.stock_quantity}
                                                onChange={e => set('stock_quantity', e.target.value)}
                                                className={errors.stock_quantity ? 'border-red-500' : ''}
                                                placeholder={t('e.g. 100')}
                                            />
                                            {errors.stock_quantity && <p className="text-xs text-red-500">{errors.stock_quantity}</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 3: Media Gallery ── */}
                            {step === 3 && (
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label>{t('Main Image')} <span className="text-red-500">*</span></Label>
                                        <MediaPicker
                                            value={data.main_image_id ?? undefined}
                                            onChange={(v) => {
                                                set('main_image_id', v);
                                                if (v) {
                                                    fetch(route('api.media.index'), {
                                                        credentials: 'same-origin',
                                                        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                                                    })
                                                        .then(r => r.json())
                                                        .then(media => {
                                                            const item = media.find((m: any) => m.id === Number(v));
                                                            setMainImageUrl(item?.url || null);
                                                        })
                                                        .catch(() => setMainImageUrl(null));
                                                } else {
                                                    setMainImageUrl(null);
                                                }
                                            }}
                                            placeholder={t('Select main image...')}
                                            showPreview={true}
                                            returnType="id"
                                        />
                                        {errors.main_image_id && <p className="text-xs text-red-500">{errors.main_image_id}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Additional Images')} <span className="text-red-500">*</span></Label>
                                        <MediaPicker
                                            value={data.additional_image_ids || []}
                                            onChange={v => set('additional_image_ids', v)}
                                            placeholder={t('Select additional images...')}
                                            multiple={true}
                                            showPreview={true}
                                            returnType="id"
                                        />
                                        {errors.additional_image_ids && <p className="text-xs text-red-500">{errors.additional_image_ids}</p>}
                                    </div>
                                </div>
                            )}

                            {/* ── Step 4: Assignment ── */}
                            {step === 4 && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label required>{t('Assign To')}</Label>
                                            <Select value={data.assigned_to} onValueChange={v => set('assigned_to', v)}>
                                                <SelectTrigger className={errors.assigned_to ? 'border-red-500' : ''}>
                                                    <SelectValue placeholder={t('Select user')} />
                                                </SelectTrigger>
                                                <SelectContent searchable>
                                                    {users?.map((u: any) => (
                                                        <SelectItem key={u.id} value={u.id.toString()}>{u.name} ({u.email})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.assigned_to && <p className="text-xs text-red-500">{errors.assigned_to}</p>}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>{t('Status')}</Label>
                                            <Select value={data.status} onValueChange={v => set('status', v)}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="active">{t('Active')}</SelectItem>
                                                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step Navigation */}
                            <div className="flex justify-between mt-8 pt-4 border-t border-border">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => step > 1 ? setStep(s => s - 1) : router.visit(route('products.index'))}
                                >
                                    {step > 1 ? t('Previous') : t('Cancel')}
                                </Button>
                                {step < 4 ? (
                                    <Button type="button" onClick={e => handleNext(e)}>
                                        {t('Next')}
                                    </Button>
                                ) : (
                                    <Button type="submit" disabled={processing}>
                                        {processing ? t('Saving...') : t('Save Product')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Live Preview ── */}
                    <div className="hidden xl:block w-72 shrink-0">
                        <div className="bg-card rounded-xl border border-border overflow-hidden sticky top-4">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                <span className="text-xs font-semibold text-muted-foreground tracking-wide">{t('Live Preview')}</span>
                            </div>

                            {/* Image area */}
                            <div className="bg-muted flex items-center justify-center h-40 border-b border-border overflow-hidden">
                                {mainImageUrl ? (
                                    <img src={mainImageUrl} alt="preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <Box className="h-12 w-12 text-muted-foreground/30" strokeWidth={1} />
                                        <span className="text-xs text-muted-foreground">{t('No image uploaded')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Product info */}
                            <div className="p-4 space-y-3">
                                <div>
                                    <p className="font-semibold text-foreground text-sm">
                                        {data.name || t('Untitled Item')}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Tag className="h-3 w-3 shrink-0" />
                                        {data.sku || 'SKU-XXXXXXXX'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-muted rounded-lg p-2 border border-border">
                                        <p className="text-[10px] text-muted-foreground tracking-wide font-medium">{t('Sale Price')}</p>
                                        <p className="text-sm font-bold text-foreground mt-0.5 font-mono">
                                            {data.price ? `${currencySymbol}${parseFloat(data.price).toFixed(2)}` : `${currencySymbol}0.00`}
                                        </p>
                                    </div>
                                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 border border-orange-200 dark:border-orange-800/40">
                                        <p className="text-[10px] text-muted-foreground tracking-wide font-medium">{t('Stock')}</p>
                                        <p className="text-sm font-bold text-orange-500 mt-0.5">
                                            {data.stock_quantity || '0'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </form>
        </PageTemplate>
    );
}
