import { useEffect, useRef } from 'react'
import api from '@/services/api'

const PING_INTERVAL_MS = 60000

export function useServerPing() {
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const ping = async () => {
            try {
                await api.get('/ping')
                console.log('[ping] Server keep-alive ping sent')
            } catch (e) {
                console.warn('[ping] Keep-alive ping failed:', e)
            }
        }

        ping()
        timerRef.current = setInterval(ping, PING_INTERVAL_MS)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])
}