import { expect, test, type Page } from "@playwright/test"

async function signIn(page: Page, role: "viewer" | "engineer" | "approver") {
  await page.goto("/login")
  await page.getByRole("button", { name: role, exact: true }).click()
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test("anonymous users are redirected to the seeded login boundary", async ({ page }) => {
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText("Enter the Verity console", { exact: true })).toBeVisible()
})

test("viewer can inspect state but cannot create specifications or runs", async ({ page }) => {
  await signIn(page, "viewer")
  await page.goto("/specifications")
  await expect(page.getByText("Sign in as engineer or admin to configure verification.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Save immutable version" })).toBeDisabled()
  await page.goto("/runs")
  await expect(page.getByRole("button", { name: /Run \d+ approved checks/ })).toHaveCount(0)
})

test("engineer receives configuration and execution capabilities", async ({ page }) => {
  await signIn(page, "engineer")
  await page.goto("/specifications")
  await expect(page.getByRole("button", { name: "Save immutable version" })).toBeEnabled()
  await page.goto("/runs")
  await expect(page.getByRole("button", { name: /Run \d+ approved checks/ })).toBeVisible()
})

test("approver cannot generate checks and theme selection persists", async ({ page }) => {
  await signIn(page, "approver")
  await page.goto("/studio")
  await expect(page.getByText("Engineer or admin role required.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Generate governed candidate" })).toBeDisabled()

  await page.getByRole("button", { name: "Choose appearance" }).click()
  await page.getByRole("menuitem", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator("html")).toHaveClass(/dark/)
})
