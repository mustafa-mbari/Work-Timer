'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface User {
  id: string
  email: string
  display_name: string | null
  role: string
  created_at: string
  subscriptions: { plan: string; status: string } | { plan: string; status: string }[] | null
}

interface UsersTableProps {
  users: User[]
  totalCount: number
  page: number
  pageSize: number
  search: string
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  premium_monthly: 'Monthly',
  premium_yearly: 'Yearly',
  premium_lifetime: 'Lifetime',
  allin_monthly: 'Team (Legacy)',
  allin_yearly: 'Team (Legacy)',
  team_10_monthly: 'Team (10)',
  team_10_yearly: 'Team (10)',
  team_20_monthly: 'Team (20)',
  team_20_yearly: 'Team (20)',
}

const PLAN_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  free: 'secondary',
  premium_monthly: 'default',
  premium_yearly: 'default',
  premium_lifetime: 'default',
  allin_monthly: 'default',
  allin_yearly: 'default',
  team_10_monthly: 'default',
  team_10_yearly: 'default',
  team_20_monthly: 'default',
  team_20_yearly: 'default',
}

export default function UsersTable({ users, totalCount, page, pageSize, search }: UsersTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchValue, setSearchValue] = useState(search)

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function navigate(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(params)) {
      if (v) sp.set(k, v)
      else sp.delete(k)
    }
    startTransition(() => {
      router.push(`/users?${sp.toString()}`)
    })
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({ search: searchValue, page: '1' })
  }

  function getPlanInfo(user: User) {
    const sub = Array.isArray(user.subscriptions) ? user.subscriptions[0] : user.subscriptions
    const plan = sub?.plan || 'free'
    return {
      label: PLAN_LABELS[plan] || plan,
      variant: PLAN_VARIANTS[plan] || 'secondary' as const,
      status: sub?.status || 'active',
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            placeholder="Search by email…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" disabled={isPending}>Search</Button>
        {search && (
          <Button
            type="button"
            variant="outline"
            onClick={() => { setSearchValue(''); navigate({ search: '', page: '1' }) }}
          >
            Clear
          </Button>
        )}
      </form>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {totalCount} user{totalCount !== 1 ? 's' : ''} found
          {search && <> matching &ldquo;{search}&rdquo;</>}
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Page {page} of {totalPages}
        </p>
      </div>

      {/* Table */}
      <Card className={isPending ? 'opacity-60 transition-opacity' : ''}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map(u => {
                  const plan = getPlanInfo(u)
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                            {u.display_name || u.email.split('@')[0]}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.variant}>{plan.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-stone-500 dark:text-stone-400">
                        {new Date(u.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-stone-500 dark:text-stone-400">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => navigate({ page: String(page - 1) })}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  disabled={isPending}
                  onClick={() => navigate({ page: String(pageNum) })}
                  className="w-9"
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => navigate({ page: String(page + 1) })}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
