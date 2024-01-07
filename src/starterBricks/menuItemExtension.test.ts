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

import {
  fromJS,
  type MenuDefinition,
  type MenuItemStarterBrickConfig,
} from "@/starterBricks/menuItemExtension";
import { validateRegistryId } from "@/types/helpers";
import { type Metadata } from "@/types/registryTypes";
import { define } from "cooky-cutter";
import { type StarterBrickConfig } from "@/starterBricks/types";
import { type UnknownObject } from "@/types/objectTypes";
import blockRegistry from "@/bricks/registry";
import { getReferenceForElement } from "@/contentScript/elementReference";
import {
  getDocument,
  RootReader,
  tick,
} from "@/starterBricks/starterBrickTestUtils";
import { type BrickPipeline } from "@/bricks/types";
import { reduceExtensionPipeline } from "@/runtime/reducePipeline";
import { type ResolvedModComponent } from "@/types/modComponentTypes";
import { RunReason } from "@/types/runtimeTypes";

import { uuidSequence } from "@/testUtils/factories/stringFactories";

jest.mock("@/runtime/reducePipeline", () => ({
  reduceExtensionPipeline: jest.fn().mockResolvedValue(undefined),
}));

const reduceExtensionPipelineMock = jest.mocked(reduceExtensionPipeline);

globalThis.requestIdleCallback = jest.fn((callback) => {
  (callback as any)();
  return 0;
});

globalThis.requestAnimationFrame = jest.fn((callback) => {
  (callback as any)();
  return 0;
});

const rootReaderId = validateRegistryId("test/root-reader");

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickConfig<MenuDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      }) as Metadata,
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

const modComponentFactory = define<ResolvedModComponent>({
  apiVersion: "v3",
  _resolvedModComponentBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<MenuItemStarterBrickConfig>({
    caption: "Hello World",
    action: () => [] as BrickPipeline,
    synchronous: false,
  }),
});

const rootReader = new RootReader();

beforeEach(() => {
  reduceExtensionPipelineMock.mockClear();
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  blockRegistry.clear();
  blockRegistry.register([rootReader]);
  rootReader.readCount = 0;
  rootReader.ref = undefined;
});

describe("menuItemExtension", () => {
  it.each([["append"], [undefined]])(
    "can add menu item with position: %s",
    async (position) => {
      document.body.innerHTML = getDocument("<div>foo</div>").body.innerHTML;

      const extensionPoint = fromJS(
        starterBrickFactory({
          position,
        })(),
      );

      const modComponent = modComponentFactory({
        extensionPointId: extensionPoint.id,
      });

      extensionPoint.registerModComponent(modComponent);

      await extensionPoint.install();
      await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

      expect(document.querySelectorAll("button")).toHaveLength(1);
      expect(document.body.innerHTML).toBe(
        `<div data-pb-extension-point="${extensionPoint.id}">foo<button data-pb-uuid="${modComponent.id}">Hello World</button></div>`,
      );

      extensionPoint.uninstall();
    },
  );

  it("can prepend menu item", async () => {
    document.body.innerHTML = getDocument("<div>foo</div>").body.innerHTML;
    const extensionPoint = fromJS(
      starterBrickFactory({
        position: "prepend",
      })(),
    );

    const modComponent = modComponentFactory({
      extensionPointId: extensionPoint.id,
    });

    extensionPoint.registerModComponent(modComponent);

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    expect(document.querySelectorAll("button")).toHaveLength(1);
    expect(document.body.innerHTML).toBe(
      `<div data-pb-extension-point="${extensionPoint.id}"><button data-pb-uuid="${modComponent.id}">Hello World</button>foo</div>`,
    );

    extensionPoint.uninstall();
  });

  it("can use targetMode: eventTarget", async () => {
    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    const extensionPoint = fromJS(
      starterBrickFactory({
        targetMode: "eventTarget",
      })(),
    );

    extensionPoint.registerModComponent(
      modComponentFactory({
        extensionPointId: extensionPoint.id,
      }),
    );

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    expect(document.querySelectorAll("button")).toHaveLength(1);

    document.querySelector("button").click();

    await tick();

    expect(rootReader.readCount).toBe(1);
    const buttonRef = getReferenceForElement(document.querySelector("button"));
    expect(rootReader.ref).toEqual(buttonRef);

    expect(reduceExtensionPipelineMock).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        root: document.querySelector("button"),
      }),
      expect.toBeObject(),
    );

    extensionPoint.uninstall();
  });

  it("can user reader selector", async () => {
    document.body.innerHTML = getDocument(
      '<div id="outer"><div id="toolbar"></div></div>',
    ).body.innerHTML;
    const extensionPoint = fromJS(
      starterBrickFactory({
        readerSelector: "div",
        containerSelector: "#toolbar",
      })(),
    );

    extensionPoint.registerModComponent(
      modComponentFactory({
        extensionPointId: extensionPoint.id,
      }),
    );

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    expect(document.querySelectorAll("button")).toHaveLength(1);

    document.querySelector("button").click();

    await tick();

    expect(rootReader.readCount).toBe(1);
    const outerRef = getReferenceForElement(
      document.querySelector<HTMLElement>("#outer"),
    );
    expect(rootReader.ref).toEqual(outerRef);

    expect(reduceExtensionPipelineMock).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        // Reader selector only impacts the reader context, not the pipeline context
        root: document,
      }),
      expect.toBeObject(),
    );

    extensionPoint.uninstall();
  });

  it.each([[undefined], ["document"]])(
    "can use default targetMode: %s",
    async (targetMode) => {
      document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
      const extensionPoint = fromJS(
        starterBrickFactory({
          targetMode,
        })(),
      );

      extensionPoint.registerModComponent(
        modComponentFactory({
          extensionPointId: extensionPoint.id,
        }),
      );

      await extensionPoint.install();
      await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

      expect(document.querySelectorAll("button")).toHaveLength(1);

      expect(reduceExtensionPipelineMock).not.toHaveBeenCalled();

      document.querySelector("button").click();
      await tick();

      expect(rootReader.readCount).toBe(1);
      const documentRef = getReferenceForElement(document);
      expect(rootReader.ref).toEqual(documentRef);

      expect(reduceExtensionPipelineMock).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          root: document,
        }),
        expect.toBeObject(),
      );

      extensionPoint.uninstall();
    },
  );

  it("re-attaches to container", async () => {
    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    const starterBrick = fromJS(starterBrickFactory()());

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });
    expect(document.querySelectorAll("button")).toHaveLength(1);

    document.body.innerHTML = "";
    expect(document.querySelectorAll("button")).toHaveLength(0);

    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    await tick();
    expect(document.querySelectorAll("button")).toHaveLength(1);

    starterBrick.uninstall();
  });

  it("watches ancestor changes for menu location", async () => {
    document.body.innerHTML = getDocument(
      '<div id="root"><div id="menu"></div></div>',
    ).body.innerHTML;
    const extensionPoint = fromJS(
      starterBrickFactory({
        containerSelector: ".newClass #menu",
      })(),
    );

    extensionPoint.registerModComponent(
      modComponentFactory({
        extensionPointId: extensionPoint.id,
      }),
    );

    const installPromise = extensionPoint.install();

    expect(document.querySelectorAll("button")).toHaveLength(0);

    document.querySelector("#root").classList.add("newClass");

    await installPromise;

    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });

    await tick();

    console.debug(document.body.innerHTML);

    expect(document.querySelectorAll("button")).toHaveLength(1);

    extensionPoint.uninstall();
  });

  it("watch attach mode attaches new menu items", async () => {
    document.body.innerHTML = getDocument(
      "<div><div class='menu'></div></div>",
    ).body.innerHTML;
    const starterBrick = starterBrickFactory()();
    starterBrick.definition.containerSelector = ".menu";
    starterBrick.definition.attachMode = "watch";

    const extensionPoint = fromJS(starterBrick);

    extensionPoint.registerModComponent(
      modComponentFactory({
        extensionPointId: extensionPoint.id,
      }),
    );

    await extensionPoint.install();
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });
    expect(document.querySelectorAll("button")).toHaveLength(1);

    $("div:first").append("<div class='menu'></div>");

    // Not sure why 2 ticks are necessary. There are likely 2 set intervals at various times
    await tick();
    await tick();
    expect(document.querySelectorAll("button")).toHaveLength(2);

    extensionPoint.uninstall();
  });

  it("once does not attach for new items", async () => {
    // Test the quirky behavior of "once" mode when there are multiple elements on the page and the original menu
    // is removed from the page
    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    const starterBrick = starterBrickFactory()();
    starterBrick.definition.containerSelector = ".menu";
    starterBrick.definition.attachMode = "once";

    const extensionPoint = fromJS(starterBrick);

    extensionPoint.registerModComponent(
      modComponentFactory({
        extensionPointId: extensionPoint.id,
      }),
    );

    const installPromise = extensionPoint.install();

    expect(document.querySelectorAll("button")).toHaveLength(0);

    $("div:first").append("<div class='menu'></div>");
    await tick();
    await tick();
    await installPromise;
    await extensionPoint.runModComponents({ reason: RunReason.MANUAL });
    expect(document.querySelectorAll("button")).toHaveLength(1);

    // 2 ticks were necessary in the watch test
    $("div:first").append("<div class='menu'></div>");
    await tick();
    await tick();
    // Not added because the element was already on the page
    expect(document.querySelectorAll("button")).toHaveLength(1);

    // It attaches to the other one if the original container is removed
    $("div div:first").remove();
    expect(document.querySelectorAll("button")).toHaveLength(0);
    await tick();
    await tick();
    expect(document.querySelectorAll("button")).toHaveLength(1);

    extensionPoint.uninstall();
  });
});
