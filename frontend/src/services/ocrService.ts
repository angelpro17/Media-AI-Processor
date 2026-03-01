import api from './api'

export async function submitOcr(file: File, langs: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('langs', langs)

    const response = await api.post('/ocr', formData)
    return response.data.job_id
}
