import { useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DropZone from '@/components/ui/DropZone'
import ProgressBar, { WaveLoader } from '@/components/ui/ProgressBar'
import Icon from '@/components/ui/Icon'
import { submitDoc, submitMerge, submitSplit, submitCompress } from '@/services/docsService'
import { useJobPoller } from '@/hooks/useJobPoller'
import { CONVERSIONS, ACCEPT_EXTS } from '@/constants/conversions'
import type { Conversion } from '@/types/conversion'

type TabId = 'convert' | 'merge' | 'split' | 'compress'

export default function DocsPage() {
    const [tab, setTab] = useState<TabId>('convert')
    const [conversion, setConversion] = useState<Conversion>(CONVERSIONS[0])

    // File states
    const [file, setFile] = useState<File | null>(null)
    const [files, setFiles] = useState<File[]>([])

    // Split states
    const [startPage, setStartPage] = useState(1)
    const [endPage, setEndPage] = useState(-1)

    const job = useJobPoller()

    const isProcessing = job.status === 'pending' || job.status === 'processing'

    function handleTab(t: TabId): void {
        setTab(t)
        setFile(null)
        setFiles([])
        job.reset()
    }

    function handleConversion(c: Conversion): void {
        setConversion(c)
        setFile(null)
        job.reset()
    }

    function handleFile(f: File): void {
        setFile(f)
        job.reset()
    }

    function handleFiles(fs: File[]): void {
        setFiles(fs)
        job.reset()
    }

    async function handleAction(): Promise<void> {
        let jobId = ''
        if (tab === 'convert' && file) {
            jobId = await submitDoc(file, conversion.outputExt)
        } else if (tab === 'merge' && files.length >= 2) {
            jobId = await submitMerge(files)
        } else if (tab === 'split' && file) {
            jobId = await submitSplit(file, startPage, endPage)
        } else if (tab === 'compress' && file) {
            jobId = await submitCompress(file)
        }

        if (jobId) job.start(jobId)
    }

    function handleDownload(): void {
        const a = document.createElement('a')
        a.href = job.downloadUrl!
        a.download = job.filename!
        a.click()
    }

    function handleReset(): void {
        setFile(null)
        setFiles([])
        job.reset()
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            <div>
                <h1 className="text-2xl font-black text-kick-white mb-1">Herramientas de Documentos</h1>
                <p className="text-kick-muted text-sm">Convierte libremente y manipula PDFs (unir, dividir, comprimir) completamente gratis.</p>
            </div>

            <div className="border-b border-kick-border">
                <div className="flex overflow-x-auto hide-scrollbar gap-2">
                    {[
                        { id: 'convert', label: 'Convertir Documentos', icon: 'document' as const },
                        { id: 'merge', label: 'Unir PDFs', icon: 'layers' as const },
                        { id: 'split', label: 'Dividir PDF', icon: 'scissors' as const },
                        { id: 'compress', label: 'Comprimir PDF', icon: 'compress' as const },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleTab(t.id as TabId)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold whitespace-nowrap transition-colors ${tab === t.id ? 'border-kick-green text-kick-green bg-kick-green/5' : 'border-transparent text-kick-muted hover:text-kick-white hover:bg-kick-dark'
                                }`}
                        >
                            <Icon name={t.icon} className="w-4 h-4" />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB: CONVERT */}
            {tab === 'convert' && (
                <>
                    <Card>
                        <CardHeader title="1. Elige el tipo de conversión" icon={<Icon name="document" className="w-5 h-5 text-kick-green" />} />
                        <div className="grid grid-cols-2 gap-2">
                            {CONVERSIONS.map(c => {
                                const active = conversion.inputExt === c.inputExt && conversion.outputExt === c.outputExt
                                return (
                                    <button
                                        key={`${c.inputExt}-${c.outputExt}`}
                                        onClick={() => handleConversion(c)}
                                        className={[
                                            'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150',
                                            active ? 'border-kick-green bg-kick-green/10' : 'border-kick-border bg-kick-dark hover:border-kick-green/30',
                                        ].join(' ')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-mono font-bold text-kick-muted bg-kick-border px-1.5 py-0.5 rounded">{c.inputLabel}</span>
                                            <Icon name="arrows" className="w-3 h-3 text-kick-muted" />
                                            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${active ? 'bg-kick-green/20 text-kick-green' : 'bg-kick-border text-kick-white'}`}>{c.outputLabel}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader
                            title={`2. Sube tu archivo ${conversion.inputLabel}`}
                            subtitle="Máximo 50 MB"
                            icon={<Icon name="upload" className="w-5 h-5 text-kick-green" />}
                        />
                        {!file ? (
                            <DropZone accept={ACCEPT_EXTS[conversion.inputExt]} onFile={handleFile} formats={[conversion.inputLabel]} maxMB={50} />
                        ) : (
                            <div className="flex items-center gap-4 p-4 bg-kick-dark rounded-xl border border-kick-border">
                                <div className="p-2.5 rounded-lg bg-kick-green/10 border border-kick-green/20">
                                    <Icon name="document" className="w-5 h-5 text-kick-green" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-kick-white truncate">{file.name}</p>
                                    <p className="text-xs text-kick-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <Button variant="ghost" size="sm" icon="x" onClick={handleReset} />
                            </div>
                        )}
                    </Card>

                    {file && job.status === 'idle' && (
                        <Button size="lg" icon="document" onClick={handleAction} className="w-full">
                            Convertir a {conversion.outputLabel}
                        </Button>
                    )}
                </>
            )}

            {/* TAB: MERGE */}
            {tab === 'merge' && (
                <>
                    <Card>
                        <CardHeader
                            title="Unir múltiples archivos PDF"
                            subtitle="Sube al menos 2 PDFs"
                            icon={<Icon name="layers" className="w-5 h-5 text-kick-green" />}
                        />
                        {files.length === 0 ? (
                            <DropZone multiple onFiles={handleFiles} accept=".pdf" formats={['PDF']} maxMB={50} label="Arrastra tus PDFs aquí" />
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="p-4 bg-kick-dark rounded-xl border border-kick-border max-h-[300px] overflow-y-auto">
                                    {files.map((f, i) => (
                                        <div key={i} className={`flex items-center gap-3 py-2 ${i > 0 ? 'border-t border-kick-border' : ''}`}>
                                            <Icon name="pdf" className="w-4 h-4 text-kick-green" />
                                            <p className="text-sm text-kick-white flex-1 truncate">{f.name}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-xs text-kick-muted">{files.length} archivos añadidos</span>
                                    <Button variant="ghost" size="sm" icon="x" onClick={handleReset}>Limpiar</Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {files.length >= 2 && job.status === 'idle' && (
                        <Button size="lg" icon="layers" onClick={handleAction} className="w-full">
                            Unir PDFs ahora
                        </Button>
                    )}
                </>
            )}

            {/* TAB: SPLIT */}
            {tab === 'split' && (
                <>
                    <Card>
                        <CardHeader
                            title="Dividir archivo PDF"
                            subtitle="Sube el archivo e indica las páginas"
                            icon={<Icon name="scissors" className="w-5 h-5 text-kick-green" />}
                        />
                        {!file ? (
                            <DropZone accept=".pdf" onFile={handleFile} formats={['PDF']} maxMB={50} />
                        ) : (
                            <div className="flex items-center gap-4 p-4 bg-kick-dark rounded-xl border border-kick-border">
                                <Icon name="pdf" className="w-6 h-6 text-kick-green shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-kick-white truncate">{file.name}</p>
                                </div>
                                <Button variant="ghost" size="sm" icon="x" onClick={handleReset} />
                            </div>
                        )}

                        {file && (
                            <div className="flex gap-4 mt-6 items-center">
                                <div className="flex-1">
                                    <label className="text-xs text-kick-muted uppercase tracking-wider font-bold mb-2 block">Pág. Inicial</label>
                                    <input type="number" min="1" value={startPage} onChange={(e) => setStartPage(Number(e.target.value))} className="w-full bg-black border border-kick-border rounded-lg p-3 text-kick-white" />
                                </div>
                                <div className="pt-6">
                                    <Icon name="arrows" className="w-4 h-4 text-kick-muted" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-kick-muted uppercase tracking-wider font-bold mb-2 block">Pág. Final (-1 = Fin)</label>
                                    <input type="number" min="-1" value={endPage} onChange={(e) => setEndPage(Number(e.target.value))} className="w-full bg-black border border-kick-border rounded-lg p-3 text-kick-white" />
                                </div>
                            </div>
                        )}
                    </Card>

                    {file && job.status === 'idle' && (
                        <Button size="lg" icon="scissors" onClick={handleAction} className="w-full">
                            Extraer Páginas
                        </Button>
                    )}
                </>
            )}

            {/* TAB: COMPRESS */}
            {tab === 'compress' && (
                <>
                    <Card>
                        <CardHeader
                            title="Comprimir archivo PDF"
                            subtitle="Reduce el peso del archivo sin perder legibilidad"
                            icon={<Icon name="compress" className="w-5 h-5 text-kick-green" />}
                        />
                        {!file ? (
                            <DropZone accept=".pdf" onFile={handleFile} formats={['PDF']} maxMB={100} />
                        ) : (
                            <div className="flex items-center gap-4 p-4 bg-kick-dark rounded-xl border border-kick-border">
                                <Icon name="pdf" className="w-6 h-6 text-kick-green" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-kick-white truncate">{file.name}</p>
                                    <p className="text-xs text-kick-muted">Original: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <Button variant="ghost" size="sm" icon="x" onClick={handleReset} />
                            </div>
                        )}
                    </Card>

                    {file && job.status === 'idle' && (
                        <Button size="lg" icon="compress" onClick={handleAction} className="w-full">
                            Comprimir Archivo
                        </Button>
                    )}
                </>
            )}

            {isProcessing && (
                <Card>
                    <WaveLoader label={tab === 'convert' ? 'Convirtiendo...' : tab === 'merge' ? 'Uniendo PDFs...' : tab === 'split' ? 'Dividiendo...' : 'Comprimiendo...'} />
                    <ProgressBar value={job.progress} label="Progreso" className="mt-2" />
                </Card>
            )}

            {job.status === 'error' && (
                <div className="flex gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/50 mt-2">
                    <Icon name="alert" className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-red-300">Error</p>
                        <p className="text-xs text-red-400 mt-0.5">{job.error}</p>
                    </div>
                </div>
            )}

            {job.status === 'done' && (
                <Card glow>
                    <CardHeader
                        title="Proceso completado"
                        subtitle="Tu documento está listo para descargar."
                        icon={<Icon name="check" className="w-5 h-5 text-kick-green" />}
                    />
                    <div className="flex gap-3">
                        <Button size="lg" icon="download" onClick={handleDownload} className="flex-1">
                            Descargar Archivo
                        </Button>
                        <Button variant="outline" size="lg" onClick={handleReset}>Hacer otro</Button>
                    </div>
                </Card>
            )}
        </div>
    )
}
