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

import { type JsonObject } from "type-fest";
import { uuidv4 } from "@/types/helpers";
import { compact, debounce, isEmpty, once, throttle, uniq } from "lodash";
import { type ManualStorageKey, readStorage, setStorage } from "@/chrome";
import { isLinked } from "@/auth/token";
import { type UUID } from "@/types/stringTypes";
import { loadOptions } from "@/store/extensionsStorage";
import {
  getLinkedApiClient,
  maybeGetLinkedApiClient,
} from "@/services/apiClient";
import { allowsTrack } from "@/telemetry/dnt";
import { type DBSchema, type IDBPDatabase, openDB } from "idb/with-async-ittr";
import { type UnknownObject } from "@/types/objectTypes";
import { deleteDatabase } from "@/utils/idbUtils";
import { detectBrowser } from "@/vendors/mixpanel";
import { type RegistryId } from "@/types/registryTypes";
import { syncFlagOn } from "@/store/syncFlags";

const UID_STORAGE_KEY = "USER_UUID" as ManualStorageKey;
const EVENT_BUFFER_DEBOUNCE_MS = 2000;
const EVENT_BUFFER_MAX_MS = 10_000;
const TELEMETRY_DB_NAME = "telemetrydb";
const TELEMETRY_DB_VERSION_NUMBER = 1;
const TELEMETRY_EVENT_OBJECT_STORE = "events";

interface UserTelemetryEvent {
  uid: string;
  event: string;
  timestamp: number;
  data: JsonObject;
}

interface TelemetryDB extends DBSchema {
  [TELEMETRY_EVENT_OBJECT_STORE]: {
    value: UserTelemetryEvent;
    key: string;
  };
}

/**
 * Map from run key (blueprintId + brickId) to the number of runs.
 *
 * It's OK to store in memory because the user generally has to be authenticated to create/run mods.
 */
const runCountBuffer = new Map<string, number>();

async function openTelemetryDB() {
  // Always return a new DB connection. IDB performance seems to be better than reusing the same connection.
  // https://stackoverflow.com/questions/21418954/is-it-bad-to-open-several-database-connections-in-indexeddb
  let database: IDBPDatabase<TelemetryDB> | null = null;

  database = await openDB<TelemetryDB>(
    TELEMETRY_DB_NAME,
    TELEMETRY_DB_VERSION_NUMBER,
    {
      upgrade(db) {
        // This is a new DB, so no need to delete existing object store yet
        db.createObjectStore(TELEMETRY_EVENT_OBJECT_STORE, {
          autoIncrement: true,
        });
      },
      blocking() {
        // Don't block upgrading/deleting the database
        console.debug("Closing telemetry database due to upgrade/delete");
        database?.close();
        database = null;
      },
      terminated() {
        console.debug(
          "Telemetry database connection was unexpectedly terminated"
        );
        database = null;
      },
    }
  );

  database.addEventListener("close", () => {
    database = null;
  });

  return database;
}

async function addEvent(event: UserTelemetryEvent): Promise<void> {
  const db = await openTelemetryDB();
  await db.add(TELEMETRY_EVENT_OBJECT_STORE, event);
}

export async function flushEvents(): Promise<UserTelemetryEvent[]> {
  const db = await openTelemetryDB();
  const tx = db.transaction(TELEMETRY_EVENT_OBJECT_STORE, "readwrite");
  const allEvents = await tx.store.getAll();
  await tx.store.clear();
  return allEvents;
}

/**
 * Deletes and recreates the logging database.
 */
export async function recreateDB(): Promise<void> {
  await deleteDatabase(TELEMETRY_DB_NAME);

  // Open the database to recreate it
  await openTelemetryDB();
}

/**
 * Returns the number of telemetry entries in the database.
 */
export async function count(): Promise<number> {
  const db = await openTelemetryDB();
  return db.count(TELEMETRY_EVENT_OBJECT_STORE);
}

/**
 * Clears all event entries from the database.
 */
export async function clear(): Promise<void> {
  const db = await openTelemetryDB();
  await db.clear(TELEMETRY_EVENT_OBJECT_STORE);
}

/**
 * Return a random ID for this browser profile.
 * It's persisted in storage via `chrome.storage.local` and in-memory via `once`
 */
export const uid = once(async (): Promise<UUID> => {
  const uid = await readStorage<UUID>(UID_STORAGE_KEY);
  if (uid) {
    return uid;
  }

  const uuid = uuidv4();
  console.debug("Generating UID for browser", { uuid });
  await setStorage(UID_STORAGE_KEY, uuid);
  return uuid;
});

/**
 * Returns UserTelemetryEvent associated with current brick run counts and flush the buffer.
 */
function flushRunCountBuffer(): UserTelemetryEvent[] {
  const timestamp = Date.now();

  const events = [...runCountBuffer.entries()].map(([runKey, count]) => {
    const [blueprintId, brickId] = runKey.split(":");
    return {
      uid: uuidv4(),
      event: "BrickRunCount",
      timestamp,
      data: {
        blueprintId: isEmpty(blueprintId) ? null : blueprintId,
        brickId,
        count,
      },
    };
  });

  runCountBuffer.clear();

  return events;
}

async function flush(): Promise<void> {
  const client = await maybeGetLinkedApiClient();
  if (client) {
    const runEvents = flushRunCountBuffer();
    const productEvents = await flushEvents();

    const events = [...runEvents, ...productEvents];

    if (events.length > 0) {
      await client.post("/api/events/", {
        events,
      });
    }
  }
}

const debouncedFlush = debounce(flush, EVENT_BUFFER_DEBOUNCE_MS, {
  trailing: true,
  leading: false,
  maxWait: EVENT_BUFFER_MAX_MS,
});

export async function TEST_flush(): Promise<void> {
  return debouncedFlush.flush();
}

async function userSummary() {
  const { os } = await browser.runtime.getPlatformInfo();
  const { version, version_name: versionName } = browser.runtime.getManifest();
  // Not supported on Chromium, and may require additional permissions
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getBrowserInfo
  // const {name: browserName} = await browser.runtime.getBrowserInfo();
  let numActiveExtensions: number = null;
  let numActiveExtensionPoints: number = null;
  let numActiveBlueprints: number = null;

  try {
    const { extensions } = await loadOptions();
    numActiveExtensions = extensions.length;
    numActiveBlueprints = uniq(
      compact(extensions.map((x) => x._recipe?.id))
    ).length;
    numActiveExtensionPoints = uniq(
      extensions.map((x) => x.extensionPointId)
    ).length;
  } catch (error) {
    console.warn("Cannot get number of extensions", { error });
  }

  return {
    numActiveExtensions,
    numActiveBlueprints,
    numActiveExtensionPoints,
    versionName,
    version,
    // https://docs.mixpanel.com/docs/tracking/reference/default-properties#web
    $os: os,
    $browser: detectBrowser(navigator.userAgent, navigator.vendor),
  };
}

async function init(): Promise<void> {
  if ((await isLinked()) && (await allowsTrack())) {
    const client = await getLinkedApiClient();
    await client.post("/api/identify/", {
      uid: await uid(),
      data: await userSummary(),
    });
  }
}

// Up to every 30 min
export const initTelemetry = throttle(init, 30 * 60 * 1000, {
  leading: true,
  trailing: true,
});

/**
 * Record a single brick run.
 * @param blockId the registry id of the brick
 * @param blueprintId the registry id of the blueprint, or null if run in the context of a standalone mod
 */
export async function recordBrickRun({
  blockId,
  blueprintId,
}: {
  blockId: RegistryId;
  blueprintId: RegistryId | null;
}) {
  if (
    !syncFlagOn("telemetry-bricks") ||
    // Don't record runs for restricted enterprise users to reduce event volume
    syncFlagOn("restricted-marketplace")
  ) {
    return;
  }

  const runKey = `${blueprintId}:${blockId}`;
  const previousCount = runCountBuffer.get(runKey) ?? 0;
  runCountBuffer.set(runKey, previousCount + 1);

  await debouncedFlush();
}

export async function recordEvent({
  event,
  data = {},
}: {
  event: string;
  data: JsonObject | undefined;
}): Promise<void> {
  if (await allowsTrack()) {
    const { version, version_name: versionName } =
      browser.runtime.getManifest();
    const telemetryEvent = {
      uid: await uid(),
      event,
      timestamp: Date.now(),
      data: {
        ...data,
        version,
        versionName,
      },
    };

    await addEvent(telemetryEvent);
    void debouncedFlush();
  }
}

export async function sendDeploymentAlert({
  deploymentId,
  data,
}: {
  deploymentId: string;
  data: UnknownObject;
}) {
  const client = await getLinkedApiClient();
  await client.post(`/api/deployments/${deploymentId}/alerts/`, data);
}
