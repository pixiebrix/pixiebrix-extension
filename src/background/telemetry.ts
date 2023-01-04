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
import { compact, debounce, once, throttle, uniq } from "lodash";
import { type ManualStorageKey, readStorage, setStorage } from "@/chrome";
import { isLinked } from "@/auth/token";
import { type Data, type UUID } from "@/core";
import { loadOptions } from "@/store/extensionsStorage";
import {
  getLinkedApiClient,
  maybeGetLinkedApiClient,
} from "@/services/apiClient";
import { allowsTrack } from "@/telemetry/dnt";
import { type DBSchema, openDB } from "idb/with-async-ittr";

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

async function openTelemetryDB() {
  return openDB<TelemetryDB>(TELEMETRY_DB_NAME, TELEMETRY_DB_VERSION_NUMBER, {
    upgrade(db) {
      // This is a new DB, so no need to delete existing object store yet
      db.createObjectStore(TELEMETRY_EVENT_OBJECT_STORE, {
        autoIncrement: true,
      });
    },
  });
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

const UID_STORAGE_KEY = "USER_UUID" as ManualStorageKey;

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

async function flush(): Promise<void> {
  const client = await maybeGetLinkedApiClient();
  if (client) {
    const events = await flushEvents();
    await client.post("/api/events/", { events });
  }
}

const debouncedFlush = debounce(flush, EVENT_BUFFER_DEBOUNCE_MS, {
  trailing: true,
  leading: false,
  maxWait: EVENT_BUFFER_MAX_MS,
});

async function userSummary() {
  const { os } = await browser.runtime.getPlatformInfo();
  const { version, version_name: versionName } = browser.runtime.getManifest();
  // Getting browser information would require additional permissions
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
    $os: os,
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
  data: Data;
}) {
  const client = await getLinkedApiClient();
  await client.post(`/api/deployments/${deploymentId}/alerts/`, data);
}
