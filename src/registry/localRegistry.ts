/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { type DBSchema, openDB } from "idb/with-async-ittr";
import { sortBy, groupBy, flatten } from "lodash";
import { type RegistryPackage } from "@/types/contract";
import { fetch } from "@/hooks/fetch";
import { type Except } from "type-fest";

const STORAGE_KEY = "BRICK_REGISTRY";
const BRICK_STORE = "bricks";
const VERSION = 1;

const MS_PER_MINUTE = 60_000;

export const PACKAGE_NAME_REGEX =
  /^((?<scope>@[\da-z~-][\d._a-z~-]*)\/)?((?<collection>[\da-z~-][\d._a-z~-]*)\/)?(?<name>[\da-z~-][\d._a-z~-]*)$/;

export type Version = {
  major: number;
  minor: number;
  patch: number;
};

export type Kind =
  | "block"
  | "foundation"
  | "service"
  | "blueprint"
  | "reader"
  | "effect"
  | "component"
  | "extensionPoint"
  | "recipe";

export type Package = {
  id: string;
  version: Version;
  kind: Kind;
  scope: string;
  config: Record<string, unknown>;
  rawConfig: string | null;
  timestamp: Date;
};

interface LogDB extends DBSchema {
  [BRICK_STORE]: {
    value: Package;
    key: [string, number, number, number];
    indexes: {
      id: string;
      scope: string;
      version: [number, number, number];
      kind: string;
      timestamp: Date;
    };
  };
}

async function getBrickDB() {
  return openDB<LogDB>(STORAGE_KEY, VERSION, {
    upgrade(db) {
      // Create a store of objects
      const store = db.createObjectStore(BRICK_STORE, {
        keyPath: ["id", "version.major", "version.minor", "version.patch"],
      });
      store.createIndex("id", "id", {
        unique: false,
      });
      store.createIndex("scope", "scope", { unique: false });
      store.createIndex("timestamp", "timestamp", { unique: false });
      store.createIndex("kind", "kind", { unique: false });
    },
  });
}

function latestVersion(versions: Package[]): Package | null {
  return versions.length > 0
    ? sortBy(
        versions,
        (x) => -x.version.major,
        (x) => -x.version.minor,
        (x) => -x.version.patch
      )[0]
    : null;
}

/**
 * Return all packages for the given kinds
 * @param kinds kinds of bricks
 */
export async function getByKinds(kinds: Kind[]): Promise<Package[]> {
  const db = await getBrickDB();

  const bricks = flatten(
    await Promise.all(
      kinds.map(async (kind) => db.getAllFromIndex(BRICK_STORE, "kind", kind))
    )
  );

  return Object.entries(groupBy(bricks, (x) => x.id)).map(([, versions]) =>
    latestVersion(versions)
  );
}

/**
 * Clear the registry
 */
export async function clear(): Promise<void> {
  const db = await getBrickDB();
  await db.clear(BRICK_STORE);
}

async function latestTimestamp(): Promise<Date> {
  const db = await getBrickDB();
  const tx = db.transaction(BRICK_STORE, "readonly");
  // Iterate from most recent to least recent and take first
  const cursor = tx.store.index("timestamp").iterate(null, "prev");
  const result = await cursor.next();
  await tx.done;
  return result.value?.value.timestamp;
}

/**
 * Put all the packages in the local database.
 * @param packages the packages to put in the database
 */
async function putAll(packages: Package[]): Promise<void> {
  const db = await getBrickDB();
  const tx = db.transaction(BRICK_STORE, "readwrite");

  for (const obj of packages) {
    void tx.store.put(obj);
  }

  await tx.done;
}

function parsePackage(item: RegistryPackage): Except<Package, "timestamp"> {
  const [major, minor, patch] = item.metadata.version
    .split(".")
    .map((x) => Number.parseInt(x, 10));

  const match = PACKAGE_NAME_REGEX.exec(item.metadata.id);

  return {
    id: item.metadata.id,
    version: { major, minor, patch },
    scope: match.groups.scope,
    kind: item.kind,
    config: item,
    // We don't need to store the raw configs, because the Workshop uses an endpoint vs. the registry version
    rawConfig: undefined,
  };
}

/**
 * Fetch all new packages from the registry and put them in the local database.
 * @returns true if the registry was updated, false otherwise
 */
export async function fetchNewPackages(): Promise<boolean> {
  // The endpoint doesn't return the updated_at timestamp. So use the current local time as our timestamp.
  const timestamp = new Date();

  const date = await latestTimestamp();
  const params = new URLSearchParams();
  if (date) {
    // Add a fudge factor of 5 minutes to the timestamp to avoid issues arising from clock being out of sync
    // between client and server.
    const lowerBound = new Date(date.getTime() - MS_PER_MINUTE * 5);
    params.set("updated_at__gt", lowerBound.toISOString());
  }

  const data = await fetch<RegistryPackage[]>(
    `/api/registry/bricks/?${params.toString()}`
  );

  const packages = data.map((x) => ({
    ...parsePackage(x),
    // Use the timestamp the call was initiated, not the timestamp received. That prevents missing any updates
    // that were made during the call.
    timestamp,
  }));

  await putAll(packages);

  return packages.length > 0;
}

/**
 * Replace the local database with the packages from the registry.
 */
export async function syncPackages(): Promise<void> {
  // The endpoint doesn't return the updated_at timestamp. So use the current local time as our timestamp.
  const timestamp = new Date();

  // In the future, use the paginated endpoint?
  const data = await fetch<RegistryPackage[]>("/api/registry/bricks/");

  const packages = data.map((x) => ({
    ...parsePackage(x),
    // Use the timestamp the call was initiated, not the timestamp received. That prevents missing any updates
    // that were made during the call.
    timestamp,
  }));

  const db = await getBrickDB();
  const tx = db.transaction(BRICK_STORE, "readwrite");
  await clear();
  await putAll(packages);
  await tx.done;
}

/**
 * Return the latest version of a brick, or null if it's not found.
 * @param id the registry id
 */
export async function find(id: string): Promise<Package | null> {
  if (id == null) {
    throw new Error("id is required");
  }

  if (typeof id !== "string") {
    console.error("REGISTRY_FIND received invalid id argument", { id });
    throw new Error("invalid brick id");
  }

  const db = await getBrickDB();
  const versions = await db.getAllFromIndex(BRICK_STORE, "id", id);
  return latestVersion(versions);
}
