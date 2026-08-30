import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/auth-options"
import { LoginForm } from "@/components/login-form"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
      <LoginForm />
    </main>
  )
}
