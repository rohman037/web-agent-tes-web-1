export interface AiAgentItem {
  id: string;
  name: string;
  role: string;
  model: string;
  status: 'active' | 'inactive';
  callsCount: number;
  lastUsed?: string;
  approvedPatternsCount: number;
  rejectedPatternsCount: number;
}

const LOCAL_STORAGE_AI_AGENTS_KEY = 'satset_ai_agents_data';

export const DEFAULT_AI_AGENTS: AiAgentItem[] = [
  {
    id: 'agent_hook_analyzer',
    name: 'Agent Analisis Hook FYP',
    role: 'Mengekstrak gaya hook pembuka & pola viral dari submission video',
    model: 'gemini-3.1-pro',
    status: 'active',
    callsCount: 142,
    lastUsed: new Date(Date.now() - 3600000 * 3).toISOString(),
    approvedPatternsCount: 38,
    rejectedPatternsCount: 2
  },
  {
    id: 'agent_content_idea',
    name: 'Agent Ide Konten & Angle',
    role: 'Menganalisis formula angle ide konten dari performa tinggi',
    model: 'gemini-2.5-pro',
    status: 'active',
    callsCount: 98,
    lastUsed: new Date(Date.now() - 3600000 * 5).toISOString(),
    approvedPatternsCount: 24,
    rejectedPatternsCount: 1
  },
  {
    id: 'agent_caption_pacing',
    name: 'Agent Caption & Pacing Segmen',
    role: 'Mengekstrak pacing visual & ritme transisi teks/audio',
    model: 'gemini-3.6-flash',
    status: 'active',
    callsCount: 76,
    lastUsed: new Date(Date.now() - 3600000 * 12).toISOString(),
    approvedPatternsCount: 19,
    rejectedPatternsCount: 0
  }
];

export function getAiAgents(): AiAgentItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_AI_AGENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  try {
    localStorage.setItem(LOCAL_STORAGE_AI_AGENTS_KEY, JSON.stringify(DEFAULT_AI_AGENTS));
  } catch (e) {}

  return DEFAULT_AI_AGENTS;
}

export function saveAiAgents(agents: AiAgentItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_AI_AGENTS_KEY, JSON.stringify(agents));
    window.dispatchEvent(new Event('satset_ai_agents_updated'));
  } catch (e) {
    console.error('[AiAgents Lib] Error saving agents:', e);
  }
}

export function saveAiAgent(agent: AiAgentItem): void {
  const current = getAiAgents();
  const idx = current.findIndex(a => a.id === agent.id);
  if (idx >= 0) {
    current[idx] = agent;
  } else {
    current.push(agent);
  }
  saveAiAgents(current);
}

export function deleteAiAgent(id: string): void {
  const current = getAiAgents();
  const updated = current.filter(a => a.id !== id);
  saveAiAgents(updated);
}

export function incrementAgentCall(id: string, approved: boolean): void {
  const current = getAiAgents();
  const idx = current.findIndex(a => a.id === id);
  if (idx >= 0) {
    current[idx].callsCount += 1;
    current[idx].lastUsed = new Date().toISOString();
    if (approved) {
      current[idx].approvedPatternsCount += 1;
    } else {
      current[idx].rejectedPatternsCount += 1;
    }
    saveAiAgents(current);
  }
}
