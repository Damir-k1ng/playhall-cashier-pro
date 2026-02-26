const QUEUE_KEY = 'offline_action_queue';

export interface OfflineAction {
  id: string;
  type: 'create_session';
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getQueue(): OfflineAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: OfflineAction[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(type: OfflineAction['type'], payload: Record<string, unknown>): OfflineAction {
  const action: OfflineAction = {
    id: generateId(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  const queue = getQueue();
  queue.push(action);
  saveQueue(queue);
  return action;
}

export function dequeue(actionId: string): void {
  const queue = getQueue().filter(a => a.id !== actionId);
  saveQueue(queue);
}

export function incrementRetry(actionId: string): void {
  const queue = getQueue().map(a =>
    a.id === actionId ? { ...a, retries: a.retries + 1 } : a
  );
  saveQueue(queue);
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function getQueueLength(): number {
  return getQueue().length;
}
