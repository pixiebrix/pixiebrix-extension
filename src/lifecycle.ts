import { loadOptions } from "@/options/loader";
import blockRegistry from "@/blocks/registry";
import serviceRegistry from "@/services/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import {
  DEV_WATCH_READER_NOT_AVAILABLE,
  DEV_WATCH_READER_READ,
} from "@/messaging/constants";

// Import for the side effect of registering js defined blocks
import "@/blocks";
import { IExtensionPoint, IReader, Message } from "@/core";
import LazyLocatorFactory from "@/services/locator";

let _loadedBlocks = false;
let _extensionPoints: IExtensionPoint[] = undefined;
let _navSequence = 1;

// TODO: the locator has to be in the contentScript for now because we're authenticating the request before
//  sending it to the background page to make the request. Probably in the future we should to the auth on the
//  background page so the credentials don't have to be in the contentScript zone
const locatorFactory = new LazyLocatorFactory();

async function loadBlocksOnce() {
  if (!_loadedBlocks) {
    await Promise.all([
      blockRegistry.refresh({ allowFetch: false }),
      extensionPointRegistry.refresh({ allowFetch: false }),
      serviceRegistry.refresh({ allowFetch: false }),
    ]);

    // Need the blocks first because it contains the pixiebrix service definition. If we wanted to avoid
    // this, could just load the YAML config directly in the locator factory.
    locatorFactory.refresh().then(() => {
      console.debug("Eagerly initialized service locator");
    });
  }
}

async function runExtensionPoint(
  extensionPoint: IExtensionPoint,
  isCancelled: () => boolean
) {
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

  await extensionPoint.run(locatorFactory.getLocator());
}

async function loadExtensionsOnce() {
  if (_extensionPoints == null) {
    const { extensions: extensionPointConfigs } = await loadOptions();

    _extensionPoints = [];

    for (const [extensionPointId, extensions] of Object.entries(
      extensionPointConfigs
    )) {
      const extensionPoint = extensionPointRegistry.lookup(extensionPointId);
      const activeExtensions = Object.values(extensions).filter(
        (x) => x.active
      );

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

  return _extensionPoints;
}

function getNavSequence() {
  return _navSequence;
}

interface ReaderPorts {
  [key: string]: {
    postMessage: (Noimessage: Message) => void;
  };
}

/**
 * Handle a website navigation, e.g., page load or a URL change in an SPA.
 * @param watchedReaders optional mapping from reader id to devtools port.
 * @returns {Promise<void>}
 */
export async function handleNavigate(watchedReaders: ReaderPorts) {
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
