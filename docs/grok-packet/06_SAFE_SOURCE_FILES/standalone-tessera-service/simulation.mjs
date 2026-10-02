import { randomUUID } from 'node:crypto';
import { ProtocolError, exact, safeText } from './protocol.mjs';
import {
  generateSimulationTurn,
  simulationProviderConfiguration,
  validateSimulationProviderOutput,
  validSimulationWorldId,
} from './simulation-provider.mjs';

const METHODS = [
  'simulation.status', 'simulation.list', 'simulation.get', 'simulation.create',
  'simulation.advance', 'simulation.enterChat', 'simulation.chat',
  'simulation.returnHome', 'simulation.delete',
];

export function createSimulationGateway({
  env = process.env,
  fetcher = fetch,
  generate = generateSimulationTurn,
} = {}) {
  return {
    methods: METHODS,
    validate(request, isOwner) {
      if (!isOwner) throw new ProtocolError(403, 'Owner approval required');
      const { method, payload: p } = request;
      if (method === 'simulation.status' || method === 'simulation.list') {
        if (exact(p, [])) return;
      } else if (method === 'simulation.create') {
        if (exact(p, ['prompt']) && safeText(p.prompt, 1200)) return;
      } else if (method === 'simulation.get') {
        if (exact(p, ['worldId']) && validSimulationWorldId(p.worldId)) return;
      } else if (method === 'simulation.advance' || method === 'simulation.chat') {
        if (exact(p, ['worldId', 'expectedVersion', 'prompt']) &&
            validSimulationWorldId(p.worldId) &&
            Number.isSafeInteger(p.expectedVersion) && p.expectedVersion > 0 &&
            safeText(p.prompt, 1200)) return;
      } else if (['simulation.enterChat', 'simulation.returnHome', 'simulation.delete'].includes(method)) {
        if (exact(p, ['worldId', 'expectedVersion']) &&
            validSimulationWorldId(p.worldId) &&
            Number.isSafeInteger(p.expectedVersion) && p.expectedVersion > 0) return;
      }
      throw new ProtocolError(400, 'Invalid simulation request');
    },
    async handle(request, { store }) {
      store.ready();
      const { method, payload: p, staffUserId: staff } = request;
      if (method === 'simulation.status') {
        const config = simulationProviderConfiguration(env);
        const verifiedAt = config.model ? store.simulationProviderVerifiedAt(config.model) : null;
        const sourceCoverage = store.simulationSourceCoverage(staff);
        return {
          state: !config.configured ? 'unavailable' : verifiedAt ? 'ready' : 'configured_unverified',
          provider: config.provider,
          model: config.model,
          webSearch: config.webSearch,
          approvedSourceCount: sourceCoverage.approved,
          pendingSourceCount: sourceCoverage.pending,
          sourceCoverageComplete: false,
          providerVerifiedAt: verifiedAt,
        };
      }
      if (method === 'simulation.list') return { worlds: store.listSimulationWorlds(staff) };
      if (method === 'simulation.get') {
        const world = store.getSimulationWorld(staff, p.worldId);
        if (!world) throw new ProtocolError(404, 'Simulation world not found');
        return { world };
      }
      if (method === 'simulation.delete') {
        const deleted = store.deleteSimulationWorld(staff, p.worldId, p.expectedVersion);
        if (deleted === 'missing') throw new ProtocolError(404, 'Simulation world not found');
        if (!deleted) throw new ProtocolError(409, 'Simulation world changed; refresh before deleting');
        return { deleted: true };
      }
      if (method === 'simulation.enterChat' || method === 'simulation.returnHome') {
        const mode = method === 'simulation.enterChat' ? 'chat' : 'home';
        const world = store.setSimulationMode(staff, p.worldId, p.expectedVersion, mode);
        if (world === 'missing') throw new ProtocolError(404, 'Simulation world not found');
        if (!world) throw new ProtocolError(409, 'Simulation world changed; refresh before switching modes');
        return { world };
      }

      const creating = method === 'simulation.create';
      const chatMode = method === 'simulation.chat';
      const current = creating ? null : store.getSimulationWorld(staff, p.worldId);
      if (creating && store.listSimulationWorlds(staff).length >= 10) {
        throw new ProtocolError(409, 'World limit reached; delete a saved world before creating another');
      }
      if (!creating && !current) throw new ProtocolError(404, 'Simulation world not found');
      if (!creating && current.version !== p.expectedVersion) {
        throw new ProtocolError(409, 'Simulation world changed; refresh before sending');
      }
      if (method === 'simulation.advance' && current.mode !== 'home') {
        throw new ProtocolError(409, 'Return to the simulation home before advancing its world');
      }
      if (chatMode && current.mode !== 'chat') {
        throw new ProtocolError(409, 'Enter chatbot mode before sending a message');
      }

      const reservation = store.beginChatCall(staff);
      if (!reservation) throw new ProtocolError(429, 'Provider call limit reached; retry later');
      let generated;
      let documents;
      try {
        documents = store.retrieveDocuments(p.prompt, Date.now(), 3);
        generated = await generate({
          mode: creating ? 'create' : chatMode ? 'chat' : 'advance',
          prompt: p.prompt,
          world: current ? {
            title: current.title, summary: current.summary, agents: current.agents,
          } : null,
          events: current?.events ?? [],
          knowledge: documents,
        }, env, fetcher);
      } finally {
        store.finishChatCall(reservation);
      }
      const config = simulationProviderConfiguration(env);
      const checked = validateSimulationProviderOutput(generated, config.model);
      if (!checked) throw new ProtocolError(503, 'Unsafe or incomplete simulation response');

      const event = {
        kind: chatMode ? 'chat' : 'world',
        input: p.prompt,
        output: checked.narrative,
        citations: checked.citations,
        model: checked.model,
      };
      const currentAgents = new Map((current?.agents ?? []).map(agent => [agent.name.toLocaleLowerCase('en-US'), agent]));
      const agents = checked.agents.map(agent => ({
        id: currentAgents.get(agent.name.toLocaleLowerCase('en-US'))?.id ?? randomUUID(),
        ...agent,
      }));
      let world;
      if (creating) {
        world = store.createSimulationWorld(staff, {
          title: checked.title, summary: checked.summary, agents, event,
        });
        if (!world) throw new ProtocolError(409, 'World limit reached; delete a saved world before creating another');
      } else if (chatMode) {
        world = store.appendSimulationChat(staff, p.worldId, p.expectedVersion, event);
        if (world === 'missing') throw new ProtocolError(404, 'Simulation world not found');
        if (!world) throw new ProtocolError(409, 'Simulation world changed; refresh before sending');
      } else {
        world = store.advanceSimulationWorld(staff, p.worldId, p.expectedVersion, {
          title: checked.title, summary: checked.summary, agents, event,
        });
        if (world === 'missing') throw new ProtocolError(404, 'Simulation world not found');
        if (!world) throw new ProtocolError(409, 'Simulation world changed; refresh before sending');
      }
      store.markSimulationProviderVerified(checked.model);
      return { world, event: world.events.at(-1) };
    },
  };
}