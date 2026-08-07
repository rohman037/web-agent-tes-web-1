import { ContentCategory } from './categorize';

export interface GenerationEvent {
  id: string;
  timestamp: string;           // ISO 8601
  clientId: string;
  accessCode: string;
  packageTier: 'mingguan' | 'bulanan_vip' | 'lifetime' | 'custom';
  tool: 'idea_konten' | 'video_to_prompt' | 'prompt_foto' | 'tiktok_downloader' | 'ekstraktor_frame';
  category: ContentCategory;
  durationRequested?: number;  // detik
  segmentSplit?: number;       // detik per klip
  toneOfVoice?: string;
  contentSalesType?: string;   // "jualan_afiliasi" | "soft_selling" | ...
  modelUsed: string;
  tierUsed: 'flagship' | 'tier2' | 'tier3' | 'user_key';
  tokensIn?: number;
  tokensOut?: number;
  latencyMs: number;
  outcome: 'success' | 'error' | 'flagged';
  errorMessage?: string;
  sourceSubmissionId?: string;
}

export interface ActiveGenerationItem {
  id: string;
  clientId: string;
  accessCode: string;
  tool: string;
  category: string;
  status: 'generating' | 'analyzing' | 'completed';
  startedAt?: string;
  updatedAt?: number;
  details?: string;
  orchestrationResult?: any;
}

/**
 * Report live generation progress step to server and local subscribers
 */
export function reportActiveGenerationStatus(
  id: string,
  status: 'generating' | 'analyzing' | 'completed',
  details?: string
): void {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('satset_active_status_updated', {
          detail: { id, status, details },
        })
      );
    } catch (e) {
      // ignore
    }
  }

  fetch('/api/events/active-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status, details }),
  }).catch((err) => console.warn('[GenerationEvent] Report active status notice:', err));
}

/**
 * Emit a generation event to tracking system.
 * Fire-and-forget, silent fail with single retry, non-blocking UI.
 */
export function emitGenerationEvent(
  eventInput: Omit<GenerationEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
): void {
  const fullEvent: GenerationEvent = {
    ...eventInput,
    id: eventInput.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: eventInput.timestamp || new Date().toISOString(),
  };

  // Dispatch custom browser event for real-time UI components
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('satset_generation_event', { detail: fullEvent })
      );
    } catch (e) {
      // Ignore DOM event dispatch issues
    }
  }

  // Fire-and-forget server sync with 1x simple retry
  const sendToServer = async (attempt: number = 1): Promise<void> => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullEvent),
      });

      if (!response.ok && attempt < 2) {
        setTimeout(() => sendToServer(attempt + 1), 1000);
      }
    } catch (err) {
      if (attempt < 2) {
        setTimeout(() => sendToServer(attempt + 1), 1000);
      } else {
        console.warn('[GenerationEvent] Silent fail after retry:', err);
      }
    }
  };

  sendToServer(1);
}

/**
 * Subscribe to Live Generation Events stream (SSE with fast polling fallback)
 */
export function subscribeLiveGenerationEvents(
  onUpdate: (data: { type: string; events?: GenerationEvent[]; activeGenerations?: ActiveGenerationItem[]; event?: GenerationEvent; result?: any }) => void
): () => void {
  let eventSource: EventSource | null = null;
  let pollingTimer: any = null;

  const handleData = (data: any) => {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('satset_live_stream_received', { detail: data }));
      }
      onUpdate(data);
    } catch (e) {
      console.warn('[GenerationEvent] Live update parse error:', e);
    }
  };

  // Attempt SSE first
  if (typeof window !== 'undefined' && 'EventSource' in window) {
    try {
      eventSource = new EventSource('/api/events/stream');
      
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          handleData(parsed);
        } catch (e) {
          // parse error
        }
      };

      eventSource.onerror = () => {
        // Fallback to polling if SSE encounters issues
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        startPolling();
      };
    } catch (e) {
      startPolling();
    }
  } else {
    startPolling();
  }

  function startPolling() {
    if (pollingTimer) return;
    const fetchSnapshot = async () => {
      try {
        const res = await fetch('/api/events/live');
        if (res.ok) {
          const json = await res.json();
          handleData({ type: 'snapshot', events: json.events || [], activeGenerations: json.activeGenerations || [] });
        }
      } catch (err) {
        // quiet fail
      }
    };
    fetchSnapshot();
    pollingTimer = setInterval(fetchSnapshot, 3000); // 3-second live polling fallback
  }

  // Also listen to window browser events for zero-latency local updates
  const handleLocalEvent = (e: any) => {
    handleData({ type: 'generation_event', event: e.detail });
  };
  const handleLocalStatus = (e: any) => {
    handleData({ type: 'active_status_update', activeGeneration: e.detail });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('satset_generation_event', handleLocalEvent);
    window.addEventListener('satset_active_status_updated', handleLocalStatus);
  }

  return () => {
    if (eventSource) eventSource.close();
    if (pollingTimer) clearInterval(pollingTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('satset_generation_event', handleLocalEvent);
      window.removeEventListener('satset_active_status_updated', handleLocalStatus);
    }
  };
}

