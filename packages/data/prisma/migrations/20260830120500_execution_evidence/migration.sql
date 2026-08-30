-- Evidence belongs to every check execution, including successful checks. A finding link
-- remains optional so failed checks can expose the same immutable record in both views.
ALTER TABLE "Evidence" ADD COLUMN "checkRunId" TEXT;
ALTER TABLE "Evidence" ALTER COLUMN "findingId" DROP NOT NULL;

UPDATE "Evidence" evidence
SET "checkRunId" = finding."checkRunId"
FROM "Finding" finding
WHERE evidence."findingId" = finding."id";

ALTER TABLE "Evidence" ALTER COLUMN "checkRunId" SET NOT NULL;

ALTER TABLE "Evidence"
ADD CONSTRAINT "Evidence_checkRunId_fkey"
FOREIGN KEY ("checkRunId") REFERENCES "CheckRun"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Finding_checkRunId_title_key"
ON "Finding"("checkRunId", "title");

CREATE INDEX "Evidence_checkRunId_capturedAt_idx"
ON "Evidence"("checkRunId", "capturedAt");

CREATE UNIQUE INDEX "Evidence_checkRunId_type_sha256_key"
ON "Evidence"("checkRunId", "type", "sha256");

CREATE INDEX "OutboxMessage_publishedAt_createdAt_idx"
ON "OutboxMessage"("publishedAt", "createdAt");
