import { useState, useCallback, useRef, useEffect } from 'react'
import api from '@/services/api'
import { JobState, ApiJob } from '@/types/job'
import { POLL_INTERVAL_MS, MAX_POLL_RETRIES } from '@/constants/ui'

interface UseJobPollerReturn extends JobState {
    start: (jobId: string, filename?: string) => void
    reset: () => void
    cancel: () => Promise<void>
}

const INITIAL_STATE: JobState = {
    jobId: null,
    status: 'idle',
    progress: 0,
    error: null,
    downloadUrl: null,
    filename: null,
}

export function useJobPoller(storageKey?: string): UseJobPollerReturn {
    const [state, setState] = useState<JobState>(INITIAL_STATE)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const retriesRef = useRef(0)

    // Load from session storage on mount
    useEffect(() => {
        if (!storageKey) return
        try {
            const saved = sessionStorage.getItem(storageKey)
            if (saved) {
                const parsed = JSON.parse(saved)
                if (parsed.jobId && parsed.status !== 'done' && parsed.status !== 'error') {
                    start(parsed.jobId, parsed.filename)
                } else {
                    setState(s => ({ ...s, ...parsed }))
                }
            }
        } catch { }
    }, [storageKey])

    const stopPolling = (): void => {
        if (timerRef.current) clearInterval(timerRef.current)
    }

    const saveState = (newState: Partial<JobState>) => {
        setState(s => {
            const next = { ...s, ...newState }
            if (storageKey) {
                sessionStorage.setItem(storageKey, JSON.stringify(next))
            }
            return next
        })
    }

    const start = useCallback((jobId: string, filename?: string): void => {
        stopPolling()
        retriesRef.current = 0
        saveState({ ...INITIAL_STATE, jobId, status: 'pending', filename: filename || null })

        const poll = async () => {
            retriesRef.current++
            if (retriesRef.current > MAX_POLL_RETRIES) {
                stopPolling()
                saveState({ status: 'error', error: 'El procesamiento tardó demasiado.' })
                return
            }
            try {
                const { data } = await api.get<ApiJob>(`/jobs/${jobId}`)
                saveState({ status: data.status, progress: data.progress, error: data.error })

                if (data.status === 'done') {
                    stopPolling()
                    saveState({
                        downloadUrl: `/api/jobs/${jobId}/download`,
                        filename: data.filename,
                        summary: data.summary || null,
                    })
                } else if (data.status === 'error') {
                    stopPolling()
                }
            } catch {
                // network hiccup — keep retrying
            }
        }

        poll()
        timerRef.current = setInterval(poll, POLL_INTERVAL_MS)
    }, [storageKey])

    const cancel = useCallback(async (): Promise<void> => {
        stopPolling()
        if (state.jobId && (state.status === 'pending' || state.status === 'processing')) {
            try {
                await api.delete(`/jobs/${state.jobId}`)
            } catch { /* ignore error on cancel */ }
        }
        retriesRef.current = 0
        setState(INITIAL_STATE)
        if (storageKey) sessionStorage.removeItem(storageKey)
    }, [state.jobId, state.status, storageKey])

    const reset = useCallback((): void => {
        stopPolling()
        retriesRef.current = 0
        setState(INITIAL_STATE)
        if (storageKey) sessionStorage.removeItem(storageKey)
    }, [storageKey])

    useEffect(() => () => stopPolling(), [])

    return { ...state, start, reset, cancel }
}
