export type UserRole = "viewer" | "engineer" | "approver" | "admin"

const runStarters = new Set<UserRole>(["engineer", "admin"])
const approvers = new Set<UserRole>(["approver", "admin"])

export function canStartRun(role: UserRole) {
  return runStarters.has(role)
}

export function canApproveRemediation(role: UserRole) {
  return approvers.has(role)
}

export function canAdminister(role: UserRole) {
  return role === "admin"
}
