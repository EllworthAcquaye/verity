"use client"

import { Background, Controls, type Edge, type Node, ReactFlow } from "@xyflow/react"
import { useMemo } from "react"

const positions = [{ x: 20, y: 100 }, { x: 300, y: 20 }, { x: 300, y: 190 }, { x: 580, y: 100 }]

export function SystemGraph({ services, dependencies }: { services: { id: string; name: string; kind: string }[]; dependencies: { id: string; fromServiceId: string; toServiceId: string; kind: string }[] }) {
  const nodes = useMemo<Node[]>(() => services.map((service, index) => ({ id: service.id, position: positions[index] ?? { x: (index % 3) * 260, y: Math.floor(index / 3) * 150 }, data: { label: `${service.name}\n${service.kind}` }, style: { whiteSpace: "pre-line", width: 190, borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", color: "var(--card-foreground)", padding: 14, fontSize: 13 } })), [services])
  const edges = useMemo<Edge[]>(() => dependencies.map((dependency) => ({ id: dependency.id, source: dependency.fromServiceId, target: dependency.toServiceId, label: dependency.kind, animated: dependency.kind.includes("event"), style: { stroke: "var(--muted-foreground)" }, labelStyle: { fill: "var(--muted-foreground)", fontSize: 11 } })), [dependencies])
  return <div className="h-[520px] overflow-hidden rounded-xl border bg-muted/20"><ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.5} maxZoom={1.8} nodesDraggable={false} nodesConnectable={false}><Background gap={20} size={1} /><Controls /></ReactFlow></div>
}
