// ============================================================
// Turn2Law Intern Tracker — Supabase Realtime Helper
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  table: string;
  event?: RealtimeEvent;
  schema?: string;
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

/**
 * Subscribe to realtime changes on a Supabase table.
 * Returns the channel for cleanup.
 */
export function subscribeToTable(config: SubscriptionConfig): RealtimeChannel {
  const supabase = createClient();
  const channelName = `realtime-${config.table}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as 'system',
      {
        event: config.event || '*',
        schema: config.schema || 'public',
        table: config.table,
        filter: config.filter,
      } as unknown as { event: string },
      config.callback as unknown as (payload: { [key: string]: unknown }) => void
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a realtime channel
 */
export function unsubscribe(channel: RealtimeChannel) {
  const supabase = createClient();
  supabase.removeChannel(channel);
}

/**
 * Create a typed subscription helper for use in React components.
 * Use in useEffect with cleanup.
 *
 * Example:
 * ```
 * useEffect(() => {
 *   const channel = subscribeToTable({
 *     table: 'tasks',
 *     callback: () => refreshTasks(),
 *   });
 *   return () => unsubscribe(channel);
 * }, []);
 * ```
 */
