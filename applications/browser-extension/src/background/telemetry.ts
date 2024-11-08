/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { debounce, throttle, uniq } from "lodash";
import { getModComponentState } from "../store/modComponents/modComponentStorage";
import {
  getLinkedApiClient,
  maybeGetLinkedApiClient,
} from "../data/service/apiClient";
import { allowsTrack } from "../telemetry/dnt";
import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import {
  DATABASE_NAME,
  deleteDatabase,
  IDB_OPERATION,
  withIdbErrorHandling,
} from "../utils/idbUtils";
import { browserVersion, detectBrowser } from "../vendors/mixpanelBrowser";
import { count as registrySize } from "../registry/packageRegistry";
import { count as logSize } from "../telemetry/logging";
import { count as traceSize } from "../telemetry/trace";
import { getUUID } from "../telemetry/telemetryHelpers";
import { getExtensionVersion, getTabsWithAccess } from "../utils/extensionUtils";
import { type TelemetryEvent } from "../telemetry/telemetryTypes";
import { API_PATHS } from "../data/service/urlPaths";

const EVENT_BUFFER_DEBOUNCE_MS = 2000;
const EVENT_BUFFER_MAX_MS = 10_000;
const TELEMETRY_DB_VERSION_NUMBER = 1;
const TELEMETRY_EVENT_OBJECT_STORE = "events";

/**
 * Timestamp when the background worker was initialized.
 *
 * This is the timestamp when the background worker was last initialized/restarted.
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- OK to reevaluate
const initTimestamp = Date.now();

interface UserTelemetryEvent {
  /**
   * A unique identifier for the event.
   */
  uid: string;
  /**
   * The name of the event.
   * @see Events
   */
  event: string;
  /**
   * Timestamp when the event occurred.
   */
  timestamp: number;
  /**
   * Event data/payload.
   */
  data: UnknownObject;
}

interface UserSummary {
  /**
   * The version from the manifest.
   */
  version: string;

  /**
   * The version_name from the manifest.
   */
  versionName?: string;

  /**
   * The number of active mod components.
   */
  numActiveExtensions: number | null;

  /**
   * The number of active mods.
   */
  numActiveBlueprints: number | null;

  /**
   * The number of active starer bricks.
   */
  numActiveExtensionPoints: number | null;

  /**
   * The detected operating system.
   */
  $os: string;

  /**
   * The detected browser.
   */
  $browser: string;

  /**
   * The detected browser version.
   */
  $browser_version: number | null;
}

/**
 * Diagnostic data to report for performance debugging.
 */
export interface Diagnostics extends UserSummary {
  /**
   * The timestamp the diagnostic data was collected.
   */
  timestamp: number;

  /**
   * Time since the background page was initialized.
   */
  timeAliveMS: number;

  /**
   * The number of tabs currently open.
   */
  tabCount: number;

  /**
   * The number of packages in the user's local IDB registry.
   */
  packageCount: number;

  /**
   * The number of logs in the user's local IDB log store.
   */
  logCount: number;

  /**
   * The number of traces in the user's local IDB trace store.
   */
  traceCount: number;

  /**
   * The number of buffered telemetry events in the user's local IDB telemetry store.
   */
  eventCount: number;
}

interface TelemetryDB extends DBSchema {
  [TELEMETRY_EVENT_OBJECT_STORE]: {
    value: UserTelemetryEvent;
    key: string;
  };
}

async function openTelemetryDB() {
  // Always return a new DB connection. IDB performance seems to be better than reusing the same connection.
  // https://stackoverflow.com/questions/21418954/is-it-bad-to-open-several-database-connections-in-indexeddb
  let database: IDBPDatabase<TelemetryDB> | null = null;

  database = await openDB<TelemetryDB>(
    DATABASE_NAME.TELEMETRY,
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
          "Telemetry database connection was unexpectedly terminated",
        );
        database = null;
      },
    },
  );

  database.addEventListener("close", () => {
    database = null;
  });

  return database;
}

// eslint-disable-next-line local-rules/persistBackgroundData -- Function
const withTelemetryDB = withIdbErrorHandling(
  openTelemetryDB,
  DATABASE_NAME.TELEMETRY,
);

async function addEvent(event: UserTelemetryEvent): Promise<void> {
  await withTelemetryDB(
    async (db) => {
      await db.add(TELEMETRY_EVENT_OBJECT_STORE, event);
    },
    { operationName: IDB_OPERATION[DATABASE_NAME.TELEMETRY].ADD_EVENT },
  );
}

/** @internal */
export async function flushEvents(): Promise<UserTelemetryEvent[]> {
  return withTelemetryDB(
    async (db) => {
      const tx = db.transaction(TELEMETRY_EVENT_OBJECT_STORE, "readwrite");
      const allEvents = await tx.store.getAll();
      await tx.store.clear();
      return allEvents;
    },
    { operationName: IDB_OPERATION[DATABASE_NAME.TELEMETRY].FLUSH_EVENTS },
  );
}

/**
 * Deletes and recreates the logging database.
 */
export async function recreateDB(): Promise<void> {
  await deleteDatabase(DATABASE_NAME.TELEMETRY);

  await withTelemetryDB(async () => {}, {
    operationName: IDB_OPERATION[DATABASE_NAME.TELEMETRY].RECREATE_DB,
  });
}

/**
 * Returns the number of telemetry entries in the database.
 */
export async function count(): Promise<number> {
  return withTelemetryDB(async (db) => db.count(TELEMETRY_EVENT_OBJECT_STORE), {
    operationName: IDB_OPERATION[DATABASE_NAME.TELEMETRY].COUNT,
  });
}

/**
 * Clears all event entries from the database.
 */
export async function clear(): Promise<void> {
  await withTelemetryDB(
    async (db) => {
      await db.clear(TELEMETRY_EVENT_OBJECT_STORE);
    },
    { operationName: IDB_OPERATION[DATABASE_NAME.TELEMETRY].CLEAR },
  );
}

async function flush(): Promise<void> {
  const client = await maybeGetLinkedApiClient();
  if (client) {
    const events = await flushEvents();

    if (events.length > 0) {
      await client.post(API_PATHS.TELEMETRY_EVENTS, {
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

/** @internal */
export async function TEST_flushAll(): Promise<void> {
  return debouncedFlush.flush();
}

async function collectUserSummary(): Promise<UserSummary> {
  const { os } = await browser.runtime.getPlatformInfo();
  const { version_name: versionName } = browser.runtime.getManifest();
  const version = getExtensionVersion();
  // Not supported on Chromium, and may require additional permissions
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/getBrowserInfo
  // const {name: browserName} = await browser.runtime.getBrowserInfo();
  let numActiveExtensions: number | null = null;
  let numActiveExtensionPoints: number | null = null;
  let numActiveBlueprints: number | null = null;

  try {
    const { activatedModComponents } = await getModComponentState();
    numActiveExtensions = activatedModComponents.length;
    numActiveBlueprints = uniq(
      activatedModComponents.map((x) => x.modMetadata.id),
    ).length;
    numActiveExtensionPoints = uniq(
      activatedModComponents.map((x) => x.extensionPointId),
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
    $browser_version: browserVersion(navigator.userAgent, navigator.vendor),
  };
}

async function init(): Promise<void> {
  const client = await maybeGetLinkedApiClient();

  if (client && (await allowsTrack())) {
    await client.post(API_PATHS.TELEMETRY_IDENTIFY_USER, {
      uid: await getUUID(),
      data: await collectUserSummary(),
    });
  }
}

// Up to every 30 min
export const initTelemetry = throttle(init, 30 * 60 * 1000, {
  leading: true,
  trailing: true,
});

/**
 * @deprecated Only allowed in @/background files. Otherwise, use: `import reportEvent from "@/telemetry/reportEvent"`
 */
export async function recordEvent({
  event,
  data = {},
}: {
  event: TelemetryEvent;
  data: UnknownObject | undefined;
}): Promise<void> {
  if (await allowsTrack()) {
    const { version_name: versionName, manifest_version: manifestVersion } =
      browser.runtime.getManifest();
    const version = getExtensionVersion();
    const telemetryEvent = {
      uid: await getUUID(),
      event,
      timestamp: Date.now(),
      data: {
        ...data,
        version,
        versionName,
        manifestVersion,
        runtimeId: browser.runtime.id,
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
  await client.post(API_PATHS.DEPLOYMENT_ALERTS(deploymentId), data);
}

/**
 * Return a ping response with the current timestamp.
 */
export async function pong(): Promise<{ timestamp: number }> {
  return {
    timestamp: Date.now(),
  };
}

/**
 * Collect performance diagnostics for the current browser session.
 */
export async function collectPerformanceDiagnostics(): Promise<Diagnostics> {
  const timestamp = Date.now();
  const allTabs = await getTabsWithAccess();

  return {
    timestamp,
    ...(await collectUserSummary()),
    timeAliveMS: timestamp - initTimestamp,
    tabCount: allTabs.length,
    packageCount: await registrySize(),
    logCount: await logSize(),
    traceCount: await traceSize(),
    eventCount: await count(),
  };
}
