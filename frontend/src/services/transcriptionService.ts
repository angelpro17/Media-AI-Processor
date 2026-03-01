import api from './api'

export async function submitTranscription(file: File, modelSize: string, outputFormat: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('model_size', modelSize)
    formData.append('output_format', outputFormat)

    const response = await api.post('/transcribe', formData)
    return response.data.job_id
}
