-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('api', 'worker', 'queue', 'cache', 'external');

-- CreateEnum
CREATE TYPE "CheckOrigin" AS ENUM ('authored', 'generated');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('readonly', 'probe', 'mutate');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('draft', 'validated', 'rejected');

-- CreateEnum
CREATE TYPE "RunTrigger" AS ENUM ('manual', 'scheduled', 'ci');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "CheckRunStatus" AS ENUM ('queued', 'running', 'passed', 'failed', 'error');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('open', 'triaged', 'remediating', 'verified', 'accepted_risk');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('request', 'response', 'assertion', 'trace', 'diff');

-- CreateEnum
CREATE TYPE "RemediationStatus" AS ENUM ('proposed', 'approved', 'rejected', 'applied', 'verified', 'rolled_back');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('viewer', 'engineer', 'approver', 'admin');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('approved', 'rejected');

-- CreateTable
CREATE TABLE "System" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "System_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ServiceKind" NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependency" (
    "id" TEXT NOT NULL,
    "fromServiceId" TEXT NOT NULL,
    "toServiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "criticality" TEXT NOT NULL,

    CONSTRAINT "Dependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spec" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intent" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Spec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Check" (
    "id" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "origin" "CheckOrigin" NOT NULL,
    "trustLevel" "TrustLevel" NOT NULL,
    "scope" JSONB NOT NULL,
    "definition" JSONB NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "systemId" TEXT NOT NULL,
    "trigger" "RunTrigger" NOT NULL,
    "status" "RunStatus" NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "passRate" DOUBLE PRECISION,
    "coverage" DOUBLE PRECISION,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckRun" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "status" "CheckRunStatus" NOT NULL,
    "durationMs" INTEGER,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "CheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "checkRunId" TEXT NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'open',

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "payload" JSONB NOT NULL,
    "sha256" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remediation" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "proposedDiff" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "status" "RemediationStatus" NOT NULL DEFAULT 'proposed',

    CONSTRAINT "Remediation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "remediationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "reason" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "previousHash" TEXT,
    "hash" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "OutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "System_name_environment_key" ON "System"("name", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "Service_systemId_name_key" ON "Service"("systemId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Dependency_fromServiceId_toServiceId_kind_key" ON "Dependency"("fromServiceId", "toServiceId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Spec_systemId_title_version_key" ON "Spec"("systemId", "title", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CheckRun_runId_checkId_key" ON "CheckRun"("runId", "checkId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_hash_key" ON "AuditEvent"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_fromServiceId_fkey" FOREIGN KEY ("fromServiceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_toServiceId_fkey" FOREIGN KEY ("toServiceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spec" ADD CONSTRAINT "Spec_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spec" ADD CONSTRAINT "Spec_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_specId_fkey" FOREIGN KEY ("specId") REFERENCES "Spec"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "System"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "Check"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_checkRunId_fkey" FOREIGN KEY ("checkRunId") REFERENCES "CheckRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remediation" ADD CONSTRAINT "Remediation_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_remediationId_fkey" FOREIGN KEY ("remediationId") REFERENCES "Remediation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxMessage" ADD CONSTRAINT "OutboxMessage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
