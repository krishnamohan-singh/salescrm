<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmEmail extends BaseModel
{
    use HasFactory;

    protected $table = 'crm_emails';

    protected $fillable = [
        'created_by',
        'user_id',
        'message_id',
        'thread_id',
        'direction',
        'from_email',
        'from_name',
        'to_emails',
        'cc_emails',
        'bcc_emails',
        'subject',
        'snippet',
        'body_text',
        'body_html',
        'sent_at',
        'lead_id',
        'contact_id',
        'account_id',
        'opportunity_id',
        'has_attachments',
        'attachment_names',
        'raw_headers',
        'source',
    ];

    protected $casts = [
        'to_emails' => 'array',
        'cc_emails' => 'array',
        'bcc_emails' => 'array',
        'attachment_names' => 'array',
        'raw_headers' => 'array',
        'has_attachments' => 'boolean',
        'sent_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
