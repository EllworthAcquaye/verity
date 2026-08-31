ALTER TABLE "Remediation" ADD COLUMN "verificationRunId" TEXT;

CREATE UNIQUE INDEX "Remediation_verificationRunId_key"
ON "Remediation"("verificationRunId");

ALTER TABLE "Remediation"
ADD CONSTRAINT "Remediation_verificationRunId_fkey"
FOREIGN KEY ("verificationRunId") REFERENCES "Run"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
