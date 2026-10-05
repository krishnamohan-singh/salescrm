import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import MediaLibraryModal from './MediaLibraryModal';
import { Image as ImageIcon, X, Trash2, File, FileText } from 'lucide-react';

interface MediaPickerProps {
    label?: string;
    value?: string | number | number[];
    onChange: (value: string | number | number[]) => void;
    multiple?: boolean;
    placeholder?: string;
    showPreview?: boolean;
    returnType?: 'url' | 'id';
}

export default function MediaPicker({
    label,
    value = '',
    onChange,
    multiple = false,
    placeholder = 'Select image...',
    showPreview = true,
    returnType = 'url'
}: MediaPickerProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSelect = (selectedData: string | number | number[]) => {
        onChange(selectedData);
    };

    const handleClear = () => {
        if (multiple) {
            onChange([]);
        } else {
            onChange('');
        }
        setImageUrls([]);
        setImageNames([]);
        setImageMimeTypes([]);
    };

    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [imageNames, setImageNames] = useState<string[]>([]);
    const [imageMimeTypes, setImageMimeTypes] = useState<string[]>([]);

    const getMimeFromUrl = (url: string) => {
        const ext = url.split('.').pop()?.toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image/' + ext;
        if (ext === 'pdf') return 'application/pdf';
        if (['doc', 'docx'].includes(ext)) return 'application/msword';
        if (['xls', 'xlsx'].includes(ext)) return 'application/vnd.ms-excel';
        if (ext === 'csv') return 'text/csv';
        return 'application/octet-stream';
    };

    // Fetch image URLs and names when using ID return type
    useEffect(() => {
        if (returnType === 'id' && value) {
            const ids = Array.isArray(value) ? value : [value].filter(Boolean);
            if (ids.length > 0) {
                fetch(route('api.media.index'), {
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                })
                    .then(response => response.json())
                    .then(media => {
                        const urls: string[] = [];
                        const names: string[] = [];
                        const mimes: string[] = [];
                        ids.forEach(id => {
                            const mediaItem = media.find((m: any) => m.id === Number(id));
                            if (mediaItem) {
                                urls.push(mediaItem.url);
                                names.push(mediaItem.name || mediaItem.file_name || `File ${id}`);
                                mimes.push(mediaItem.mime_type || getMimeFromUrl(mediaItem.url));
                            }
                        });
                        setImageUrls(urls);
                        setImageNames(names);
                        setImageMimeTypes(mimes);
                    })
                    .catch(() => {
                        setImageUrls([]);
                        setImageNames([]);
                        setImageMimeTypes([]);
                    });
            } else {
                setImageUrls([]);
                setImageNames([]);
                setImageMimeTypes([]);
            }
        } else if (returnType === 'url') {
            const valueStr = Array.isArray(value) ? value.join(',') : String(value || '');
            const urls = valueStr ? valueStr.split(',').map(url => url.trim()).filter(Boolean) : [];
            setImageUrls(urls);
            setImageNames(urls.map((_, index) => `File ${index + 1}`));
            setImageMimeTypes(urls.map(getMimeFromUrl));
        }
    }, [value, returnType]);

    const displayValue = imageUrls.map((img) => {
        const imagePathArr = String(img || '').split('/');
        return imagePathArr[imagePathArr.length - 1];
    }).join(', ');

    const getFileIcon = (mime: string) => {
        if (mime.includes('pdf')) return <FileText className="h-7 w-7 text-red-500" />;
        if (mime.includes('word') || mime.includes('document')) return <FileText className="h-7 w-7 text-blue-500" />;
        if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv') return <FileText className="h-7 w-7 text-green-500" />;
        return <File className="h-7 w-7 text-gray-500" />;
    };

    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}

            <div className="flex gap-2">
                <Input
                    value={displayValue}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    readOnly={multiple}
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(true)}
                >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Browse
                </Button>
                {(imageNames.length > 0 || displayValue) && (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleClear}
                    >
                        <X className="h-4 w-4 mx-2" />
                    </Button>
                )}
            </div>

            {/* Preview */}
            {showPreview && imageUrls.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                    {imageUrls.map((url, index) => {
                        const mime = imageMimeTypes[index] || '';
                        const isImage = mime.startsWith('image/');
                        return (
                            <div key={index} className="relative">
                                {isImage ? (
                                    <img
                                        src={url}
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-20 object-cover rounded border"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-20 rounded border bg-muted flex flex-col items-center justify-center gap-1">
                                        {getFileIcon(mime)}
                                        <span className="text-xs text-muted-foreground truncate px-1 max-w-full">
                                            {mime.split('/')[1]?.toUpperCase() || 'FILE'}
                                        </span>
                                    </div>
                                )}
                                {multiple && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            if (Array.isArray(value)) {
                                                const newValue = value.filter((_, i) => i !== index);
                                                onChange(newValue);
                                            }
                                        }}
                                        className="absolute top-1 right-1 h-6 w-6 p-0 bg-red-500 text-white hover:bg-red-600"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <MediaLibraryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelect={handleSelect}
                multiple={multiple}
                returnType={returnType}
                preSelected={Array.isArray(value) ? value : (value ? [value] : [])}
            />
        </div>
    );
}
