export type TaskNotificationType = 'assigned' | 'reassigned';

interface TriggerTaskNotificationOptions {
  taskId: string | null | undefined;
  type: TaskNotificationType;
  requestUrl?: string;
  cookieHeader?: string | null;
  schedule?: (callback: () => Promise<void>) => void;
}

function getNotificationUrl(requestUrl?: string): string {
  if (requestUrl) {
    return new URL('/api/notifications/task', requestUrl).toString();
  }

  return '/api/notifications/task';
}

export function triggerTaskNotification({
  taskId,
  type,
  requestUrl,
  cookieHeader,
  schedule,
}: TriggerTaskNotificationOptions): void {
  if (!taskId) {
    console.warn('[notifications] Task notification skipped: missing taskId');
    return;
  }

  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const sendNotification = async () => {
    try {
      const response = await fetch(getNotificationUrl(requestUrl), {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId, type }),
        credentials: 'same-origin',
      });

      if (!response.ok) {
        console.warn('[notifications] Task notification returned a non-OK response', {
          taskId,
          type,
          status: response.status,
        });
      }
    } catch (error: unknown) {
      console.error('[notifications] Task notification request failed safely', {
        taskId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  if (schedule) {
    schedule(sendNotification);
    return;
  }

  void sendNotification();
}
