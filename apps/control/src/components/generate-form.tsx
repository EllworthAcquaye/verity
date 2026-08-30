"use client"

import { SparklesIcon } from "lucide-react"
import { useActionState } from "react"

import { generateChecks, type FormState } from "@/app/(console)/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

export function GenerateForm({ specs, disabled = false }: { specs: { id: string; label: string }[]; disabled?: boolean }) {
  const [state, action, pending] = useActionState(generateChecks, { status: "idle", message: "" } satisfies FormState)
  return <form action={action} className="space-y-4">
    <div className="space-y-2"><Label htmlFor="specId">Specification</Label><NativeSelect className="w-full" id="specId" name="specId" disabled={disabled}>{specs.map((spec) => <NativeSelectOption key={spec.id} value={spec.id}>{spec.label}</NativeSelectOption>)}</NativeSelect></div>
    <div className="space-y-2"><Label htmlFor="provider">Provider</Label><NativeSelect className="w-full" id="provider" name="provider" disabled={disabled}><NativeSelectOption value="ollama">Ollama · live local (default)</NativeSelectOption><NativeSelectOption value="cassette">Cassette · deterministic recovery</NativeSelectOption><NativeSelectOption value="anthropic">Anthropic · optional comparison</NativeSelectOption></NativeSelect></div>
    {state.message ? <p role="status" className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-600"}>{state.message}</p> : null}
    <Button type="submit" disabled={disabled || pending || !specs.length}><SparklesIcon />{pending ? "Generating…" : "Generate governed candidate"}</Button>
  </form>
}
