import api from './api'
import { TranslationDirection } from '@/types/translation'

export async function translate(text: string, direction: TranslationDirection): Promise<string> {
    const { data } = await api.post<{ translated: string }>('/translate', { text, direction }, { timeout: 120_000 })
    return data.translated
}

export async function translateDocument(file: File, direction: TranslationDirection): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    form.append('direction', direction)
    const { data } = await api.post<{ job_id: string }>('/translate/document', form, { timeout: 60_000 })
    return data.job_id
}
