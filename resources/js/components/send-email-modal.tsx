import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, Loader2, Sparkles, Building, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { router } from '@inertiajs/react';

export interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientEmail: string;
  recipientName?: string;
  entityType: 'lead' | 'contact' | 'account' | 'opportunity';
  entityId: number | string;
  entityName?: string;
}

export function SendEmailModal({
  isOpen,
  onClose,
  recipientEmail,
  recipientName,
  entityType,
  entityId,
  entityName,
}: SendEmailModalProps) {
  const { t } = useTranslation();

  const [to, setTo] = useState(recipientEmail || '');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Keep `to` synchronized if recipientEmail changes
  React.useEffect(() => {
    if (recipientEmail) {
      setTo(recipientEmail);
    }
  }, [recipientEmail]);

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

    setIsSending(true);

    const payload: any = {
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
    };

    if (entityType === 'lead') payload.lead_id = entityId;
    if (entityType === 'contact') payload.contact_id = entityId;
    if (entityType === 'account') payload.account_id = entityId;
    if (entityType === 'opportunity') payload.opportunity_id = entityId;

    router.post(route('google-mail.send'), payload, {
      preserveScroll: true,
      onSuccess: () => {
        setIsSending(false);
        toast.success(t('Email sent and captured in timeline successfully!'));
        setSubject('');
        setBody('');
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">{t('Compose & Send Email')}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('Sends via connected Google Mail (or SMTP) and automatically captures to the CRM timeline.')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Target Entity info banner */}
          {entityName && (
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-muted/40 border border-border">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {t('Recipient')}: <strong className="text-foreground">{recipientName || entityName}</strong>
              </span>
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                {t(entityType)}
              </span>
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
              placeholder="contact@company.com"
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
              placeholder={t('Discussion regarding proposal & next steps...')}
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
              className="resize-y text-sm"
              required
              disabled={isSending}
            />
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
              className="gap-2"
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
