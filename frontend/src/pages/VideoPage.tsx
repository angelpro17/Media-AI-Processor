import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DropZone from '@/components/ui/DropZone'
import ProgressBar, { WaveLoader } from '@/components/ui/ProgressBar'
import Icon from '@/components/ui/Icon'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { extractAudio } from '@/services/videoService'
import { useJobPoller } from '@/hooks/useJobPoller'

export default function VideoPage() {
    const [file, setFile] = useState<File | null>(null)
    const [showCancelModal, setShowCancelModal] = useState(false)
    const job = useJobPoller('video_job')

    function handleFile(f: File): void {
        setFile(f)
        job.reset()
    }

    async function handleProcess(): Promise<void> {
        if (!file) return
        const jobId = await extractAudio(file)
        job.start(jobId, file.name)
    }

    function handleDownload(): void {
        const a = document.createElement('a')
        a.href = job.downloadUrl!
        a.download = job.filename!
        a.click()
    }

    function handleResetClick(): void {
        if (job.status === 'pending' || job.status === 'processing') {
            setShowCancelModal(true)
        } else {
            performReset()
        }
    }

    function performReset(): void {
        setFile(null)
        job.reset()
        setShowCancelModal(false)
    }

    const isProcessing = job.status === 'pending' || job.status === 'processing'
    const isRestoredJob = !file && job.jobId !== null && job.status !== 'idle'

    return (
        <div className="flex flex-col gap-6">
            <Helmet>
                <title>Extraer Audio de Video — Media-AI-Processor</title>
                <meta name="description" content="Extrae el audio (MP3) de tus videos MP4, AVI, MOV o MKV offline al instante. Conversor de video a audio gratis sin límites de tamaño." />
                <meta name="keywords" content="video a mp3, extraer audio de video, convertir mp4 a mp3, extractor de audio offline, conversor de video gratis" />
            </Helmet>

            <ConfirmModal
                isOpen={showCancelModal}
                title="¿Cancelar extracción?"
                message="La extracción de audio se detendrá y perderás el progreso actual."
                confirmText="Sí, cancelar"
                onConfirm={() => {
                    job.cancel()
                    performReset()
                }}
                onCancel={() => setShowCancelModal(false)}
            />

            <div>
                <h1 className="text-2xl font-black text-kick-white mb-1">Herramientas de Video</h1>
                <p className="text-kick-muted text-sm">Extrae el audio original (MP3) de cualquier video rápidamente con FFmpeg.</p>
            </div>

            <Card>
                <CardHeader
                    title="1. Sube tu video"
                    subtitle="MP4, MKV, AVI, WEBM, MOV — máx. 200 MB"
                    icon={<Icon name="upload" className="w-5 h-5 text-kick-green" />}
                />
                {!file && !isRestoredJob ? (
                    <DropZone accept=".mp4,.mkv,.avi,.mov,.webm" onFile={handleFile} formats={['MP4', 'MKV', 'AVI', 'WEBM', 'MOV']} maxMB={200} />
                ) : (
                    <div className="flex items-center gap-4 p-4 bg-kick-dark rounded-xl border border-kick-border">
                        <div className="p-2.5 rounded-lg bg-kick-green/10 border border-kick-green/20">
                            <Icon name="videoCamera" className="w-5 h-5 text-kick-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-kick-white truncate">{file ? file.name : (job.filename || 'Archivo en proceso')}</p>
                            <p className="text-xs text-kick-muted">
                                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Recuperado de la sesión anterior'}
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" icon="x" onClick={handleResetClick} />
                    </div>
                )}
            </Card>

            {file && job.status === 'idle' && (
                <Button size="lg" icon="audio" onClick={handleProcess} className="w-full">
                    Extraer Audio (MP3)
                </Button>
            )}

            {isProcessing && (
                <Card>
                    <div className="flex justify-between items-start mb-2">
                        <WaveLoader label={job.status === 'pending' ? 'Preparando...' : 'Extrayendo audio a 192kbps...'} />
                        <Button variant="ghost" size="sm" icon="x" onClick={handleResetClick} className="text-kick-muted hover:text-red-400" />
                    </div>
                    <ProgressBar value={job.progress} label="Progreso" className="mt-2" />
                </Card>
            )}

            {job.status === 'error' && (
                <div className="flex justify-between items-center p-4 rounded-xl bg-red-950/40 border border-red-800/50">
                    <div className="flex gap-3">
                        <Icon name="alert" className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-300">Error en la extracción</p>
                            <p className="text-xs text-red-400 mt-0.5">{job.error}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" icon="x" onClick={performReset} />
                </div>
            )}

            {job.status === 'done' && (
                <Card glow>
                    <CardHeader
                        title="Audio extraído"
                        subtitle="El archivo de audio ha sido exportado exitosamente."
                        icon={<Icon name="check" className="w-5 h-5 text-kick-green" />}
                    />
                    <div className="grid gap-4 mb-6 mt-4">
                        <div className="p-4 rounded-xl bg-kick-dark border border-kick-green/30">
                            <p className="text-xs text-kick-green mb-2 font-semibold uppercase tracking-wide">Audio MP3</p>
                            <audio controls src={job.downloadUrl ?? undefined} className="w-full h-10" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button size="lg" icon="download" onClick={handleDownload} className="flex-1">Descargar MP3</Button>
                        <Button variant="outline" size="lg" onClick={performReset}>Extraer de otro video</Button>
                    </div>
                </Card>
            )}
        </div>
    )
}
