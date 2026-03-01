import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Icon from '@/components/ui/Icon'

interface Feature {
    icon: 'audio' | 'document' | 'translate'
    path: string
    title: string
    desc: string
    badge: string
    stats: { label: string; value: string }[]
}

const FEATURES: Feature[] = [
    {
        icon: 'audio', path: '/audio', title: 'Audio AI', badge: 'PESQ ≈ 4.0',
        desc: 'Elimina el ruido de fondo de tus grabaciones con DeepFilterNet3 — el mejor modelo open-source para speech enhancement.',
        stats: [{ label: 'Modelo', value: 'DeepFilterNet3' }, { label: 'Output', value: 'MP3 192kbps' }, { label: 'Formatos', value: 'MP3, WAV, OGG…' }],
    },
    {
        icon: 'document', path: '/docs', title: 'Documentos', badge: '7 conversiones',
        desc: 'Convierte entre DOCX, PDF, XLSX, PPTX e imágenes con LibreOffice y pdf2docx — sin pérdida de formato.',
        stats: [{ label: 'Motor', value: 'LibreOffice' }, { label: 'PDF→DOCX', value: 'pdf2docx' }, { label: 'Máx.', value: '50 MB' }],
    },
    {
        icon: 'translate', path: '/translate', title: 'Traducción', badge: 'Sin límites',
        desc: 'Traduce texto y documentos entre Español e Inglés con Helsinki-NLP — completamente offline.',
        stats: [{ label: 'Modelo', value: 'Helsinki-NLP' }, { label: 'Idiomas', value: 'ES ↔ EN' }, { label: 'Privacidad', value: '100% Local' }],
    },
]

export default function HomePage() {
    return (
        <div className="flex flex-col gap-12 animate-fade-up">
            <Helmet>
                <title>Media-AI-Processor — Plataforma Todo-en-Uno de IA Local</title>
                <meta name="description" content="Media-AI-Processor es tu suite offline de herramientas potenciadas por Inteligencia Artificial. Limpieza de audio, transcripción, traducción, OCR de imágenes a texto y resúmenes de documentos gratis y sin internet." />
                <meta name="keywords" content="audioclean, limpiar audio con ia, transcribir audio a texto gratis, traducir documentos pdf, extraer texto de imagenes ocr, resumir texto largo, ia local, offline" />
            </Helmet>
            <div className="pt-4">

                <h1 className="text-4xl font-black text-kick-white leading-tight mb-3">
                    Plataforma AI de<br />
                    <span className="text-kick-green">Productividad</span>
                </h1>
                <p className="text-kick-muted text-lg max-w-xl leading-relaxed">
                    Audio, documentos y traducción — procesado localmente con modelos de inteligencia artificial de última generación. Sin costos ocultos.
                </p>
            </div>

            <div className="grid gap-4">
                {FEATURES.map(f => (
                    <Link
                        key={f.path}
                        to={f.path}
                        className="group block bg-kick-surface border border-kick-border rounded-xl p-6 hover:border-kick-green/40 hover:shadow-green-sm transition-all duration-200"
                    >
                        <div className="flex items-start gap-5">
                            <div className="p-3 rounded-xl bg-kick-dark border border-kick-border group-hover:border-kick-green/30 group-hover:bg-kick-green/10 transition-all duration-200 shrink-0">
                                <Icon name={f.icon} className="w-6 h-6 text-kick-green" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-base font-bold text-kick-white">{f.title}</h2>
                                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-kick-green/10 border border-kick-green/20 text-kick-green">{f.badge}</span>
                                </div>
                                <p className="text-sm text-kick-muted leading-relaxed mb-4">{f.desc}</p>
                                <div className="flex gap-6">
                                    {f.stats.map(s => (
                                        <div key={s.label}>
                                            <p className="text-xs text-kick-muted">{s.label}</p>
                                            <p className="text-xs font-semibold text-kick-white">{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <Icon name="chevronRight" className="w-5 h-5 text-kick-muted group-hover:text-kick-green transition-colors duration-200 shrink-0 mt-0.5" />
                        </div>
                    </Link>
                ))}
            </div>


        </div>
    )
}
