/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { DBSchema, openDB } from "idb/with-async-ittr";
import { sortBy, groupBy } from "lodash";

const STORAGE_KEY = "BRICK_REGISTRY";
const BRICK_STORE = "bricks";
const VERSION = 1;

// `LOCAL_SCOPE` is for supporting local bricks that aren't synced with the server. This feature is not implemented yet,
// but there's some parts of it floating around. See https://github.com/pixiebrix/pixiebrix-extension/issues/14
export const LOCAL_SCOPE = "@local";

export const PACKAGE_NAME_REGEX = /^((?<scope>@[\da-z~-][\d._a-z~-]*)\/)?((?<collection>[\da-z~-][\d._a-z~-]*)\/)?(?<name>[\da-z~-][\d._a-z~-]*)$/;

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export type Kind =
  | "block"
  | "foundation"
  | "service"
  | "blueprint"
  | "reader"
  | "effect"
  | "component"
  | "extensionPoint";

export interface Package {
  id: string;
  version: Version;
  kind: Kind;
  scope: string;
  config: Record<string, unknown>;
  rawConfig: string | null;
  timestamp: Date;
}

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

function getKey(object: Package): [string, number, number, number] {
  return [
    object.id,
    object.version.major,
    object.version.minor,
    object.version.patch,
  ];
}

async function getBrickDB() {
  return openDB<LogDB>(STORAGE_KEY, VERSION, {
    upgrade(database) {
      // Create a store of objects
      const store = database.createObjectStore(BRICK_STORE, {
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

export async function getKind(kind: Kind) {
  const database = await getBrickDB();
  const bricks = await database.getAllFromIndex(BRICK_STORE, "kind", kind);
  return Object.entries(groupBy(bricks, (x) => x.id)).map(([, versions]) =>
    latestVersion(versions)
  );
}

// `getLocal` is for supporting local bricks that aren't synced with the server. This feature is not implemented yet,
// but there's some parts of it floating around. See https://github.com/pixiebrix/pixiebrix-extension/issues/14
export async function getLocal() {
  const database = await getBrickDB();
  return database.getAllFromIndex(BRICK_STORE, "scope", LOCAL_SCOPE);
}

// `getLocal` is for supporting local bricks that aren't synced with the server. This feature is not implemented yet,
// but there's some parts of it floating around. See https://github.com/pixiebrix/pixiebrix-extension/issues/14
export async function add(object: Package) {
  const database = await getBrickDB();
  await database.put(BRICK_STORE, object);
}

export async function syncRemote(kind: Kind, objs: Package[]) {
  const database = await getBrickDB();
  const tx = database.transaction(BRICK_STORE, "readwrite");

  const current = await tx.store.getAll();

  let deleteCnt = 0;
  for (const object of current) {
    if (object.kind === kind && object.scope !== LOCAL_SCOPE) {
      void tx.store.delete(getKey(object));
      deleteCnt++;
    }
  }

  for (const object of objs) {
    void tx.store.put(object);
  }

  await tx.done;

  console.debug(
    `Replaced ${deleteCnt} ${kind} entries with ${objs.length} entries`
  );
}

export async function find(id: string) {
  if (id == null) {
    throw new Error("id is required");
  }

  if (typeof id !== "string") {
    console.error("REGISTRY_FIND received invalid id argument", { id });
    throw new Error("invalid brick id");
  }

  const database = await getBrickDB();
  const versions = await database.getAllFromIndex(BRICK_STORE, "id", id);
  return latestVersion(versions);
}
