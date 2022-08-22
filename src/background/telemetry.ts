/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { JsonObject } from "type-fest";
import { uuidv4 } from "@/types/helpers";
import { compact, debounce, throttle, uniq } from "lodash";
import { ManualStorageKey, readStorage, setStorage } from "@/chrome";
import { isLinked } from "@/auth/token";
import { Data, UUID } from "@/core";
import { loadOptions } from "@/store/extensionsStorage";
import {
  getLinkedApiClient,
  maybeGetLinkedApiClient,
} from "@/services/apiClient";
import { allowsTrack } from "@/telemetry/dnt";

const EVENT_BUFFER_DEBOUNCE_MS = 2000;
const EVENT_BUFFER_MAX_MS = 10_000;

export interface UserTelemetryEvent {
  uid: string;
  event: string;
  timestamp: number;
  data: JsonObject;
}

const eventQueue: UserTelemetryEvent[] = [];
let eventStorageLocked = false;

const UUID_STORAGE_KEY = "USER_UUID" as ManualStorageKey;
export const TELEMETRY_EVENT_BUFFER_KEY =
  "TELEMETRY_EVENT_BUFFER" as ManualStorageKey;

let _uid: UUID = null;

/**
 * Return a random ID for this browser profile.
 */
export async function uid(): Promise<UUID> {
  if (_uid != null) {
    return _uid;
  }

  let uuid = await readStorage<UUID>(UUID_STORAGE_KEY);

  if (!uuid || typeof uuid !== "string") {
    uuid = uuidv4();
    console.debug("Generating UID for browser", { uuid });
    await setStorage(UUID_STORAGE_KEY, uuid);
  }

  _uid = uuid;
  return _uid;
}

async function flush(): Promise<void> {
  const events = await readStorage<UserTelemetryEvent[]>(
    TELEMETRY_EVENT_BUFFER_KEY
  );

  if (events.length === 0 || eventStorageLocked) {
    return;
  }

  eventStorageLocked = true;
  const client = await maybeGetLinkedApiClient();
  if (client) {
    await Promise.all([
      setStorage(TELEMETRY_EVENT_BUFFER_KEY, []),
      client.post("/api/events/", { events }),
    ]);
  }

  eventStorageLocked = false;
  if (eventQueue.length > 0) {
    void persistEvents();
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

async function persistEvents() {
  if (eventQueue.length === 0 || eventStorageLocked) {
    return;
  }

  eventStorageLocked = true;
  const persistedEvents =
    (await readStorage<UserTelemetryEvent[]>(TELEMETRY_EVENT_BUFFER_KEY)) ?? [];
  await setStorage(TELEMETRY_EVENT_BUFFER_KEY, [
    ...persistedEvents,
    ...eventQueue.splice(0, eventQueue.length),
  ]);
  eventStorageLocked = false;
  if (eventQueue.length > 0) {
    await persistEvents();
  }
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

    eventQueue.push(telemetryEvent);
    await persistEvents();
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
