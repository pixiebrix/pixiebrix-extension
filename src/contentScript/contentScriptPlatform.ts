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

import {
  PlatformBase,
  type PlatformProtocol,
} from "@/platform/platformProtocol";
import { showNotification } from "@/utils/notify";
import { setToolbarBadge } from "@/background/messenger/strict/api";
import { getState, setState } from "@/platform/state/stateController";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import { expectContext } from "@/utils/expectContext";
import type { PlatformCapability } from "@/platform/capabilities";
import { getReferenceForElement } from "@/contentScript/elementReference";
import {
  ensureContextMenu,
  openTab,
  performConfiguredRequestInBackground,
  uninstallContextMenu,
} from "@/background/messenger/api";
import { ephemeralForm } from "@/contentScript/ephemeralForm";
import { ephemeralPanel } from "@/contentScript/ephemeralPanel";
import type { ElementReference } from "@/types/runtimeTypes";
import {
  renderHandlebarsTemplate,
  renderNunjucksTemplate,
  runUserJs,
  validateNunjucksTemplate,
} from "@/sandbox/messenger/api";
import type { JsonObject } from "type-fest";
import { BusinessError } from "@/errors/businessErrors";
import { registerHandler } from "@/contentScript/contextMenus";
import { writeToClipboard } from "@/utils/clipboardUtils";
import { tooltipActionRegistry } from "@/contentScript/selectionTooltip/tooltipController";
import { commandRegistry } from "@/contentScript/commandPopover/commandController";

/**
 * @file Platform definition for mods running in a content script
 * @see PlatformProtocol
 */

async function playSound(sound: string): Promise<void> {
  const audio = new Audio(browser.runtime.getURL(`audio/${sound}.mp3`));
  // NOTE: this does not wait for the sound effect to complete
  await audio.play();
}

async function userSelectElementRefs(): Promise<ElementReference[]> {
  // The picker uses `bootstrap-switch-button`, which does a `window` check on load and breaks
  // the MV3 background worker. Lazy-loading it keeps the background worker from breaking.
  const { userSelectElement } = await import(
    /* webpackChunkName: "editorContentScript" */ "@/contentScript/pageEditor/elementPicker"
  );

  const { elements } = await userSelectElement();

  return elements.map((element) => getReferenceForElement(element));
}

class ContentScriptPlatform extends PlatformBase {
  constructor() {
    super("contentScript");
  }

  override capabilities: PlatformCapability[] = [
    "dom",
    "pageScript",
    "contentScript",
    "alert",
    "form",
    "panel",
    "toast",
    "sandbox",
    "clipboardWrite",
    "audio",
    "quickBar",
    "selectionTooltip",
    "commandPopover",
    "contextMenu",
    "badge",
    "state",
    "link",
    "http",
    "template",
  ];

  override open = async (url: URL): Promise<void> => {
    await openTab({
      url: url.href,
    });
  };

  // Running unbound window methods throws Invocation Error
  override alert = window.alert.bind(window);
  override prompt = window.prompt.bind(window);

  override notify = showNotification;

  override userSelectElementRefs = userSelectElementRefs;

  // Perform requests via the background so 1/ the host pages CSP doesn't conflict, and 2/ credentials aren't
  // passed to the content script
  override request = performConfiguredRequestInBackground;

  override form = ephemeralForm;

  override panel = ephemeralPanel;

  override runSandboxedJavascript = runUserJs;

  override get template(): PlatformProtocol["template"] {
    return {
      async render({
        engine,
        ...payload
      }: {
        engine: "nunjucks" | "handlebars";
        template: string;
        context: JsonObject;
        autoescape: boolean;
      }): Promise<string> {
        switch (engine) {
          case "nunjucks": {
            return renderNunjucksTemplate(payload);
          }

          case "handlebars": {
            return renderHandlebarsTemplate(payload);
          }

          default: {
            const exhaustiveCheck: never = engine;
            throw new BusinessError(
              `Unsupported template engine: ${exhaustiveCheck}`,
            );
          }
        }
      },

      async validate({
        template,
      }: {
        engine: "nunjucks";
        template: string;
      }): Promise<void> {
        await validateNunjucksTemplate(template);
      },
    };
  }

  override get audio(): PlatformProtocol["audio"] {
    return {
      play: playSound,
    };
  }

  override get badge(): PlatformProtocol["badge"] {
    return {
      setText: setToolbarBadge,
    };
  }

  override get state(): PlatformProtocol["state"] {
    // Double-check already in contentScript because the calls don't go through the messenger
    expectContext("contentScript");

    return {
      getState,
      setState,
    };
  }

  override get contextMenu(): PlatformProtocol["contextMenu"] {
    expectContext("contentScript");

    return {
      async register({ handler, ...options }) {
        registerHandler(options.extensionId, handler);
        await ensureContextMenu(options);
      },
      async unregister(componentId) {
        await uninstallContextMenu({ extensionId: componentId });
      },
    };
  }

  override get quickBar(): PlatformProtocol["quickBar"] {
    return quickBarRegistry;
  }

  override get selectionTooltip(): PlatformProtocol["selectionTooltip"] {
    return tooltipActionRegistry;
  }

  override get commandPopover(): PlatformProtocol["commandPopover"] {
    return commandRegistry;
  }

  override get clipboard(): PlatformProtocol["clipboard"] {
    return {
      write: writeToClipboard,
    };
  }
}

/**
 * Platform for web extensions running in the content script.
 */
const contentScriptPlatform = new ContentScriptPlatform();
export default contentScriptPlatform;
