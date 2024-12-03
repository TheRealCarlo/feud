export {};

declare global {
    interface Window {
        ethereum?: {
            isMetaMask?: boolean;
            request: (args: { 
                method: string; 
                params?: any[] 
            }) => Promise<any>;
            on: (event: string, callback: (params: any) => void) => void;
            removeListener: (event: string, callback: (params: any) => void) => void;
            selectedAddress?: string;
            chainId?: string;
            networkVersion?: string;
            isConnected?: () => boolean;
            enable?: () => Promise<string[]>;
        };
    }
} 