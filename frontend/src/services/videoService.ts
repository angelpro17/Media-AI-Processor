import api from './api'

export async function extractAudio(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/video/extract-audio', formData)
    return response.data.job_id
}
