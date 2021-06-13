/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { liftBackground } from "@/background/protocol";
import { JsonObject } from "type-fest";
import { v4 as uuidv4 } from "uuid";
import { debounce, uniq, throttle } from "lodash";
import { browser } from "webextension-polyfill-ts";
import { readStorage, setStorage } from "@/chrome";
import { getExtensionToken } from "@/auth/token";
import axios from "axios";
import { getBaseURL } from "@/services/baseService";
import { boolean } from "@/utils";
import { ExtensionOptions, loadOptions } from "@/options/loader";

const EVENT_BUFFER_DEBOUNCE_MS = 2_000;
const EVENT_BUFFER_MAX_MS = 10_000;

interface UserEvent {
  uid: string;
  event: string;
  timestamp: number;
  data: JsonObject;
}

const DNT_STORAGE_KEY = "DNT";
const UUID_STORAGE_KEY = "USER_UUID";

let _uid: string = null;
let _dnt: boolean;
const buffer: UserEvent[] = [];

/**
 * Return a random ID for this browser profile.
 */
async function uid(): Promise<string> {
  if (_uid != null) {
    return _uid;
  }
  let uuid: string = await readStorage<string>(UUID_STORAGE_KEY);
  if (!uuid || typeof uuid !== "string") {
    uuid = uuidv4();
    await setStorage(UUID_STORAGE_KEY, uuid);
  }
  _uid = uuid;
  return _uid;
}

export async function _toggleDNT(enable: boolean): Promise<boolean> {
  _dnt = enable;
  await setStorage(DNT_STORAGE_KEY, enable.toString());
  return enable;
}

export async function _getDNT(): Promise<boolean> {
  if (_dnt != null) {
    return _dnt;
  }
  _dnt = boolean(await readStorage<string>(DNT_STORAGE_KEY));
  return _dnt;
}

async function flush(): Promise<void> {
  if (buffer.length > 0) {
    const url = `${await getBaseURL()}/api/events/`;
    const events = buffer.splice(0, buffer.length);
    await axios.post(
      url,
      {
        events,
      },
      {
        headers: { Authorization: `Token ${await getExtensionToken()}` },
      }
    );
  }
}

const debouncedFlush = debounce(flush, EVENT_BUFFER_DEBOUNCE_MS, {
  trailing: true,
  leading: false,
  maxWait: EVENT_BUFFER_MAX_MS,
});

export const getDNT = liftBackground("GET_DNT", async () => {
  return await _getDNT();
});

export const getUID = liftBackground("GET_UID", async () => {
  return await uid();
});

export const getExtensionVersion = liftBackground(
  "GET_EXTENSION_VERSION",
  async () => {
    return browser.runtime.getManifest().version;
  }
);

export const toggleDNT = liftBackground(
  "TOGGLE_DNT",
  async (enabled: boolean) => {
    return await _toggleDNT(enabled);
  }
);

async function userSummary() {
  const { os } = await browser.runtime.getPlatformInfo();
  // Getting browser information would require additional permissions
  // const {name: browserName} = await browser.runtime.getBrowserInfo();
  let numActiveExtensions: number = null;
  let numActiveExtensionPoints: number = null;
  let numActiveBlueprints: number = null;

  try {
    const { extensions: extensionPointConfigs } = await loadOptions();
    const extensions: ExtensionOptions[] = Object.entries(
      extensionPointConfigs
    ).flatMap(([, xs]) => Object.values(xs));
    numActiveExtensions = extensions.length;
    numActiveBlueprints = uniq(
      extensions.filter((x) => x._recipeId).map((x) => x._recipeId)
    ).length;
    numActiveExtensionPoints = uniq(extensions.map((x) => x.extensionPointId))
      .length;
  } catch (err) {
    console.warn("Cannot get number of extensions", { err });
  }

  return {
    numActiveExtensions,
    numActiveBlueprints,
    numActiveExtensionPoints,
    $os: os,
  };
}

async function _init(): Promise<void> {
  const url = `${await getBaseURL()}/api/identify/`;
  const token = await getExtensionToken();
  if (token) {
    await axios.post(
      url,
      {
        uid: await uid(),
        data: await userSummary(),
      },
      {
        headers: { Authorization: `Token ${token}` },
      }
    );
  }
}

// up to every 30 min
const throttledInit = throttle(_init, 30 * 60 * 1000, {
  leading: true,
  trailing: true,
});

export const initUID = liftBackground(
  "INIT_UID",
  async (): Promise<void> => {
    try {
      if (!(await _getDNT())) {
        throttledInit();
      }
    } catch (err) {
      console.warn("Error initializing uid", { err });
    }
  },
  { asyncResponse: false }
);

export const recordEvent = liftBackground(
  "RECORD_EVENT",
  async ({
    event,
    data = {},
  }: {
    event: string;
    data: JsonObject | undefined;
  }): Promise<void> => {
    if (!(await _getDNT())) {
      buffer.push({
        uid: await uid(),
        event,
        timestamp: Date.now(),
        data,
      });
      debouncedFlush();
    }
  },
  { asyncResponse: false }
);

export const sendDeploymentAlert = liftBackground(
  "SEND_DEPLOYMENT_ALERT",
  async ({ deploymentId, data }: { deploymentId: string; data: object }) => {
    const url = `${await getBaseURL()}/api/deployments/${deploymentId}/alerts/`;
    const token = await getExtensionToken();
    if (!token) {
      throw new Error("Extension not linked to PixieBrix server");
    }
    await axios.post(url, data, {
      headers: { Authorization: `Token ${token}` },
    });
  }
);
