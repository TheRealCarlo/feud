import { supabase } from '../lib/supabase';

export const cleanExpiredCooldowns = async () => {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Get expired cooldowns first
        const { data: expiredCooldowns, error: fetchError } = await supabase
            .from('cooldowns')
            .select('id')
            .lt('end_time', currentTime);

        if (fetchError) {
            console.error('Error fetching expired cooldowns:', fetchError);
            return;
        }

        if (!expiredCooldowns?.length) {
            console.log('No expired cooldowns to clean');
            return;
        }

        // Delete expired cooldowns by their IDs
        const expiredIds = expiredCooldowns.map(c => c.id);
        const { error: deleteError } = await supabase
            .from('cooldowns')
            .delete()
            .in('id', expiredIds);

        if (deleteError) {
            console.error('Error deleting expired cooldowns:', deleteError);
        } else {
            console.log(`Cleaned ${expiredIds.length} expired cooldowns`);
        }
    } catch (err) {
        console.error('Error in cleanExpiredCooldowns:', err);
    }
};

// Add a function to check if a bear is on cooldown
export const isOnCooldown = async (tokenId: string): Promise<boolean> => {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const { data, error } = await supabase
            .from('cooldowns')
            .select('*')
            .eq('token_id', String(tokenId))
            .gt('end_time', currentTime);

        if (error) {
            console.error('Error checking cooldown:', error);
            return false;
        }

        // Return true if there are any active cooldowns
        return data && data.length > 0;
    } catch (err) {
        console.error('Error checking cooldown status:', err);
        return false;
    }
};

// Add a function to get cooldown details
export const getCooldownDetails = async (tokenId: string): Promise<{ isOnCooldown: boolean; remainingTime?: number }> => {
    try {
        const currentTime = Math.floor(Date.now() / 1000);
        const { data, error } = await supabase
            .from('cooldowns')
            .select('end_time')
            .eq('token_id', String(tokenId))
            .gt('end_time', currentTime)
            .order('end_time', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error getting cooldown details:', error);
            return { isOnCooldown: false };
        }

        if (!data || data.length === 0) {
            return { isOnCooldown: false };
        }

        const remainingTime = data[0].end_time - currentTime;
        return {
            isOnCooldown: true,
            remainingTime
        };
    } catch (err) {
        console.error('Error getting cooldown details:', err);
        return { isOnCooldown: false };
    }
}; 