import { PageTemplate } from '@/components/page-template';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Briefcase, Play, CheckCircle, Percent } from 'lucide-react';
import { ReportFilters } from '@/components/reports/report-filters';
import { SummaryCards } from '@/components/reports/summary-cards';
import { ChartCard } from '@/components/reports/chart-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function ProjectReports() {
  const { t } = useTranslation();
  const { filters, summary, monthlyData, dailyData, projectsByStatus } = usePage().props as any;
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('monthly');

  const chartData = chartView === 'daily' ? dailyData : monthlyData;

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Reports'), href: '#' },
    { title: t('Project Reports') }
  ];

  const summaryCards = [
    {
      title: t('Total Projects'),
      value: summary.total_projects.toLocaleString(),
      icon: <Briefcase className="h-6 w-6 text-blue-600" />,
      iconColor: 'bg-blue-100'
    },
    {
      title: t('Active Projects'),
      value: summary.active_projects.toLocaleString(),
      icon: <Play className="h-6 w-6 text-green-600" />,
      iconColor: 'bg-green-100'
    },
    {
      title: t('Completed Projects'),
      value: summary.completed_projects.toLocaleString(),
      icon: <CheckCircle className="h-6 w-6 text-purple-600" />,
      iconColor: 'bg-purple-100'
    },
    {
      title: t('Completion Rate'),
      value: `${summary.completion_rate.toFixed(2)}%`,
      icon: <Percent className="h-6 w-6 text-orange-600" />,
      iconColor: 'bg-orange-100'
    }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <PageTemplate title={t("Project Reports")} 
    description={t("View and analyze project reports to track performance and progress.")}
    url="/reports/projects" breadcrumbs={breadcrumbs} noPadding>
       <SummaryCards cards={summaryCards} />
      <ReportFilters filters={filters} />

     

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title={t('Project Trend')}
          actions={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={chartView === 'daily' ? 'default' : 'outline'}
                onClick={() => setChartView('daily')}
              >
                {t('Daily')}
              </Button>
              <Button
                size="sm"
                variant={chartView === 'monthly' ? 'default' : 'outline'}
                onClick={() => setChartView('monthly')}
              >
                {t('Monthly')}
              </Button>
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('Projects by Status')}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percent, total }) => {
                  const statusLabels: { [key: string]: string } = {
                    'active': t('Active'),
                    'completed': t('Completed'),
                    'on_hold': t('On Hold'),
                    'inactive': t('Inactive')
                  };
                  const label = statusLabels[status] || status;
                  return `${label} ${(percent * 100).toFixed(0)}% (${total})`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="total"
              >
                {projectsByStatus.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name, props) => {
                  const statusLabels: { [key: string]: string } = {
                    'active': t('Active'),
                    'completed': t('Completed'),
                    'on_hold': t('On Hold'),
                    'inactive': t('Inactive')
                  };
                  const label = statusLabels[props.payload.status] || props.payload.status;
                  return [value, label];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </PageTemplate>
  );
}
