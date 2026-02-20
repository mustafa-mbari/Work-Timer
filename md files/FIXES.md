# Fixes Log

## Vercel Deployment Failures (Feb 2026)

After upgrading Next.js 15 to 16.1.6 and updating all web dependencies (Stripe v17 to v20, Supabase SSR, Zod, etc.), the Vercel deployment broke with multiple cascading errors.

### Root Cause: Corrupted `package-lock.json`

The `web/` directory's `package-lock.json` had 5 packages symlinked to the root pnpm store instead of being properly installed:

```
@tailwindcss/postcss -> ../node_modules/.pnpm/@tailwindcss+postcss@4.1.18/...
postcss -> ../node_modules/.pnpm/postcss@8.5.6/...
tailwindcss -> ../node_modules/.pnpm/tailwindcss@4.1.18/...
typescript -> ../node_modules/.pnpm/typescript@5.9.3/...
@fontsource-variable/inter -> ../node_modules/.pnpm/@fontsource-variable+inter@5.2.8/...
```

This happened because the root directory uses pnpm (`pnpm-lock.yaml`) while `web/` uses npm (`package-lock.json`). Running `npm install` in `web/` created symlinks to pnpm's store instead of installing the packages properly.

On Vercel, with "Include files outside the Root Directory" disabled, the parent directory (`../node_modules/.pnpm/...`) doesn't exist, so those 5 packages were never actually installed (156 packages instead of 175).

**Fix:** Deleted `package-lock.json` and `node_modules/`, then ran `npm install` to regenerate a clean lock file with no symlinks.

### Error 1: `Cannot find module '@tailwindcss/postcss'`

- **Appeared with both Turbopack and webpack**
- Next.js's `plugins.js` uses `require.resolve()` to find PostCSS plugins, which failed because the package was a broken symlink
- Many config workarounds were tried (`require.resolve` in postcss.config.js, `--webpack` flag, `outputFileTracingRoot`) — none worked because the package simply wasn't installed

### Error 2: `Module not found: Can't resolve '@/components/ui/button'`

- **Appeared with webpack mode**
- The `@/` path alias (tsconfig `paths`) wasn't resolving on Vercel
- Initially thought to be a workspace root inference issue, but was actually caused by missing `typescript` package (also a broken symlink)
- A webpack alias (`config.resolve.alias['@'] = __dirname`) was added as a workaround but wasn't needed after fixing the lock file

### Error 3: `Cannot find name 'chrome'`

- **TypeScript error** in `ExtensionBridge.tsx` which uses `chrome.runtime.sendMessage`
- The web project didn't have Chrome extension type definitions
- Previously worked because the old lock file pulled types from the root pnpm store
- **Fix:** Added a minimal `web/chrome.d.ts` type declaration file

### Additional Changes Made

- **`web/` made self-contained:** Copied `shared/types.ts` and `shared/constants.ts` into `web/lib/shared/` and updated 10 import statements from `@shared/*` to `@/lib/shared/*`. This removed the dependency on files outside the `web/` directory.
- **Vercel setting:** Disabled "Include files outside the Root Directory" since `web/` no longer references parent files.
- **Config simplified:** `next.config.js` reduced to empty config, `postcss.config.js` uses standard string plugin format, build uses default Turbopack (no `--webpack` flag).

### Stripe v20 Breaking Changes (during upgrade)

- `Subscription.current_period_end` moved to item-level: `sub.items.data[0]?.current_period_end`
- `Invoice.subscription` moved to `invoice.parent?.subscription_details?.subscription`

### Lesson Learned

When a monorepo mixes package managers (pnpm at root, npm in subdirectory), always verify `package-lock.json` doesn't contain symlinks to the other package manager's store. If in doubt, delete `package-lock.json` and `node_modules/` and regenerate from scratch.
