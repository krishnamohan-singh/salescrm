<?php

namespace App\Exports;

use App\Models\Project;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProjectExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        $query = Project::with(['account', 'assignedUser'])
            ->where('created_by', createdBy());

        return $query->get();
    }

    public function headings(): array
    {
        return [
            'Name',
            'Code',
            'Description',
            'Account',
            'Start Date',
            'End Date',
            'Budget',
            'Priority',
            'Status',
            'Assigned To',
        ];
    }

    public function map($project): array
    {
        return [
            $project->name,
            $project->code,
            $project->description,
            $project->account->name ?? '',
            $project->start_date?->format('Y-m-d'),
            $project->end_date?->format('Y-m-d'),
            $project->budget,
            ucfirst($project->priority),
            ucfirst($project->status),
            $project->assignedUser->name ?? 'Unassigned',
        ];
    }
}
