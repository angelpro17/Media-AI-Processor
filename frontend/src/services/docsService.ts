import api from './api'

export async function submitDoc(file: File, outputFormat: string): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    form.append('output_format', outputFormat)
    const { data } = await api.post<{ job_id: string }>('/docs/convert', form, { timeout: 60_000 })
    return data.job_id
}

export async function submitMerge(files: File[]): Promise<string> {
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    const { data } = await api.post<{ job_id: string }>('/docs/merge', formData)
    return data.job_id
}

export async function submitSplit(file: File, start: number, end: number): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('start', start.toString())
    formData.append('end', end.toString())
    const { data } = await api.post<{ job_id: string }>('/docs/split', formData)
    return data.job_id
}

export async function submitCompress(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post<{ job_id: string }>('/docs/compress', formData)
    return data.job_id
}
