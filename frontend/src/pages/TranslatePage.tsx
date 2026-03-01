import { useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import DropZone from '@/components/ui/DropZone'
import ProgressBar, { WaveLoader } from '@/components/ui/ProgressBar'
import Icon from '@/components/ui/Icon'
import { translate, translateDocument } from '@/services/translateService'
import { useJobPoller } from '@/hooks/useJobPoller'
import type { TranslationDirection, DirectionOption } from '@/types/translation'

const DIRECTIONS: DirectionOption[] = [
    { id: 'es-en', from: 'Español', to: 'Inglés' },
    { id: 'en-es', from: 'Inglés', to: 'Español' },
    { id: 'es-fr', from: 'Español', to: 'Francés' },
    { id: 'fr-es', from: 'Francés', to: 'Español' },
    { id: 'es-pt', from: 'Español', to: 'Portugués' },
    { id: 'pt-es', from: 'Portugués', to: 'Español' },
    { id: 'es-it', from: 'Español', to: 'Italiano' },
    { id: 'it-es', from: 'Italiano', to: 'Español' },
    { id: 'es-de', from: 'Español', to: 'Alemán' },
    { id: 'de-es', from: 'Alemán', to: 'Español' },
]

const MAX_CHARS = 10_000

const TABS = [
    { id: 'text', label: 'Texto', icon: 'translate' as const },
    { id: 'document', label: 'Docs / Subs', icon: 'document' as const },
]

type TabId = 'text' | 'document'

export default function TranslatePage() {
    const [tab, setTab] = useState<TabId>('text')
    const [direction, setDirection] = useState<TranslationDirection>('es-en')
    const [input, setInput] = useState('')
    const [output, setOutput] = useState('')
    const [loading, setLoading] = useState(false)
    const [textError, setTextError] = useState('')
    const [copied, setCopied] = useState(false)
    const [docFile, setDocFile] = useState<File | null>(null)
    const docJob = useJobPoller()

    const dir = DIRECTIONS.find(d => d.id === direction)!
    const charPct = (input.length / MAX_CHARS) * 100
    const docProcessing = docJob.status === 'pending' || docJob.status === 'processing'

    function handleDirectionChange(d: TranslationDirection): void {
        setDirection(d)
        setOutput('')
        docJob.reset()
    }

    async function handleTranslateText(): Promise<void> {
        if (!input.trim()) return
        setLoading(true); setTextError(''); setOutput('')
        try {
            const result = await translate(input, direction)
            setOutput(result)
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
            setTextError(msg ?? 'Error al traducir. Intenta de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    function handleCopy(): void {
        navigator.clipboard.writeText(output)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    async function handleTranslateDoc(): Promise<void> {
        if (!docFile) return
        const jobId = await translateDocument(docFile, direction)
        docJob.start(jobId)
    }

    function handleDocDownload(): void {
        const a = document.createElement('a')
        a.href = docJob.downloadUrl!
        a.download = docJob.filename!
        a.click()
    }

    function handleDocReset(): void {
        setDocFile(null)
        docJob.reset()
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-black text-kick-white mb-1">Traducción Automática</h1>
                <p className="text-kick-muted text-sm">Traducción profesional mediante modelos de inteligencia artificial locales.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {DIRECTIONS.map(d => (
                    <button
                        key={d.id}
                        onClick={() => handleDirectionChange(d.id)}
                        className={[
                            'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-semibold text-sm transition-all duration-150',
                            direction === d.id
                                ? 'border-kick-green bg-kick-green/10 text-kick-green shadow-green-sm'
                                : 'border-kick-border bg-kick-surface text-kick-muted hover:border-kick-green/30 hover:text-kick-white',
                        ].join(' ')}
                    >
                        <span>{d.from}</span>
                        <Icon name="arrows" className="w-4 h-4 shrink-0" />
                        <span>{d.to}</span>
                    </button>
                ))}
            </div>

            <div className="flex border-b border-kick-border">
                {TABS.map((t: any) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={[
                            'flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all duration-150',
                            tab === t.id ? 'border-kick-green text-kick-green' : 'border-transparent text-kick-muted hover:text-kick-white',
                        ].join(' ')}
                    >
                        <Icon name={t.icon} className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'text' && (
                <div className="flex flex-col gap-6 animate-fade-up">
                    <Card>
                        <CardHeader title={`Texto en ${dir.from}`} icon={<Icon name="translate" className="w-5 h-5 text-kick-green" />} />
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value.slice(0, MAX_CHARS))}
                            placeholder={`Escribe o pega el texto en ${dir.from}…`}
                            rows={7}
                            className="w-full bg-kick-dark border border-kick-border rounded-xl px-4 py-3 text-sm text-kick-white placeholder-kick-muted resize-none focus:outline-none focus:border-kick-green/50 transition-colors"
                        />
                        <div className="flex justify-between items-center mt-2">
                            <ProgressBar value={charPct} className="flex-1 mr-4" />
                            <span className="text-xs text-kick-muted font-mono shrink-0">{input.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
                        </div>
                    </Card>

                    <Button size="lg" icon={loading ? 'spinner' : 'translate'} loading={loading}
                        disabled={!input.trim() || loading} onClick={handleTranslateText} className="w-full">
                        {loading ? 'Traduciendo…' : `Traducir a ${dir.to}`}
                    </Button>

                    {textError && (
                        <div className="flex gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/50">
                            <Icon name="alert" className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-sm text-red-300">{textError}</p>
                        </div>
                    )}

                    {output && (
                        <Card glow>
                            <CardHeader title={`Traducción en ${dir.to}`} icon={<Icon name="check" className="w-5 h-5 text-kick-green" />}>
                                <Button variant="outline" size="sm" icon={copied ? 'check' : 'copy'} onClick={handleCopy}>
                                    {copied ? 'Copiado' : 'Copiar'}
                                </Button>
                            </CardHeader>
                            <div className="bg-kick-dark border border-kick-border rounded-xl px-4 py-3 text-sm text-kick-white leading-relaxed whitespace-pre-wrap select-all">
                                {output}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {tab === 'document' && (
                <div className="flex flex-col gap-6 animate-fade-up">
                    <Card>
                        <CardHeader
                            title="Sube el archivo a traducir"
                            subtitle={`Se traducirá a ${dir.to} preservando el formato · PDF, DOCX, TXT, SRT, VTT · máx. 20 MB`}
                            icon={<Icon name="document" className="w-5 h-5 text-kick-green" />}
                        />
                        {!docFile ? (
                            <DropZone
                                accept=".pdf,.docx,.doc,.txt,.srt,.vtt"
                                onFile={f => { setDocFile(f); docJob.reset() }}
                                formats={['PDF', 'DOCX', 'TXT', 'SRT', 'VTT']}
                                maxMB={20}
                                disabled={docProcessing}
                            />
                        ) : (
                            <div className="flex items-center gap-4 p-4 bg-kick-dark rounded-xl border border-kick-border">
                                <div className="p-2.5 rounded-lg bg-kick-green/10 border border-kick-green/20">
                                    <Icon name="document" className="w-5 h-5 text-kick-green" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-kick-white truncate">{docFile.name}</p>
                                    <p className="text-xs text-kick-muted">{(docFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                {!docProcessing && docJob.status !== 'done' && (
                                    <Button variant="ghost" size="sm" icon="x" onClick={handleDocReset} />
                                )}
                            </div>
                        )}
                    </Card>

                    {docFile && docJob.status === 'idle' && (
                        <Button size="lg" icon="translate" onClick={handleTranslateDoc} className="w-full">
                            Traducir documento a {dir.to}
                        </Button>
                    )}

                    {docProcessing && (
                        <Card>
                            <WaveLoader label="Traduciendo documento… (puede tardar unos minutos)" />
                            <ProgressBar value={docJob.progress} label="Progreso" className="mt-2" />
                        </Card>
                    )}

                    {docJob.status === 'error' && (
                        <div className="flex gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/50">
                            <Icon name="alert" className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-300">Error en la traducción</p>
                                <p className="text-xs text-red-400 mt-0.5">{docJob.error}</p>
                            </div>
                        </div>
                    )}

                    {docJob.status === 'done' && (
                        <Card glow>
                            <CardHeader
                                title="Documento traducido listo"
                                subtitle={`Traducido a ${dir.to} preservando el formato original.`}
                                icon={<Icon name="check" className="w-5 h-5 text-kick-green" />}
                            />
                            <div className="flex gap-3">
                                <Button size="lg" icon="download" onClick={handleDocDownload} className="flex-1">
                                    Descargar {docJob.filename}
                                </Button>
                                <Button variant="outline" size="lg" onClick={handleDocReset}>Nueva traducción</Button>
                            </div>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
