// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { ToastSettings } from '@skeletonlabs/skeleton';

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    interface PageData {
      flash: ToastSettings;
    }
    // interface Platform {}
  }
}

export {};
