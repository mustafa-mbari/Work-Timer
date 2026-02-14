import { createServiceClient } from '@/lib/supabase/server'

export default async function AdminUsersPage() {
  const supabase = await createServiceClient()

  const { data: users } = await (supabase
    .from('profiles') as any)
    .select(`
      id,
      email,
      display_name,
      role,
      created_at,
      subscriptions (
        plan,
        status
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users && users.length > 0 ? (
                users.map((u: any) => {
                  const sub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions
                  return (
                    <tr key={u.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3 text-sm text-stone-700">{u.email}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          sub?.plan === 'free'
                            ? 'bg-stone-100 text-stone-600'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {sub?.plan || 'free'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">{u.role}</td>
                      <td className="px-4 py-3 text-sm text-stone-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-stone-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
