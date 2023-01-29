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
import { type RegistryId, type UUID } from "@/core";

const STORAGE_KEY = "TOUR";
const ENTRY_OBJECT_STORE = "tourRuns";
const DB_VERSION_NUMBER = 1;

type TourMetadata = {
  /**
   * The tour nonce.
   * @since 1.7.19
   */
  id: UUID;
  /**
   * The extension id associated with the tour.
   * @since 1.7.19
   */
  extensionId: UUID;
  /**
   * The blueprint id containing the tour. Used to disambiguate tour names across browsers
   */
  packageId: RegistryId | null;
  /**
   * The tour name.
   * - For tour extensions, the name of the extension
   * - For tour effects, the name of the step, or the name of the extension
   * @since 1.7.19
   */
  tourName: string;
};

type TourStatus = {
  /**
   * True if the tour was completed successfully.
   */
  completed: boolean;
  /**
   * True if the tour finished exceptionally.
   */
  errored: boolean;
  /**
   * True if the user skipped the tour or the tour was cancelled
   */
  skipped: boolean;
};

type TourEntry = TourMetadata &
  TourStatus & {
    /**
     * When the tour entry was last updated: e.g., start, finish.
     * @since 1.7.19
     */
    updatedAt: string;
  };

interface TourDB extends DBSchema {
  [ENTRY_OBJECT_STORE]: {
    value: TourEntry;
    key: string;
    indexes: {
      id: string;
      tourName: string;
      packageId: string;
      extensionId: string;
    };
  };
}

const indexKeys = ["tourName", "packageId", "extensionId"] as const;

async function getDB(): Promise<IDBPDatabase<TourDB>> {
  return openDB<TourDB>(STORAGE_KEY, DB_VERSION_NUMBER, {
    upgrade(db) {
      // Create a store of objects
      const store = db.createObjectStore(ENTRY_OBJECT_STORE, {
        keyPath: "id",
      });

      for (const key of indexKeys) {
        store.createIndex(key, key, {
          unique: false,
        });
      }
    },
  });
}

/**
 * Record the start of a tour
 * @param run the tour run
 */
export async function recordStart(run: TourMetadata): Promise<void> {
  const db = await getDB();
  await db.add(ENTRY_OBJECT_STORE, {
    ...run,
    updatedAt: new Date().toISOString(),
    completed: false,
    skipped: false,
    errored: false,
  });
}

/**
 * Record the end of a tour
 * @param nonce the tour nonce
 * @param update the update to apply
 */
export async function recordEnd(
  nonce: UUID,
  update: TourStatus
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(ENTRY_OBJECT_STORE, "readwrite");
  const value = await tx.store.get(nonce);
  await tx.store.put({
    ...value,
    ...update,
    updatedAt: new Date().toISOString(),
  });
  await tx.done;
}

/**
 * Retrieve all tour runs.
 */
export async function getAll(): Promise<TourEntry[]> {
  const db = await getDB();
  return db.getAll(ENTRY_OBJECT_STORE);
}
