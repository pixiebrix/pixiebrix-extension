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

import DisplayTemporaryInfo from "./DisplayTemporaryInfo";
import brickRegistry from "../../registry";
import {
  ContextBrick,
  contextBrick,
  echoBrick,
  simpleInput,
  teapotBrick,
  throwBrick,
} from "../../../runtime/pipelineTests/testHelpers";
import { DocumentRenderer } from "../../renderers/document";
import { getExampleBrickConfig } from "../../exampleBrickConfigs";
import { reducePipeline } from "../../../runtime/reducePipeline";
import { type BusinessError } from "../../../errors/businessErrors";
import {
  isRendererErrorPayload,
  type PanelPayload,
  type TemporaryPanelEntry,
} from "../../../types/sidebarTypes";
import {
  showTemporarySidebarPanel,
  updateTemporarySidebarPanel,
} from "../../../contentScript/sidebarController";
import {
  cancelTemporaryPanelsForModComponent,
  updatePanelDefinition,
  waitForTemporaryPanel,
} from "../../../platform/panels/panelController";
import ConsoleLogger from "../../../utils/ConsoleLogger";
import { tick } from "../../../starterBricks/testHelpers";
import pDefer from "p-defer";
import { type RendererErrorPayload } from "../../../types/rendererTypes";
import { contextAsPlainObject } from "../../../runtime/extendModVariableContext";
import { unary } from "lodash";
import { toExpression } from "../../../utils/expressionUtils";
import { showModal } from "../../../contentScript/modalDom";
import { isLoadedInIframe } from "../../../utils/iframeUtils";
import { modComponentRefFactory } from "../../../testUtils/factories/modComponentFactories";
import { mapModComponentRefToMessageContext } from "../../../utils/modUtils";
import { reduceOptionsFactory } from "../../../testUtils/factories/runtimeFactories";
import {
  MergeStrategies,
  STATE_CHANGE_JS_EVENT_TYPE,
  StateNamespaces,
} from "../../../platform/state/stateTypes";
import { RefreshTriggers } from "../../../platform/panels/panelTypes";
import { getPlatform } from "../../../platform/platformContext";

jest.mock("../../../contentScript/modalDom");
jest.mock("../../../contentScript/sidebarController");
jest.mock("../../../platform/panels/panelController");
jest.mock("../../../utils/iframeUtils");

const displayTemporaryInfoBlock = new DisplayTemporaryInfo();
const renderer = new DocumentRenderer();

describe("DisplayTemporaryInfo", () => {
  beforeEach(() => {
    jest.mocked(isLoadedInIframe).mockReturnValue(false);

    brickRegistry.clear();
    brickRegistry.register([
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

  it("returns run payload for sidebar panel", async () => {
    const modComponentRef = modComponentRefFactory();

    const config = getExampleBrickConfig(renderer.id)!;
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
      },
    };

    await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    // Show function will be called with a "loading" payload
    expect(showTemporarySidebarPanel).toHaveBeenCalledExactlyOnceWith({
      modComponentRef,
      nonce: expect.toBeString(),
      heading: expect.toBeString(),
      payload: expect.objectContaining({
        loadingMessage: expect.toBeString(),
      }),
    });

    // Panel will be updated when the real payload is ready
    expect(updatePanelDefinition).toHaveBeenCalledExactlyOnceWith({
      modComponentRef,
      nonce: expect.toBeString(),
      heading: expect.toBeString(),
      payload: expect.objectContaining({
        brickId: renderer.id,
        args: expect.anything(),
        ctxt: expect.anything(),
      }),
    });
  });

  it("returns error", async () => {
    const message = "display info test error";

    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [
          { id: throwBrick.id, config: { message } },
          { id: renderer.id, config: getExampleBrickConfig(renderer.id)! },
        ]),
      },
    };

    let payload: PanelPayload | null = null;
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

    await reducePipeline(pipeline, simpleInput({}), reduceOptionsFactory());

    expect(isRendererErrorPayload(payload!)).toBe(true);
    const error = payload! as RendererErrorPayload;
    const errorMessage = (error.error as BusinessError).message;
    expect(errorMessage).toStrictEqual(message);
  });

  it("registers panel for modal", async () => {
    const config = getExampleBrickConfig(renderer.id)!;
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "modal",
      },
    };

    const modComponentRef = modComponentRefFactory();
    await reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    expect(showModal).toHaveBeenCalled();
    expect(showTemporarySidebarPanel).not.toHaveBeenCalled();

    expect(waitForTemporaryPanel).toHaveBeenCalledWith({
      nonce: expect.toBeString(),
      modComponentId: modComponentRef.modComponentId,
      location: "modal",
      entry: expect.objectContaining({
        modComponentRef,
        heading: "Test Temp Panel",
        nonce: expect.toBeString(),
        payload: expect.toBeObject(),
      }),
    });
  });

  it("errors from frame", async () => {
    const modComponentRef = modComponentRefFactory();
    jest.mocked(isLoadedInIframe).mockReturnValue(true);

    const config = getExampleBrickConfig(renderer.id)!;
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "panel",
        isRootAware: true,
      },
    };

    const options = {
      ...reduceOptionsFactory("v3"),
      logger: new ConsoleLogger(
        mapModComponentRefToMessageContext(modComponentRef),
      ),
    };

    await expect(
      reducePipeline(pipeline, simpleInput({}), options),
    ).rejects.toThrow("Cannot show sidebar in a frame");
  });

  test("requires target for popover", async () => {
    const config = getExampleBrickConfig(renderer.id)!;
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "popover",
        isRootAware: true,
      },
    };

    await expect(
      reducePipeline(pipeline, simpleInput({}), reduceOptionsFactory()),
    ).rejects.toThrow("Target must be an element for popover");
  });

  it("registers a popover panel", async () => {
    document.body.innerHTML = '<div><div id="target"></div></div>';

    const config = getExampleBrickConfig(renderer.id)!;
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        isRootAware: true,
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "popover",
      },
    };

    const root = document.querySelector<HTMLElement>("#target");

    await reducePipeline(
      pipeline,
      { ...simpleInput({}), root },
      reduceOptionsFactory(),
    );

    expect(showModal).not.toHaveBeenCalled();
    expect(showTemporarySidebarPanel).not.toHaveBeenCalled();
    expect(cancelTemporaryPanelsForModComponent).toHaveBeenCalled();

    expect(
      document.body.querySelector(".pixiebrix-tooltips-container"),
    ).not.toBeNull();
  });

  it("listens for statechange", async () => {
    document.body.innerHTML = '<div><div id="target"></div></div>';

    const deferredPromise = pDefer<any>();
    jest
      .mocked(waitForTemporaryPanel)
      .mockImplementation(async () => deferredPromise.promise);

    const config = getExampleBrickConfig(renderer.id)!;
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [{ id: renderer.id, config }]),
        location: "panel",
        refreshTrigger: RefreshTriggers.MANUAL,
      },
    };

    void reducePipeline(pipeline, simpleInput({}), reduceOptionsFactory());

    await tick();

    expect(jest.mocked(showTemporarySidebarPanel)).toHaveBeenCalled();

    $(document).trigger(STATE_CHANGE_JS_EVENT_TYPE);

    await tick();

    expect(jest.mocked(updateTemporarySidebarPanel)).toHaveBeenCalled();

    deferredPromise.resolve();
  });

  test("body receives updated public mod variable on re-render", async () => {
    document.body.innerHTML = '<div><div id="target"></div></div>';

    const deferredPromise = pDefer<any>();
    jest
      .mocked(waitForTemporaryPanel)
      .mockImplementation(async () => deferredPromise.promise);

    const config = getExampleBrickConfig(renderer.id)!;

    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: toExpression("pipeline", [
          { id: ContextBrick.BRICK_ID, config: {} },
          { id: renderer.id, config },
        ]),
        location: "panel",
        refreshTrigger: RefreshTriggers.STATE_CHANGE,
      },
    };

    const modComponentRef = modComponentRefFactory();

    void reducePipeline(
      pipeline,
      simpleInput({}),
      reduceOptionsFactory("v3", { modComponentRef }),
    );

    await tick();

    expect(
      ContextBrick.contexts.map(unary(contextAsPlainObject)),
    ).toStrictEqual([{ "@input": {}, "@mod": {}, "@options": {} }]);
    expect(jest.mocked(showTemporarySidebarPanel)).toHaveBeenCalled();

    await getPlatform().state.setState({
      namespace: StateNamespaces.MOD,
      data: { foo: 42 },
      mergeStrategy: MergeStrategies.REPLACE,
      modComponentRef,
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
