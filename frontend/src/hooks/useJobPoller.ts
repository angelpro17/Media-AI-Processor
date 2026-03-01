import { useState, useCallback, useRef, useEffect } from 'react'
import api from '@/services/api'
import { JobState, ApiJob } from '@/types/job'
import { POLL_INTERVAL_MS, MAX_POLL_RETRIES } from '@/constants/ui'

interface UseJobPollerReturn extends JobState {
    start: (jobId: string) => void
    reset: () => void
}

const INITIAL_STATE: JobState = {
    jobId: null,
    status: 'idle',
    progress: 0,
    error: null,
    downloadUrl: null,
    filename: null,
}

export function useJobPoller(): UseJobPollerReturn {
    const [state, setState] = useState<JobState>(INITIAL_STATE)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const retriesRef = useRef(0)

    const stopPolling = (): void => {
        if (timerRef.current) clearInterval(timerRef.current)
    }

    const start = useCallback((jobId: string): void => {
        retriesRef.current = 0
        setState({ ...INITIAL_STATE, jobId, status: 'pending' })

        timerRef.current = setInterval(async () => {
            retriesRef.current++
            if (retriesRef.current > MAX_POLL_RETRIES) {
                stopPolling()
                setState(s => ({ ...s, status: 'error', error: 'El procesamiento tardó demasiado.' }))
                return
            }
            try {
                const { data } = await api.get<ApiJob>(`/jobs/${jobId}`)
                setState(s => ({ ...s, status: data.status, progress: data.progress, error: data.error }))
                if (data.status === 'done') {
                    stopPolling()
                    setState(s => ({
                        ...s,
                        downloadUrl: `/api/jobs/${jobId}/download`,
                        filename: data.filename,
                    }))
                } else if (data.status === 'error') {
                    stopPolling()
                }
            } catch {
                // network hiccup — keep retrying
            }
        }, POLL_INTERVAL_MS)
    }, [])

    const reset = useCallback((): void => {
        stopPolling()
        retriesRef.current = 0
        setState(INITIAL_STATE)
    }, [])

    useEffect(() => () => stopPolling(), [])

    return { ...state, start, reset }
}
