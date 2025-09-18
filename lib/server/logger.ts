export type ApiEvent = {
  route: string;
  user_id?: string;
  feature?: string;
  amount?: number;
  idempotency_key?: string | null;
  success: boolean;
  elapsed_ms: number;
  status?: number;
  error?: string | null;
  extra?: Record<string, any>;
  ts: string;
};

export function logApiEvent(event: ApiEvent) {
  try {
    // Structured log in single line JSON for easy ingestion
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
      type: 'api_event',
      ...event,
    }));
  } catch {
    // ignore logging errors
  }
}
