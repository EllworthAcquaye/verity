CREATE TABLE "Schedule" (
  "id" TEXT NOT NULL,
  "systemId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "cron" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Run" ADD COLUMN "scheduleId" TEXT;

CREATE UNIQUE INDEX "Schedule_systemId_name_key" ON "Schedule"("systemId", "name");
CREATE INDEX "Schedule_enabled_nextRunAt_idx" ON "Schedule"("enabled", "nextRunAt");

ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Run" ADD CONSTRAINT "Run_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CiRequest" (
  "idempotencyKey" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CiRequest_pkey" PRIMARY KEY ("idempotencyKey")
);

CREATE UNIQUE INDEX "CiRequest_runId_key" ON "CiRequest"("runId");
ALTER TABLE "CiRequest" ADD CONSTRAINT "CiRequest_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
