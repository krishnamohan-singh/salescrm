<?php

namespace App\Imports;

use App\Models\Lead;
use App\Models\User;
use App\Events\LeadAssigned;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterImport;

class LeadImport implements ToModel, WithHeadingRow, WithEvents
{
    private $addedCount = 0;
    private $skippedCount = 0;
    private $leads = [];
    private $assignedTo = null;

    public function __construct($assignedTo = null)
    {
        $this->assignedTo = $assignedTo;
    }

    public function model(array $row)
    {
        $name = trim((string)($row['name'] ?? ''));
        $email = trim((string)($row['email'] ?? ''));
        $phone = trim((string)($row['phone'] ?? ''));

        // Skip if any mandatory field (name, email, phone) is empty
        if (empty($name) || empty($email) || empty($phone)) {
            $this->skippedCount++;
            return null;
        }

        // Check for duplicate email
        $leadByEmail = Lead::where('email', $email)->where('created_by', createdBy())->first();
        if ($leadByEmail) {
            $this->skippedCount++;
            return null;
        }

        $rowAssignedTo = null;
        if (!empty($row['assigned_to'])) {
            $val = trim((string)$row['assigned_to']);
            if (is_numeric($val)) {
                $rowAssignedTo = (int)$val;
            } else {
                $matchedUser = User::where('created_by', createdBy())
                    ->where(function($q) use ($val) {
                        $q->where('email', $val)->orWhere('name', $val);
                    })->first();
                if ($matchedUser) {
                    $rowAssignedTo = $matchedUser->id;
                }
            }
        }

        $assignedToId = $this->assignedTo ? (int)$this->assignedTo : ($rowAssignedTo ?: auth()->id());

        $leadData = [
            'name' => $name,
            'email' => $email,
            'alternate_email' => !empty($row['alternate_email']) ? trim((string)$row['alternate_email']) : (!empty($row['alternate email']) ? trim((string)$row['alternate email']) : null),
            'phone' => $phone,
            'company' => $row['company'] ?? '',
            'account_name' => $row['account_name'] ?? '',
            'website' => $row['website'] ?? '',
            'position' => $row['position'] ?? '',
            'address' => $row['address'] ?? '',
            'notes' => $row['notes'] ?? '',
            'value' => is_numeric($row['value'] ?? null) ? (float)($row['value']) : null,
            'status' => in_array($row['status'] ?? 'active', ['active', 'inactive']) ? ($row['status'] ?? 'active') : 'active',
            'is_converted' => false,
            'created_by' => createdBy(),
            'creator_id' => auth()->id() ?? createdBy(),
            'assigned_to' => $assignedToId,
        ];

        // Lead Status
        $leadStatusValue = trim($row['lead_status'] ?? '');
        $leadStatus = !empty($leadStatusValue)
            ? \App\Models\LeadStatus::where('name', $leadStatusValue)->where('created_by', createdBy())->first()
            : null;
        $leadData['lead_status_id'] = $leadStatus?->id ?? \App\Models\LeadStatus::where('created_by', createdBy())->value('id');

        // Lead Source
        $leadSourceValue = trim($row['lead_source'] ?? '');
        $leadSource = !empty($leadSourceValue)
            ? \App\Models\LeadSource::where('name', $leadSourceValue)->where('created_by', createdBy())->first()
            : null;
        $leadData['lead_source_id'] = $leadSource?->id ?? \App\Models\LeadSource::where('created_by', createdBy())->value('id');

        // Account Industry
        $accountIndustryValue = trim($row['account_industry'] ?? '');
        $accountIndustry = !empty($accountIndustryValue)
            ? \App\Models\AccountIndustry::where('name', $accountIndustryValue)->where('created_by', createdBy())->first()
            : null;
        $leadData['account_industry_id'] = $accountIndustry?->id ?? \App\Models\AccountIndustry::where('created_by', createdBy())->value('id');

        // Campaign
        $campaignValue = trim($row['campaign'] ?? '');
        if (!empty($campaignValue)) {
            $campaign = \App\Models\Campaign::where('name', $campaignValue)->where('created_by', createdBy())->first();
            $leadData['campaign_id'] = $campaign?->id ?? \App\Models\Campaign::where('created_by', createdBy())->value('id');
        } else {
            $leadData['campaign_id'] = null;
        }

        $this->addedCount++;
        array_push($this->leads, $leadData['email']);
        return new Lead($leadData);
    }

    public function registerEvents(): array
    {
        return [
            AfterImport::class => function(AfterImport $event) {
                // Fire LeadAssigned event for all imported leads
                if (!IsDemo()) {
                    Lead::where('created_by', createdBy())
                        ->whereIn('email', $this->leads)
                        ->orderBy('id', 'desc')
                        ->take($this->addedCount)
                        ->get()
                        ->each(function($lead) {
                            if ($lead->assigned_to) {
                                event(new LeadAssigned($lead));
                            }
                        });
                }
            },
        ];
    }

    public function getAddedCount()
    {
        return $this->addedCount;
    }

    public function getSkippedCount()
    {
        return $this->skippedCount;
    }
}
