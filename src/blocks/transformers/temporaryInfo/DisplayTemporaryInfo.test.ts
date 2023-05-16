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

import DisplayTemporaryInfo from "@/blocks/transformers/temporaryInfo/DisplayTemporaryInfo";
import blockRegistry from "@/blocks/registry";
import {
  simpleInput,
  teapotBlock,
  testOptions,
  throwBlock,
} from "@/runtime/pipelineTests/pipelineTestHelpers";
import { makePipelineExpression } from "@/runtime/expressionCreators";
import { DocumentRenderer } from "@/blocks/renderers/document";
import { getExampleBlockConfig } from "@/pageEditor/exampleBlockConfigs";
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
  registerEmptyTemporaryPanel,
  updatePanelDefinition,
  waitForTemporaryPanel,
} from "@/blocks/transformers/temporaryInfo/temporaryPanelProtocol";
import { showModal } from "@/blocks/transformers/ephemeralForm/modalUtils";
import { uuidv4 } from "@/types/helpers";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { tick } from "@/extensionPoints/extensionPointTestUtils";
import pDefer from "p-defer";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { type RendererErrorPayload } from "@/types/rendererTypes";

(browser.runtime as any).getURL = jest.fn(
  (path) => `chrome-extension://abc/${path}`
);

jest.mock("@/blocks/transformers/ephemeralForm/modalUtils", () => ({
  showModal: jest.fn(),
}));
const showModalMock = jest.mocked(showModal);

jest.mock("@/contentScript/sidebarController", () => ({
  ensureSidebar: jest.fn(),
  showTemporarySidebarPanel: jest.fn(),
  updateTemporarySidebarPanel: jest.fn(),
}));
const showTemporarySidebarPanelMock = jest.mocked(showTemporarySidebarPanel);
const updateTemporarySidebarPanelMock = jest.mocked(
  updateTemporarySidebarPanel
);

jest.mock("@/blocks/transformers/temporaryInfo/temporaryPanelProtocol", () => ({
  registerEmptyTemporaryPanel: jest.fn(),
  waitForTemporaryPanel: jest.fn(),
  stopWaitingForTemporaryPanels: jest.fn(),
  cancelTemporaryPanelsForExtension: jest.fn(),
  updatePanelDefinition: jest.fn(),
}));
const registerEmptyTemporaryPanelMock = jest.mocked(
  registerEmptyTemporaryPanel
);
const waitForTemporaryPanelMock = jest.mocked(waitForTemporaryPanel);
const cancelTemporaryPanelsForExtensionMock = jest.mocked(
  cancelTemporaryPanelsForExtension
);
const updatePanelDefinitionMock = jest.mocked(updatePanelDefinition);

describe("DisplayTemporaryInfo", () => {
  const displayTemporaryInfoBlock = new DisplayTemporaryInfo();
  const renderer = new DocumentRenderer();

  beforeEach(() => {
    blockRegistry.clear();
    blockRegistry.register([
      teapotBlock,
      throwBlock,
      renderer,
      displayTemporaryInfoBlock,
    ]);

    showTemporarySidebarPanelMock.mockReset();
    showModalMock.mockReset();
    cancelTemporaryPanelsForExtensionMock.mockReset();
    updateTemporarySidebarPanelMock.mockReset();
    registerEmptyTemporaryPanelMock.mockReset();
  });

  test("isRootAware", async () => {
    await expect(displayTemporaryInfoBlock.isRootAware()).resolves.toBe(true);
  });

  test("it returns run payload for sidebar panel", async () => {
    const extensionId = uuidv4();
    const blueprintId = registryIdFactory();

    const config = getExampleBlockConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: makePipelineExpression([{ id: renderer.id, config }]),
      },
    };

    await reducePipeline(pipeline, simpleInput({}), {
      ...testOptions("v3"),
      logger: new ConsoleLogger({ extensionId, blueprintId }),
    });

    // Show function will be called with a "loading" payload
    expect(showTemporarySidebarPanelMock).toHaveBeenCalledOnceWith({
      blueprintId,
      extensionId,
      nonce: expect.toBeString(),
      heading: expect.toBeString(),
      payload: expect.objectContaining({
        loadingMessage: expect.toBeString(),
      }),
    });

    // Panel will be updated when the real payload is ready
    expect(updatePanelDefinitionMock).toHaveBeenCalledOnceWith({
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
        body: makePipelineExpression([
          { id: throwBlock.id, config: { message } },
          { id: renderer.id, config: getExampleBlockConfig(renderer.id) },
        ]),
      },
    };

    let payload: PanelPayload;
    showTemporarySidebarPanelMock.mockImplementation(
      (entry: TemporaryPanelEntry) => {
        payload = entry.payload;
      }
    );
    updatePanelDefinitionMock.mockImplementation(
      (entry: TemporaryPanelEntry) => {
        payload = entry.payload;
      }
    );

    await reducePipeline(pipeline, simpleInput({}), testOptions("v3"));

    expect(isRendererErrorPayload(payload)).toBe(true);
    const error = payload as RendererErrorPayload;
    const errorMessage = (error.error as BusinessError).message;
    expect(errorMessage).toStrictEqual(message);
  });

  test("it registers panel for modal", async () => {
    const config = getExampleBlockConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: makePipelineExpression([{ id: renderer.id, config }]),
        location: "modal",
      },
    };

    const extensionId = uuidv4();

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        extensionId,
      }),
    };

    await reducePipeline(pipeline, simpleInput({}), options);

    expect(showModalMock).toHaveBeenCalled();
    expect(showTemporarySidebarPanelMock).not.toHaveBeenCalled();

    expect(waitForTemporaryPanelMock).toHaveBeenCalledWith(
      // First argument is nonce
      expect.toBeString(),
      expect.objectContaining({
        extensionId,
        heading: "Test Temp Panel",
        nonce: expect.toBeString(),
        payload: expect.toBeObject(),
      }),
      { onRegister: undefined }
    );
  });

  test("requires target for popover", async () => {
    const config = getExampleBlockConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: makePipelineExpression([{ id: renderer.id, config }]),
        location: "popover",
        isRootAware: true,
      },
    };

    const extensionId = uuidv4();

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        extensionId,
      }),
    };

    await expect(
      reducePipeline(pipeline, simpleInput({}), options)
    ).rejects.toThrow("Target must be an element for popover");
  });

  test("it registers a popover panel", async () => {
    document.body.innerHTML = '<div><div id="target"></div></div>';

    const config = getExampleBlockConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        isRootAware: true,
        body: makePipelineExpression([{ id: renderer.id, config }]),
        location: "popover",
      },
    };

    const extensionId = uuidv4();
    const root = document.querySelector<HTMLElement>("#target");

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        extensionId,
      }),
    };

    await reducePipeline(pipeline, { ...simpleInput({}), root }, options);

    expect(showModalMock).not.toHaveBeenCalled();
    expect(showTemporarySidebarPanelMock).not.toHaveBeenCalled();
    expect(cancelTemporaryPanelsForExtensionMock).toHaveBeenCalled();

    expect(
      document.body.querySelector("#pb-tooltips-container")
    ).not.toBeNull();
  });

  test("it listens for statechange", async () => {
    document.body.innerHTML = '<div><div id="target"></div></div>';

    const deferredPromise = pDefer<any>();
    waitForTemporaryPanelMock.mockImplementation(
      async () => deferredPromise.promise
    );

    const config = getExampleBlockConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: makePipelineExpression([{ id: renderer.id, config }]),
        location: "panel",
        refreshTrigger: "statechange",
      },
    };

    const extensionId = uuidv4();

    const options = {
      ...testOptions("v3"),
      logger: new ConsoleLogger({
        extensionId,
      }),
    };

    void reducePipeline(pipeline, simpleInput({}), options);

    await tick();

    expect(showTemporarySidebarPanelMock).toHaveBeenCalled();

    $(document).trigger("statechange");

    await tick();

    expect(updateTemporarySidebarPanelMock).toHaveBeenCalled();

    deferredPromise.resolve();
  });
});
