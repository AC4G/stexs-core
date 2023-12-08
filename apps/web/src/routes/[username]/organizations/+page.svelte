<script lang="ts">
    import { user } from "$lib/stores/user";
    import { profile } from "$lib/stores/profile";
</script>

<div class="grid gap-4 place-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
    <div class="grid place-items-center bg-surface-800 rounded-md col-span-full">
        <p class="text-[18px] p-4 text-center">{$user?.id === $profile?.userId ? 'You haven\'t join any organizations' : 'User is not a member of any organization'}</p>
    </div>
</div>
