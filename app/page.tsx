'use client';

import { useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRight, Boxes, Braces, Check, CheckCircle2,
  ChevronDown, CircleDot, ClipboardCheck, Copy, Database, Download, FileCheck2,
  Fingerprint, GitBranch, History, KeyRound, LockKeyhole, Play, Radio, Search,
  Server, ShieldCheck, Sparkles, TerminalSquare, UserCheck, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type RunState = 'ready' | 'running' | 'failed' | 'reverifying' | 'verified';

const streamSteps = [
  'Claimed run_9E41 with idempotency key',
  'Replaying 6 typed checks in isolated runner',
  'Captured request and response evidence',
  'Verified SHA-256 integrity for 18 records',
];

export default function Home() {
  const [runState, setRunState] = useState<RunState>('ready');
  const [streamIndex, setStreamIndex] = useState(0);
  const [findingOpen, setFindingOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'evidence' | 'fix' | 'audit'>('evidence');
  const [approved, setApproved] = useState(false);

  const startRun = () => {
    setStreamIndex(0);
    setRunState('running');
    streamSteps.forEach((_, index) => window.setTimeout(() => setStreamIndex(index), index * 560));
    window.setTimeout(() => setRunState(approved ? 'verified' : 'failed'), 2700);
  };

  const approveFix = () => {
    setApproved(true);
    setRunState('reverifying');
    setDetailTab('audit');
    window.setTimeout(() => setRunState('verified'), 1900);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-white/8 bg-[#071018]/92 px-4 backdrop-blur-xl md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg border border-primary/35 bg-primary/10 text-primary shadow-[0_0_30px_rgba(77,226,197,.12)]">
            <Fingerprint className="size-[18px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-[-0.02em]">Verity</span>
              <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-slate-400">study build</span>
            </div>
            <p className="hidden text-[10px] text-slate-500 sm:block">Governed verification control plane</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/5 px-2.5 py-1 text-[11px] text-emerald-200 md:flex">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
            All planes healthy
          </div>
          <button className="grid size-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/5 hover:text-white" aria-label="Search">
            <Search className="size-4" />
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.035] px-2 py-1.5 text-left">
            <span className="grid size-6 place-items-center rounded-md bg-[#263b4b] text-[10px] font-semibold text-white">EA</span>
            <span className="hidden text-xs text-slate-300 md:block">Ellworth A.</span>
            <ChevronDown className="size-3 text-slate-500" />
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-64px)] border-r border-white/8 px-3 py-5 md:block">
          <p className="px-3 text-[9px] font-semibold uppercase tracking-[.16em] text-slate-600">Control plane</p>
          <nav className="mt-2 space-y-1" aria-label="Primary navigation">
            <NavItem icon={Boxes} label="Systems" active />
            <NavItem icon={FileCheck2} label="Specifications" badge="3" />
            <NavItem icon={Activity} label="Runs" />
            <NavItem icon={AlertTriangle} label="Findings" badge="2" />
            <NavItem icon={ShieldCheck} label="Remediations" badge="1" />
          </nav>
          <p className="mt-7 px-3 text-[9px] font-semibold uppercase tracking-[.16em] text-slate-600">Governance</p>
          <nav className="mt-2 space-y-1" aria-label="Governance navigation">
            <NavItem icon={History} label="Audit trail" />
            <NavItem icon={KeyRound} label="Access control" />
            <NavItem icon={Braces} label="API reference" />
          </nav>

          <div className="mt-10 rounded-xl border border-primary/15 bg-primary/[.035] p-3">
            <div className="flex items-center gap-2 text-[11px] font-medium text-primary">
              <LockKeyhole className="size-3.5" /> Execution boundary
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Runner has no database credentials. Results return through one authenticated API.</p>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-5 md:px-7 md:py-7 lg:px-9">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.14em] text-slate-500">
                Systems <span className="text-slate-700">/</span> Production
              </div>
              <h1 className="mt-1.5 text-2xl font-semibold tracking-[-.035em] md:text-[28px]">Orders platform</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">Live dependency coverage, typed evidence, and human-gated remediation across the target boundary.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-9 border-white/10 bg-white/[.025] px-3 text-slate-300 hover:bg-white/5">
                <GitBranch /> View architecture
              </Button>
              <Button
                onClick={startRun}
                disabled={runState === 'running' || runState === 'reverifying'}
                className="h-9 bg-primary px-3 text-[#04110e] shadow-[0_0_24px_rgba(77,226,197,.16)] hover:bg-primary/85"
              >
                {runState === 'running' || runState === 'reverifying' ? <Radio className="animate-pulse" /> : <Play />}
                {runState === 'running' ? 'Verification running' : runState === 'reverifying' ? 'Re-verifying fix' : runState === 'ready' ? 'Run verification' : 'Run again'}
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Reliability score" value={runState === 'verified' ? '94.8' : '91.2'} suffix="/ 100" delta={runState === 'verified' ? '+3.6 after approval' : 'weighted by severity'} tone="mint" />
            <Metric label="Service coverage" value="87%" delta="26 of 30 contracts" tone="blue" />
            <Metric label="Open findings" value={runState === 'verified' ? '1' : '2'} delta={runState === 'verified' ? '1 verified this run' : '1 critical · 1 medium'} tone="amber" />
            <Metric label="Evidence integrity" value="100%" delta="148 hashes verified" tone="mint" />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(330px,.8fr)]">
            <section className="overflow-hidden rounded-2xl border border-white/9 bg-card shadow-[0_18px_70px_rgba(0,0,0,.16)]">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div>
                  <h2 className="text-sm font-medium">System topology</h2>
                  <p className="mt-0.5 text-[11px] text-slate-500">6 services · 8 dependencies · click a service to inspect</p>
                </div>
                <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-emerald-300" /> healthy</span>
                  <span className="flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-amber-300" /> finding</span>
                </div>
              </div>
              <Topology runState={runState} />
            </section>

            <section className="rounded-2xl border border-white/9 bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-medium">Latest verification</h2>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">run_9E41 · manual</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] ${runState === 'running' ? 'border-blue-300/20 bg-blue-300/5 text-blue-200' : runState === 'complete' ? 'border-emerald-300/20 bg-emerald-300/5 text-emerald-200' : 'border-white/10 bg-white/[.03] text-slate-400'}`}>
                  <span className={`size-1.5 rounded-full ${runState === 'running' ? 'animate-pulse bg-blue-300' : runState === 'complete' ? 'bg-emerald-300' : 'bg-slate-500'}`} />
                  {runState === 'running' ? 'streaming' : runState === 'reverifying' ? 're-verifying' : runState === 'verified' ? 'verified' : runState === 'failed' ? 'attention' : 'ready'}
                </span>
              </div>

              <div className="mt-5 rounded-xl border border-white/8 bg-[#08131c] p-3 font-mono text-[10px] leading-6">
                <div className="flex items-center gap-2 text-slate-500"><TerminalSquare className="size-3.5" /> Execution stream</div>
                <div className="mt-2 space-y-1">
                  {streamSteps.map((step, index) => (
                    <p key={step} className={`flex gap-2 transition ${runState === 'ready' || index > streamIndex ? 'text-slate-700' : 'text-slate-300'}`}>
                      <span className={runState !== 'ready' && index <= streamIndex ? 'text-primary' : ''}>{runState !== 'ready' && index <= streamIndex ? '✓' : '·'}</span>{step}
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <RunStat label="passed" value={runState === 'ready' ? '—' : '4'} tone="text-emerald-300" />
                <RunStat label="failed" value={runState === 'ready' ? '—' : runState === 'verified' ? '1' : '2'} tone="text-amber-300" />
                <RunStat label="duration" value={runState === 'failed' || runState === 'verified' ? '2.7s' : runState === 'running' || runState === 'reverifying' ? 'live' : '—'} tone="text-slate-200" />
              </div>
            </section>
          </div>

          <section className="mt-4 overflow-hidden rounded-2xl border border-white/9 bg-card">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <h2 className="text-sm font-medium">Findings requiring attention</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Every result carries immutable, hash-verified evidence.</p>
              </div>
              <button className="flex items-center gap-1 text-[11px] text-primary">View triage <ArrowRight className="size-3" /></button>
            </div>
            <div className="divide-y divide-white/7">
              <FindingRow onClick={() => setFindingOpen(true)} severity="Critical" title="Retry applies the order twice" service="orders-api" evidence="6 records" status={runState === 'verified' ? 'Verified' : runState === 'ready' ? 'Seeded finding' : 'Awaiting approval'} fixed={runState === 'verified'} />
              <FindingRow severity="Medium" title="Payment callback returns 200 with error body" service="callback-api" evidence="4 records" status="Open" />
            </div>
          </section>

          <footer className="mt-5 flex flex-col gap-2 border-t border-white/7 pt-4 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>Independent engineering study by Ellworth Acquaye · not affiliated with any company.</p>
            <p className="font-mono">Cassette replay mode · no external model calls</p>
          </footer>
        </section>
      </div>
      {findingOpen && (
        <FindingDetail
          tab={detailTab}
          onTab={setDetailTab}
          onClose={() => setFindingOpen(false)}
          onApprove={approveFix}
          runState={runState}
          approved={approved}
        />
      )}
    </main>
  );
}

function NavItem({ icon: Icon, label, badge, active = false }: { icon: typeof Boxes; label: string; badge?: string; active?: boolean }) {
  return (
    <button className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition ${active ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-white/[.035] hover:text-slate-200'}`}>
      <Icon className="size-3.5" />
      <span>{label}</span>
      {badge && <span className={`ml-auto rounded px-1.5 py-0.5 font-mono text-[9px] ${active ? 'bg-primary/15' : 'bg-white/5'}`}>{badge}</span>}
    </button>
  );
}

function Metric({ label, value, suffix, delta, tone }: { label: string; value: string; suffix?: string; delta: string; tone: 'mint' | 'blue' | 'amber' }) {
  const colors = { mint: 'text-primary', blue: 'text-blue-300', amber: 'text-amber-300' };
  return (
    <article className="rounded-xl border border-white/9 bg-card px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-[.08em] text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tracking-[-.04em] ${colors[tone]}`}>{value} <span className="text-xs font-normal text-slate-600">{suffix}</span></p>
      <p className="mt-1 text-[10px] text-slate-500">{delta}</p>
    </article>
  );
}

function Topology({ runState }: { runState: RunState }) {
  return (
    <div className="topology-grid relative h-[350px] overflow-hidden p-4 sm:h-[390px]">
      <svg className="absolute inset-0 size-full text-slate-700/80" viewBox="0 0 780 390" preserveAspectRatio="none" aria-hidden="true">
        <path d="M114 196 C190 196 190 92 270 92" />
        <path d="M114 196 C190 196 190 286 270 286" />
        <path d="M358 92 C420 92 422 196 486 196" />
        <path d="M358 286 C420 286 422 196 486 196" />
        <path d="M574 196 C630 196 632 108 692 108" />
        <path d="M574 196 C630 196 632 282 692 282" />
      </svg>
      <ServiceNode className="left-[3%] top-[42%]" icon={Server} name="api-gateway" detail="EDGE · 100%" />
      <ServiceNode className="left-[29%] top-[15%]" icon={Boxes} name="orders-api" detail="API · 83%" warning={runState !== 'verified'} />
      <ServiceNode className="left-[29%] top-[68%]" icon={CircleDot} name="callback-api" detail="API · 75%" warning />
      <ServiceNode className="left-[57%] top-[42%]" icon={Sparkles} name="verification-runner" detail="WORKER · 92%" selected />
      <ServiceNode className="right-[2%] top-[18%]" icon={Database} name="orders-db" detail="POSTGRES · 100%" />
      <ServiceNode className="right-[2%] top-[66%]" icon={Radio} name="run-stream" detail="REDIS · 100%" />
    </div>
  );
}

function ServiceNode({ className, icon: Icon, name, detail, warning, selected }: { className: string; icon: typeof Server; name: string; detail: string; warning?: boolean; selected?: boolean }) {
  return (
    <button className={`absolute z-10 w-[128px] -translate-y-1/2 rounded-xl border p-3 text-left shadow-[0_12px_34px_rgba(0,0,0,.28)] transition hover:-translate-y-[53%] sm:w-[146px] ${selected ? 'border-primary/45 bg-[#10272a] ring-1 ring-primary/10' : 'border-white/10 bg-[#0c1923] hover:border-white/20'} ${className}`}>
      <div className="flex items-center justify-between">
        <span className={`grid size-7 place-items-center rounded-lg ${selected ? 'bg-primary/15 text-primary' : 'bg-white/5 text-slate-400'}`}><Icon className="size-3.5" /></span>
        <span className={`size-1.5 rounded-full ${warning ? 'bg-amber-300 shadow-[0_0_8px_#fcd34d]' : 'bg-emerald-300 shadow-[0_0_8px_#6ee7b7]'}`} />
      </div>
      <p className="mt-3 truncate font-mono text-[10px] font-medium text-slate-200">{name}</p>
      <p className="mt-0.5 font-mono text-[8px] tracking-wide text-slate-600">{detail}</p>
    </button>
  );
}

function RunStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="rounded-lg bg-white/[.025] py-2"><p className={`font-mono text-base font-medium ${tone}`}>{value}</p><p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-600">{label}</p></div>;
}

function FindingRow({ severity, title, service, evidence, status, fixed, onClick }: { severity: string; title: string; service: string; evidence: string; status: string; fixed?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="grid w-full gap-3 px-5 py-3.5 text-left transition hover:bg-white/[.02] sm:grid-cols-[88px_minmax(0,1fr)_110px_120px] sm:items-center">
      <span className={`w-fit rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${fixed ? 'border-emerald-300/20 bg-emerald-300/5 text-emerald-300' : severity === 'Critical' ? 'border-red-300/20 bg-red-300/5 text-red-300' : 'border-amber-300/20 bg-amber-300/5 text-amber-300'}`}>{fixed ? 'Verified' : severity}</span>
      <span><span className="block text-xs font-medium text-slate-200">{title}</span><span className="mt-0.5 block font-mono text-[9px] text-slate-600">{service}</span></span>
      <span className="flex items-center gap-1.5 font-mono text-[9px] text-slate-500"><FileCheck2 className="size-3" /> {evidence}</span>
      <span className={`text-[10px] ${fixed ? 'text-emerald-300' : 'text-slate-400'}`}>{status}</span>
    </button>
  );
}

function FindingDetail({ tab, onTab, onClose, onApprove, runState, approved }: {
  tab: 'evidence' | 'fix' | 'audit';
  onTab: (tab: 'evidence' | 'fix' | 'audit') => void;
  onClose: () => void;
  onApprove: () => void;
  runState: RunState;
  approved: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Finding detail">
      <button className="absolute inset-0 cursor-default" aria-label="Close finding detail" onClick={onClose} />
      <section className="relative flex h-full w-full max-w-[680px] flex-col border-l border-white/10 bg-[#09141d] shadow-[-30px_0_90px_rgba(0,0,0,.38)]">
        <header className="border-b border-white/8 px-5 py-4 sm:px-7">
          <div className="flex items-start gap-4">
            <span className={`mt-0.5 rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${runState === 'verified' ? 'border-emerald-300/20 bg-emerald-300/5 text-emerald-300' : 'border-red-300/20 bg-red-300/5 text-red-300'}`}>{runState === 'verified' ? 'Verified' : 'Critical'}</span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] uppercase tracking-wider text-slate-600">FND-1042 · orders-api</p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-.02em]">Retry applies the order twice</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">The write path does not claim an idempotency key before persistence. Replaying the same request created a second order and ledger posting.</p>
            </div>
            <button onClick={onClose} className="grid size-8 place-items-center rounded-lg border border-white/10 text-slate-500 hover:bg-white/5 hover:text-white" aria-label="Close"><X className="size-4" /></button>
          </div>
          <div className="mt-5 flex gap-1 border-b border-white/8">
            <DetailTab label="Evidence" count="6" active={tab === 'evidence'} onClick={() => onTab('evidence')} />
            <DetailTab label="Proposed fix" active={tab === 'fix'} onClick={() => onTab('fix')} />
            <DetailTab label="Audit" count={approved ? '4' : '2'} active={tab === 'audit'} onClick={() => onTab('audit')} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {tab === 'evidence' && <EvidencePanel />}
          {tab === 'fix' && <FixPanel />}
          {tab === 'audit' && <AuditPanel approved={approved} verified={runState === 'verified'} reverifying={runState === 'reverifying'} />}
        </div>

        <footer className="border-t border-white/8 bg-[#08121a] px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-[10px] text-slate-500"><LockKeyhole className="size-3.5 text-primary" /> No automated approval path exists.</p>
            {runState === 'verified' ? (
              <span className="flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/5 px-3 py-2 text-xs font-medium text-emerald-300"><CheckCircle2 className="size-4" /> Fix approved and verified</span>
            ) : approved ? (
              <span className="flex items-center gap-2 rounded-lg border border-blue-300/20 bg-blue-300/5 px-3 py-2 text-xs text-blue-200"><Radio className="size-4 animate-pulse" /> Re-verifying in staging</span>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" className="border-white/10 bg-transparent text-slate-300">Reject</Button>
                <Button onClick={onApprove} className="bg-primary text-[#04110e] hover:bg-primary/85"><UserCheck /> Approve as Ellworth</Button>
              </div>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}

function DetailTab({ label, count, active, onClick }: { label: string; count?: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`relative px-3 py-2.5 text-[11px] transition ${active ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}>{label}{count && <span className="ml-1.5 rounded bg-white/5 px-1.5 py-0.5 font-mono text-[8px]">{count}</span>}{active && <i className="absolute inset-x-2 -bottom-px h-px bg-primary" />}</button>;
}

function EvidencePanel() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div><h3 className="text-sm font-medium">Typed evidence bundle</h3><p className="mt-0.5 text-[10px] text-slate-500">Captured before persistence · secrets redacted</p></div>
        <Button variant="outline" size="sm" className="border-white/10 bg-transparent text-slate-300"><Download /> Export signed JSON</Button>
      </div>
      <div className="mt-4 space-y-3">
        <EvidenceCard type="REQUEST" time="14:02:11.084" hash="b2d7…93af" body={'POST /orders\nIdempotency-Key: order-demo-1842\n{ "sku": "MTR-440", "quantity": 1 }'} />
        <EvidenceCard type="RESPONSE" time="14:02:11.126" hash="082a…e7d1" body={'HTTP 201 Created\n{ "orderId": "ord_7CK1", "status": "accepted" }'} />
        <EvidenceCard type="ASSERTION" time="14:02:11.244" hash="f413…0ae9" body={'replay.count expected: 1\nreplay.count actual:   2\nresult: FAIL'} failing />
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/[.035] p-3 text-[10px] text-slate-400"><Fingerprint className="size-4 text-primary" /><span>All 6 records verified against their SHA-256 digest on read.</span></div>
    </div>
  );
}

function EvidenceCard({ type, time, hash, body, failing }: { type: string; time: string; hash: string; body: string; failing?: boolean }) {
  return <article className={`overflow-hidden rounded-xl border ${failing ? 'border-red-300/15' : 'border-white/8'} bg-[#07121a]`}><header className="flex items-center border-b border-white/7 px-3 py-2 font-mono text-[9px]"><span className={failing ? 'text-red-300' : 'text-primary'}>{type}</span><span className="ml-3 text-slate-600">{time}</span><span className="ml-auto text-slate-600">sha256:{hash}</span><Copy className="ml-2 size-3 text-slate-600" /></header><pre className={`overflow-x-auto p-3 font-mono text-[10px] leading-5 ${failing ? 'text-red-100/80' : 'text-slate-400'}`}>{body}</pre></article>;
}

function FixPanel() {
  return (
    <div>
      <div className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-4"><ShieldCheck className="mt-0.5 size-4 text-amber-300" /><div><h3 className="text-xs font-medium text-amber-100">Policy-constrained proposal</h3><p className="mt-1 text-[10px] leading-relaxed text-slate-500">Path allowlisted · 14 changed lines · no auth, migration, CI, or dependency files touched · staged copy only.</p></div></div>
      <div className="mt-4 overflow-hidden rounded-xl border border-white/8 bg-[#07121a] font-mono text-[10px]"><div className="border-b border-white/7 px-3 py-2 text-slate-500">apps/target/src/routes/orders.ts</div><pre className="overflow-x-auto p-3 leading-5 text-slate-400"><span className="text-slate-600">@@ -42,6 +42,12 @@</span>{'\n'}<span className="text-red-300">- const order = await orders.create(input)</span>{'\n'}<span className="text-emerald-300">+ const claim = await idempotency.claim(key)</span>{'\n'}<span className="text-emerald-300">+ if (claim.replayed) return claim.response</span>{'\n'}<span className="text-emerald-300">+ const order = await orders.create(input)</span>{'\n'}<span className="text-emerald-300">+ await idempotency.complete(key, order)</span>{'\n'}  return reply.status(201).send(order)</pre></div>
      <div className="mt-4"><h3 className="text-xs font-medium">Rationale</h3><p className="mt-2 text-[11px] leading-6 text-slate-400">Claim the request key before the write, return the stored response for a replay, and complete the claim only after persistence. Duplicate delivery becomes observably harmless without weakening the transactional boundary.</p></div>
    </div>
  );
}

function AuditPanel({ approved, verified, reverifying }: { approved: boolean; verified: boolean; reverifying: boolean }) {
  const events = [
    { icon: Play, title: 'Verification triggered', actor: 'Ellworth Acquaye · engineer', time: '14:02:08' },
    { icon: AlertTriangle, title: 'Finding FND-1042 recorded', actor: 'verification-runner · service', time: '14:02:11' },
    ...(approved ? [{ icon: UserCheck, title: 'Remediation approved', actor: 'Ellworth Acquaye · approver', time: '14:03:02' }] : []),
    ...(reverifying ? [{ icon: Radio, title: 'Staging verification running', actor: 'remediation-worker · service', time: 'now' }] : []),
    ...(verified ? [{ icon: ClipboardCheck, title: 'Fix applied and verified', actor: 'remediation-worker · service', time: '14:03:04' }] : []),
  ];
  return <div><div className="flex items-center justify-between"><div><h3 className="text-sm font-medium">Append-only decision trail</h3><p className="mt-0.5 text-[10px] text-slate-500">Hash-chained to the previous event</p></div><span className="font-mono text-[9px] text-primary">CHAIN VALID</span></div><div className="relative mt-5 space-y-5 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-white/8">{events.map(({ icon: Icon, title, actor, time }) => <div key={title} className="relative flex gap-3"><span className="z-10 grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-[#0d1c26] text-primary"><Icon className="size-3.5" /></span><div className="flex-1 pt-0.5"><div className="flex justify-between gap-3"><p className="text-xs font-medium text-slate-200">{title}</p><time className="font-mono text-[9px] text-slate-600">{time}</time></div><p className="mt-1 text-[10px] text-slate-500">{actor}</p></div></div>)}</div></div>;
}
