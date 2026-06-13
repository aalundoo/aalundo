// The 8 default game voice rooms. Shared by the signaling server (server.mjs)
// and the client UI. Plain JS so server.mjs can import it directly.

// Every default game room caps at 20 participants.
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 20;

export const DEFAULT_ROOMS = [
  { id: "tea-talk", name: "Tea Talk", description: "Casual chats over chai", emoji: "☕", gradient: "from-amber-500 to-orange-600", limit: DEFAULT_LIMIT },
  { id: "business", name: "Business Ideas", description: "Pitch & brainstorm", emoji: "💡", gradient: "from-sky-500 to-blue-600", limit: DEFAULT_LIMIT },
  { id: "startup", name: "Startup Lounge", description: "Founders & builders", emoji: "🚀", gradient: "from-violet-500 to-fuchsia-600", limit: DEFAULT_LIMIT },
  { id: "study", name: "Study Hall", description: "Focus together", emoji: "📚", gradient: "from-emerald-500 to-green-600", limit: DEFAULT_LIMIT },
  { id: "music", name: "Music Room", description: "Vibe & share tracks", emoji: "🎵", gradient: "from-pink-500 to-rose-600", limit: DEFAULT_LIMIT },
  { id: "gaming", name: "Gaming", description: "Squad up & play", emoji: "🎮", gradient: "from-indigo-500 to-violet-600", limit: DEFAULT_LIMIT },
  { id: "deep-talk", name: "Deep Talk", description: "Meaningful conversations", emoji: "🌙", gradient: "from-cyan-500 to-sky-600", limit: DEFAULT_LIMIT },
  { id: "general", name: "General", description: "Open hangout for anything", emoji: "💬", gradient: "from-teal-500 to-emerald-600", limit: DEFAULT_LIMIT },
];

// Gradient pool for custom (user-created) rooms, picked by a hash of the id.
export const CUSTOM_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-teal-500 to-emerald-600",
  "from-fuchsia-500 to-pink-600",
  "from-blue-500 to-cyan-600",
  "from-amber-500 to-yellow-600",
];

export function customGradient(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CUSTOM_GRADIENTS[h % CUSTOM_GRADIENTS.length];
}
