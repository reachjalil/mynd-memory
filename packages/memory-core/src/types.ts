export const memoryStates = [
  "observed",
  "short_term",
  "working",
  "candidate",
  "long_term",
  "dormant",
  "decayed",
  "superseded",
] as const;

export type MemoryState = (typeof memoryStates)[number];

export const memoryTypes = [
  "user_preference",
  "user_fact",
  "goal",
  "task",
  "decision",
  "emotional_signal",
  "repeated_pattern",
  "conversation_episode",
  "skill_or_learning",
  "relationship_context",
] as const;

export type MemoryType = (typeof memoryTypes)[number];

export const agentMoods = [
  "calm",
  "focused",
  "curious",
  "overloaded",
  "cautious",
  "excited",
  "reflective",
] as const;

export type AgentMood = (typeof agentMoods)[number];

export type MemoryEventKind =
  | "memory_observed"
  | "memory_encoded"
  | "memory_scored"
  | "memory_recalled"
  | "memory_reinforced"
  | "memory_decayed"
  | "memory_consolidated"
  | "memory_ignored"
  | "memory_superseded"
  | "time_advanced"
  | "parameter_changed"
  | "agent_created"
  | "hydradb_sync";

export type AgentRole = "user" | "agent" | "system";

export interface BrainParameters {
  shortTermCapacity: number;
  decaySpeed: number;
  importanceThreshold: number;
  emotionalSensitivity: number;
  recencyBias: number;
  longTermRecallStrength: number;
  consolidationAggressiveness: number;
  themeLinkingSensitivity: number;
  moodInfluence: number;
  exploration: number;
}

export interface AgentMemory {
  id: string;
  agentId: string;
  content: string;
  type: MemoryType;
  sourceInteraction: string;
  createdAt: string;
  simulatedTime: string;
  lastAccessedAt: string;
  importance: number;
  emotionalWeight: number;
  confidence: number;
  theme: string;
  relatedMemoryIds: string[];
  decayRate: number;
  accessCount: number;
  state: MemoryState;
  explanation: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  memoryAge: string;
  personality: string;
  operatingStyle: string;
  mood: AgentMood;
  recallStrategy: string;
  parameters: BrainParameters;
  seedMemories: AgentMemory[];
}

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  createdAt: string;
  retrievedMemoryIds: string[];
  newMemoryIds: string[];
  explanation: string;
}

export interface MemoryEvent {
  id: string;
  kind: MemoryEventKind;
  title: string;
  detail: string;
  createdAt: string;
  memoryId?: string;
  score?: number;
}

export interface RetrievalTrace {
  memoryId: string;
  score: number;
  matchedTerms: string[];
  used: boolean;
  reason: string;
}

export interface AgentTurnResult {
  state: SimulatorState;
  retrieved: AgentMemory[];
  created: AgentMemory[];
  ignored: RetrievalTrace[];
  response: AgentMessage;
}

export interface SimulatorState {
  profile: AgentProfile;
  memories: AgentMemory[];
  messages: AgentMessage[];
  events: MemoryEvent[];
  simulatedNow: string;
  parameters: BrainParameters;
  activeHydra?: HydraConnectionSummary;
}

export interface HydraConnectionSummary {
  configured: boolean;
  tenantId: string;
  sharedSubTenantId: string;
  profileSubTenantId: string;
  lastRequestId?: string;
  lastSyncAt?: string;
  status: "offline" | "ready" | "not_ready" | "error";
  message: string;
}

export interface AgentDraftInput {
  name: string;
  description: string;
  personality: string;
  mood: AgentMood;
  memoryAge?: string;
  recallStrategy?: string;
}
