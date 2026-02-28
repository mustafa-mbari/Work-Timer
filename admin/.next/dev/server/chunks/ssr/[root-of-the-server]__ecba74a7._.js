module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/admin/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/admin/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/admin/app/(admin)/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/admin/app/(admin)/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/admin/app/(admin)/error.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/admin/app/(admin)/error.tsx [app-rsc] (ecmascript)"));
}),
"[project]/admin/app/(admin)/loading.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/admin/app/(admin)/loading.tsx [app-rsc] (ecmascript)"));
}),
"[project]/admin/lib/repositories/admin.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "findAuthUserByEmail",
    ()=>findAuthUserByEmail,
    "getActiveUsers",
    ()=>getActiveUsers,
    "getAdminGroups",
    ()=>getAdminGroups,
    "getAllAuthUsers",
    ()=>getAllAuthUsers,
    "getAuthUserCount",
    ()=>getAuthUserCount,
    "getAuthUsers",
    ()=>getAuthUsers,
    "getDomainStats",
    ()=>getDomainStats,
    "getEntryTypeBreakdown",
    ()=>getEntryTypeBreakdown,
    "getPlatformStats",
    ()=>getPlatformStats,
    "getPremiumBreakdown",
    ()=>getPremiumBreakdown,
    "getPromoStats",
    ()=>getPromoStats,
    "getTopUsers",
    ()=>getTopUsers,
    "getUserGrowth",
    ()=>getUserGrowth,
    "updateGroupMaxMembers",
    ()=>updateGroupMaxMembers
]);
/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase v2.95 type workaround for RPC calls */ var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/lib/supabase/server.ts [app-rsc] (ecmascript)");
;
async function callRpc(name, args) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServiceClient"])();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    return supabase.rpc(name, args);
}
async function getPlatformStats() {
    const { data, error } = await callRpc('get_platform_stats');
    if (error) throw new Error(`get_platform_stats failed: ${error.message}`);
    return data;
}
async function getActiveUsers(period) {
    const { data, error } = await callRpc('get_active_users', {
        period
    });
    if (error) throw new Error(`get_active_users failed: ${error.message}`);
    return data ?? 0;
}
async function getUserGrowth(weeks = 8) {
    const { data, error } = await callRpc('get_user_growth', {
        weeks
    });
    if (error) throw new Error(`get_user_growth failed: ${error.message}`);
    return data ?? [];
}
async function getTopUsers(lim = 5) {
    const { data, error } = await callRpc('get_top_users', {
        lim
    });
    if (error) throw new Error(`get_top_users failed: ${error.message}`);
    return data ?? [];
}
async function getEntryTypeBreakdown() {
    const { data, error } = await callRpc('get_entry_type_breakdown');
    if (error) throw new Error(`get_entry_type_breakdown failed: ${error.message}`);
    return data ?? [];
}
async function getPremiumBreakdown() {
    const { data, error } = await callRpc('get_premium_breakdown');
    if (error) throw new Error(`get_premium_breakdown failed: ${error.message}`);
    return data;
}
async function getPromoStats() {
    const { data, error } = await callRpc('get_promo_stats');
    if (error) throw new Error(`get_promo_stats failed: ${error.message}`);
    return data;
}
async function getDomainStats() {
    const { data, error } = await callRpc('get_domain_stats');
    if (error) throw new Error(`get_domain_stats failed: ${error.message}`);
    return data;
}
async function getAuthUserCount() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServiceClient"])();
    const { data } = await supabase.auth.admin.listUsers({
        perPage: 1
    });
    return data?.users?.length ?? 0;
}
async function getAuthUsers(page = 1, perPage = 15) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServiceClient"])();
    const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage
    });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    return data;
}
async function getAllAuthUsers() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServiceClient"])();
    const { data, error } = await supabase.auth.admin.listUsers({
        perPage: 10000
    });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    return data?.users ?? [];
}
async function findAuthUserByEmail(email) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServiceClient"])();
    const { data } = await supabase.auth.admin.listUsers({
        perPage: 1000
    });
    return data?.users?.find((u)=>u.email === email) ?? null;
}
async function getAdminGroups() {
    const { data, error } = await callRpc('admin_get_groups');
    if (error) throw new Error(`admin_get_groups failed: ${error.message}`);
    return data ?? [];
}
async function updateGroupMaxMembers(groupId, maxMembers) {
    const { error } = await callRpc('admin_update_group', {
        p_group_id: groupId,
        p_max_members: maxMembers
    });
    if (error) throw new Error(`admin_update_group failed: ${error.message}`);
}
}),
"[project]/admin/lib/repositories/subscriptions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getAllSubscriptions",
    ()=>getAllSubscriptions,
    "getAllSubscriptionsWithEmail",
    ()=>getAllSubscriptionsWithEmail,
    "upsertSubscription",
    ()=>upsertSubscription
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/lib/supabase/server.ts [app-rsc] (ecmascript)");
;
async function getAllSubscriptions() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServiceClient"])();
    const { data } = await supabase.from('subscriptions').select('user_id, plan, status, granted_by, created_at').range(0, 49999).returns();
    return data ?? [];
}
async function getAllSubscriptionsWithEmail() {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServiceClient"])();
    const [{ data: subscriptions }, { data: profiles }] = await Promise.all([
        supabase.from('subscriptions').select('id, user_id, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, cancel_at_period_end, granted_by, promo_code_id, created_at, updated_at').order('updated_at', {
            ascending: false
        }).returns(),
        supabase.from('profiles').select('id, email, display_name').range(0, 49999).returns()
    ]);
    const profileMap = new Map();
    for (const p of profiles ?? []){
        profileMap.set(p.id, {
            email: p.email,
            display_name: p.display_name
        });
    }
    return (subscriptions ?? []).map((s)=>({
            ...s,
            email: profileMap.get(s.user_id)?.email ?? null,
            display_name: profileMap.get(s.user_id)?.display_name ?? null
        }));
}
async function upsertSubscription(sub) {
    const supabase = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServiceClient"])();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return supabase.from('subscriptions').upsert({
        ...sub,
        updated_at: new Date().toISOString()
    }, {
        onConflict: 'user_id'
    });
}
}),
"[project]/admin/app/(admin)/users/UsersTable.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_b7425865da53ff23ed15cc7a43c4bd25$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_b7425865da53ff23ed15cc7a43c4bd25/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_b7425865da53ff23ed15cc7a43c4bd25$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/admin/app/(admin)/users/UsersTable.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/admin/app/(admin)/users/UsersTable.tsx <module evaluation>", "default");
}),
"[project]/admin/app/(admin)/users/UsersTable.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
// This file is generated by next-core EcmascriptClientReferenceModule.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_b7425865da53ff23ed15cc7a43c4bd25$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_b7425865da53ff23ed15cc7a43c4bd25/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_b7425865da53ff23ed15cc7a43c4bd25$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/admin/app/(admin)/users/UsersTable.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/admin/app/(admin)/users/UsersTable.tsx", "default");
}),
"[project]/admin/app/(admin)/users/UsersTable.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$app$2f28$admin$292f$users$2f$UsersTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/admin/app/(admin)/users/UsersTable.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$app$2f28$admin$292f$users$2f$UsersTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/admin/app/(admin)/users/UsersTable.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$app$2f28$admin$292f$users$2f$UsersTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/admin/app/(admin)/users/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AdminUsersPage,
    "revalidate",
    ()=>revalidate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_b7425865da53ff23ed15cc7a43c4bd25$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.1.6_@babel+core@7.2_b7425865da53ff23ed15cc7a43c4bd25/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$repositories$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/lib/repositories/admin.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$repositories$2f$subscriptions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/lib/repositories/subscriptions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$repositories$2f$profiles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/lib/repositories/profiles.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$app$2f28$admin$292f$users$2f$UsersTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/app/(admin)/users/UsersTable.tsx [app-rsc] (ecmascript)");
;
;
;
;
;
const revalidate = 60;
const PAGE_SIZE = 15;
async function AdminUsersPage({ searchParams }) {
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const search = (params.search || '').toLowerCase();
    const [authUsers, subscriptions, profiles] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$repositories$2f$admin$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAllAuthUsers"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$repositories$2f$subscriptions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAllSubscriptions"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$lib$2f$repositories$2f$profiles$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getAllProfiles"])()
    ]);
    const subMap = new Map();
    subscriptions.forEach((s)=>{
        subMap.set(s.user_id, s);
    });
    const profileMap = new Map();
    profiles.forEach((p)=>{
        profileMap.set(p.id, p);
    });
    let mergedUsers = authUsers.map((u)=>{
        const profile = profileMap.get(u.id);
        const sub = subMap.get(u.id);
        return {
            id: u.id,
            email: u.email || 'Unknown',
            display_name: profile?.display_name || u.user_metadata?.full_name || u.user_metadata?.name || null,
            role: profile?.role || 'user',
            created_at: u.created_at,
            subscriptions: sub || {
                plan: 'free',
                status: 'active'
            }
        };
    });
    mergedUsers.sort((a, b)=>new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (search) {
        mergedUsers = mergedUsers.filter((u)=>u.email.toLowerCase().includes(search));
    }
    const totalCount = mergedUsers.length;
    const from = (page - 1) * PAGE_SIZE;
    const pagedUsers = mergedUsers.slice(from, from + PAGE_SIZE);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$6_$40$babel$2b$core$40$7$2e$2_b7425865da53ff23ed15cc7a43c4bd25$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$app$2f28$admin$292f$users$2f$UsersTable$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
        users: pagedUsers,
        totalCount: totalCount,
        page: page,
        pageSize: PAGE_SIZE,
        search: params.search || ''
    }, void 0, false, {
        fileName: "[project]/admin/app/(admin)/users/page.tsx",
        lineNumber: 54,
        columnNumber: 5
    }, this);
}
}),
"[project]/admin/app/(admin)/users/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/admin/app/(admin)/users/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__ecba74a7._.js.map