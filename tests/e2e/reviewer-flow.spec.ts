import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page, role: "engineer" | "approver") {
  await page.goto("/login")
  await page.getByRole("button", { name: role, exact: true }).click()
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test("complete governed run and independent remediation", async ({ page, context }) => {
  test.skip(process.env.VERITY_FULL_E2E !== "1", "Set VERITY_FULL_E2E=1 for the mutating reviewer flow")
  test.setTimeout(240_000)

  await signIn(page, "engineer")
  await page.goto("/runs")
  await page.getByRole("button", { name: /Run \d+ approved checks/ }).click()
  await expect(page).toHaveURL(/\/runs\/.+/)
  await expect(page.getByText("completed", { exact: true }).first()).toBeVisible({ timeout: 120_000 })

  await page.goto("/remediations")
  await page.getByRole("button", { name: "Propose governed fix" }).first().click()
  await expect(page.getByText("proposed", { exact: true }).first()).toBeVisible()

  await context.clearCookies()
  await signIn(page, "approver")
  await page.goto("/remediations")
  await page.getByPlaceholder("Approval reason").first().fill("Independent evidence review passed")
  await page.getByRole("button", { name: "Approve & verify" }).first().click()
  await expect(page).toHaveURL(/\/runs\/.+/)
  await expect(page.getByText("completed", { exact: true }).first()).toBeVisible({ timeout: 120_000 })
  await expect(page.getByText("Pass rate 100%", { exact: true })).toBeVisible()

  await page.goto("/remediations")
  await expect(page.getByText("verified", { exact: true }).first()).toBeVisible()
})
