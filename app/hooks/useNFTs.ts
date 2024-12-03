import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useNFTs(walletAddress: string) {
    const [nfts, setNfts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNFTs = async () => {
            if (!walletAddress) {
                console.log('No wallet address provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                console.log('Fetching NFTs for wallet:', walletAddress.toLowerCase());

                // Fetch NFTs from your database
                const { data: nftData, error: nftError } = await supabase
                    .from('nfts')
                    .select('*')
                    .eq('owner', walletAddress.toLowerCase());

                if (nftError) {
                    console.error('NFT fetch error:', nftError);
                    throw nftError;
                }

                console.log('NFT Data:', nftData);

                // If no NFTs found, try fetching from the blockchain
                if (!nftData || nftData.length === 0) {
                    // You might want to implement blockchain fetching here
                    console.log('No NFTs found in database, checking blockchain...');
                    // For now, we'll just log this
                }

                // Fetch cooldowns
                const { data: cooldownData, error: cooldownError } = await supabase
                    .from('cooldowns')
                    .select('*')
                    .eq('wallet_address', walletAddress.toLowerCase());

                if (cooldownError) {
                    console.error('Cooldown fetch error:', cooldownError);
                    throw cooldownError;
                }

                console.log('Cooldown Data:', cooldownData);

                // Combine NFT data with cooldown information
                const combinedNFTs = (nftData || []).map(nft => {
                    const cooldown = cooldownData?.find(cd => cd.token_id === nft.token_id);
                    return {
                        ...nft,
                        cooldown: cooldown ? {
                            endTime: cooldown.end_time,
                            tokenId: cooldown.token_id
                        } : null
                    };
                });

                console.log('Combined NFTs:', combinedNFTs);
                setNfts(combinedNFTs);
            } catch (err) {
                console.error('Error in useNFTs:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch NFTs');
            } finally {
                setLoading(false);
            }
        };

        fetchNFTs();
    }, [walletAddress]);

    return { 
        nfts, 
        loading, 
        error,
        refetch: () => {
            setLoading(true);
            setError(null);
            // This will trigger the useEffect
        }
    };
} 