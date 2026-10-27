# Tukio frontend

Next.js frontend for the Tukio event ticketing service. The public events section reads published event data from the NestJS API in `../tukiio-backend`; search and category filters run in the page after the event list loads. The ticket CTA opens a standalone `/matukio` event list with price ranges. Each event opens `/matukio/:id/booking`, where ticket tiers (such as Regular, VIP, and VVIP) are shown with prices, and a visitor can choose a quantity, enter their details, and create a 15-minute inventory reservation.

Organizers use `/organizer` to register or sign in, create/publish events, view ticket sales and orders, submit a demo payout request, and validate a QR payload at the gate. The dashboard refreshes its totals every 20 seconds. Buyer checkout can simulate a mobile money result and issue downloadable demo QR tickets.

## Run the connected app locally

Use two terminals from the project folder:

1. Start PostgreSQL in Docker Desktop from `../tukiio-backend`: `docker compose up -d postgres`.
2. In `../tukiio-backend`, apply migrations with `npm run db:deploy`. To create the development sample listings and Regular, VIP, and VVIP ticket tiers, configure the optional seed values in its `.env` and run `npm run db:seed`. Re-running the seed updates the sample listings and ticket tiers.
3. Start the API in `../tukiio-backend` with `npm run start:dev`.
4. Start the frontend here with `npm run dev`.
5. Open [http://localhost:3000](http://localhost:3000). The page requests `http://localhost:3001/api/v1/events` by default.

If the API uses another URL, copy `.env.example` to `.env.local`, set `NEXT_PUBLIC_TUKIO_API_URL` to the API's `/api/v1` URL, and restart Next.js. The backend's `FRONTEND_ORIGIN` must allow the frontend origin for browser requests.

When the API is unavailable, the events section shows a retry message. An empty event list means the API responded successfully but there are no published events in the database yet.

Mobile Money and organizer payouts are simulations; no provider is contacted and no funds are transferred. Simulated checkout records are marked as simulated in the payment record and appear in demo sales totals. SMS, WhatsApp and email delivery are not connected.
