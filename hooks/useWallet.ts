import { useEffect, useState } from 'react'

export function useWallet() {
    const [ethereum, setEthereum] = useState<any>(null)

    useEffect(() => {
        // Wait for window.ethereum to be injected
        const checkEthereum = () => {
            if (typeof window !== 'undefined' && window.ethereum) {
                setEthereum(window.ethereum)
            }
        }

        // Check immediately
        checkEthereum()

        // Also check when the ethereum object might be injected later
        window.addEventListener('ethereum#initialized', checkEthereum, {
            once: true,
        })

        // Cleanup
        return () => {
            window.removeEventListener('ethereum#initialized', checkEthereum)
        }
    }, [])

    return { ethereum }
} 