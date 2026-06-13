// MongoDB connection (cached across hot-reloads via globalThis).

import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "allundo";

export function isDbConfigured(): boolean {
  return Boolean(uri);
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoClient: Promise<MongoClient> | undefined;
}

function clientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!global.__mongoClient) {
    global.__mongoClient = new MongoClient(uri).connect();
  }
  return global.__mongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise();
  return client.db(dbName);
}
