'use client'

import { useState } from 'react'
import { useAdminStats } from '@/hooks/useAdminStats'
import { useAdminActivity } from '@/hooks/useAdminActivity'
import { useAdminRecentActivity } from '@/hooks/useAdminRecentActivity'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Users, FileText, Layers, Flag, TrendingUp, UserPlus, AlertTriangle } from 'lucide-react'
import { AdminStats } from '@/interfaces/adminStats'
import { AdminRecentEvent } from '@/interfaces/adminRecentEvent'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ─── Utilitaire temps relatif ─────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'à l\'instant'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const KPI_ACCENT = {
  Utilisateurs: '#6366f1',
  Posts:        '#10b981',
  Groupes:      '#f59e0b',
  'Reports en attente': '#f43f5e',
} as const

function KpiCard({
  title,
  value,
  weeklyDelta,
  icon: Icon,
  isLoading,
}: {
  title: string
  value: number
  weeklyDelta: number
  icon: React.ElementType
  isLoading: boolean
}) {
  const accent = KPI_ACCENT[title as keyof typeof KPI_ACCENT] ?? '#6366f1'

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <div className="h-0.5 w-full" style={{ background: accent }} />
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-9 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="h-0.5 w-full" style={{ background: accent }} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${accent}18` }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold font-mono tabular-nums leading-none">
          {value.toLocaleString('fr-FR')}
        </p>
        <div className="flex items-center gap-1 mt-2">
          {weeklyDelta > 0 && (
            <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
          )}
          <p className="text-xs text-muted-foreground">
            +{weeklyDelta} cette semaine
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Graphique d'activité ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry: { color: string; name: string; value: number }, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-foreground">
            {entry.name === 'newUsers' ? 'Utilisateurs' : 'Posts'} :{' '}
            <span className="font-semibold font-mono">{entry.value}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

function ActivityChart() {
  const [days, setDays] = useState<7 | 14 | 30>(30)
  const { activity, isLoading } = useAdminActivity(days)

  const filterOptions = [
    { label: '7j', value: 7 },
    { label: '14j', value: 14 },
    { label: '30j', value: 30 },
  ] as const

  const formatDate = (dateStr: string) => {
    const [, month, day] = dateStr.split('-')
    return `${day}/${month}`
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">Activité journalière</CardTitle>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {filterOptions.map(({ label, value }) => (
            <Button
              key={value}
              variant={days === value ? 'default' : 'ghost'}
              size="sm"
              className="h-6 px-2.5 text-xs rounded-md"
              onClick={() => setDays(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={activity} margin={{ top: 5, right: 4, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value) => value === 'newUsers' ? 'Utilisateurs' : 'Posts'}
              />
              <Line
                type="monotone"
                dataKey="newUsers"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="newPosts"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Top 5 groupes actifs ──────────────────────────────────────────────────────

function TopGroupsCard({
  groups,
  isLoading,
}: {
  groups: AdminStats['topGroups']
  isLoading: boolean
}) {
  const maxPosts = groups.reduce((m, g) => Math.max(m, g.postCountThisMonth), 1)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Top groupes ce mois</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))
        ) : groups.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Aucune activité ce mois</p>
        ) : (
          groups.map((group, index) => (
            <div key={group.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-bold w-4 shrink-0 text-center ${
                    index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-400' : index === 2 ? 'text-orange-600' : 'text-muted-foreground'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium truncate">{group.name}</span>
                </div>
                <div className="flex items-center gap-2.5 shrink-0 text-[10px] text-muted-foreground">
                  <span>{group.memberCount}m</span>
                  <span className="font-semibold text-foreground font-mono">
                    {group.postCountThisMonth}p
                  </span>
                </div>
              </div>
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(group.postCountThisMonth / maxPosts) * 100}%`,
                    background: index === 0 ? '#6366f1' : 'var(--color-muted-foreground)',
                    opacity: index === 0 ? 1 : 0.4 + (4 - index) * 0.1,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ─── Fil d'activité récente ────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, {
  icon: React.ElementType
  label: (e: AdminRecentEvent) => string
  color: string
  bg: string
}> = {
  new_user: {
    icon: UserPlus,
    label: (e) => `Nouvel utilisateur : ${e.actor}`,
    color: '#6366f1',
    bg: '#6366f118',
  },
  new_post: {
    icon: FileText,
    label: (e) => `Nouveau post par ${e.actor}`,
    color: '#10b981',
    bg: '#10b98118',
  },
  new_report: {
    icon: AlertTriangle,
    label: (e) => `Report signalé par ${e.actor}`,
    color: '#f43f5e',
    bg: '#f43f5e18',
  },
}

const EVENT_FALLBACK = {
  icon: Flag,
  label: (e: AdminRecentEvent) => `Événement : ${e.actor}`,
  color: '#64748b',
  bg: '#64748b18',
}

function RecentActivityFeed() {
  const { events, isLoading } = useAdminRecentActivity()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Aucune activité récente</p>
        ) : (
          <div className="space-y-2.5">
            {events.map((event, i) => {
              const config = EVENT_CONFIG[event.type] ?? EVENT_FALLBACK
              const Icon = config.icon

              return (
                <div
                  key={`${event.type}-${event.actor}-${event.createdAt}-${i}`}
                  className="flex items-start gap-3 py-1.5 border-b border-border/50 last:border-0 animate-fade-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5"
                    style={{ background: config.bg }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight">{config.label(event)}</p>
                    {event.excerpt && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 italic">
                        {event.excerpt}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">{timeAgo(event.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { stats, isLoading } = useAdminStats()

  const kpis = [
    {
      title: 'Utilisateurs',
      value: stats?.totalUsers ?? 0,
      weeklyDelta: stats?.newUsersThisWeek ?? 0,
      icon: Users,
    },
    {
      title: 'Posts',
      value: stats?.totalPosts ?? 0,
      weeklyDelta: stats?.newPostsThisWeek ?? 0,
      icon: FileText,
    },
    {
      title: 'Groupes',
      value: stats?.totalGroups ?? 0,
      weeklyDelta: 0,
      icon: Layers,
    },
    {
      title: 'Reports en attente',
      value: stats?.pendingReportsCount ?? 0,
      weeklyDelta: 0,
      icon: Flag,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vue d&apos;ensemble du réseau World of Code
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 bg-muted/30">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          En ligne
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div key={kpi.title} className={`animate-fade-up stagger-${i + 1}`}>
            <KpiCard {...kpi} isLoading={isLoading} />
          </div>
        ))}
      </div>

      {/* Graphique + Top groupes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-fade-up stagger-3">
          <ActivityChart />
        </div>
        <div className="animate-fade-up stagger-4">
          <TopGroupsCard groups={stats?.topGroups ?? []} isLoading={isLoading} />
        </div>
      </div>

      {/* Activité récente */}
      <div className="animate-fade-up stagger-5">
        <RecentActivityFeed />
      </div>
    </div>
  )
}
