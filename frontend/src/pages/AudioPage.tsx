import { useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DropZone from '@/components/ui/DropZone'
import ProgressBar, { WaveLoader } from '@/components/ui/ProgressBar'
import Icon from '@/components/ui/Icon'
import { submitAudio } from '@/services/audioService'
import { useJobPoller } from '@/hooks/useJobPoller'
import type { ProcessingMode } from '@/types/ui'

interface ModeOption {
    id: ProcessingMode
    label: string
    icon: 'lightning' | 'diamond'
    desc: string
}

const MODES: ModeOption[] = [
    { id: 'fast', label: 'Rápido', icon: 'lightning', desc: 'DeepFilterNet3 · PESQ ≈ 3.7–4.0 · ~10s' },
    { id: 'premium', label: 'Premium', icon: 'diamond', desc: 'DF3 + noisereduce · PESQ ≈ 4.0+ · ~30s' },
]

export default function AudioPage() {
    const [file, setFile] = useState<File | null>(null)
    const [mode, setMode] = useState<ProcessingMode>('fast')
    const [origUrl, setOrigUrl] = useState<string | null>(null)
    const job = useJobPoller()

    function handleFile(f: File): void {
        setFile(f)
        if (origUrl) URL.revokeObjectURL(origUrl)
        setOrigUrl(URL.createObjectURL(f))
        job.reset()
    }

    async function handleProcess(): Promise<void> {
        if (!file) return
        const jobId = await submitAudio(file, mode)
        job.start(jobId)
    }

    function handleDownload(): void {
        const a = document.createElement('a')
        a.href = job.downloadUrl!
        a.download = job.filename!
        a.click()
    }

    function handleReset(): void {
        setFile(null)
        if (origUrl) URL.revokeObjectURL(origUrl)
        setOrigUrl(null)
        job.reset()
    }

    const isProcessing = job.status === 'pending' || job.status === 'processing'

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            <div>
                <h1 className="text-2xl font-black text-kick-white mb-1">Limpieza de Audio AI</h1>
                <p className="text-kick-muted text-sm">Elimina el ruido de fondo con DeepFilterNet3 — calidad broadcast garantizada.</p>
            </div>

            <Card>
                <CardHeader
                    title="1. Sube tu audio"
                    subtitle="MP3, WAV, OGG, FLAC o M4A — máx. 100 MB"
                    icon={<Icon name="upload" className="w-5 h-5 text-kick-green" />}
                />
                {!file ? (
                    <DropZone accept=".mp3,.wav,.ogg,.flac,.m4a" onFile={handleFile} formats={['MP3', 'WAV', 'OGG', 'FLAC', 'M4A']} maxMB={100} />
                ) : (
                    <div className="flex items-center gap-4 p-4 bg-kick-dark rounded-xl border border-kick-border">
                        <div className="p-2.5 rounded-lg bg-kick-green/10 border border-kick-green/20">
                            <Icon name="audio" className="w-5 h-5 text-kick-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-kick-white truncate">{file.name}</p>
                            <p className="text-xs text-kick-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button variant="ghost" size="sm" icon="x" onClick={handleReset} />
                    </div>
                )}
            </Card>

            <Card>
                <CardHeader title="2. Modo de procesamiento" icon={<Icon name="lightning" className="w-5 h-5 text-kick-green" />} />
                <div className="grid grid-cols-2 gap-3">
                    {MODES.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={[
                                'flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-150',
                                mode === m.id ? 'border-kick-green bg-kick-green/10 shadow-green-sm' : 'border-kick-border bg-kick-dark hover:border-kick-green/30',
                            ].join(' ')}
                        >
                            <Icon name={m.icon} className={`w-5 h-5 shrink-0 ${mode === m.id ? 'text-kick-green' : 'text-kick-muted'}`} />
                            <div>
                                <p className={`text-sm font-bold ${mode === m.id ? 'text-kick-green' : 'text-kick-white'}`}>{m.label}</p>
                                <p className="text-xs text-kick-muted mt-0.5 leading-tight">{m.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>

            {file && job.status === 'idle' && (
                <Button size="lg" icon="waveform" onClick={handleProcess} className="w-full">
                    Limpiar audio
                </Button>
            )}

            {isProcessing && (
                <Card>
                    <WaveLoader label={job.status === 'pending' ? 'Iniciando procesamiento…' : 'Procesando con DeepFilterNet3…'} />
                    <ProgressBar value={job.progress} label="Progreso" className="mt-2" />
                </Card>
            )}

            {job.status === 'error' && (
                <div className="flex gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/50">
                    <Icon name="alert" className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-300">Error en el procesamiento</p>
                        <p className="text-xs text-red-400 mt-0.5">{job.error}</p>
                    </div>
                </div>
            )}

            {job.status === 'done' && (
                <Card glow>
                    <CardHeader
                        title="Audio limpio listo"
                        subtitle="Compara el original con el procesado y descarga el resultado."
                        icon={<Icon name="check" className="w-5 h-5 text-kick-green" />}
                    />
                    <div className="grid gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-kick-dark border border-kick-border">
                            <p className="text-xs text-kick-muted mb-2 font-semibold uppercase tracking-wide">Original</p>
                            <audio controls src={origUrl ?? undefined} className="w-full h-10" />
                        </div>
                        <div className="p-4 rounded-xl bg-kick-dark border border-kick-green/30">
                            <p className="text-xs text-kick-green mb-2 font-semibold uppercase tracking-wide">Sin ruido</p>
                            <audio controls src={job.downloadUrl ?? undefined} className="w-full h-10" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button size="lg" icon="download" onClick={handleDownload} className="flex-1">Descargar MP3</Button>
                        <Button variant="outline" size="lg" onClick={handleReset}>Nueva limpieza</Button>
                    </div>
                </Card>
            )}
        </div>
    )
}
