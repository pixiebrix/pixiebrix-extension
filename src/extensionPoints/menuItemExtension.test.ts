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

import {
  fromJS,
  type MenuDefinition,
  type MenuItemExtensionConfig,
} from "@/extensionPoints/menuItemExtension";
import { validateRegistryId } from "@/types/helpers";
import { type Metadata, type ResolvedExtension, RunReason } from "@/core";
import { define } from "cooky-cutter";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import { uuidSequence } from "@/testUtils/factories";
import { type UnknownObject } from "@/types";
import blockRegistry from "@/blocks/registry";
import { getReferenceForElement } from "@/contentScript/elementReference";
import {
  getDocument,
  RootReader,
  tick,
} from "@/extensionPoints/extensionPointTestUtils";
import { type BlockPipeline } from "@/blocks/types";
import { reduceExtensionPipeline } from "@/runtime/reducePipeline";

jest.mock("@/runtime/reducePipeline", () => ({
  reduceExtensionPipeline: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/telemetry/logging", () => {
  const actual = jest.requireActual("@/telemetry/logging");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

const reduceExtensionPipelineMock = reduceExtensionPipeline as jest.Mock;

const rootReaderId = validateRegistryId("test/root-reader");

const extensionPointFactory = (definitionOverrides: UnknownObject = {}) =>
  define<ExtensionPointConfig<MenuDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/extension-point-${n}`),
        name: "Test Extension Point",
      } as Metadata),
    definition: define<MenuDefinition>({
      type: "menuItem",
      template: "<button>{{caption}}</button>",
      containerSelector: "div",
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReaderId],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<ResolvedExtension>({
  apiVersion: "v3",
  _resolvedExtensionBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/extension-point-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<MenuItemExtensionConfig>({
    caption: "Hello World",
    action: () => [] as BlockPipeline,
    synchronous: false,
  }),
});

const rootReader = new RootReader();

beforeEach(() => {
  reduceExtensionPipelineMock.mockClear();
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  blockRegistry.clear();
  blockRegistry.register(rootReader);
  rootReader.readCount = 0;
  rootReader.ref = undefined;
});

describe("menuItemExtension", () => {
  it.each([["append"], [undefined]])(
    "can add menu item with position: %s",
    async (position) => {
      document.body.innerHTML = getDocument("<div>foo</div>").body.innerHTML;

      const extensionPoint = fromJS(
        extensionPointFactory({
          position,
        })()
      );

      const extension = extensionFactory({
        extensionPointId: extensionPoint.id,
      });

      extensionPoint.addExtension(extension);

      await extensionPoint.install();
      await extensionPoint.run({ reason: RunReason.MANUAL });

      expect(document.querySelectorAll("button")).toHaveLength(1);
      expect(document.body.innerHTML).toEqual(
        `<div data-pb-extension-point="${extensionPoint.id}">foo<button data-pb-uuid="${extension.id}">Hello World</button></div>`
      );

      extensionPoint.uninstall();
    }
  );

  it("can prepend menu item", async () => {
    document.body.innerHTML = getDocument("<div>foo</div>").body.innerHTML;
    const extensionPoint = fromJS(
      extensionPointFactory({
        position: "prepend",
      })()
    );

    const extension = extensionFactory({
      extensionPointId: extensionPoint.id,
    });

    extensionPoint.addExtension(extension);

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.MANUAL });

    expect(document.querySelectorAll("button")).toHaveLength(1);
    expect(document.body.innerHTML).toEqual(
      `<div data-pb-extension-point="${extensionPoint.id}"><button data-pb-uuid="${extension.id}">Hello World</button>foo</div>`
    );

    extensionPoint.uninstall();
  });

  it("can use targetMode: eventTarget", async () => {
    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    const extensionPoint = fromJS(
      extensionPointFactory({
        targetMode: "eventTarget",
      })()
    );

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.MANUAL });

    expect(document.querySelectorAll("button")).toHaveLength(1);

    document.querySelector("button").click();

    await tick();

    expect(rootReader.readCount).toEqual(1);
    const buttonRef = getReferenceForElement(document.querySelector("button"));
    expect(rootReader.ref).toEqual(buttonRef);

    expect(reduceExtensionPipelineMock).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        root: document.querySelector("button"),
      }),
      expect.toBeObject()
    );

    extensionPoint.uninstall();
  });

  it("can user reader selector", async () => {
    document.body.innerHTML = getDocument(
      '<div id="outer"><div id="toolbar"></div></div>'
    ).body.innerHTML;
    const extensionPoint = fromJS(
      extensionPointFactory({
        readerSelector: "div",
        containerSelector: "#toolbar",
      })()
    );

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.MANUAL });

    expect(document.querySelectorAll("button")).toHaveLength(1);

    document.querySelector("button").click();

    await tick();

    expect(rootReader.readCount).toEqual(1);
    const outerRef = getReferenceForElement(
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- eslint thinks type is Element
      document.querySelector("#outer") as HTMLElement
    );
    expect(rootReader.ref).toEqual(outerRef);

    expect(reduceExtensionPipelineMock).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        // Reader selector only impacts the reader context, not the pipeline context
        root: document,
      }),
      expect.toBeObject()
    );

    extensionPoint.uninstall();
  });

  it.each([[undefined], ["document"]])(
    "can use default targetMode: %s",
    async (targetMode) => {
      document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
      const extensionPoint = fromJS(
        extensionPointFactory({
          targetMode,
        })()
      );

      extensionPoint.addExtension(
        extensionFactory({
          extensionPointId: extensionPoint.id,
        })
      );

      await extensionPoint.install();
      await extensionPoint.run({ reason: RunReason.MANUAL });

      expect(document.querySelectorAll("button")).toHaveLength(1);

      expect(reduceExtensionPipelineMock).not.toHaveBeenCalled();

      document.querySelector("button").click();
      await tick();

      expect(rootReader.readCount).toEqual(1);
      const documentRef = getReferenceForElement(document);
      expect(rootReader.ref).toEqual(documentRef);

      expect(reduceExtensionPipelineMock).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          root: document,
        }),
        expect.toBeObject()
      );

      extensionPoint.uninstall();
    }
  );

  it("re-attaches to container", async () => {
    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    const extensionPoint = fromJS(extensionPointFactory()());

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.MANUAL });
    expect(document.querySelectorAll("button")).toHaveLength(1);

    document.body.innerHTML = "";
    expect(document.querySelectorAll("button")).toHaveLength(0);

    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    await tick();
    expect(document.querySelectorAll("button")).toHaveLength(1);

    extensionPoint.uninstall();
  });
});
