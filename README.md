# Carpool OS

Build CARPOOL OS V1 from the supplied master specification. Start with a concise implementation plan, then implement the actual application in priority order: Supabase/PostgreSQL schema and RLS, Supabase Auth, profiles, driver and passenger flows, deterministic reusable matching, transaction-safe booking, trip lifecycle, ratings/reports, admin, testing, then polish. Use React + TypeScript, Supabase, responsive mobile-first PWA. Do not redesign the business, invent major features, create another backend, or use mock logic instead of the real workflows. Seed clearly marked demo data and test accounts only where safe. Use meaningful commits and connect/configure GitHub if available; report exactly what was tested and all incomplete items at completion.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/dfb58edc-17a0-4c14-a567-00094b21beb3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
