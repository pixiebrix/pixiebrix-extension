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

import { validateRegistryId } from "@/types/helpers";
import { type UnknownObject } from "@/types";
import { define } from "cooky-cutter";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { type Metadata, type ResolvedExtension, RunReason } from "@/core";
import { uuidSequence } from "@/testUtils/factories";
import { type BlockPipeline } from "@/blocks/types";
import {
  getDocument,
  RootReader,
  tick,
} from "@/extensionPoints/extensionPointTestUtils";
import blockRegistry from "@/blocks/registry";
import {
  fromJS,
  type TriggerConfig,
  type TriggerDefinition,
} from "@/extensionPoints/triggerExtension";
import { getReferenceForElement } from "@/contentScript/elementReference";
import userEvent from "@testing-library/user-event";
import { waitForEffect } from "@/testUtils/testHelpers";

jest.mock("@/telemetry/logging", () => {
  const actual = jest.requireActual("@/telemetry/logging");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

const rootReaderId = validateRegistryId("test/root-reader");

const extensionPointFactory = (definitionOverrides: UnknownObject = {}) =>
  define<ExtensionPointConfig<TriggerDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/extension-point-${n}`),
        name: "Test Extension Point",
      } as Metadata),
    definition: define<TriggerDefinition>({
      type: "trigger",
      background: false,
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReaderId],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<ResolvedExtension<TriggerConfig>>({
  apiVersion: "v3",
  _resolvedExtensionBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/extension-point-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<TriggerConfig>({
    action: () => [] as BlockPipeline,
  }),
});

const rootReader = new RootReader();

beforeEach(() => {
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  blockRegistry.clear();
  blockRegistry.register(rootReader);
  rootReader.readCount = 0;
  rootReader.ref = undefined;
});

describe("triggerExtension", () => {
  it.each([["load"], [undefined]])(
    "runs page load trigger",
    async (trigger) => {
      const extensionPoint = fromJS(
        extensionPointFactory({
          trigger,
        })()
      );

      extensionPoint.addExtension(
        extensionFactory({
          extensionPointId: extensionPoint.id,
        })
      );

      await extensionPoint.install();
      await extensionPoint.run({ reason: RunReason.MANUAL });

      expect(rootReader.readCount).toBe(1);

      extensionPoint.uninstall();
    }
  );

  it.each([[undefined], ["once"], ["watch"]])(
    "attachMode: %s",
    async (attachMode) => {
      document.body.innerHTML = getDocument(
        "<button>Click Me</button>"
      ).body.innerHTML;

      const extensionPoint = fromJS(
        extensionPointFactory({
          trigger: "click",
          attachMode,
          rootSelector: "button",
        })()
      );

      extensionPoint.addExtension(
        extensionFactory({
          extensionPointId: extensionPoint.id,
        })
      );

      await extensionPoint.install();
      await extensionPoint.run({ reason: RunReason.MANUAL });

      expect(rootReader.readCount).toBe(0);

      document.querySelector("button").click();
      await tick();
      expect(rootReader.readCount).toBe(1);

      document.body.innerHTML = "";
      document.body.innerHTML = getDocument(
        "<button>Click Me</button>"
      ).body.innerHTML;

      // Give the mutation observer time to run
      await tick();

      // Check click handler was not re-attached
      document.querySelector("button").click();
      await tick();
      expect(rootReader.readCount).toBe(attachMode === "watch" ? 2 : 1);

      extensionPoint.uninstall();
    }
  );

  it.each([[undefined], ["eventTarget"]])(
    "targetMode: %s",
    async (targetMode) => {
      document.body.innerHTML = getDocument(
        "<div><button>Click Me</button></div>"
      ).body.innerHTML;

      const extensionPoint = fromJS(
        extensionPointFactory({
          trigger: "click",
          targetMode,
          rootSelector: "div",
        })()
      );

      extensionPoint.addExtension(
        extensionFactory({
          extensionPointId: extensionPoint.id,
        })
      );

      await extensionPoint.install();
      await extensionPoint.run({ reason: RunReason.MANUAL });

      document.querySelector("button").click();
      await tick();

      const buttonRef = getReferenceForElement(
        document.querySelector("button")
      );

      expect(rootReader.readCount).toBe(1);
      expect(rootReader.ref).toBe(buttonRef);

      extensionPoint.uninstall();
    }
  );

  it("targetMode: root", async () => {
    document.body.innerHTML = getDocument(
      "<div><button>Click Me</button></div>"
    ).body.innerHTML;

    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "click",
        targetMode: "root",
        rootSelector: "div",
      })()
    );

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.MANUAL });

    document.querySelector("button").click();
    await tick();

    const divRef = getReferenceForElement(document.querySelector("div"));

    expect(rootReader.readCount).toBe(1);
    expect(rootReader.ref).toBe(divRef);

    extensionPoint.uninstall();
  });

  it("runs hover trigger", async () => {
    document.body.innerHTML = getDocument(
      "<div><button>Hover Me</button></div>"
    ).body.innerHTML;

    const extensionPoint = fromJS(
      extensionPointFactory({
        trigger: "hover",
        rootSelector: "button",
      })()
    );

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.MANUAL });

    const buttonElement = document.querySelector("button");

    // This causes the hoverintent.js:handleHover handle to fire. But the vendored logic doesn't recognize it as a
    // hover for purposes of triggering the event
    await userEvent.hover(buttonElement);
    await waitForEffect();

    // See comment above, the handler isn't actually run because userEvent.hover isn't enough to trigger hoverintent
    expect(rootReader.readCount).toBe(0);

    extensionPoint.uninstall();
  });
});
