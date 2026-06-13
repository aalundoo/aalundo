// In-memory hub for WebRTC signaling over Server-Sent Events.
//
// Each connected browser holds one SSE stream (a "client"). The hub keeps the
// per-room presence and a way to push a message to any client's stream. This
// state is intentionally in-memory and lives for the lifetime of the Node
// process — it's live-connection state, not data to persist.

export interface HubUser {
  id: string;
  name: string;
  avatar: string | null;
}

export interface HubClient {
  id: string; // peerId
  roomId: string;
  user: HubUser;
  enqueue: (chunk: string) => void;
  closed: boolean;
}

interface HubState {
  clients: Map<string, HubClient>;
  presence: Map<string, Set<string>>; // roomId -> set of peerIds
}

const g = globalThis as unknown as { __signalHub?: HubState };
const state: HubState =
  g.__signalHub ?? (g.__signalHub = { clients: new Map(), presence: new Map() });

export function memberCount(roomId: string): number {
  return state.presence.get(roomId)?.size ?? 0;
}

export function clientRoom(peerId: string): string | null {
  return state.clients.get(peerId)?.roomId ?? null;
}

export function clientBelongsToUser(peerId: string, userId: string): boolean {
  return state.clients.get(peerId)?.user.id === userId;
}

function sendTo(peerId: string, obj: unknown) {
  const c = state.clients.get(peerId);
  if (c && !c.closed) c.enqueue(`data: ${JSON.stringify(obj)}\n\n`);
}

function peersInRoom(roomId: string, exceptId: string) {
  const set = state.presence.get(roomId);
  if (!set) return [];
  return [...set]
    .filter((id) => id !== exceptId)
    .map((id) => ({ id, user: state.clients.get(id)!.user }));
}

// Register a freshly-opened SSE stream and announce presence both ways.
export function addClient(client: HubClient) {
  state.clients.set(client.id, client);
  const peers = peersInRoom(client.roomId, client.id);

  if (!state.presence.has(client.roomId)) state.presence.set(client.roomId, new Set());
  state.presence.get(client.roomId)!.add(client.id);

  // Existing peers wait for the newcomer's offer.
  for (const p of peers) {
    sendTo(p.id, { type: "peer-join", peer: { id: client.id, user: client.user } });
  }
  // The newcomer initiates offers to everyone already here.
  sendTo(client.id, { type: "joined", selfId: client.id, peers });
}

export function removeClient(peerId: string) {
  const c = state.clients.get(peerId);
  if (!c) return;
  c.closed = true;
  state.clients.delete(peerId);
  const set = state.presence.get(c.roomId);
  if (set) {
    set.delete(peerId);
    for (const id of set) sendTo(id, { type: "peer-leave", id: peerId });
    if (set.size === 0) state.presence.delete(c.roomId);
  }
}

export function relaySignal(fromId: string, toId: string, data: unknown) {
  sendTo(toId, { type: "signal", from: fromId, data });
}

export function broadcastState(roomId: string, fromId: string, muted: boolean) {
  const set = state.presence.get(roomId);
  if (!set) return;
  for (const id of set) {
    if (id !== fromId) sendTo(id, { type: "peer-state", id: fromId, muted });
  }
}
