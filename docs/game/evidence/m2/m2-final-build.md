# Isolated production build

Final command re-executed on 2026-10-11 in `/private/tmp/mugiwara-m2-final-20261011`, a fresh copy of `cardgame/` excluding all `.env*`, `.next`, and `node_modules` directories; the existing local `node_modules` was linked into the temporary copy:

```sh
npm run build
```

The sandboxed attempt was blocked while Next.js fetched Inter from `fonts.googleapis.com` (`getaddrinfo ENOTFOUND`). The same build was rerun with approved network access and completed successfully (exit code 0):

- Next.js 15.5.27 optimized production compilation: PASS.
- Build reported `Compiled successfully`.
- Next.js lint/type validation: PASS with the repository's pre-existing warnings.
- Static page generation and route table: completed.

The final rerun compiled in 9.0 seconds and generated all 41 static pages. It emitted one Node module-type warning for `tailwind.config.ts`, in addition to the existing ESLint warnings; no build errors occurred.

No `.env` files were copied and no production deployment occurred.
