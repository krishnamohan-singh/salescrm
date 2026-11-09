<?php

namespace App\Mail;

use App\Models\SalesDayPlan;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SalesDailyReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public SalesDayPlan $dayPlan;
    public int $companyId;
    public string $companyName;
    public ?string $companyLogo;
    public ?string $managerNotes;
    public array $managerCcList;
    public array $telemetry;

    /**
     * Create a new message instance.
     */
    public function __construct(SalesDayPlan $dayPlan, ?string $managerNotes = null, array $managerCcList = [], array $telemetry = [])
    {
        $this->dayPlan = $dayPlan->loadMissing(['user', 'creator', 'reviewer']);
        $companyId = (int) ($this->dayPlan->created_by ?: ($this->dayPlan->user?->created_by ?: 1));
        $company = \App\Models\User::find($companyId);

        $this->companyId = $companyId;
        $this->companyName = $company?->name ?? (function_exists('getCompanyName') ? getCompanyName($companyId) : config('app.name'));
        $this->companyLogo = function_exists('getCompanyLogoUrl') ? getCompanyLogoUrl($companyId) : null;
        $this->managerNotes = $managerNotes;
        $this->managerCcList = $managerCcList;
        $this->telemetry = $telemetry;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $userName = $this->dayPlan->user?->name ?? 'Team Member';
        $formattedDate = $this->dayPlan->plan_date ? $this->dayPlan->plan_date->format('M d, Y') : date('M d, Y');
        $subject = "Daily Sales Work Report: {$userName} - {$formattedDate} [{$this->companyName}]";

        return $this->subject($subject)
                    ->view('emails.sales_daily_report')
                    ->with([
                        'dayPlan' => $this->dayPlan,
                        'user' => $this->dayPlan->user,
                        'companyId' => $this->companyId,
                        'companyName' => $this->companyName,
                        'companyLogo' => $this->companyLogo,
                        'managerNotes' => $this->managerNotes,
                        'managerCcList' => $this->managerCcList,
                        'telemetry' => $this->telemetry,
                    ]);
    }
}
