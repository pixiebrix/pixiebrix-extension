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

import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import { flatten, groupBy, sortBy } from "lodash";
import { type RegistryPackage } from "@/types/contract";
import { fetch } from "@/hooks/fetch";
import { type Except } from "type-fest";
import { deleteDatabase } from "@/utils/idbUtils";
import { PACKAGE_REGEX } from "@/types/helpers";
import { type UnknownObject } from "@/types/objectTypes";
import { memoizeUntilSettled } from "@/utils/promiseUtils";

const DATABASE_NAME = "BRICK_REGISTRY";
const BRICK_STORE = "bricks";
const VERSION = 1;

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

type PackageVersion = {
  id: string;
  version: Version;
  kind: Kind;
  scope: string;
  config: UnknownObject;
  rawConfig: string | null;
  timestamp: Date;
};

interface RegistryDB extends DBSchema {
  [BRICK_STORE]: {
    value: PackageVersion;
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

async function openRegistryDB() {
  // Always return a new DB connection. IDB performance seems to be better than reusing the same connection.
  // https://stackoverflow.com/questions/21418954/is-it-bad-to-open-several-database-connections-in-indexeddb
  let database: IDBPDatabase<RegistryDB> | null = null;

  database = await openDB<RegistryDB>(DATABASE_NAME, VERSION, {
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

function latestVersion(versions: PackageVersion[]): PackageVersion | null {
  return versions.length > 0
    ? sortBy(
        versions,
        (x) => -x.version.major,
        (x) => -x.version.minor,
        (x) => -x.version.patch,
      )[0]
    : null;
}

/**
 * Return all packages for the given kinds
 * @param kinds kinds of bricks
 */
export async function getByKinds(kinds: Kind[]): Promise<PackageVersion[]> {
  const db = await openRegistryDB();

  try {
    const bricks = flatten(
      await Promise.all(
        kinds.map(async (kind) =>
          db.getAllFromIndex(BRICK_STORE, "kind", kind),
        ),
      ),
    );

    return Object.entries(groupBy(bricks, (x) => x.id)).map(([, versions]) =>
      latestVersion(versions),
    );
  } finally {
    db.close();
  }
}

/**
 * Clear the brick definition registry
 */
export async function clear(): Promise<void> {
  const db = await openRegistryDB();
  try {
    await db.clear(BRICK_STORE);
  } finally {
    db.close();
  }
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
 * Deletes and recreates the brick definition database.
 */
export async function recreateDB(): Promise<void> {
  await deleteDatabase(DATABASE_NAME);

  // Open the database to recreate it
  await openRegistryDB();

  // Re-populate the packages from the remote registry
  await syncPackages();
}

/**
 * Return the number of records in the registry.
 */
export async function count(): Promise<number> {
  const db = await openRegistryDB();
  try {
    return await db.count(BRICK_STORE);
  } finally {
    db.close();
  }
}

/**
 * Replace all packages in the local database.
 * @param packages the packages to put in the database
 */
async function replaceAll(packages: PackageVersion[]): Promise<void> {
  const db = await openRegistryDB();

  try {
    const tx = db.transaction(BRICK_STORE, "readwrite");

    await tx.store.clear();
    await Promise.all(packages.map(async (obj) => tx.store.add(obj)));

    await tx.done;
  } finally {
    db.close();
  }
}

export function parsePackage(
  item: RegistryPackage,
): Except<PackageVersion, "timestamp"> {
  const [major, minor, patch] = item.metadata.version
    .split(".")
    .map((x) => Number.parseInt(x, 10));

  const match = PACKAGE_REGEX.exec(item.metadata.id);

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
 * Return the latest version of a brick, or null if it's not found.
 * @param id the registry id
 * @param options the find options
 * @param options.shouldFetch whether to fetch from the api if not found in the db
 */
export async function find(
  id: string,
  options: { shouldFetch?: boolean } = {},
): Promise<PackageVersion | null> {
  if (id == null) {
    throw new Error("id is required");
  }

  if (typeof id !== "string") {
    console.error("REGISTRY_FIND received invalid id argument", { id });
    throw new Error("invalid brick id");
  }

  const db = await openRegistryDB();

  try {
    const versions = await db.getAllFromIndex(BRICK_STORE, "id", id);
    const diskResult = latestVersion(versions);

    if (!options.shouldFetch || diskResult != null) {
      return diskResult;
    }

    // The endpoint doesn't return the updated_at timestamp. So use the current local time as our timestamp.
    const timestamp = new Date();
    const data = await fetch<RegistryPackage>(`/api/registry/bricks/${id}`);
    const packageVersion: PackageVersion = {
      ...parsePackage(data),
      // Use the timestamp the call was initiated, not the timestamp received. That prevents missing any updates
      // that were made during the call.
      timestamp,
    };
    const tx = db.transaction(BRICK_STORE, "readwrite");
    await tx.store.put(packageVersion);
    await tx.done;
  } finally {
    db.close();
  }
}
