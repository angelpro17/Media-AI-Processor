import api from './api'

export const summarizeText = async (text: string): Promise<string> => {
    const { data } = await api.post('/summarize', { text })
    return data.job_id
}

export const submitSummarizeDocument = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/summarize/document', formData)
    return data.job_id
}
