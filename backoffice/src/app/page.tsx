'use client'

import { useState } from 'react'
import { useAdminStats } from '@/hooks/useAdminStats'
import { useAdminActivity } from '@/hooks/useAdminActivity'
import { useAdminRecentActivity } from '@/hooks/useAdminRecentActivity'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Users, FileText, Layers, Flag } from 'lucide-react'
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

// ─── Utilitaire temps relatif ────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'il y a quelques secondes'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

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
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-5 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value.toLocaleString('fr-FR')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          +{weeklyDelta} cette semaine
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Graphique d'activité ────────────────────────────────────────────────────

function ActivityChart() {
  const [days, setDays] = useState<7 | 14 | 30>(30)
  const { activity, isLoading } = useAdminActivity(days)

  const filterOptions = [
    { label: '7 jours', value: 7 },
    { label: '14 jours', value: 14 },
    { label: '30 jours', value: 30 },
  ] as const

  const formatDate = (dateStr: string) => {
    const [, month, day] = dateStr.split('-')
    return `${day}/${month}`
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Activité journalière</CardTitle>
        <div className="flex gap-1">
          {filterOptions.map(({ label, value }) => (
            <Button
              key={value}
              variant={days === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={activity} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(value, name) => [
                  value,
                  name === 'newUsers' ? 'Nouveaux utilisateurs' : 'Nouveaux posts',
                ]}
                labelFormatter={(label) => `Date : ${label}`}
              />
              <Legend
                formatter={(value) =>
                  value === 'newUsers' ? 'Utilisateurs' : 'Posts'
                }
              />
              <Line
                type="monotone"
                dataKey="newUsers"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="newPosts"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Top 5 groupes actifs ────────────────────────────────────────────────────

function TopGroupsCard({
  groups,
  isLoading,
}: {
  groups: AdminStats['topGroups']
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Top 5 groupes actifs ce mois</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune activité ce mois
          </p>
        ) : (
          groups.map((group, index) => (
            <div
              key={group.id}
              className="flex items-center justify-between py-1 border-b last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">
                  {index + 1}
                </span>
                <span className="text-sm font-medium truncate max-w-[180px]">
                  {group.name}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground shrink-0">
                <span>{group.memberCount} membre{group.memberCount !== 1 ? 's' : ''}</span>
                <span className="font-medium text-foreground">
                  {group.postCountThisMonth} post{group.postCountThisMonth !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

// ─── Fil d'activité récente ──────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, { icon: React.ElementType; label: (e: AdminRecentEvent) => string }> = {
  new_user: {
    icon: Users,
    label: (e: AdminRecentEvent) => `Nouvel utilisateur : ${e.actor}`,
  },
  new_post: {
    icon: FileText,
    label: (e: AdminRecentEvent) => `Nouveau post par ${e.actor}`,
  },
  new_report: {
    icon: Flag,
    label: (e: AdminRecentEvent) => `Report signalé par ${e.actor}`,
  },
}

const EVENT_CONFIG_FALLBACK = { icon: Flag, label: (e: AdminRecentEvent) => `Événement : ${e.actor}` }

function RecentActivityFeed() {
  const { events, isLoading } = useAdminRecentActivity()

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Activité récente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune activité récente
          </p>
        ) : (
          events.map((event) => {
            const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG_FALLBACK
            const Icon = config.icon

            return (
              <div
                key={`${event.type}-${event.actor}-${event.createdAt}`}
                className="flex items-start gap-3 py-2 border-b last:border-0"
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {config.label(event)}
                  </p>
                  {event.excerpt && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {event.excerpt}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {timeAgo(event.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Vue d&apos;ensemble du réseau World of Code</p>
      </div>

      {/* Row 1 : KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} isLoading={isLoading} />
        ))}
      </div>

      {/* Row 2 : Graphique activité + Top groupes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <TopGroupsCard groups={stats?.topGroups ?? []} isLoading={isLoading} />
      </div>

      {/* Row 3 : Fil d'activité récente */}
      <RecentActivityFeed />
    </div>
  )
}
