CREATE TYPE "PayoutRequestStatus" AS ENUM ('DEMO_REQUESTED');

CREATE TABLE "PayoutRequest" (
    "id" UUID NOT NULL,
    "organizerId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'DEMO_REQUESTED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PayoutRequest_organizerId_createdAt_idx" ON "PayoutRequest"("organizerId", "createdAt");
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
