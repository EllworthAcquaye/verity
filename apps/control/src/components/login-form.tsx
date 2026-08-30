"use client"

import * as React from "react"
import { ShieldCheckIcon } from "lucide-react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const accounts = ["viewer", "engineer", "approver", "admin"] as const

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = React.useState("engineer@verity.local")
  const [password, setPassword] = React.useState("Verity123!")
  const [error, setError] = React.useState("")
  const [pending, startTransition] = React.useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (!result?.ok) {
        setError("Those credentials were not accepted.")
        return
      }

      router.push("/dashboard")
      router.refresh()
    })
  }

  return (
    <Card className="w-full max-w-md shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheckIcon className="size-5" />
        </div>
        <div>
          <CardTitle className="text-xl">Enter the Verity console</CardTitle>
          <CardDescription className="mt-1">
            Use a seeded role to verify server-enforced access boundaries.
          </CardDescription>
        </div>
      </CardHeader>
      <form onSubmit={submit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((role) => (
              <Button
                key={role}
                type="button"
                variant={email.startsWith(role) ? "secondary" : "outline"}
                size="sm"
                onClick={() => setEmail(`${role}@verity.local`)}
                className="capitalize"
              >
                {role}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">All local demo roles use Verity123!</p>
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter className="mt-2">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
