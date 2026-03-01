export type JobStatus = 'idle' | 'pending' | 'processing' | 'done' | 'error'

export interface JobState {
    jobId: string | null
    status: JobStatus
    progress: number
    error: string | null
    downloadUrl: string | null
    filename: string | null
}

export interface ApiJob {
    id: string
    status: JobStatus
    progress: number
    filename: string
    mime_type: string
    result_path: string | null
    error: string | null
}
