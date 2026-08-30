"use client"

import { useActionState } from "react"

import { createSpecification, type FormState } from "@/app/(console)/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"

export function SpecificationForm({ disabled = false }: { disabled?: boolean }) {
  const [state, action, pending] = useActionState(createSpecification, { status: "idle", message: "" } satisfies FormState)
  return <form action={action} className="space-y-4">
    <div className="space-y-2"><Label htmlFor="title">Requirement title</Label><Input id="title" name="title" placeholder="Create order safely" minLength={3} required disabled={disabled} /></div>
    <div className="grid gap-4 sm:grid-cols-[9rem_1fr]"><div className="space-y-2"><Label htmlFor="method">Method</Label><NativeSelect className="w-full" id="method" name="method" disabled={disabled}><NativeSelectOption>GET</NativeSelectOption><NativeSelectOption>POST</NativeSelectOption><NativeSelectOption>PUT</NativeSelectOption><NativeSelectOption>PATCH</NativeSelectOption><NativeSelectOption>DELETE</NativeSelectOption></NativeSelect></div><div className="space-y-2"><Label htmlFor="path">Endpoint path</Label><Input id="path" name="path" placeholder="/orders" pattern="/[A-Za-z0-9_./{}-]*" required disabled={disabled} /></div></div>
    <div className="space-y-2"><Label htmlFor="invariants">Invariants <span className="font-normal text-muted-foreground">one per line</span></Label><Textarea id="invariants" name="invariants" rows={4} placeholder={"Returns an accepted order id\nThe same idempotency key creates at most one order"} required disabled={disabled} /></div>
    <div className="space-y-2"><Label htmlFor="latencyBudgetMs">Latency budget (ms)</Label><Input id="latencyBudgetMs" name="latencyBudgetMs" type="number" min={1} max={30000} defaultValue={750} required disabled={disabled} /></div>
    {state.message ? <p role="status" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-600"}>{state.message}</p> : null}
    <Button type="submit" disabled={disabled || pending}>{pending ? "Saving…" : "Save immutable version"}</Button>
  </form>
}
