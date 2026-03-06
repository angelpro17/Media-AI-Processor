import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DropZone from '@/components/ui/DropZone'
import ProgressBar, { WaveLoader } from '@/components/ui/ProgressBar'
import Icon from '@/components/ui/Icon'
import { submitTranscription } from '@/services/transcriptionService'
import { useJobPoller } from '@/hooks/useJobPoller'

const MODELS = [
    { id: 'tiny', label: 'Tiny', desc: 'Rápido, menor precisión' },
    { id: 'base', label: 'Base', desc: 'Equilibrado (Recomendado)' },
    { id: 'small', label: 'Small', desc: 'Mayor precisión, más lento' },
    { id: 'medium', label: 'Medium', desc: 'Alta precisión, muy lento' }
]

const FORMATS = [
    { id: 'txt', label: 'Texto plano (.txt)' },
    { id: 'srt', label: 'Subtítulos (.srt)' },
    { id: 'vtt', label: 'Subtítulos Web (.vtt)' }
]

export default function TranscriptionPage() {
    const [file, setFile] = useState<File | null>(null)
    const [modelSize, setModelSize] = useState('base')
    const [format, setFormat] = useState('txt')
    const job = useJobPoller()

    function handleFile(f: File): void {
        setFile(f)
        job.reset()
    }

    async function handleProcess(): Promise<void> {
        if (!file) return
        const jobId = await submitTranscription(file, modelSize, format)
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
        job.reset()
    }

    const isProcessing = job.status === 'pending' || job.status === 'processing'

    return (
        <div className="flex flex-col gap-6">
            <Helmet>
                <title>Transcribir Audio y Video a Texto — Media-AI-Processor</title>
                <meta name="description" content="Convierte voz, dictados, entrevistas y videos a texto o subtítulos (SRT, VTT) usando IA (Whisper) gratis y sin conexión a internet." />
                <meta name="keywords" content="transcribir audio a texto, video a texto, conversor audio a texto, crear subtitulos automáticos, whisper ia, offline" />
            </Helmet>
            <div>
                <h1 className="text-2xl font-black text-kick-white mb-1">Transcripción Inteligente</h1>
                <p className="text-kick-muted text-sm">Convierte audio y video a texto o subtítulos usando OpenAI Whisper localmente.</p>
            </div>

            <Card>
                <CardHeader
                    title="1. Sube tu archivo"
                    subtitle="MP3, WAV, M4A, MP4, MKV — máx. 100 MB"
                    icon={<Icon name="upload" className="w-5 h-5 text-kick-green" />}
                />
                {!file ? (
                    <DropZone accept=".mp3,.wav,.ogg,.flac,.m4a,.mp4,.mkv,.avi,.mov" onFile={handleFile} formats={['Audio', 'Video']} maxMB={100} />
                ) : (
                    <div className="flex items-center gap-4 p-4 bg-kick-dark rounded-xl border border-kick-border">
                        <div className="p-2.5 rounded-lg bg-kick-green/10 border border-kick-green/20">
                            <Icon name="mic" className="w-5 h-5 text-kick-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-kick-white truncate">{file.name}</p>
                            <p className="text-xs text-kick-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <Button variant="ghost" size="sm" icon="x" onClick={handleReset} />
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader title="Modelo de IA" icon={<Icon name="lightning" className="w-5 h-5 text-kick-green" />} />
                    <div className="flex flex-col gap-2">
                        {MODELS.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setModelSize(m.id)}
                                className={`flex flex-col text-left p-3 rounded-xl border transition-all ${modelSize === m.id ? 'border-kick-green bg-kick-green/10 shadow-green-sm' : 'border-kick-border bg-kick-dark hover:border-kick-green/30'
                                    }`}
                            >
                                <span className={`text-sm font-bold ${modelSize === m.id ? 'text-kick-green' : 'text-kick-white'}`}>{m.label}</span>
                                <span className="text-xs text-kick-muted mt-0.5">{m.desc}</span>
                            </button>
                        ))}
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Formato de salida" icon={<Icon name="document" className="w-5 h-5 text-kick-green" />} />
                    <div className="flex flex-col gap-2">
                        {FORMATS.map(f => (
                            <button
                                key={f.id}
                                onClick={() => setFormat(f.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${format === f.id ? 'border-kick-green bg-kick-green/10 shadow-green-sm' : 'border-kick-border bg-kick-dark hover:border-kick-green/30'
                                    }`}
                            >
                                <Icon name="check" className={`w-4 h-4 ${format === f.id ? 'text-kick-green' : 'opacity-0'}`} />
                                <span className={`text-sm font-bold truncate ${format === f.id ? 'text-kick-green' : 'text-kick-white'}`}>{f.label}</span>
                            </button>
                        ))}
                    </div>
                </Card>
            </div>

            {file && job.status === 'idle' && (
                <Button size="lg" icon="mic" onClick={handleProcess} className="w-full">
                    Iniciar transcripción
                </Button>
            )}

            {isProcessing && (
                <Card>
                    <WaveLoader label={job.status === 'pending' ? 'Preparando...' : 'Transcribiendo con OpenAI Whisper...'} />
                    <ProgressBar value={job.progress} label="Progreso" className="mt-2" />
                </Card>
            )}

            {job.status === 'error' && (
                <div className="flex gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/50">
                    <Icon name="alert" className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-300">Error en la transcripción</p>
                        <p className="text-xs text-red-400 mt-0.5">{job.error}</p>
                    </div>
                </div>
            )}

            {job.status === 'done' && (
                <Card glow>
                    <CardHeader
                        title="Transcripción lista"
                        subtitle="Tu archivo ha sido procesado exitosamente."
                        icon={<Icon name="check" className="w-5 h-5 text-kick-green" />}
                    />
                    <div className="flex gap-3 mt-4">
                        <Button size="lg" icon="download" onClick={handleDownload} className="flex-1">Descargar {format.toUpperCase()}</Button>
                        <Button variant="outline" size="lg" onClick={handleReset}>Subir otro archivo</Button>
                    </div>
                </Card>
            )}
        </div>
    )
}
