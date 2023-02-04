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
  type PanelPayload,
  type RendererError,
  type TemporaryPanelEntry,
} from "@/sidebar/types";
import {
  showTemporarySidebarPanel,
  updateTemporarySidebarPanel,
} from "@/contentScript/sidebarController";
import {
  cancelTemporaryPanelsForExtension,
  waitForTemporaryPanel,
} from "@/blocks/transformers/temporaryInfo/temporaryPanelProtocol";
import { showModal } from "@/blocks/transformers/ephemeralForm/modalUtils";
import { uuidv4 } from "@/types/helpers";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { tick } from "@/extensionPoints/extensionPointTestUtils";
import pDefer from "p-defer";

(browser.runtime as any).getURL = jest.fn(
  (path) => `chrome-extension://abc/${path}`
);

jest.mock("@/telemetry/logging", () => {
  const actual = jest.requireActual("@/telemetry/logging");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

jest.mock("@/blocks/transformers/ephemeralForm/modalUtils", () => ({
  showModal: jest.fn(),
}));

jest.mock("@/contentScript/sidebarController", () => ({
  ensureSidebar: jest.fn(),
  showTemporarySidebarPanel: jest.fn(),
  updateTemporarySidebarPanel: jest.fn(),
}));

jest.mock("@/blocks/transformers/temporaryInfo/temporaryPanelProtocol", () => ({
  waitForTemporaryPanel: jest.fn(),
  stopWaitingForTemporaryPanels: jest.fn(),
  cancelTemporaryPanelsForExtension: jest.fn(),
  updatePanelDefinition: jest.fn(),
}));

const showTemporarySidebarPanelMock =
  showTemporarySidebarPanel as jest.MockedFunction<
    typeof showTemporarySidebarPanel
  >;
const showModalMock = showModal as jest.MockedFunction<typeof showModal>;
const waitForTemporaryPanelMock = waitForTemporaryPanel as jest.MockedFunction<
  typeof waitForTemporaryPanel
>;
const cancelTemporaryPanelsForExtensionMock =
  cancelTemporaryPanelsForExtension as jest.MockedFunction<
    typeof cancelTemporaryPanelsForExtension
  >;
const updateTemporarySidebarPanelMock =
  updateTemporarySidebarPanel as jest.MockedFunction<
    typeof updateTemporarySidebarPanel
  >;

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
  });

  test("isRootAware", async () => {
    await expect(displayTemporaryInfoBlock.isRootAware()).resolves.toBe(true);
  });

  test("it returns payload", async () => {
    const config = getExampleBlockConfig(renderer.id);
    const pipeline = {
      id: displayTemporaryInfoBlock.id,
      config: {
        title: "Test Temp Panel",
        body: makePipelineExpression([{ id: renderer.id, config }]),
      },
    };
    let payload: PanelPayload;
    showTemporarySidebarPanelMock.mockImplementation(
      (entry: TemporaryPanelEntry) => {
        payload = entry.payload;
      }
    );

    await reducePipeline(pipeline, simpleInput({}), testOptions("v3"));

    // Check structure for RendererPayload
    expect(payload).toHaveProperty("blockId", renderer.id);
    expect(payload).toHaveProperty("args");
    expect(payload).toHaveProperty("ctxt");
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

    await reducePipeline(pipeline, simpleInput({}), testOptions("v3"));

    // Check structure for RendererError
    expect(payload).toHaveProperty("error");
    const error = payload as RendererError;
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
