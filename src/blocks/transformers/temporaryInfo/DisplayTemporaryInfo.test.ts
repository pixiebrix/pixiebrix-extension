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
import { BusinessError } from "@/errors/businessErrors";
import { RendererError } from "@/sidebar/types";

jest.mock("@/background/messenger/api", () => {
  const actual = jest.requireActual("@/background/messenger/api");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

jest.mock("@/contentScript/sidebarController", () => ({
  ensureSidebar: jest.fn(),
  showTemporarySidebarPanel: jest.fn(),
}));

describe("DisplayTemporaryInfo", () => {
  const displayTemporaryInfoBlock = new DisplayTemporaryInfo();
  const renderer = new DocumentRenderer();

  beforeEach(() => {
    blockRegistry.clear();
    blockRegistry.register(
      teapotBlock,
      throwBlock,
      renderer,
      displayTemporaryInfoBlock
    );
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
    // Result is PanelPayload (= RendererPayload | RendererError)
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );

    // Check structure for RendererPayload
    expect(result).toHaveProperty("blockId", renderer.id);
    expect(result).toHaveProperty("args");
    expect(result).toHaveProperty("ctxt");
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
    // Result is PanelPayload (= RendererPayload | RendererError)
    const result = await reducePipeline(
      pipeline,
      simpleInput({}),
      testOptions("v3")
    );

    // Check structure for RendererError
    expect(result).toHaveProperty("error");
    const error = result as RendererError;
    const errorMessage = (error.error as BusinessError).message;
    expect(errorMessage).toStrictEqual(message);
  });
});
