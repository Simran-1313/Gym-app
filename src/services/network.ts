import { useSyncExternalStore } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * One connectivity snapshot for the whole app, readable outside React (the API
 * client consults it before sending) and inside it (`useConnectivity`).
 *
 * Two levels, because they warrant different reactions:
 *  - `hardOffline`: no network interface at all. Requests cannot succeed, so
 *    the API client refuses to send them.
 *  - `isOffline`: also covers "connected to Wi-Fi but no internet". Shown to
 *    the member, but requests still go out — NetInfo's reachability probe can
 *    be wrong behind some networks, and blocking every call on a false
 *    negative would be worse than letting one fail.
 */
export interface Connectivity {
  /** False until NetInfo has reported once. */
  known: boolean;
  hardOffline: boolean;
  isOffline: boolean;
}

let snapshot: Connectivity = { known: false, hardOffline: false, isOffline: false };
const listeners = new Set<() => void>();
const reconnectListeners = new Set<() => void>();
let unsubscribeNetInfo: (() => void) | null = null;

const toConnectivity = (s: NetInfoState): Connectivity => ({
  known: s.isConnected !== null,
  hardOffline: s.isConnected === false,
  isOffline: s.isConnected === false || s.isInternetReachable === false,
});

const apply = (next: Connectivity) => {
  const prev = snapshot;
  if (prev.known === next.known && prev.hardOffline === next.hardOffline && prev.isOffline === next.isOffline) {
    return;
  }
  snapshot = next;
  listeners.forEach((l) => l());
  if (prev.isOffline && !next.isOffline) reconnectListeners.forEach((l) => l());
};

/** Idempotent; called once from App. */
export function startConnectivityMonitor(): void {
  if (unsubscribeNetInfo) return;
  unsubscribeNetInfo = NetInfo.addEventListener((state) => apply(toConnectivity(state)));
}

export const getConnectivity = (): Connectivity => snapshot;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useConnectivity(): Connectivity {
  return useSyncExternalStore(subscribe, getConnectivity, getConnectivity);
}

/** Fires when the device goes from offline back to online. Returns an unsubscribe. */
export function onReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  return () => {
    reconnectListeners.delete(listener);
  };
}

/**
 * Re-check before a manual retry rather than trusting a possibly stale event.
 * A `true` here only means the device has a route out — the API may still be
 * down, which the request itself will report as `unreachable`.
 */
export async function confirmOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    apply(toConnectivity(state));
    return state.isConnected !== false;
  } catch {
    return true;
  }
}
