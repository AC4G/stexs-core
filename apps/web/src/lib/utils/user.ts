import type { ToastSettings } from "@skeletonlabs/skeleton";
import type { Writable } from "svelte/store";
import { stexs } from "../../stexsClient";

export async function blockUser(params: { blocked_id: string, blocker_id: string, username: string, flash: Writable<ToastSettings> }) {
    const { blocked_id, blocker_id, username, flash } = params;
    const { error } = await stexs.from('blocked')
        .insert([
            { blocker_id, blocked_id }
        ]);

    if (error) {
        flash.set({
            message: `Could not block ${username}. Try out again.`,
            classes: 'variant-glass-error',
            timeout: 5000,
        });
    } else {
        location.reload();
    }
}

export async function unblockUser(params: { userId: string, currentUserId: string, username: string, flash: Writable<ToastSettings> }) {
    const { userId, currentUserId, username, flash } = params;
    const { error } = await stexs.from('blocked')
        .delete()
        .eq('blocked_id', userId)
        .eq('blocker_id', currentUserId);

    if (error) {
        flash.set({
            message: `Could not unblock ${username}. Try out again.`,
            classes: 'variant-glass-error',
            timeout: 5000,
        });
    } else {
        location.reload();
    }
}
