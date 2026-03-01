interface ProgressBarProps {
    value?: number
    label?: string
    className?: string
}

export default function ProgressBar({ value = 0, label, className = '' }: ProgressBarProps) {
    const pct = Math.min(100, Math.max(0, value))

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex justify-between items-center text-xs text-kick-muted">
                {label && <span>{label}</span>}
                <span className="text-kick-green font-mono font-semibold ml-auto">{pct}%</span>
            </div>
            <div className="h-1.5 bg-kick-border rounded-full overflow-hidden">
                <div
                    className="h-full bg-kick-green rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${pct}%`, boxShadow: pct > 0 ? '0 0 8px rgba(83,252,24,0.6)' : 'none' }}
                />
            </div>
        </div>
    )
}

interface WaveLoaderProps {
    label?: string
}

export function WaveLoader({ label }: WaveLoaderProps) {
    const delays = [0.0, 0.2, 0.4, 0.2, 0.0, 0.3, 0.5, 0.3, 0.1, 0.4]
    return (
        <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex items-end gap-0.5 h-8">
                {delays.map((delay, i) => (
                    <span key={i} className="wave-bar h-full" style={{ animationDelay: `${delay}s` }} />
                ))}
            </div>
            {label && <p className="text-sm text-kick-muted">{label}</p>}
        </div>
    )
}
