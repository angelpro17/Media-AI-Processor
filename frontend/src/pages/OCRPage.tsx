import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DropZone from '@/components/ui/DropZone'
import ProgressBar, { WaveLoader } from '@/components/ui/ProgressBar'
import Icon from '@/components/ui/Icon'
import { submitOcr } from '@/services/ocrService'
import { useJobPoller } from '@/hooks/useJobPoller'

export default function OCRPage() {
    const [file, setFile] = useState<File | null>(null)
    const [origUrl, setOrigUrl] = useState<string | null>(null)
    const [langs, setLangs] = useState('es,en')
    const job = useJobPoller()

    function handleFile(f: File): void {
        setFile(f)
        if (origUrl) URL.revokeObjectURL(origUrl)
        setOrigUrl(URL.createObjectURL(f))
        job.reset()
    }

    async function handleProcess(): Promise<void> {
        if (!file) return
        const jobId = await submitOcr(file, langs)
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
            <Helmet>
                <title>Extraer Texto de Imágenes (OCR) — Media-AI-Processor</title>
                <meta name="description" content="Usa Inteligencia Artificial para sacar el texto de cualquier imagen, foto o captura de pantalla gratis y sin internet." />
                <meta name="keywords" content="ocr online, sacar texto de imagen, convertir imagen a texto, extraer texto de foto, escaner ocr, easyocr" />
            </Helmet>
            <div>
                <h1 className="text-2xl font-black text-kick-white mb-1">Escáner OCR Avanzado</h1>
                <p className="text-kick-muted text-sm">Extrae el texto de cualquier imagen instantáneamente de forma local.</p>
            </div>

            <Card>
                <CardHeader
                    title="1. Sube tu imagen"
                    subtitle="PNG, JPG, WEBP — máx. 10 MB"
                    icon={<Icon name="image" className="w-5 h-5 text-kick-green" />}
                />
                {!file ? (
                    <DropZone accept=".png,.jpg,.jpeg,.webp" onFile={handleFile} formats={['PNG', 'JPG', 'WEBP']} maxMB={10} />
                ) : (
                    <div className="flex gap-4 p-4 bg-kick-dark rounded-xl border border-kick-border">
                        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-kick-border">
                            {origUrl && <img src={origUrl} alt="Preview" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex flex-col justify-center flex-1 min-w-0">
                            <p className="text-sm font-semibold text-kick-white truncate">{file.name}</p>
                            <p className="text-xs text-kick-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="sm" icon="x" onClick={handleReset} />
                        </div>
                    </div>
                )}
            </Card>

            <Card>
                <CardHeader title="2. Idiomas del texto" icon={<Icon name="translate" className="w-5 h-5 text-kick-green" />} />
                <div className="flex gap-4 items-center">
                    <input
                        type="text"
                        value={langs}
                        onChange={e => setLangs(e.target.value)}
                        placeholder="Ejemplo: es,en"
                        className="bg-kick-dark border border-kick-border rounded-lg px-4 py-2 text-sm text-kick-white w-full focus:border-kick-green focus:outline-none transition-colors"
                    />
                    <div className="shrink-0 text-xs text-kick-muted w-1/3">
                        Códigos separados por coma.<br />(es = Español, en = Inglés, fr = Francés)
                    </div>
                </div>
            </Card>

            {file && job.status === 'idle' && (
                <Button size="lg" icon="scan" onClick={handleProcess} className="w-full">
                    Escanear Texto
                </Button>
            )}

            {isProcessing && (
                <Card>
                    <WaveLoader label={job.status === 'pending' ? 'Preparando motor...' : 'Escaneando texto con EasyOCR...'} />
                    <ProgressBar value={job.progress} label="Progreso" className="mt-2" />
                </Card>
            )}

            {job.status === 'error' && (
                <div className="flex gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/50">
                    <Icon name="alert" className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-300">Error en el OCR</p>
                        <p className="text-xs text-red-400 mt-0.5">{job.error}</p>
                    </div>
                </div>
            )}

            {job.status === 'done' && (
                <Card glow>
                    <CardHeader
                        title="Texto extraído detectado"
                        subtitle="El texto se ha extraído exitosamente."
                        icon={<Icon name="check" className="w-5 h-5 text-kick-green" />}
                    />
                    <div className="flex gap-3 mt-4">
                        <Button size="lg" icon="download" onClick={handleDownload} className="flex-1">Descargar TXT</Button>
                        <Button variant="outline" size="lg" onClick={handleReset}>Escanear otra imagen</Button>
                    </div>
                </Card>
            )}
        </div>
    )
}
