'use client';

import { useState, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';

interface WalletState {
    provider: BrowserProvider | null;
    isConnecting: boolean;
    error: string | null;
    isMetaMaskInstalled: boolean;
}

export function useWallet() {
    const [state, setState] = useState<WalletState>({
        provider: null,
        isConnecting: false,
        error: null,
        isMetaMaskInstalled: false
    });

    // Safe check for ethereum provider
    const getEthereum = useCallback(() => {
        if (typeof window === 'undefined') return null;
        return window.ethereum;
    }, []);

    // Check MetaMask installation
    useEffect(() => {
        let mounted = true;

        const checkMetaMask = async () => {
            try {
                // Wait for potential provider injection
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const ethereum = getEthereum();
                if (mounted) {
                    setState(prev => ({
                        ...prev,
                        isMetaMaskInstalled: !!ethereum?.isMetaMask
                    }));
                }
            } catch (err) {
                console.warn('Error checking MetaMask:', err);
                if (mounted) {
                    setState(prev => ({
                        ...prev,
                        isMetaMaskInstalled: false
                    }));
                }
            }
        };

        checkMetaMask();

        return () => {
            mounted = false;
        };
    }, [getEthereum]);

    const connect = useCallback(async () => {
        if (!state.isMetaMaskInstalled) {
            setState(prev => ({
                ...prev,
                error: 'Please install MetaMask to connect your wallet'
            }));
            return null;
        }

        setState(prev => ({ ...prev, isConnecting: true, error: null }));

        try {
            const ethereum = getEthereum();
            if (!ethereum) {
                throw new Error('MetaMask not found');
            }

            // Request accounts
            await ethereum.request({
                method: 'eth_requestAccounts'
            });

            // Create provider safely
            const provider = new BrowserProvider(ethereum);

            // Verify connection
            const network = await provider.getNetwork();
            console.log('Connected to network:', network.name);

            setState(prev => ({ ...prev, provider }));
            return provider;
        } catch (err) {
            console.error('Wallet connection error:', err);
            setState(prev => ({
                ...prev,
                error: err instanceof Error ? err.message : 'Failed to connect wallet'
            }));
            return null;
        } finally {
            setState(prev => ({ ...prev, isConnecting: false }));
        }
    }, [state.isMetaMaskInstalled, getEthereum]);

    const disconnect = useCallback(() => {
        setState(prev => ({
            ...prev,
            provider: null,
            error: null
        }));
    }, []);

    return {
        ...state,
        connect,
        disconnect
    };
} 