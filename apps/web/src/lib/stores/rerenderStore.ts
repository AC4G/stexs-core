import { getContext, setContext } from 'svelte';
import { writable, type Writable, get } from 'svelte/store';

export function createRerenderStore(): Writable<Record<string, boolean>> {
  const profile = writable<Record<string, boolean>>({});
  setContext('rerenderStore', profile);
  return profile;
}

export function getRerenderStore(): Writable<Record<string, boolean>> {
  return getContext<Writable<Record<string, boolean>>>('rerenderStore');
}

export function getState(
  key: string,
  store: Writable<Record<string, boolean>>,
) {
  let dataStore = get(store);

  if (!(key in dataStore)) {
    store.update((states) => {
      return {
        ...states,
        [key]: true,
      };
    });
  }

  dataStore = get(store);

  return {
    subscribe: store.subscribe,
    toggle: () => {
      store.update((state) => {
        return {
          ...state,
          [key]: !state[key],
        };
      });
    },
  };
}
