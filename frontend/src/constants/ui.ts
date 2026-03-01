import { NavItem } from '@/types/translation'

export const NAV_ITEMS: NavItem[] = [
    { path: '/', label: 'Inicio', icon: 'home' },
    { path: '/audio', label: 'Audio AI', icon: 'audio' },
    { path: '/video', label: 'Video AI', icon: 'videoCamera' },
    { path: '/transcription', label: 'Transcripción', icon: 'mic' },
    { path: '/docs', label: 'Documentos', icon: 'document' },
    { path: '/pdf-editor', label: 'Editor PDF', icon: 'pdf' },
    { path: '/ocr', label: 'Escáner OCR', icon: 'scan' },
    { path: '/translate', label: 'Traducción', icon: 'translate' },
    { path: '/summarize', label: 'Resumen AI', icon: 'list' },
]

export const POLL_INTERVAL_MS = 1500
export const MAX_POLL_RETRIES = 240
