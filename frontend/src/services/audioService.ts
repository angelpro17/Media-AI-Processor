import api from './api'
import { ProcessingMode } from '@/types/ui'

export async function submitAudio(file: File, mode: ProcessingMode = 'fast'): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    form.append('mode', mode)
    const { data } = await api.post<{ job_id: string }>('/audio/denoise', form, { timeout: 60_000 })
    return data.job_id
}
