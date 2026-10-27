# Tukio backend

NestJS API for event listings and ticket sales. It uses PostgreSQL through Prisma ORM 7. The API now has persistent events, organizer registration and login, event and ticket type management, reserved ticket inventory, orders, a signed payment callback boundary, QR ticket payloads, and single-use gate check-in.

## Local setup

Requirements: Node.js 20.19+, 22.12+, or 24+ and Docker Compose.

1. Install packages: `npm install`.
2. Add the settings from `.env.example` to `.env`. Replace `JWT_SECRET`, `TICKET_SIGNING_SECRET`, and `PAYMENT_WEBHOOK_SECRET` with independent random values of at least 32 characters. If `.env` already exists, preserve its existing settings.
3. Start PostgreSQL: `docker compose up -d postgres`.
4. Apply the initial database migration: `npm run db:migrate`.
5. Generate the Prisma client: `npx prisma generate` (also runs after package installation and as part of `npm run build`).
6. Start the API: `npm run start:dev`.

The API listens on port `3001`; the frontend is allowed from `http://localhost:3000`. Set `PORT` and `FRONTEND_ORIGIN` to change those values. The local PostgreSQL credentials in the example file are for local development only. A hosted PostgreSQL service can use the same `DATABASE_URL` format. For a pooled hosted connection, point application `DATABASE_URL` at the pooler and use a direct connection for Prisma migrations.

To load the demo events, set `SEED_ORGANIZER_EMAIL` and a `SEED_ORGANIZER_PASSWORD` of at least 12 characters in `.env`, then run `npm run db:seed`. The seed includes upcoming and past examples and creates Regular, VIP, and VVIP ticket tiers with demo prices. Re-running it updates the sample listings and tiers. The seed account is for development only.

## Routes

All routes use `/api/v1`. JSON responses generally use a `data` envelope. Prices are integer Tanzanian shillings (TZS), and dates are ISO timestamps.

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | API liveness check |
| GET | `/events?category=Muziki&search=Dar` | Public | List published events with optional category/search filters |
| GET | `/events/:id` | Public | Get a published event by slug or ID, including active ticket types |
| POST | `/auth/register` | Public | Create an organizer and return a bearer token |
| POST | `/auth/login` | Public | Sign in and return a bearer token |
| GET | `/organizer/dashboard` | Organizer | Get sales, ticket inventory, pending orders, events, and demo payout totals |
| GET | `/organizer/events` | Organizer | List the signed-in organizer's events |
| GET | `/organizer/orders` | Organizer | List recent orders for the organizer's events |
| POST | `/organizer/events` | Organizer | Create a draft event |
| PATCH | `/organizer/events/:eventId` | Organizer | Edit event details and image URL for an owned event |
| POST | `/organizer/events/:eventId/ticket-types` | Organizer | Add ticket inventory to a draft event |
| PATCH | `/organizer/events/:eventId/publish` | Organizer | Publish an event with at least one ticket type |
| POST | `/orders` | Public | Reserve 1–10 tickets for 15 minutes and return a private order access token |
| GET | `/orders/:id` | Order token | Read payment state and QR payloads with the `X-Order-Token` header |
| POST | `/orders/:id/simulate-payment` | Order token, non-production only | Simulate checkout and issue demo QR tickets; no money is transferred |
| GET | `/organizer/payout-requests` | Organizer | List demo payout requests |
| POST | `/organizer/payout-requests` | Organizer | Save a demo payout request against simulated sales; does not transfer money |
| POST | `/payments/webhook` | Signed provider callback | Confirm or fail payment; successful confirmation issues tickets idempotently |
| POST | `/checkin` | Organizer | Validate a QR payload and mark its ticket used once |

Send organizer tokens as `Authorization: Bearer <accessToken>`. A buyer must keep the order token returned by `POST /orders` and send it as `X-Order-Token` to retrieve ticket QR payloads.

## Payment integration boundary

Payment-provider checkout is not connected. The non-production `POST /orders/:id/simulate-payment` route is a development demo: it creates a paid demo order and QR tickets so attendee and organizer flows can be previewed. It does not initiate USSD, send SMS, or transfer funds. Demo payout requests likewise only create records. Do not treat either simulation as proof of real payment. A provider adapter still needs to initiate M-Pesa/Tigo Pesa/Airtel Money/HaloPesa transactions and call the webhook only after the provider confirms settlement.

The current webhook accepts JSON fields `eventId`, `orderId`, `providerReference`, integer `amount`, and `status` (`paid` or `failed`). It verifies `X-Payment-Signature` as a lowercase or uppercase hex HMAC-SHA256 of the exact parsed JSON serialization using `PAYMENT_WEBHOOK_SECRET`. Real provider adapters must validate the provider's own signature and map its verified event into this internal contract. Payment callbacks are deduplicated by provider event ID. If a provider reports a successful payment after the 15-minute reservation expired, the order is cancelled and the payment is recorded as `paid_late_refund_required`; the provider integration must refund or reconcile it.

## Security and operations notes

- Organizer passwords use Node's scrypt; API bearer tokens use HMAC-SHA256 and expire after 12 hours by default.
- Order access tokens are stored as SHA-256 hashes. Ticket QR payloads are signed and cannot be forged without `TICKET_SIGNING_SECRET` (or the JWT secret fallback).
- Inventory is reserved atomically in PostgreSQL. Failed or late callbacks release it; successful settlement converts reservations to sold inventory.
- QR check-in is scoped to the event's organizer and uses a conditional update so one ticket cannot be checked in twice.
- Configure separate high-entropy secrets in every environment. Never commit `.env` or use the example secrets in production.
- The schema is in `prisma/schema.prisma`; local migrations are created with `npm run db:migrate -- --name <name>` and production migrations are applied with `npm run db:deploy`.
