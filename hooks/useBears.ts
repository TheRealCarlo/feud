import { useEffect, useState } from 'react'
import { supabase, type Bear } from '../lib/supabase'

export function useBears() {
    const [bears, setBears] = useState<Bear[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch initial bears
    useEffect(() => {
        async function fetchBears() {
            try {
                const { data, error } = await supabase
                    .from('bears')
                    .select('*')
                    .order('created_at', { ascending: true })

                if (error) throw error
                setBears(data || [])
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred')
            } finally {
                setIsLoading(false)
            }
        }

        fetchBears()
    }, [])

    // Subscribe to real-time updates
    useEffect(() => {
        const subscription = supabase
            .channel('bears')
            .on('postgres_changes', 
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bears'
                },
                (payload) => {
                    setBears(current => [...current, payload.new as Bear])
                }
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    // Function to place a new bear
    const placeBear = async (x: number, y: number) => {
        // Add rate limiting
        const lastPlacement = localStorage.getItem('lastBearPlacement')
        const now = Date.now()
        
        if (lastPlacement && now - parseInt(lastPlacement) < 1000) {
            throw new Error('Please wait before placing another bear')
        }
        
        try {
            const { error } = await supabase
                .from('bears')
                .insert([
                    {
                        x,
                        y,
                        placed_by: 'user-id' // Replace with actual user ID
                    }
                ])

            if (error) throw error
            localStorage.setItem('lastBearPlacement', now.toString())
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to place bear')
            throw err
        }
    }

    const removeBear = async (bearId: string) => {
        try {
            const { error } = await supabase
                .from('bears')
                .delete()
                .match({ id: bearId })

            if (error) throw error
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove bear')
            throw err
        }
    }

    useEffect(() => {
        // Add this console log to verify connection
        supabase
            .from('bears')
            .select('*')
            .limit(1)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Supabase connection error:', error)
                } else {
                    console.log('Supabase connected successfully:', data)
                }
            })
    }, [])

    return {
        bears,
        isLoading,
        error,
        placeBear,
        removeBear
    }
} 