import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from '@/components/custom-toast';
import { Upload, X, Image as ImageIcon, Search, Plus, Check, File, FileText } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { hasPermission } from '@/utils/authorization';

interface MediaItem {
  id: number;
  name: string;
  file_name: string;
  url: string;
  thumb_url: string;
  size: number;
  mime_type: string;
  created_at: string;
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (data: string | number | number[]) => void;
  multiple?: boolean;
  returnType?: 'url' | 'id';
  preSelected?: (string | number)[];
}

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  returnType = 'url',
  preSelected = []
}: MediaLibraryModalProps) {
  const { auth, csrf_token, storageSettings } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const canCreateMedia = hasPermission(permissions, 'create-media');
  const canManageMedia = hasPermission(permissions, 'manage-media');

  const allowedTypes = storageSettings?.allowed_file_types || 'jpg,png,webp,gif';
  const acceptAttribute = allowedTypes.split(',').map((type: string) => `.${type.trim()}`).join(',');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<(string | number)[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(route('api.media.index'), {
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMedia(data);
      setFilteredMedia(data);
    } catch (error) {
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
      setSearchTerm('');
      setSelectedItems(preSelected);
    }
  }, [isOpen, fetchMedia, preSelected]);

  // Filter media based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMedia(media);
    } else {
      const filtered = media.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMedia(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, media]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredMedia.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentMedia = filteredMedia.slice(startIndex, startIndex + itemsPerPage);

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
      return (
        <div className="flex flex-col items-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
            <FileText className="h-8 w-8 text-red-600" />
          </div>
          <span className="text-xs font-medium text-red-600">PDF</span>
        </div>
      );
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <div className="flex flex-col items-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-blue-600">DOC</span>
        </div>
      );
    }
    if (mimeType === 'text/csv' || mimeType.includes('spreadsheet')) {
      return <FileText className="h-12 w-12 text-green-500" />;
    }
    return <File className="h-12 w-12 text-gray-500" />;
  };

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);

    const allowedExtensions = allowedTypes.split(',').map((type: string) => type.trim().toLowerCase());

    const validFiles = Array.from(files).filter(file => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        toast.error(`${file.name} - File type not allowed. Allowed types: ${allowedTypes}`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      setUploading(false);
      return;
    }

    const formData = new FormData();
    validFiles.forEach(file => {
      formData.append('files[]', file);
    });

    try {
      const response = await fetch(route('api.media.batch'), {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: {
          'X-CSRF-TOKEN': csrf_token,
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setMedia(prev => [...result.data, ...prev]);
        toast.success(result.message);
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: string) => toast.error(error));
        }
      } else {
        if (response.status === 403) {
          toast.error(result.message);
        } else if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: string) => toast.error(error));
        } else {
          toast.error(result.message || 'Failed to upload files');
        }
      }
    } catch (error) {
      toast.error('Error uploading files');
    }

    setUploading(false);
    setIsUploadModalOpen(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleSelect = (item: MediaItem) => {
    const value = returnType === 'id' ? item.id : item.url;

    if (multiple) {
      setSelectedItems(prev =>
        prev.includes(value)
          ? prev.filter(selectedValue => selectedValue !== value)
          : [...prev, value]
      );
    } else {
      onSelect(value);
      onClose();
    }
  };

  const handleConfirmSelection = () => {
    if (multiple && selectedItems.length > 0) {
      if (returnType === 'id') {
        onSelect(selectedItems as number[]);
      } else {
        onSelect(selectedItems.join(','));
      }
      onClose();
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Media Library
            {filteredMedia.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filteredMedia.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header with Search and Upload */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search media files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {canCreateMedia && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadModalOpen(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload
              </Button>
            )}
          </div>

          {/* Stats and Selection Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
            <span>
              {filteredMedia.length} files • Page {currentPage} of {totalPages || 1}
            </span>
            {multiple && selectedItems.length > 0 && (
              <Badge variant="default" className="text-xs">
                {selectedItems.length} selected
              </Badge>
            )}
          </div>

          {/* Media Grid */}
          <div className="border rounded-lg bg-muted/10 flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading media...</p>
                </div>
              </div>
            ) : filteredMedia.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="text-center max-w-sm">
                  <div
                    className={`mx-auto w-24 h-24 border-2 border-dashed rounded-xl flex items-center justify-center mb-6 transition-colors ${
                      dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  </div>

                  <div className="space-y-3 mb-6">
                    <h3 className="text-lg font-semibold">No media files found</h3>
                    {searchTerm && (
                      <p className="text-sm text-muted-foreground">
                        No results for <span className="font-medium text-foreground">"${searchTerm}"</span>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {searchTerm ? 'Try a different search term or upload new images' : 'Upload images to get started'}
                    </p>
                  </div>

                  {canCreateMedia && (
                    <Button
                      type="button"
                      onClick={() => setIsUploadModalOpen(true)}
                      disabled={uploading}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Images
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-6 gap-3">
                  {currentMedia.map((item) => (
                    <div
                      key={item.id}
                      className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all hover:scale-105 ${
                        selectedItems.includes(returnType === 'id' ? item.id : item.url)
                          ? 'ring-2 ring-primary shadow-lg'
                          : 'hover:shadow-md border border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleSelect(item)}
                    >
                      <div className="relative aspect-square bg-muted flex items-center justify-center">
                        {item.mime_type.startsWith('image/') ? (
                          <img
                            src={item.thumb_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = item.url;
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4">
                            {getFileIcon(item.mime_type)}
                            <div className="text-xs text-center font-medium text-muted-foreground truncate w-full mt-1">
                              {item.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </div>
                          </div>
                        )}

                        {/* File Type Badge */}
                        <div className="absolute top-1 left-1">
                          <Badge variant="secondary" className="text-xs bg-background/95 px-1 py-0">
                            {item.mime_type.split('/')[1]?.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Selection Indicator */}
                        {selectedItems.includes(returnType === 'id' ? item.id : item.url) && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

                        {/* File Name Tooltip */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs text-white truncate" title={item.name}>
                            {item.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredMedia.length)} of {filteredMedia.length} files
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Upload Modal */}
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Files
                </DialogTitle>
              </DialogHeader>
              <div
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                  dragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className={`transition-all duration-200 ${dragActive ? 'scale-110' : ''}`}>
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Upload className={`h-8 w-8 transition-colors ${dragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                  </div>
                  <h3 className="text-lg font-medium mb-2">
                    {dragActive ? 'Drop files here' : 'Upload your files'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Drag and drop your files here, or click to browse
                  </p>
                  <Input
                    type="file"
                    multiple
                    accept={acceptAttribute}
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Choose Files
                      </>
                    )}
                  </Button>
                </div>
                {dragActive && <div className="absolute inset-0 bg-blue-500/10 rounded-xl" />}
              </div>
            </DialogContent>
          </Dialog>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {multiple && selectedItems.length > 0 && (
                <Button variant="outline" onClick={() => setSelectedItems([])} size="sm">
                  Clear
                </Button>
              )}
              {multiple && selectedItems.length > 0 && (
                <Button onClick={handleConfirmSelection}>
                  Select {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
