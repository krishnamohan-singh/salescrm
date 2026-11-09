@extends('emails.layout')

@section('title', 'Daily Sales Work Report - ' . ($dayPlan->user->name ?? 'Sales Representative'))

@section('styles')
<style>
    .report-card {
        background: #ffffff;
        margin: 0;
        padding: 0;
    }
    .badge {
        display: inline-block;
        padding: 5px 12px;
        font-size: 11px;
        font-weight: 700;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .badge-completed { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-submitted { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
    .badge-in_progress { background: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
    .badge-draft { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .badge-reviewed { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }

    .stats-table {
        width: 100%;
        border-collapse: collapse;
        margin: 14px 0 20px 0;
    }
    .stats-table th {
        background: #f8fafc;
        text-align: left;
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 700;
        color: #475569;
        border-bottom: 2px solid #e2e8f0;
    }
    .stats-table td {
        padding: 10px 12px;
        font-size: 13px;
        border-bottom: 1px solid #f1f5f9;
        color: #334155;
    }
    .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
        margin-top: 24px;
        margin-bottom: 10px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 6px;
    }
    .content-box {
        background: #f8fafc;
        border-left: 4px solid #3b82f6;
        padding: 12px 16px;
        border-radius: 4px;
        font-size: 13px;
        color: #334155;
        white-space: pre-line;
        line-height: 1.6;
    }
    .achievement-box {
        border-left-color: #10b981;
        background: #f0fdf4;
    }
    .challenge-box {
        border-left-color: #f59e0b;
        background: #fffbeb;
    }
    .next-plan-box {
        border-left-color: #8b5cf6;
        background: #faf5ff;
    }
    .deal-badge {
        background: #ecfdf5;
        color: #047857;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid #a7f3d0;
    }
</style>
@endsection

@section('content')
<div class="report-card">
    {{-- Header Section --}}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; border-bottom: 1px solid #f1f5f9; padding-bottom: 18px;">
        <tr>
            <td style="vertical-align: top;">
                <h1 style="margin: 0 0 6px 0; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                    {{ $dayPlan->user->name ?? 'Sales Representative' }}
                </h1>
                <div style="color: #64748b; font-size: 13px; line-height: 1.6;">
                    <strong>Date:</strong> {{ $dayPlan->plan_date ? $dayPlan->plan_date->format('l, F d, Y') : date('l, F d, Y') }}<br>
                    <strong>Sales Representative:</strong> {{ $dayPlan->user->name ?? 'User' }} &lt;{{ $dayPlan->user->email ?? '-' }}&gt;
                    @if(!empty($managerCcList))
                        <div style="margin-top: 4px; color: #475569; font-size: 12px;">
                            <strong>Manager / Admin in CC:</strong> {{ implode(', ', $managerCcList) }}
                        </div>
                    @endif
                </div>
            </td>
            <td style="text-align: right; vertical-align: top; width: 150px;">
                <span class="badge badge-{{ $dayPlan->status }}">{{ ucfirst(str_replace('_', ' ', $dayPlan->status)) }}</span>
                @if($dayPlan->completion_rate > 0)
                    <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
                        Target Completion:<br><strong style="color: #0f172a; font-size: 14px;">{{ $dayPlan->completion_rate }}%</strong>
                    </div>
                @endif
            </td>
        </tr>
    </table>

    {{-- 4 Metric Scorecards (Email-Safe Table Layout for Gmail / Outlook) --}}
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; border-collapse: separate; margin: 15px 0 20px 0;">
        <tr>
            <!-- Calls Made -->
            <td width="23%" align="center" style="width: 23%; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 8px; vertical-align: middle;">
                <div style="font-size: 24px; font-weight: 800; color: #1d4ed8; line-height: 1.2; margin-bottom: 4px;">
                    {{ $dayPlan->actual_calls ?: ($telemetry['calls_count'] ?? 0) }}
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
                    📞 Calls Made
                </div>
            </td>
            <td width="2%" style="width: 2%;">&nbsp;</td>
            <!-- Meetings Held -->
            <td width="23%" align="center" style="width: 23%; background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 14px 8px; vertical-align: middle;">
                <div style="font-size: 24px; font-weight: 800; color: #7e22ce; line-height: 1.2; margin-bottom: 4px;">
                    {{ $dayPlan->actual_meetings ?: ($telemetry['meetings_count'] ?? 0) }}
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #9333ea; text-transform: uppercase; letter-spacing: 0.5px;">
                    🤝 Meetings Held
                </div>
            </td>
            <td width="2%" style="width: 2%;">&nbsp;</td>
            <!-- Leads Contacted -->
            <td width="23%" align="center" style="width: 23%; background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 14px 8px; vertical-align: middle;">
                <div style="font-size: 24px; font-weight: 800; color: #0f766e; line-height: 1.2; margin-bottom: 4px;">
                    {{ $dayPlan->actual_leads ?: ($telemetry['leads_contacted'] ?? 0) }}
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #0d9488; text-transform: uppercase; letter-spacing: 0.5px;">
                    🎯 Leads Contacted
                </div>
            </td>
            <td width="2%" style="width: 2%;">&nbsp;</td>
            <!-- Won Revenue -->
            <td width="25%" align="center" style="width: 25%; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 8px; vertical-align: middle;">
                <div style="font-size: 22px; font-weight: 800; color: #15803d; line-height: 1.2; margin-bottom: 4px;">
                    {{ number_format((float) ($dayPlan->actual_sales_amount ?: ($telemetry['opportunities_won_amount'] ?? 0)), 2) }}
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px;">
                    💰 Won Revenue
                </div>
            </td>
        </tr>
    </table>

    {{-- Attendance & Working Hours (Timezone Aware - Indian / Kolkata) --}}
    @if(!empty($telemetry['attendance']))
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width: 100%; background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; border-radius: 6px; margin: 15px 0 22px 0;">
        <tr>
            <td style="padding: 12px 16px; font-size: 13px; color: #334155;">
                <strong style="color: #0369a1;">🕒 Working Hours:</strong>
                @if(!empty($telemetry['attendance']['formatted_clock_in']))
                    &nbsp;Clock-in: <strong style="color: #0f172a;">{{ $telemetry['attendance']['formatted_clock_in'] }}</strong>
                @elseif(!empty($telemetry['attendance']['clock_in']))
                    &nbsp;Clock-in: <strong style="color: #0f172a;">{{ \Carbon\Carbon::parse($telemetry['attendance']['clock_in'])->timezone($telemetry['timezone'] ?? 'Asia/Kolkata')->format('g:i A') }}</strong>
                @endif
                @if(!empty($telemetry['attendance']['formatted_clock_out']))
                    &nbsp;|&nbsp;Clock-out: <strong style="color: #0f172a;">{{ $telemetry['attendance']['formatted_clock_out'] }}</strong>
                @elseif(!empty($telemetry['attendance']['clock_out']))
                    &nbsp;|&nbsp;Clock-out: <strong style="color: #0f172a;">{{ \Carbon\Carbon::parse($telemetry['attendance']['clock_out'])->timezone($telemetry['timezone'] ?? 'Asia/Kolkata')->format('g:i A') }}</strong>
                @endif
                @if(!empty($telemetry['attendance']['active_hours']))
                    &nbsp;|&nbsp;Total Time: <strong style="color: #0f172a;">{{ $telemetry['attendance']['active_hours'] }} hrs</strong>
                @endif
                <span style="display: inline-block; margin-left: 8px; font-size: 11px; color: #64748b; background-color: #e2e8f0; padding: 2px 7px; border-radius: 4px; font-weight: 600;">
                    {{ $telemetry['timezone'] ?? 'Asia/Kolkata' }}
                </span>
            </td>
        </tr>
    </table>
    @endif

    {{-- Targets vs Actuals Table (if targets were planned) --}}
    @if($dayPlan->target_calls > 0 || $dayPlan->target_meetings > 0 || $dayPlan->target_sales_amount > 0 || $dayPlan->target_leads > 0)
        <div class="section-title">📊 Planned Targets vs. Actual Results</div>
        <table class="stats-table" role="presentation" border="0" cellpadding="0" cellspacing="0">
            <thead>
                <tr>
                    <th>Activity Metric</th>
                    <th style="text-align: center;">Target Planned</th>
                    <th style="text-align: center;">Actual Achieved</th>
                    <th style="text-align: right;">Progress</th>
                </tr>
            </thead>
            <tbody>
                @if($dayPlan->target_calls > 0 || $dayPlan->actual_calls > 0)
                <tr>
                    <td><strong>Calls / Outreach</strong></td>
                    <td style="text-align: center;">{{ $dayPlan->target_calls }}</td>
                    <td style="text-align: center; color: {{ $dayPlan->actual_calls >= $dayPlan->target_calls ? '#15803d' : '#334155' }}; font-weight: 700;">
                        {{ $dayPlan->actual_calls }}
                    </td>
                    <td style="text-align: right; font-weight: 700; color: {{ $dayPlan->calls_completion_rate >= 100 ? '#15803d' : '#475569' }};">
                        {{ $dayPlan->calls_completion_rate }}%
                    </td>
                </tr>
                @endif
                @if($dayPlan->target_meetings > 0 || $dayPlan->actual_meetings > 0)
                <tr>
                    <td><strong>Meetings / Client Visits</strong></td>
                    <td style="text-align: center;">{{ $dayPlan->target_meetings }}</td>
                    <td style="text-align: center; color: {{ $dayPlan->actual_meetings >= $dayPlan->target_meetings ? '#15803d' : '#334155' }}; font-weight: 700;">
                        {{ $dayPlan->actual_meetings }}
                    </td>
                    <td style="text-align: right; font-weight: 700; color: {{ $dayPlan->meetings_completion_rate >= 100 ? '#15803d' : '#475569' }};">
                        {{ $dayPlan->meetings_completion_rate }}%
                    </td>
                </tr>
                @endif
                @if($dayPlan->target_leads > 0 || $dayPlan->actual_leads > 0)
                <tr>
                    <td><strong>Leads Contacted / Handled</strong></td>
                    <td style="text-align: center;">{{ $dayPlan->target_leads }}</td>
                    <td style="text-align: center; font-weight: 700;">
                        {{ $dayPlan->actual_leads }}
                    </td>
                    <td style="text-align: right; font-weight: 700;">
                        {{ $dayPlan->target_leads > 0 ? min(150, round(($dayPlan->actual_leads / $dayPlan->target_leads) * 100)) : ($dayPlan->actual_leads > 0 ? 100 : 0) }}%
                    </td>
                </tr>
                @endif
                @if($dayPlan->target_sales_amount > 0 || $dayPlan->actual_sales_amount > 0)
                <tr>
                    <td><strong>Sales / Won Revenue</strong></td>
                    <td style="text-align: center;">{{ number_format($dayPlan->target_sales_amount, 2) }}</td>
                    <td style="text-align: center; color: {{ $dayPlan->actual_sales_amount >= $dayPlan->target_sales_amount ? '#15803d' : '#334155' }}; font-weight: 700;">
                        {{ number_format($dayPlan->actual_sales_amount, 2) }}
                    </td>
                    <td style="text-align: right; font-weight: 700; color: {{ $dayPlan->sales_completion_rate >= 100 ? '#15803d' : '#475569' }};">
                        {{ $dayPlan->sales_completion_rate }}%
                    </td>
                </tr>
                @endif
            </tbody>
        </table>
    @endif

    {{-- Won Deals Highlight --}}
    @if(!empty($telemetry['deals_won_list']) && count($telemetry['deals_won_list']) > 0)
        <div class="section-title">🏆 Deals Won Today</div>
        <table class="stats-table" role="presentation" border="0" cellpadding="0" cellspacing="0">
            <thead>
                <tr>
                    <th>Opportunity / Deal Name</th>
                    <th>Account / Client</th>
                    <th style="text-align: right;">Won Value</th>
                </tr>
            </thead>
            <tbody>
                @foreach($telemetry['deals_won_list'] as $deal)
                <tr>
                    <td><strong>{{ $deal['name'] }}</strong></td>
                    <td>{{ $deal['account_name'] }}</td>
                    <td style="text-align: right;">
                        <span class="deal-badge">{{ number_format($deal['amount'], 2) }}</span>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- Contacted Leads Highlight --}}
    @if(!empty($telemetry['leads_contacted_list']) && count($telemetry['leads_contacted_list']) > 0)
        <div class="section-title">🎯 Leads Engaged & Contacted Today</div>
        <table class="stats-table" role="presentation" border="0" cellpadding="0" cellspacing="0">
            <thead>
                <tr>
                    <th>Lead Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                </tr>
            </thead>
            <tbody>
                @foreach($telemetry['leads_contacted_list'] as $ld)
                <tr>
                    <td><strong>{{ $ld['name'] }}</strong></td>
                    <td>{{ $ld['phone'] ?? '-' }}</td>
                    <td>{{ $ld['email'] ?? '-' }}</td>
                </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- Follow-ups & Tasks Summary --}}
    @if(($telemetry['tasks_completed'] ?? 0) > 0 || ($telemetry['tasks_pending'] ?? 0) > 0)
        <div style="font-size: 13px; color: #475569; margin: 15px 0; padding: 12px 14px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 6px;">
            📌 <strong>Tasks Summary:</strong>
            <span style="color: #16a34a; font-weight: 700; margin-left: 6px;">{{ $telemetry['tasks_completed'] ?? 0 }} task(s) completed</span>
            <span style="margin: 0 6px; color: #cbd5e1;">|</span>
            <span style="color: #dc2626; font-weight: 700;">{{ $telemetry['tasks_pending'] ?? 0 }} pending/due task(s)</span>
        </div>
    @endif

    {{-- Planned Activities --}}
    @if(!empty($dayPlan->planned_activities))
        <div class="section-title">📋 Planned Activities</div>
        <div class="content-box">{{ $dayPlan->planned_activities }}</div>
    @endif

    {{-- End of Day Achievements --}}
    @if(!empty($dayPlan->achievements_summary))
        <div class="section-title">✅ End of Day Achievements & Summary</div>
        <div class="content-box achievement-box">{{ $dayPlan->achievements_summary }}</div>
    @endif

    {{-- Challenges / Roadblocks --}}
    @if(!empty($dayPlan->challenges_notes))
        <div class="section-title">⚠️ Roadblocks / Challenges Encountered</div>
        <div class="content-box challenge-box">{{ $dayPlan->challenges_notes }}</div>
    @endif

    {{-- Priorities for Tomorrow --}}
    @if(!empty($dayPlan->next_day_plan))
        <div class="section-title">🎯 Plan & Priorities for Tomorrow</div>
        <div class="content-box next-plan-box">{{ $dayPlan->next_day_plan }}</div>
    @endif

    {{-- Manager Feedback --}}
    @if(!empty($dayPlan->manager_feedback))
        <div class="section-title">💬 Manager Review & Feedback</div>
        <div class="content-box" style="border-left-color: #6366f1; background: #eef2ff;">
            {{ $dayPlan->manager_feedback }}
            @if($dayPlan->reviewer)
                <div style="margin-top: 8px; font-size: 11px; color: #4338ca; font-weight: 600;">
                    — Reviewed by {{ $dayPlan->reviewer->name }} on {{ $dayPlan->reviewed_at ? $dayPlan->reviewed_at->format('M d, Y H:i') : '' }}
                </div>
            @endif
        </div>
    @endif

    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
        This automated daily work report was generated by {{ $companyName }}. Sales representatives can review their daily records anytime in the CRM.
    </div>
</div>
@endsection

