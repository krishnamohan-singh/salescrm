import { useEffect, useRef, useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { PageTemplate } from '@/components/page-template'
import { Input } from '@/components/ui/input'
import { CrudTable } from '@/components/CrudTable'
import { Pagination } from '@/components/ui/pagination'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface NotificationTemplate {
  id: number;
  name: string;
  type: string;
  created_at: string;
  notification_template_langs: Array<{
    lang: string;
    title: string;
    content: string;
  }>;
}

interface Props {
  templates: {
    data: NotificationTemplate[]
    from: number
    to: number
    total: number
    links: Array<{
      url: string | null
      label: string
      active: boolean
    }>
  }
  filters: {
    search?: string
    sort_field?: string
    sort_direction?: string
    per_page?: number
    type?: string
  }
}

export default function NotificationTemplatesIndex({ templates, filters: pageFilters = {} }: Props) {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '')
  const [activeType, setActiveType] = useState(pageFilters.type || 'slack')

  const formRef = useRef<HTMLFormElement>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    const timer = setTimeout(() => formRef.current?.requestSubmit(), 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    applyFilters()
  }

  const applyFilters = () => {
    router.get(route('notification-templates.index'), {
      page: 1,
      search: searchTerm || undefined,
      type: activeType,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true })
  }

  const handleTypeChange = (type: string) => {
    setActiveType(type)
    router.get(route('notification-templates.index'), {
      page: 1,
      search: searchTerm || undefined,
      type,
      ...(pageFilters.sort_field && { sort_field: pageFilters.sort_field, sort_direction: pageFilters.sort_direction }),
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true })
  }

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field
      ? (pageFilters.sort_direction === 'asc' ? 'desc' : 'asc')
      : 'asc'
    router.get(route('notification-templates.index'), {
      sort_field: field,
      sort_direction: direction,
      page: 1,
      search: searchTerm || undefined,
      type: activeType,
      ...(pageFilters.per_page && { per_page: pageFilters.per_page }),
    }, { preserveState: true, preserveScroll: true })
  }

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Notification Templates') }
  ]

  const columns = [
    { key: 'name', label: t('Name'), sortable: true },
  ]

  const actions = [
    { label: t('View'), icon: 'Eye', action: 'view', className: 'text-blue-500' },
  ]

  return (
    <PageTemplate
      title={t('Notification Templates')}
      description={t('Manage your notification templates.')}
      url={route('notification-templates.index')}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <Head title={t('Notification Templates')} />

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4 border">
        <div className="w-full p-3">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <form ref={formRef} onSubmit={handleSearch}>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Search...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-9 h-8"
                />
                {searchTerm && (
                  <X
                    className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground cursor-pointer"
                    onClick={() => setSearchTerm('')}
                  />
                )}
              </div>
            </form>

            <div className="border rounded-md p-0.5 mr-2">
              <Tabs value={activeType} onValueChange={handleTypeChange}>
                <TabsList className="grid w-fit grid-cols-2">
                  <TabsTrigger value="slack" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">Slack</TabsTrigger>
                  <TabsTrigger value="twilio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground cursor-pointer">Twilio</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={templates?.data || []}
          from={templates?.from || 1}
          onAction={(action, item) => { if (action === 'view') router.get(route('notification-templates.show', item.id)) }}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction as 'asc' | 'desc'}
          onSort={handleSort}
          permissions={[]}
          entityPermissions={{ view: '', edit: '', delete: '' }}
        />

        <Pagination
          from={templates?.from || 0}
          to={templates?.to || 0}
          total={templates?.total || 0}
          links={templates?.links}
          entityName={t('templates')}
          currentPerPage={pageFilters.per_page?.toString() || '10'}
          onPerPageChange={(value) => {
            router.get(route('notification-templates.index'), {
              page: 1,
              ...(parseInt(value) !== 10 && { per_page: parseInt(value) }),
              search: searchTerm || undefined,
              type: activeType,
              sort_field: pageFilters.sort_field || undefined,
              sort_direction: pageFilters.sort_direction || undefined,
            }, { preserveState: true, preserveScroll: true })
          }}
          onPageChange={(url) => router.get(url, {}, { preserveState: true, preserveScroll: true })}
        />
      </div>
    </PageTemplate>
  )
}
