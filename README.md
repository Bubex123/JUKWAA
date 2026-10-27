# Tukio

Tukio is a ticket listing and booking demo with a Next.js frontend and a NestJS API backed by PostgreSQL and Prisma. The organizer dashboard can publish and edit event, movie, bus, and flight listings. Checkout, mobile money, and payouts are currently simulations.

## Run locally

Requirements: Node.js and Docker Desktop.

1. In `tukiio-backend`, copy `.env.example` to `.env` and set local secrets.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. From `tukiio-backend`, run `npm install`, `npm run db:deploy`, then `npm run start:dev`.
4. In another terminal, go to `tukiio-clone`, run `npm install` and `npm run dev`.
5. Open `http://localhost:3000`.

See [backend setup and API details](tukiio-backend/README.md) and [frontend details](tukiio-clone/README.md).

## Demo limitations

Mobile money, ticket delivery by SMS/WhatsApp/email, and organizer payouts are not connected to real providers. Payments and payouts do not move money. Do not use the example environment secrets in production.
