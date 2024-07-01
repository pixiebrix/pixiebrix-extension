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

import DisplayTemporaryInfo from "@/bricks/transformers/temporaryInfo/DisplayTemporaryInfo";
import blockRegistry from "@/bricks/registry";
import {
  ContextBrick,
  contextBrick,
  echoBrick,
  simpleInput,
  teapotBrick,
  testOptions,
  throwBrick,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { getExampleBrickConfig } from "@/pageEditor/exampleBrickConfigs";
import { reducePipeline } from "@/runtime/reducePipeline";
import { type BusinessError } from "@/errors/businessErrors";
import {
  isRendererErrorPayload,
  type PanelPayload,
  type TemporaryPanelEntry,
} from "@/types/sidebarTypes";
import {
  showTemporarySidebarPanel,
  updateTemporarySidebarPanel,
} from "@/contentScript/sidebarController";
import {
  cancelTemporaryPanelsForExtension,
  updatePanelDefinition,
  waitForTemporaryPanel,
} from "@/platform/panels/panelController";
import { uuidv4 } from "@/types/helpers";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { tick } from "@/starterBricks/starterBrickTestUtils";
import pDefer from "p-defer";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { type RendererErrorPayload } from "@/types/rendererTypes";
import {
  MergeStrategies,
  setState,
  StateNamespaces,
} from "@/platform/state/stateController";
import { contextAsPlainObject } from "@/runtime/extendModVariableContext";
import { unary } from "lodash";
import { toExpression } from "@/utils/expressionUtils";
import { showModal } from "@/contentScript/modalDom";
import { isLoadedInIframe } from "@/utils/iframeUtils";

jest.mock("@/contentScript/modalDom");
jest.mock("@/contentScript/sidebarController");
jest.mock("@/platform/panels/panelController");

jest.mock("@/utils/iframeUtils");

const displayTemporaryInfoBlock = new DisplayTemporaryInfo();
const renderer = new DocumentRenderer();

describe("DisplayTemporaryInfo", () => {
  beforeEach(() => {
    jest.mocked(isLoadedInIframe).mockReturnValue(false);

    blockRegistry.clear();
    blockRegistry.register([
      echoBrick,
      teapotBrick,
      contextBrick,
      throwBrick,
      renderer,
      displayTemporaryInfoBlock,
    ]);

    jest.clearAllMocks();
  });

  test("isRootAware", async () => {
    await expect(displayTemporaryInfoBlock.isRootAware()).resolves.toBe(true);
  });

  test("it returns run payload for sidebar panel", async () => {
    const extensionId = uuidv4();
    const blueprintId = registryIdFactory();

    const config = getExampleBrickConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
      },
    };

    await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        modComponentId: extensionId,
        modId: blueprintId,
      }),
    });

    // Show function will be called with a "loading" payload
    expect(showTemporarySidebarPanel).toHaveBeenCalledExactlyOnceWith({
      blueprintId,
      extensionId,
      nonce: expect.toBeString(),
      heading: expect.toBeString(),
      payload: expect.objectContaining({
        loadingMessage: expect.toBeString(),
      }),
    });

    // Panel will be updated when the real payload is ready
    expect(updatePanelDefinition).toHaveBeenCalledExactlyOnceWith({
      blueprintId,
      extensionId,
      nonce: expect.toBeString(),
      heading: expect.toBeString(),
      payload: expect.objectContaining({
        blockId: renderer.id,
        args: expect.anything(),
        ctxt: expect.anything(),
      }),
    });
  });

  test("it returns error", async () => {
    const message = "display info test error";

    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [
          { id: throwBrick.id, config: { message } },
          { id: renderer.id, config: getExampleBrickConfig(renderer.id) },
        ]),
      },
    };

    let payload: PanelPayload;
    jest
      .mocked(showTemporarySidebarPanel)
      .mockImplementation(async (entry: TemporaryPanelEntry) => {
        payload = entry.payload;
      });
    jest
      .mocked(updatePanelDefinition)
      .mockImplementation((entry: TemporaryPanelEntry) => {
        payload = entry.payload;
      });

    await reducePipeline(pipeline, simpleInput({}), testOptions("v3"));

    expect(isRendererErrorPayload(payload)).toBe(true);
    const error = payload as RendererErrorPayload;
    const errorMessage = (error.error as BusinessError).message;
    expect(errorMessage).toStrictEqual(message);
  });

  test("it registers panel for modal", async () => {
    const config = getExampleBrickConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "modal",
      },
    };

    const extensionId = uuidv4();

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        modComponentId: extensionId,
      }),
    };

    await reducePipeline(pipeline, simpleInput({}), options);

    expect(showModal).toHaveBeenCalled();
    expect(showTemporarySidebarPanel).not.toHaveBeenCalled();

    expect(waitForTemporaryPanel).toHaveBeenCalledWith({
      nonce: expect.toBeString(),
      extensionId,
      location: "modal",
      entry: expect.objectContaining({
        extensionId,
        heading: "Test Temp Panel",
        nonce: expect.toBeString(),
        payload: expect.toBeObject(),
      }),
    });
  });

  test("it errors from frame", async () => {
    jest.mocked(isLoadedInIframe).mockReturnValue(true);

    const config = getExampleBrickConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "panel",
        isRootAware: true,
      },
    };

    const extensionId = uuidv4();

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        modComponentId: extensionId,
      }),
    };

    await expect(
      reducePipeline(pipeline, simpleInput({}), options),
    ).rejects.toThrow("Cannot show sidebar in a frame");
  });

  test("requires target for popover", async () => {
    const config = getExampleBrickConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "popover",
        isRootAware: true,
      },
    };

    const extensionId = uuidv4();

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        modComponentId: extensionId,
      }),
    };

    await expect(
      reducePipeline(pipeline, simpleInput({}), options),
    ).rejects.toThrow("Target must be an element for popover");
  });

  test("it registers a popover panel", async () => {
    document.body.innerHTML = '<div><div id="target"></div></div>';

    const config = getExampleBrickConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        isRootAware: true,
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "popover",
      },
    };

    const extensionId = uuidv4();
    const root = document.querySelector<HTMLElement>("#target");

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        modComponentId: extensionId,
      }),
    };

    await reducePipeline(pipeline, { ...simpleInput({}), root }, options);

    expect(showModal).not.toHaveBeenCalled();
    expect(showTemporarySidebarPanel).not.toHaveBeenCalled();
    expect(cancelTemporaryPanelsForExtension).toHaveBeenCalled();

    expect(
      document.body.querySelector(".pixiebrix-tooltips-container"),
    ).not.toBeNull();
  });

  test("it listens for statechange", async () => {
    document.body.innerHTML = '<div><div id="target"></div></div>';

    const deferredPromise = pDefer<any>();
    jest
      .mocked(waitForTemporaryPanel)
      .mockImplementation(async () => deferredPromise.promise);

    const config = getExampleBrickConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "panel",
        refreshTrigger: "statechange",
      },
    };

    const extensionId = uuidv4();

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        modComponentId: extensionId,
      }),
    };

    void reducePipeline(pipeline, simpleInput({}), options);

    await tick();

    expect(jest.mocked(showTemporarySidebarPanel)).toHaveBeenCalled();

    $(document).trigger("statechange");

    await tick();

    expect(jest.mocked(updateTemporarySidebarPanel)).toHaveBeenCalled();

    deferredPromise.resolve();
  });

  test("body receives updated mod variable on re-render", async () => {
    document.body.innerHTML = '<div><div id="target"></div></div>';

    const deferredPromise = pDefer<any>();
    jest
      .mocked(waitForTemporaryPanel)
      .mockImplementation(async () => deferredPromise.promise);

    const config = getExampleBrickConfig(renderer.id);

    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [
          { id: ContextBrick.BLOCK_ID, config: {} },
          { id: renderer.id, config },
        ]),
        location: "panel",
        refreshTrigger: "statechange",
      },
    };

    const extensionId = uuidv4();

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        modComponentId: extensionId,
      }),
    };

    void reducePipeline(pipeline, simpleInput({}), options);

    await tick();

    expect(
      ContextBrick.contexts.map(unary(contextAsPlainObject)),
    ).toStrictEqual([{ "@input": {}, "@mod": {}, "@options": {} }]);
    expect(jest.mocked(showTemporarySidebarPanel)).toHaveBeenCalled();

    setState({
      namespace: StateNamespaces.MOD,
      data: { foo: 42 },
      mergeStrategy: MergeStrategies.REPLACE,
      modComponentId: extensionId,
      modId: null,
    });

    await tick();

    expect(
      ContextBrick.contexts.map(unary(contextAsPlainObject)),
    ).toStrictEqual([
      { "@input": {}, "@mod": {}, "@options": {} },
      { "@input": {}, "@mod": { foo: 42 }, "@options": {} },
    ]);
    expect(jest.mocked(updateTemporarySidebarPanel)).toHaveBeenCalled();

    deferredPromise.resolve();
  });
});
