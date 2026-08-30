-- Record the engineer who authored a remediation proposal.
ALTER TABLE "Remediation" ADD COLUMN "proposedById" TEXT NOT NULL;

CREATE UNIQUE INDEX "Approval_remediationId_actorId_key"
ON "Approval"("remediationId", "actorId");

ALTER TABLE "Remediation"
ADD CONSTRAINT "Remediation_proposedById_fkey"
FOREIGN KEY ("proposedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Evidence and audit history are append-only. Corrections are new records.
CREATE FUNCTION verity_reject_immutable_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% records are append-only', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER "Evidence_append_only"
BEFORE UPDATE OR DELETE ON "Evidence"
FOR EACH ROW EXECUTE FUNCTION verity_reject_immutable_mutation();

CREATE TRIGGER "AuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION verity_reject_immutable_mutation();

-- Approval is a database fact, not a UI flag.
CREATE FUNCTION verity_validate_approval_actor()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  actor_role "UserRole";
  proposer_id TEXT;
BEGIN
  SELECT "role" INTO actor_role FROM "User" WHERE "id" = NEW."actorId";
  SELECT "proposedById" INTO proposer_id FROM "Remediation" WHERE "id" = NEW."remediationId";

  IF actor_role NOT IN ('approver', 'admin') THEN
    RAISE EXCEPTION 'approval actor must have approver or admin role';
  END IF;

  IF NEW."actorId" = proposer_id THEN
    RAISE EXCEPTION 'remediation proposer cannot approve their own proposal';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "Approval_actor_guard"
BEFORE INSERT OR UPDATE ON "Approval"
FOR EACH ROW EXECUTE FUNCTION verity_validate_approval_actor();

CREATE FUNCTION verity_require_approved_remediation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" IN ('approved', 'applied', 'verified') AND NOT EXISTS (
    SELECT 1
    FROM "Approval" approval
    WHERE approval."remediationId" = NEW."id"
      AND approval."decision" = 'approved'
      AND approval."actorId" <> NEW."proposedById"
  ) THEN
    RAISE EXCEPTION 'remediation % requires an independent approval before status %', NEW."id", NEW."status";
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER "Remediation_approval_guard"
AFTER INSERT OR UPDATE OF "status" ON "Remediation"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION verity_require_approved_remediation();
