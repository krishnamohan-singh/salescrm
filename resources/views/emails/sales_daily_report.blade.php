@extends('emails.layout')

@section('title', 'Sales Daily Report - ' . ($dayPlan->user->name ?? 'Team Member'))

@section('styles')
<style>
    .report-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
    }
    .badge {
        display: inline-block;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 600;
        border-radius: 4px;
        text-transform: uppercase;
    }
    .badge-completed { background: #dcfce7; color: #15803d; }
    .badge-submitted { background: #e0e7ff; color: #4338ca; }
    .badge-in_progress { background: #fef9c3; color: #854d0e; }
    .badge-draft { background: #f1f5f9; color: #475569; }
    .badge-reviewed { background: #f3e8ff; color: #7e22ce; }
    
    .stats-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
    }
    .stats-table th {
        background: #f8fafc;
        text-align: left;
        padding: 10px 12px;
        font-size: 12px;
        color: #64748b;
        border-bottom: 2px solid #e2e8f0;
    }
    .stats-table td {
        padding: 10px 12px;
        font-size: 13px;
        border-bottom: 1px solid #f1f5f9;
    }
    .section-title {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        margin-top: 20px;
        margin-bottom: 8px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 4px;
    }
    .content-box {
        background: #f8fafc;
        border-left: 3px solid #3b82f6;
        padding: 12px 16px;
        border-radius: 4px;
        font-size: 13px;
        color: #334155;
        white-space: pre-line;
    }
    .achievement-box {
        border-left-color: #10b981;
    }
    .challenge-box {
        border-left-color: #f59e0b;
    }
    .next-plan-box {
        border-left-color: #8b5cf6;
    }
</style>
@endsection

@section('content')
<div class="report-card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <div>
            <h2 style="margin: 0 0 5px 0; color: #0f172a; font-size: 20px;">
                {{ $dayPlan->user->name ?? 'Sales Representative' }}
            </h2>
            <p style="margin: 0; color: #64748b; font-size: 13px;">
                <strong>Date:</strong> {{ $dayPlan->plan_date ? $dayPlan->plan_date->format('l, F d, Y') : date('l, F d, Y') }} | 
                <strong>Email:</strong> {{ $dayPlan->user->email ?? '-' }}
            </p>
        </div>
        <div style="text-align: right; margin-top: 10px;">
            <span class="badge badge-{{ $dayPlan->status }}">{{ ucfirst(str_replace('_', ' ', $dayPlan->status)) }}</span>
            <div style="margin-top: 5px; font-size: 12px; color: #64748b;">
                Overall Completion: <strong>{{ $dayPlan->completion_rate }}%</strong>
            </div>
        </div>
    </div>

    @if(!empty($dayPlan->title))
        <p style="font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 12px;">
            Focus / Title: {{ $dayPlan->title }}
        </p>
    @endif

    <div class="section-title">📊 Key Metrics (Target vs. Actual)</div>
    <table class="stats-table">
        <thead>
            <tr>
                <th>Metric</th>
                <th style="text-align: center;">Target Planned</th>
                <th style="text-align: center;">Actual Achieved</th>
                <th style="text-align: right;">Progress</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Calls / Follow-ups</strong></td>
                <td style="text-align: center;">{{ $dayPlan->target_calls }}</td>
                <td style="text-align: center; color: {{ $dayPlan->actual_calls >= $dayPlan->target_calls ? '#15803d' : '#334155' }};">
                    <strong>{{ $dayPlan->actual_calls }}</strong>
                </td>
                <td style="text-align: right;">
                    <strong>{{ $dayPlan->calls_completion_rate }}%</strong>
                </td>
            </tr>
            <tr>
                <td><strong>Meetings / Visits</strong></td>
                <td style="text-align: center;">{{ $dayPlan->target_meetings }}</td>
                <td style="text-align: center; color: {{ $dayPlan->actual_meetings >= $dayPlan->target_meetings ? '#15803d' : '#334155' }};">
                    <strong>{{ $dayPlan->actual_meetings }}</strong>
                </td>
                <td style="text-align: right;">
                    <strong>{{ $dayPlan->meetings_completion_rate }}%</strong>
                </td>
            </tr>
            <tr>
                <td><strong>Leads Handled / Added</strong></td>
                <td style="text-align: center;">{{ $dayPlan->target_leads }}</td>
                <td style="text-align: center;">
                    <strong>{{ $dayPlan->actual_leads }}</strong>
                </td>
                <td style="text-align: right;">
                    <strong>{{ $dayPlan->target_leads > 0 ? min(100, round(($dayPlan->actual_leads / $dayPlan->target_leads) * 100)) : ($dayPlan->actual_leads > 0 ? 100 : 0) }}%</strong>
                </td>
            </tr>
            <tr>
                <td><strong>Sales / Revenue</strong></td>
                <td style="text-align: center;">{{ number_format($dayPlan->target_sales_amount, 2) }}</td>
                <td style="text-align: center; color: {{ $dayPlan->actual_sales_amount >= $dayPlan->target_sales_amount ? '#15803d' : '#334155' }};">
                    <strong>{{ number_format($dayPlan->actual_sales_amount, 2) }}</strong>
                </td>
                <td style="text-align: right;">
                    <strong>{{ $dayPlan->sales_completion_rate }}%</strong>
                </td>
            </tr>
        </tbody>
    </table>

    @if(!empty($dayPlan->planned_activities))
        <div class="section-title">📋 Planned Activities (Morning Plan)</div>
        <div class="content-box">{{ $dayPlan->planned_activities }}</div>
    @endif

    @if(!empty($dayPlan->achievements_summary))
        <div class="section-title">✅ End of Day Achievements & Summary</div>
        <div class="content-box achievement-box">{{ $dayPlan->achievements_summary }}</div>
    @endif

    @if(!empty($dayPlan->challenges_notes))
        <div class="section-title">⚠️ Roadblocks / Challenges Encountered</div>
        <div class="content-box challenge-box">{{ $dayPlan->challenges_notes }}</div>
    @endif

    @if(!empty($dayPlan->next_day_plan))
        <div class="section-title">🎯 Plan & Priorities for Tomorrow</div>
        <div class="content-box next-plan-box">{{ $dayPlan->next_day_plan }}</div>
    @endif

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
</div>
@endsection
