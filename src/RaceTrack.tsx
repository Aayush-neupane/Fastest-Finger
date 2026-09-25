export interface Lane {
  name: string
  value: number
  bar: string
  dot: string
  glow?: string
  dim?: boolean
}

interface Props {
  lanes: Lane[]
  wpm: number
  label?: string
}

/** Head-to-head lanes: you vs ghosts and rivals. */
export default function RaceTrack({ lanes, wpm, label }: Props) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="uppercase tracking-[0.2em] text-zinc-500">{label ?? 'Live'}</span>
        <span className="tabular-nums text-zinc-100">
          <span className="text-2xl font-bold text-yellow-400">{wpm}</span>{' '}
          <span className="uppercase tracking-[0.2em] text-zinc-500">wpm</span>
        </span>
      </div>
      {lanes.map((lane) => (
        <div key={lane.name}>
          <div className="mb-1 flex items-center justify-between font-mono text-[11px]">
            <span className={lane.dim ? 'text-zinc-500' : 'text-zinc-100'}>
              {lane.name}
            </span>
            <span className="tabular-nums text-zinc-500">
              {Math.round(lane.value * 100)}%
            </span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${lane.bar} transition-[width] duration-150`}
              style={{ width: `${Math.round(lane.value * 100)}%` }}
            />
            <div
              className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${lane.dot} ${lane.glow ?? 'shadow-[0_0_12px_rgba(250,204,21,0.7)]'}`}
              style={{ left: `${Math.round(lane.value * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
