export type UserRole = "viewer" | "engineer" | "approver" | "admin"

const runStarters = new Set<UserRole>(["engineer", "admin"])
const approvers = new Set<UserRole>(["approver", "admin"])

export function canStartRun(role: UserRole) {
  return runStarters.has(role)
}

export function canConfigureVerification(role: UserRole) {
  return runStarters.has(role)
}

export function canApproveRemediation(role: UserRole) {
  return approvers.has(role)
}

export function canAdminister(role: UserRole) {
  return role === "admin"
}

export type ReliabilityInputs = { passRate: number; coverage: number; openCriticalFindings: number }

export function reliabilityScore({ passRate, coverage, openCriticalFindings }: ReliabilityInputs) {
  const boundedPassRate = Math.max(0, Math.min(1, passRate))
  const boundedCoverage = Math.max(0, Math.min(1, coverage))
  const criticalHealth = 1 - Math.min(1, Math.max(0, openCriticalFindings) / 3)
  return Math.round((boundedPassRate * 0.55 + boundedCoverage * 0.3 + criticalHealth * 0.15) * 100)
}
