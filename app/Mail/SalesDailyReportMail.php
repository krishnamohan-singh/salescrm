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
    public string $companyName;
    public ?string $managerNotes;

    /**
     * Create a new message instance.
     */
    public function __construct(SalesDayPlan $dayPlan, ?string $managerNotes = null)
    {
        $this->dayPlan = $dayPlan->load(['user', 'creator', 'reviewer']);
        $this->companyName = function_exists('getCompanyName') ? getCompanyName() : config('app.name');
        $this->managerNotes = $managerNotes;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $userName = $this->dayPlan->user?->name ?? 'Team Member';
        $formattedDate = $this->dayPlan->plan_date ? $this->dayPlan->plan_date->format('M d, Y') : date('M d, Y');
        $subject = "Daily Sales Report: {$userName} - {$formattedDate} [{$this->companyName}]";

        return $this->subject($subject)
                    ->view('emails.sales_daily_report')
                    ->with([
                        'dayPlan' => $this->dayPlan,
                        'user' => $this->dayPlan->user,
                        'companyName' => $this->companyName,
                        'managerNotes' => $this->managerNotes,
                    ]);
    }
}
