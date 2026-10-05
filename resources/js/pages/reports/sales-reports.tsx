import { PageTemplate } from '@/components/page-template';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, ShoppingCart, TrendingUp, Target } from 'lucide-react';
import { ReportFilters } from '@/components/reports/report-filters';
import { SummaryCards } from '@/components/reports/summary-cards';
import { ChartCard } from '@/components/reports/chart-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { formatCurrency } from '@/utils/helper';

export default function SalesReports() {
  const { t } = useTranslation();
  const { filters, summary, monthlyData, dailyData, salesByStatus } = usePage().props as any;
  const [chartView, setChartView] = useState<'daily' | 'monthly'>('monthly');

  const chartData = chartView === 'daily' ? dailyData : monthlyData;

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Reports'), href: '#' },
    { title: t('Sales Reports') }
  ];

  const summaryCards = [
    {
      title: t('Total Sales'),
      value: <span className="font-mono">{formatCurrency(summary.total_sales)}</span>,
      icon: <DollarSign className="h-6 w-6 text-green-600" />,
      iconColor: 'bg-green-100'
    },
    {
      title: t('Total Orders'),
      value: summary.total_orders.toLocaleString(),
      icon: <ShoppingCart className="h-6 w-6 text-blue-600" />,
      iconColor: 'bg-blue-100'
    },
    {
      title: t('Average Order Value'),
      value: <span className="font-mono">{formatCurrency(summary.avg_order_value)}</span>,
      icon: <Target className="h-6 w-6 text-purple-600" />,
      iconColor: 'bg-purple-100'
    },
    {
      title: t('Growth Rate'),
      value: `${summary.growth_rate.toFixed(2)}%`,
      icon: <TrendingUp className="h-6 w-6 text-orange-600" />,
      iconColor: 'bg-orange-100'
    }
  ];

  return (
    <PageTemplate title={t("Sales Reports")} 
    description={t("View and analyze sales reports to track revenue and performance.")}
    url="/reports/sales" breadcrumbs={breadcrumbs} noPadding>
         <SummaryCards cards={summaryCards} />
      <ReportFilters filters={filters} />

   

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title={t('Sales Trend')}
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
              <Tooltip formatter={(value) => [window.appSettings?.formatCurrency(Number(value)) || `$${Number(value).toLocaleString()}`, t('Revenue')]} />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('Sales by Status')}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesByStatus}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip formatter={(value) => [window.appSettings?.formatCurrency(Number(value)) || `$${Number(value).toLocaleString()}`, t('Amount')]} />
              <Bar dataKey="amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </PageTemplate>
  );
}
