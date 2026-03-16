// Multi-Agent System Index
// Comprehensive multi-agent coordination with specialized sub-agents

// Main exports
export {
  MultiAgentCoordinator,
  multiAgentCoordinator,
} from './coordinator.js';

// Types
export type {
  AgentCategory,
  BrainAgentType,
  SensesAgentType,
  BodyAgentType,
  TeamAgentType,
  OpsAgentType,
  FutureAgentType,
  AgentRole,
  TaskComplexity,
  RoutingDecision,
  AgentMessage,
  AgentTask,
  AgentConfig,
  SwarmConfig,
  AgentStats,
  ObservabilityData,
  CostTracking,
  DebateFormat,
  ProactiveAlert,
} from './types.js';

// Agent Factory
export {
  AgentFactory,
  agentFactory,
} from './agent-factory.js';

// Task Router
export {
  TaskRouter,
  taskRouter,
} from './router.js';

// Message Bus
export {
  MessageBus,
  messageBus,
} from './message-bus.js';

// Brain Agents
export {
  ScratchpadAgent,
  createScratchpadAgent,
} from './brain/scratchpad-agent.js';

export {
  CriticAgent,
  createCriticAgent,
} from './brain/critic-agent.js';

export {
  RouterAgent,
  createRouterAgent,
} from './brain/router-agent.js';

// Senses Agents
export {
  VisionAgent,
  createVisionAgent,
} from './senses/vision-agent.js';

export {
  AudioAgent,
  createAudioAgent,
} from './senses/audio-agent.js';

export {
  IotAgent,
  createIotAgent,
} from './senses/iot-agent.js';

// Body Agents
export {
  ResearchAgent,
  createResearchAgent,
} from './body/research-agent.js';

export {
  CodeReviewAgent,
  createCodeReviewAgent,
} from './body/code-review-agent.js';

export {
  AnalystAgent,
  createAnalystAgent,
} from './body/analyst-agent.js';

// Team Agents
export {
  DrafterAgent,
  createDrafterAgent,
} from './team/drafter-agent.js';

export {
  CriticAgent as CriticTeamAgent,
  createCriticTeamAgent,
} from './team/critic-agent.js';

export {
  DebaterAgent,
  createDebaterAgent,
} from './team/debater-agent.js';

export {
  DelegateAgent,
  createDelegateAgent,
} from './team/delegate-agent.js';

// Ops Agents
export {
  ObservabilityAgent,
  createObservabilityAgent,
} from './ops/observability-agent.js';

export {
  CostGovernorAgent,
  createCostGovernorAgent,
} from './ops/cost-governor-agent.js';

export {
  ChaosTesterAgent,
  createChaosTesterAgent,
} from './ops/chaos-tester-agent.js';

// Future Agents
export {
  DigitalTwinAgent,
  createDigitalTwinAgent,
} from './future/digital-twin-agent.js';

export {
  ForesightAgent,
  createForesightAgent,
} from './future/foresight-agent.js';

export {
  FederatedMemoryAgent,
  createFederatedMemoryAgent,
} from './future/federated-memory-agent.js';
