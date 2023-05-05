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

import { type DBSchema, type IDBPDatabase, openDB } from "idb/with-async-ittr";
import { flatten, groupBy, sortBy } from "lodash";
import { type RegistryPackage } from "@/types/contract";
import { fetch } from "@/hooks/fetch";
import { type Except } from "type-fest";
import { memoizeUntilSettled } from "@/utils";
import { deleteDatabase } from "@/utils/idbUtils";

const DATABASE_NAME = "BRICK_REGISTRY";
const BRICK_STORE = "bricks";
const VERSION = 1;

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

interface BrickDB extends DBSchema {
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
  // Always return a new DB connection. IDB performance seems to be better than reusing the same connection.
  // https://stackoverflow.com/questions/21418954/is-it-bad-to-open-several-database-connections-in-indexeddb
  let database: IDBPDatabase<BrickDB> | null = null;

  database = await openDB<BrickDB>(DATABASE_NAME, VERSION, {
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
    blocking() {
      // Don't block closing/upgrading the database
      console.debug("Closing brick database due to upgrade/delete");
      database?.close();
      database = null;
    },
    terminated() {
      console.debug("Brick database connection was unexpectedly terminated");
      database = null;
    },
  });

  database.addEventListener("close", () => {
    database = null;
  });

  return database;
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
 * Clear the brick definition registry
 */
export async function clear(): Promise<void> {
  const db = await getBrickDB();
  await db.clear(BRICK_STORE);
}

/**
 * Deletes and recreates the brick definition database.
 */
export async function recreateDB(): Promise<void> {
  await deleteDatabase(DATABASE_NAME);

  // Open the database to recreate it
  await getBrickDB();

  // Re-populate the packages from the remote registry
  await syncPackages();
}

/**
 * Return the number of records in the registry.
 */
export async function count(): Promise<number> {
  const db = await getBrickDB();
  return db.count(BRICK_STORE);
}

/**
 * Replace all packages in the local database.
 * @param packages the packages to put in the database
 */
async function replaceAll(packages: Package[]): Promise<void> {
  const db = await getBrickDB();
  const tx = db.transaction(BRICK_STORE, "readwrite");

  await tx.store.clear();
  await Promise.all(packages.map(async (obj) => tx.store.add(obj)));

  await tx.done;
}

export function parsePackage(
  item: RegistryPackage
): Except<Package, "timestamp"> {
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
 * Replace the local database with the packages from the registry.
 *
 * Memoized to avoid multiple network requests across tabs.
 */
export const syncPackages = memoizeUntilSettled(async () => {
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

  await replaceAll(packages);
});

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
