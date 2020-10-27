/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import { loadOptions } from "@/options/loader";
import blockRegistry from "@/blocks/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import { IExtensionPoint, IReader, Message } from "@/core";
import {
  DEV_WATCH_READER_NOT_AVAILABLE,
  DEV_WATCH_READER_READ,
} from "@/messaging/constants";

import serviceRegistry from "@/services/registry";
import {
  liftContentScript,
  notifyContentScripts,
} from "@/contentScript/protocol";

let _loadedBlocks = false;
let _extensionPoints: IExtensionPoint[] = undefined;
let _navSequence = 1;

export async function loadBlocks(): Promise<void> {
  await Promise.all([
    blockRegistry.refresh({ allowFetch: false }),
    extensionPointRegistry.refresh({ allowFetch: false }),
    serviceRegistry.refresh({ allowFetch: false }),
  ]);
}

async function loadBlocksOnce(): Promise<void> {
  if (!_loadedBlocks) {
    await loadBlocks();
    _loadedBlocks = true;
  }
}

async function runExtensionPoint(
  extensionPoint: IExtensionPoint,
  isCancelled: () => boolean
): Promise<void> {
  const installed = await extensionPoint.install(/* isCancelled */);

  if (!installed) {
    console.debug(
      `Skipping ${extensionPoint.id} because it was not installed on the page`
    );
    return;
  } else if (isCancelled()) {
    console.debug(
      `Skipping ${extensionPoint.id} because user navigated away from the page`
    );
    return;
  }

  await extensionPoint.run();
}

async function loadExtensions() {
  _extensionPoints = [];

  const { extensions: extensionPointConfigs } = await loadOptions();

  for (const [extensionPointId, extensions] of Object.entries(
    extensionPointConfigs
  )) {
    const extensionPoint = extensionPointRegistry.lookup(extensionPointId);
    const activeExtensions = Object.values(extensions).filter((x) => x.active);

    let added = false;
    for (const extension of activeExtensions) {
      extensionPoint.addExtension(extension);
      added = true;
    }

    if (added) {
      _extensionPoints.push(extensionPoint);
    }
  }
}

async function loadExtensionsOnce() {
  if (_extensionPoints == null) {
    await loadExtensions();
  }
  return _extensionPoints;
}

function getNavSequence() {
  return _navSequence;
}

interface ReaderPorts {
  [key: string]: {
    postMessage: (message: Message) => void;
  };
}

/**
 * Handle a website navigation, e.g., page load or a URL change in an SPA.
 * @param watchedReaders optional mapping from reader id to devtools port.
 * @returns {Promise<void>}
 */
export async function handleNavigate(
  watchedReaders: ReaderPorts
): Promise<void> {
  await loadBlocksOnce();
  const extensionPoints = await loadExtensionsOnce();

  if (extensionPoints.length) {
    _navSequence++;
    const currentNavSequence = _navSequence;
    const cancel = () => getNavSequence() > currentNavSequence;

    for (const extensionPoint of extensionPoints) {
      // Don't await each extension point since the extension point may never appear. For example, an
      // extension point that runs on the contact information page on LinkedIn
      // eslint-disable-next-line require-await
      runExtensionPoint(extensionPoint, cancel);
    }
  }

  for (const [readerId, port] of Object.entries(watchedReaders)) {
    const reader = blockRegistry.lookup(readerId) as IReader;
    if (await reader.isAvailable()) {
      const value = await reader.read();
      port.postMessage({
        type: DEV_WATCH_READER_READ,
        payload: { id: readerId, value },
      });
    } else {
      port.postMessage({ type: DEV_WATCH_READER_NOT_AVAILABLE });
    }
  }
}

export const notifyNavigation = liftContentScript(
  "NAVIGATE",
  async () => {
    // TODO: pass watched readers once we re-implement that functionality
    await handleNavigate({});
  },
  { asyncResponse: false }
);

export const reactivate = notifyContentScripts("REACTIVATE", async () => {
  await loadBlocks();
  await loadExtensions();
  await handleNavigate({});
});
