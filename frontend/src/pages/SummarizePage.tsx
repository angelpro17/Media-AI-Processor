import { useState } from 'react'
import { submitSummarizeDocument, summarizeText } from '@/services/summarizeService'
import { useJobPoller } from '@/hooks/useJobPoller'

import Card, { CardHeader } from '@/components/ui/Card'
import Icon from '@/components/ui/Icon'
import DropZone from '@/components/ui/DropZone'
import Button from '@/components/ui/Button'
import ProgressBar, { WaveLoader } from '@/components/ui/ProgressBar'

const TABS = [
    { id: 'text', label: 'Texto', icon: 'list' as const },
    { id: 'document', label: 'Documento', icon: 'document' as const },
]
type TabId = 'text' | 'document'

export default function SummarizePage() {
    const [tab, setTab] = useState<TabId>('text')

    // Text state
    const [inputText, setInputText] = useState('')
    const [outputText, setOutputText] = useState('')
    const [isTranslatingText, setIsTranslatingText] = useState(false)
    const [textError, setTextError] = useState('')

    // Doc state
    const [docFile, setDocFile] = useState<File | null>(null)
    const docJob = useJobPoller()

    const handleTextSubmit = async () => {
        if (!inputText.trim()) return
        setIsTranslatingText(true)
        setTextError('')
        try {
            const summary = await summarizeText(inputText)
            setOutputText(summary)
        } catch (err: any) {
            setTextError(err?.response?.data?.detail || 'Error al resumir el texto.')
        } finally {
            setIsTranslatingText(false)
        }
    }

    const handleDocSubmit = async () => {
        if (!docFile) return
        try {
            const jid = await submitSummarizeDocument(docFile)
            docJob.start(jid)
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Error al enviar el documento')
        }
    }

    const docProcessing = ['pending', 'processing'].includes(docJob.status || '')
    const docDone = docJob.status === 'done'
    const docError = docJob.status === 'error'

    function handleDocDownload(): void {
        const a = document.createElement('a')
        a.href = docJob.downloadUrl!
        a.download = docJob.filename!
        a.click()
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-black text-kick-white mb-1">Resumen Automático</h1>
                <p className="text-kick-muted text-sm">Destila lo más importante de tus textos y documentos al instante, usando el potente motor de BART Large CNN localmente.</p>
            </div>

            <div className="flex border-b border-kick-border">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => { setTab(t.id as TabId); setOutputText('') }}
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
                <div className="grid lg:grid-cols-2 gap-6 animate-fade-up">
                    <Card>
                        <CardHeader
                            title="Texto original"
                            subtitle="Introduce el texto que quieres resumir"
                            icon={<Icon name="list" className="w-5 h-5 text-kick-green" />}
                        />
                        <textarea
                            className="w-full bg-black border border-kick-border rounded-xl p-4 text-kick-white placeholder-kick-muted/50 focus:outline-none focus:border-kick-green/50 focus:ring-1 focus:ring-kick-green/50 transition-all resize-none font-mono text-sm leading-relaxed"
                            rows={12}
                            placeholder="Pega aquí el texto tan largo como quieras..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                        {textError && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-xl text-sm border border-red-400/20">
                                <Icon name="alert" className="w-4 h-4 flex-shrink-0" />
                                {textError}
                            </div>
                        )}
                        <Button
                            onClick={handleTextSubmit}
                            disabled={!inputText.trim() || isTranslatingText}
                            loading={isTranslatingText}
                            icon="list"
                            className="w-full justify-center"
                        >
                            Resumir texto
                        </Button>
                    </Card>

                    <Card>
                        <CardHeader
                            title="Resumen"
                            subtitle="Puntos clave generados"
                            icon={<Icon name="list" className="w-5 h-5 text-kick-white" />}
                        />
                        <div className="w-full h-[300px] bg-kick-dark border border-kick-border rounded-xl p-4 text-kick-white overflow-y-auto custom-scrollbar font-mono text-sm leading-relaxed whitespace-pre-wrap select-all">
                            {outputText || (
                                <span className="text-kick-muted select-none flex items-center justify-center h-full italic">
                                    El resumen aparecerá aquí...
                                </span>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {tab === 'document' && (
                <div className="flex flex-col gap-6 animate-fade-up mx-auto max-w-2xl">
                    <Card>
                        <CardHeader
                            title="Sube el documento a resumir"
                            subtitle="Se generará un archivo de texto con los puntos clave · PDF, DOCX, TXT · máx. 20 MB"
                            icon={<Icon name="document" className="w-5 h-5 text-kick-green" />}
                        />
                        {!docFile ? (
                            <DropZone
                                accept=".pdf,.docx,.doc,.txt"
                                onFile={f => { setDocFile(f); docJob.reset() }}
                                formats={['PDF', 'DOCX', 'TXT']}
                                maxMB={20}
                                disabled={docProcessing}
                            />
                        ) : (
                            <div className="bg-black border border-kick-border rounded-xl p-4 flex items-center justify-between group hover:border-kick-green/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-kick-green/10 rounded-xl flex items-center justify-center border border-kick-green/20">
                                        <Icon name="document" className="w-6 h-6 text-kick-green" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-kick-white truncate max-w-[200px] sm:max-w-xs">{docFile.name}</p>
                                        <p className="text-sm text-kick-muted">{(docFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                {!docProcessing && !docDone && (
                                    <button
                                        onClick={() => { setDocFile(null); docJob.reset() }}
                                        className="p-2 text-kick-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                    >
                                        <Icon name="x" className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        )}

                        {docError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 mt-4">
                                <Icon name="alert" className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm">{docJob.error || 'Error al procesar'}</span>
                            </div>
                        )}

                        {docProcessing && (
                            <div className="mt-4 border border-kick-border rounded-xl p-4">
                                <WaveLoader label="Resumiendo formato..." />
                                <ProgressBar value={docJob.progress || 0} className="mt-2" />
                            </div>
                        )}

                        {docDone && docJob.downloadUrl && (
                            <div className="bg-kick-green/10 border border-kick-green/20 rounded-xl p-4 flex flex-col gap-4 mt-4">
                                <div className="flex items-center gap-3 text-kick-green">
                                    <div className="w-8 h-8 bg-kick-green/20 rounded-full flex items-center justify-center border border-kick-green/30">
                                        <Icon name="check" className="w-4 h-4" />
                                    </div>
                                    <span className="font-semibold text-sm">Resumen completado</span>
                                </div>
                                <Button
                                    onClick={handleDocDownload}
                                    icon="download"
                                    className="w-full justify-center"
                                    variant="outline"
                                >
                                    Descargar {docJob.filename || 'Resumen.txt'}
                                </Button>
                            </div>
                        )}

                        {docFile && !docProcessing && !docDone && (
                            <Button
                                onClick={handleDocSubmit}
                                icon="list"
                                className="w-full justify-center"
                            >
                                Resumir Documento
                            </Button>
                        )}
                    </Card>
                </div>
            )}
        </div>
    )
}
