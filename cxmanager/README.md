This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database

Dev Postgres runs **natively** (not via `docker-compose.yml`) because Docker Desktop hit an unrecoverable Windows bug in this environment (a stuck `sailor-ingest.sock` reparse point that survived reboot, admin deletion, and rebuilding the WSL distro). Installed via:

```bash
winget install PostgreSQL.PostgreSQL.16
```

Role/database created to match `.env`'s `DATABASE_URL` (`cxmanager` / `cxmanager_dev` / db `cxmanager`, port 5432) so no other config changed. `docker-compose.yml` is left in place in case Docker gets fixed later — either path should work unmodified since both target `127.0.0.1:5432` with the same credentials.

```bash
npx prisma migrate deploy   # apply migrations
npx prisma db seed          # seed dev users
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
