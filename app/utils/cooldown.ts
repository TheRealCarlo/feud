import { supabase } from '../lib/supabase';

export const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function getBearCooldown(tokenId: string) {
    const { data, error } = await supabase
        .from('cooldowns')
        .select('*')
        .eq('token_id', tokenId)
        .single();

    if (error) {
        console.error('Error fetching cooldown:', error);
        return null;
    }

    return data;
}

export function isInCooldown(cooldownData: any): boolean {
    if (!cooldownData?.last_battle) return false;
    
    const lastBattle = new Date(cooldownData.last_battle).getTime();
    const now = new Date().getTime();
    const timeSinceLastBattle = now - lastBattle;
    
    return timeSinceLastBattle < COOLDOWN_DURATION;
}

export function getCooldownRemaining(cooldownData: any): number {
    if (!cooldownData?.last_battle) return 0;
    
    const lastBattle = new Date(cooldownData.last_battle).getTime();
    const now = new Date().getTime();
    const timeRemaining = COOLDOWN_DURATION - (now - lastBattle);
    
    return Math.max(0, timeRemaining);
}

export function getCooldownDetails(endTime: string): string | null {
    const now = Math.floor(Date.now() / 1000);
    const end = parseInt(endTime);
    
    if (now >= end) return null;
    
    const remainingSeconds = end - now;
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
} 