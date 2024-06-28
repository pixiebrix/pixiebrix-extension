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

import { fromJS } from "@/starterBricks/button/buttonStarterBrick";
import { validateRegistryId } from "@/types/helpers";
import { type Metadata, DefinitionKinds } from "@/types/registryTypes";
import { define } from "cooky-cutter";
import { type StarterBrickDefinitionLike } from "@/starterBricks/types";
import blockRegistry from "@/bricks/registry";
import { getReferenceForElement } from "@/contentScript/elementReference";
import {
  getDocument,
  RootReader,
  tick,
} from "@/starterBricks/starterBrickTestUtils";
import { type BrickPipeline } from "@/bricks/types";
import { reduceModComponentPipeline } from "@/runtime/reducePipeline";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { RunReason } from "@/types/runtimeTypes";

import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { getPlatform } from "@/platform/platformContext";
import {
  type ButtonDefinition,
  type ButtonStarterBrickConfig,
} from "@/starterBricks/button/buttonStarterBrickTypes";
import { StarterBrickTypes } from "@/types/starterBrickTypes";

jest.mock("@/runtime/reducePipeline");

const reduceModComponentPipelineMock = jest.mocked(reduceModComponentPipeline);

globalThis.requestIdleCallback = jest.fn((callback) => {
  callback({ didTimeout: false, timeRemaining: () => 1 });
  return 0;
});

globalThis.requestAnimationFrame = jest.fn((callback) => {
  callback(1);
  return 0;
});

const rootReaderId = validateRegistryId("test/root-reader");

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickDefinitionLike<ButtonDefinition>>({
    apiVersion: "v3",
    kind: DefinitionKinds.STARTER_BRICK,
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      }) as Metadata,
    definition: define<ButtonDefinition>({
      type: StarterBrickTypes.BUTTON,
      template: "<button>{{caption}}</button>",
      containerSelector: "div",
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReaderId],
      ...definitionOverrides,
    }),
  });

const modComponentFactory = define<HydratedModComponent>({
  apiVersion: "v3",
  _hydratedModComponentBrand: undefined as never,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: undefined,
  label: "Test Button",
  config: define<ButtonStarterBrickConfig>({
    caption: "Hello World",
    action: () => [] as BrickPipeline,
    synchronous: false,
  }),
});

const rootReader = new RootReader();

beforeEach(() => {
  reduceModComponentPipelineMock.mockClear();
  window.document.body.innerHTML = "";
  document.body.innerHTML = "";
  blockRegistry.clear();
  blockRegistry.register([rootReader]);
  rootReader.readCount = 0;
  rootReader.ref = null;
});

describe("buttonStarterBrick", () => {
  it.each([["append"], [undefined]])(
    "can add button with position: %s",
    async (position) => {
      document.body.innerHTML = getDocument("<div>foo</div>").body.innerHTML;

      const starterBrick = fromJS(
        getPlatform(),
        starterBrickFactory({
          position,
        })(),
      );

      const modComponent = modComponentFactory({
        extensionPointId: starterBrick.id,
      });

      starterBrick.registerModComponent(modComponent);

      await starterBrick.install();
      await starterBrick.runModComponents({ reason: RunReason.MANUAL });

      expect(document.querySelectorAll("button")).toHaveLength(1);
      expect(document.body.innerHTML).toBe(
        `<div data-pb-extension-point="${starterBrick.id}">foo<button data-pb-uuid="${modComponent.id}">Hello World</button></div>`,
      );

      starterBrick.uninstall();
    },
  );

  it("can prepend button", async () => {
    document.body.innerHTML = getDocument("<div>foo</div>").body.innerHTML;
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        position: "prepend",
      })(),
    );

    const modComponent = modComponentFactory({
      extensionPointId: starterBrick.id,
    });

    starterBrick.registerModComponent(modComponent);

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(document.querySelectorAll("button")).toHaveLength(1);
    expect(document.body.innerHTML).toBe(
      `<div data-pb-extension-point="${starterBrick.id}"><button data-pb-uuid="${modComponent.id}">Hello World</button>foo</div>`,
    );

    starterBrick.uninstall();
  });

  it("can use targetMode: eventTarget", async () => {
    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        targetMode: "eventTarget",
      })(),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(document.querySelectorAll("button")).toHaveLength(1);

    document.querySelector("button")!.click();

    await tick();

    expect(rootReader.readCount).toBe(1);
    const buttonRef = getReferenceForElement(document.querySelector("button")!);
    expect(rootReader.ref).toEqual(buttonRef);

    expect(reduceModComponentPipelineMock).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        root: document.querySelector("button"),
      }),
      expect.toBeObject(),
    );

    starterBrick.uninstall();
  });

  it("can user reader selector", async () => {
    document.body.innerHTML = getDocument(
      '<div id="outer"><div id="toolbar"></div></div>',
    ).body.innerHTML;
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        readerSelector: "div",
        containerSelector: "#toolbar",
      })(),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    expect(document.querySelectorAll("button")).toHaveLength(1);

    document.querySelector("button")!.click();

    await tick();

    expect(rootReader.readCount).toBe(1);
    const outerRef = getReferenceForElement(
      document.querySelector<HTMLElement>("#outer")!,
    );
    expect(rootReader.ref).toEqual(outerRef);

    expect(reduceModComponentPipelineMock).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        // Reader selector only impacts the reader context, not the pipeline context
        root: document,
      }),
      expect.toBeObject(),
    );

    starterBrick.uninstall();
  });

  it.each([[undefined], ["document"]])(
    "can use default targetMode: %s",
    async (targetMode) => {
      document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
      const starterBrick = fromJS(
        getPlatform(),
        starterBrickFactory({
          targetMode,
        })(),
      );

      starterBrick.registerModComponent(
        modComponentFactory({
          extensionPointId: starterBrick.id,
        }),
      );

      await starterBrick.install();
      await starterBrick.runModComponents({ reason: RunReason.MANUAL });

      expect(document.querySelectorAll("button")).toHaveLength(1);

      expect(reduceModComponentPipelineMock).not.toHaveBeenCalled();

      document.querySelector("button")!.click();
      await tick();

      expect(rootReader.readCount).toBe(1);
      const documentRef = getReferenceForElement(document);
      expect(rootReader.ref).toEqual(documentRef);

      expect(reduceModComponentPipelineMock).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          root: document,
        }),
        expect.toBeObject(),
      );

      starterBrick.uninstall();
    },
  );

  it("re-attaches to container", async () => {
    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    const starterBrick = fromJS(getPlatform(), starterBrickFactory()());

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

  it("watches ancestor changes for button location", async () => {
    document.body.innerHTML = getDocument(
      '<div id="root"><div id="menu"></div></div>',
    ).body.innerHTML;
    const starterBrick = fromJS(
      getPlatform(),
      starterBrickFactory({
        containerSelector: ".newClass #menu",
      })(),
    );

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    const installPromise = starterBrick.install();

    expect(document.querySelectorAll("button")).toHaveLength(0);

    document.querySelector("#root")!.classList.add("newClass");

    await installPromise;

    await starterBrick.runModComponents({ reason: RunReason.MANUAL });

    await tick();

    console.debug(document.body.innerHTML);

    expect(document.querySelectorAll("button")).toHaveLength(1);

    starterBrick.uninstall();
  });

  it("watch attach mode attaches new buttons", async () => {
    document.body.innerHTML = getDocument(
      "<div><div class='menu'></div></div>",
    ).body.innerHTML;
    const starterBrickDefinition = starterBrickFactory()();
    starterBrickDefinition.definition.containerSelector = ".menu";
    starterBrickDefinition.definition.attachMode = "watch";

    const starterBrick = fromJS(getPlatform(), starterBrickDefinition);

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    await starterBrick.install();
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });
    expect(document.querySelectorAll("button")).toHaveLength(1);

    $("div:first").append("<div class='menu'></div>");

    // Not sure why 2 ticks are necessary. There are likely 2 set intervals at various times
    await tick();
    await tick();
    expect(document.querySelectorAll("button")).toHaveLength(2);

    starterBrick.uninstall();
  });

  it("once does not attach for new items", async () => {
    // Test the quirky behavior of "once" mode when there are multiple elements on the page and the original menu
    // is removed from the page
    document.body.innerHTML = getDocument("<div></div>").body.innerHTML;
    const starterBrickDefinition = starterBrickFactory()();
    starterBrickDefinition.definition.containerSelector = ".menu";
    starterBrickDefinition.definition.attachMode = "once";

    const starterBrick = fromJS(getPlatform(), starterBrickDefinition);

    starterBrick.registerModComponent(
      modComponentFactory({
        extensionPointId: starterBrick.id,
      }),
    );

    const installPromise = starterBrick.install();

    expect(document.querySelectorAll("button")).toHaveLength(0);

    $("div:first").append("<div class='menu'></div>");
    await tick();
    await tick();
    await installPromise;
    await starterBrick.runModComponents({ reason: RunReason.MANUAL });
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

    starterBrick.uninstall();
  });
});
