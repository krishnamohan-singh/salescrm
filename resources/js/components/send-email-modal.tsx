import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Mail,
  Send,
  Loader2,
  Building,
  User,
  Target,
  Briefcase,
  Link2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Paperclip,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  File,
  Archive,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { router, usePage } from '@inertiajs/react';

export interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail?: string;
  recipientName?: string;
  entityType?: 'lead' | 'contact' | 'account' | 'opportunity' | string;
  entityId?: number | string;
  entityName?: string;
  initialSubject?: string;
  initialBody?: string;
  availableEntities?: {
    leads?: Array<{ id: number | string; name: string; email?: string }>;
    contacts?: Array<{ id: number | string; name: string; email?: string }>;
    accounts?: Array<{ id: number | string; name: string; email?: string }>;
    opportunities?: Array<{ id: number | string; name: string; contact?: any; account?: any }>;
  };
}

export function SendEmailModal({
  isOpen,
  onClose,
  recipientEmail = '',
  recipientName = '',
  entityType = '',
  entityId = '',
  entityName = '',
  initialSubject = '',
  initialBody = '',
  availableEntities,
}: SendEmailModalProps) {
  const { t } = useTranslation();
  const pageProps: any = usePage().props;
  const googleMail = pageProps.googleMail || {};
  const isGoogleConnected = Boolean(googleMail?.isConnected);
  const connectedEmail = googleMail?.connectedEmail || '';

  const [to, setTo] = useState(recipientEmail || '');
  const [subject, setSubject] = useState(initialSubject || '');
  const [body, setBody] = useState(initialBody || '');
  const [isSending, setIsSending] = useState(false);

  // Attachments state (Documents & Media)
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic entity linking when not passed from a parent record
  const [selectedEntityKey, setSelectedEntityKey] = useState<string>('');

  // Synchronize state on prop changes
  useEffect(() => {
    if (recipientEmail) setTo(recipientEmail);
    if (initialSubject) setSubject(initialSubject);
    if (initialBody) setBody(initialBody);
    if (entityType && entityId) {
      setSelectedEntityKey(`${entityType}:${entityId}`);
    } else {
      setSelectedEntityKey('');
    }
    if (!isOpen) {
      setAttachments([]);
      setIsDragging(false);
    }
  }, [recipientEmail, initialSubject, initialBody, entityType, entityId, isOpen]);

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get appropriate file icon
  const getFileIcon = (file: File) => {
    const type = file.type || '';
    const name = file.name.toLowerCase();
    if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(name)) {
      return <ImageIcon className="h-4 w-4 text-purple-500 shrink-0" />;
    }
    if (type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/.test(name)) {
      return <Film className="h-4 w-4 text-blue-500 shrink-0" />;
    }
    if (type === 'application/pdf' || name.endsWith('.pdf')) {
      return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
    }
    if (/\.(doc|docx|txt|rtf|odt)$/.test(name)) {
      return <FileText className="h-4 w-4 text-blue-600 shrink-0" />;
    }
    if (/\.(xls|xlsx|csv)$/.test(name)) {
      return <FileText className="h-4 w-4 text-emerald-600 shrink-0" />;
    }
    if (/\.(zip|tar|gz|rar|7z)$/.test(name)) {
      return <Archive className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    return <File className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  // Handle incoming files
  const handleFilesAdded = (incomingFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    let currentTotalSize = attachments.reduce((sum, f) => sum + f.size, 0);

    Array.from(incomingFiles).forEach((file) => {
      // 25MB max per single file
      if (file.size > 25 * 1024 * 1024) {
        toast.error(t(`File "${file.name}" exceeds the 25MB limit.`));
        return;
      }
      // Check total size
      if (currentTotalSize + file.size > 25 * 1024 * 1024) {
        toast.error(t('Total attachments size cannot exceed 25MB.'));
        return;
      }
      currentTotalSize += file.size;
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setAttachments((prev) => [...prev, ...validFiles]);
    }
  };

  // Remove attachment
  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // When picking an entity from dropdown
  const handleEntitySelection = (value: string) => {
    setSelectedEntityKey(value);
    if (!value) return;

    const [type, id] = value.split(':');
    if (type === 'lead' && availableEntities?.leads) {
      const match = availableEntities.leads.find((l) => String(l.id) === String(id));
      if (match?.email) setTo(match.email);
    } else if (type === 'contact' && availableEntities?.contacts) {
      const match = availableEntities.contacts.find((c) => String(c.id) === String(id));
      if (match?.email) setTo(match.email);
    } else if (type === 'account' && availableEntities?.accounts) {
      const match = availableEntities.accounts.find((a) => String(a.id) === String(id));
      if (match?.email) setTo(match.email);
    } else if (type === 'opportunity' && availableEntities?.opportunities) {
      const match = availableEntities.opportunities.find((o) => String(o.id) === String(id));
      if (match?.contact?.email) setTo(match.contact.email);
      else if (match?.account?.email) setTo(match.account.email);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!to.trim()) {
      toast.error(t('Please enter a recipient email address'));
      return;
    }

    if (!subject.trim()) {
      toast.error(t('Please enter an email subject'));
      return;
    }

    if (!body.trim()) {
      toast.error(t('Please write an email message body'));
      return;
    }

    if (!isGoogleConnected) {
      toast.error(t('Please connect your Google account in Settings to send emails.'));
      return;
    }

    setIsSending(true);

    const formData = new FormData();
    formData.append('to', to.trim());
    formData.append('subject', subject.trim());
    formData.append('body', body.trim());

    // Determine entity link
    let finalType = entityType;
    let finalId = entityId;

    if (!finalType && selectedEntityKey) {
      const [type, id] = selectedEntityKey.split(':');
      finalType = type;
      finalId = id;
    }

    if (finalType === 'lead' && finalId) formData.append('lead_id', String(finalId));
    if (finalType === 'contact' && finalId) formData.append('contact_id', String(finalId));
    if (finalType === 'account' && finalId) formData.append('account_id', String(finalId));
    if (finalType === 'opportunity' && finalId) formData.append('opportunity_id', String(finalId));

    // Append document and media attachments
    attachments.forEach((file) => {
      formData.append('attachments[]', file);
    });

    router.post(route('google-mail.send'), formData, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: (page: any) => {
        setIsSending(false);
        const flashError = page?.props?.flash?.error;
        if (flashError) {
          toast.error(String(flashError));
          return;
        }
        toast.success(page?.props?.flash?.success || t('Email sent via connected Google account and logged to timeline!'));
        setSubject('');
        setBody('');
        setAttachments([]);
        onClose();
      },
      onError: (errors) => {
        setIsSending(false);
        const msg = errors.error || Object.values(errors)[0] || t('Failed to send email');
        toast.error(String(msg));
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-500/10 rounded-lg text-red-600 dark:text-red-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">{t('Compose & Send Email')}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('Sends directly through your connected Google Gmail account with document & media support.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Connected Google Account Sender Banner */}
          {isGoogleConnected ? (
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                {t('Sending from:')} <strong className="text-foreground">{connectedEmail}</strong>
              </span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {t('Google Account')}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{t('Google Mail is not connected yet.')}</span>
              </div>
              <a
                href={route('google-mail.connect')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {t('Connect Google')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Preset Target Entity banner */}
          {entityName && (
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-muted/40 border border-border">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {t('Recipient')}: <strong className="text-foreground">{recipientName || entityName}</strong>
              </span>
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                {t(entityType)}
              </span>
            </div>
          )}

          {/* Optional entity picker if composing from Mailbox page */}
          {!entityName && availableEntities && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                {t('Link to CRM Record')} <span className="text-muted-foreground font-normal">({t('Optional')})</span>
              </Label>
              <select
                value={selectedEntityKey}
                onChange={(e) => handleEntitySelection(e.target.value)}
                disabled={isSending}
                className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">{t('— None (Stand-alone Email) —')}</option>
                {availableEntities.leads && availableEntities.leads.length > 0 && (
                  <optgroup label={t('Leads')}>
                    {availableEntities.leads.map((l) => (
                      <option key={`lead:${l.id}`} value={`lead:${l.id}`}>
                        {l.name} ({l.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {availableEntities.contacts && availableEntities.contacts.length > 0 && (
                  <optgroup label={t('Contacts')}>
                    {availableEntities.contacts.map((c) => (
                      <option key={`contact:${c.id}`} value={`contact:${c.id}`}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {availableEntities.accounts && availableEntities.accounts.length > 0 && (
                  <optgroup label={t('Accounts')}>
                    {availableEntities.accounts.map((a) => (
                      <option key={`account:${a.id}`} value={`account:${a.id}`}>
                        {a.name} ({a.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {availableEntities.opportunities && availableEntities.opportunities.length > 0 && (
                  <optgroup label={t('Opportunities')}>
                    {availableEntities.opportunities.map((o) => (
                      <option key={`opportunity:${o.id}`} value={`opportunity:${o.id}`}>
                        {o.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {/* To field */}
          <div className="space-y-1.5">
            <Label htmlFor="email-to" className="text-xs font-medium">
              {t('To')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              required
              disabled={isSending}
            />
          </div>

          {/* Subject field */}
          <div className="space-y-1.5">
            <Label htmlFor="email-subject" className="text-xs font-medium">
              {t('Subject')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('Follow-up regarding proposal...')}
              required
              disabled={isSending}
            />
          </div>

          {/* Body field */}
          <div className="space-y-1.5">
            <Label htmlFor="email-body" className="text-xs font-medium">
              {t('Message')} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('Write your email message here...')}
              rows={6}
              className="resize-y text-sm leading-relaxed"
              required
              disabled={isSending}
            />
          </div>

          {/* Attachments Section (Documents & Media) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5 text-foreground">
                <Paperclip className="h-3.5 w-3.5 text-primary" />
                {t('Attachments (Documents & Media)')}
              </span>
              {attachments.length > 0 && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  {attachments.length} {attachments.length === 1 ? t('file') : t('files')} (
                  {formatFileSize(attachments.reduce((sum, f) => sum + f.size, 0))} / 25 MB)
                </span>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesAdded(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            {/* Drop / upload zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFilesAdded(e.dataTransfer.files);
                }
              }}
              className={`p-3 rounded-lg border border-dashed transition-all ${
                isDragging
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-border/80 bg-muted/20 hover:bg-muted/40'
              }`}
            >
              {attachments.length === 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-md bg-background border border-border text-muted-foreground shrink-0">
                      <Upload className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {t('Attach documents, images, or media files')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t('PDF, Word, Excel, Images (PNG, JPG), Audio, Video up to 25 MB')}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSending}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 text-xs gap-1.5 shrink-0"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span>{t('Browse Files')}</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {attachments.map((file, idx) => {
                      const isImg = file.type.startsWith('image/');
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-md bg-background border border-border text-xs group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isImg ? (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-6 h-6 rounded object-cover border border-border/50 shrink-0"
                              />
                            ) : (
                              <div className="p-1 rounded bg-muted text-muted-foreground shrink-0">
                                {getFileIcon(file)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate text-foreground">{file.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isSending}
                            onClick={() => handleRemoveAttachment(idx)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            title={t('Remove file')}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSending}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-6 text-[11px] gap-1 text-primary hover:text-primary"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span>{t('Add more files')}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSending}
                      onClick={() => setAttachments([])}
                      className="h-6 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      {t('Clear all')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSending}
            >
              {t('Cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSending}
              className="gap-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-sm"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('Sending...')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {t('Send Email')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SendEmailModal;
