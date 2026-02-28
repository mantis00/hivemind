### Hivemind

Minimal notes to get the app running locally and know what is inside.

### Tech stack

- Next.js App Router (TypeScript)
- Supabase auth + database
- React Query for data fetching/caching
- Tailwind CSS + shadcn/ui component primitives
- Playwright for E2E tests

### Setup

1. Clone repo and install deps:

```bash
npm install
```

2. Create `.env.local` at the project root. Get the values from your Supabase project or from Vercel project settings (Environment Variables tab).

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
# add any other project secrets you need
```

3. Run dev server:

```bash
npm run dev
```

4. Run checks (optional):

```bash
npm run lint
npm run format:check
```

### Useful scripts

- `npm run dev` start local dev server
- `npm run build` production build
- `npm run start` run built app
- `npm run lint` lint codebase
- `npm run format` format with Prettier
- `npm run format:check` verify formatting

### Git hooks (Husky)

Pre-commit hooks auto-format staged files using Prettier and locally builds the app before every commit. If you want to skip the hook (not recommended), use `git commit --no-verify`.

### Deployment

Vercel automatically deploys on every push, If `npm run build` fails, the deployment will fail. Ensure your code builds locally before pushing.

### Notes

- shadcn components are configured via `components.json`.
- Tailwind config lives in `tailwind.config.ts` and global styles in `app/globals.css`.
- GitHub Actions run format checks on PRs to `main`—PRs cannot merge if formatting fails.
