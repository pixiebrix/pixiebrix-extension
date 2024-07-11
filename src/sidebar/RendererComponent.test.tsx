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

import React from "react";
import { render, act } from "@/sidebar/testHelpers";
import RendererComponent from "@/sidebar/RendererComponent";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import DocumentView from "@/bricks/renderers/documentView/DocumentView";
import { screen } from "shadow-dom-testing-library";
import { SubmitPanelAction } from "@/bricks/errors";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { runHeadlessPipeline } from "@/contentScript/messenger/api";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";
import { toExpression } from "@/utils/expressionUtils";

jest.mock("@/contentScript/messenger/api", () => ({
  runHeadlessPipeline: jest
    .fn()
    .mockRejectedValue(new Error("not implemented")),
}));

const runHeadlessPipelineMock = jest.mocked(runHeadlessPipeline);

describe("RendererComponent", () => {
  beforeEach(() => {
    runHeadlessPipelineMock.mockReset();
  });

  test("provide onAction to document renderer", async () => {
    const runId = uuidv4();
    const modComponentId = uuidv4();
    const onAction = jest.fn();

    runHeadlessPipelineMock.mockRejectedValue(
      new SubmitPanelAction("submit", { foo: "bar" }),
    );

    const config = {
      type: "button",
      config: {
        title: "Button under test",
        variant: "primary",
        className: "test-class",
        onClick: toExpression("pipeline", []),
      },
    };

    const props = {
      body: [config],
      options: brickOptionsFactory({
        logger: new ConsoleLogger({ modComponentId }),
        meta: {
          runId,
          modComponentId,
          branches: [],
        },
      }),
    };

    render(
      <RendererComponent
        brickId={validateRegistryId("@pixiebrix/document")}
        body={{ Component: DocumentView as any, props }}
        meta={{ runId, modComponentId }}
        onAction={onAction}
      />,
    );

    await waitForEffect();

    act(() => {
      screen.getByShadowText("Button under test").click();
    });

    await waitForEffect();

    expect(onAction).toHaveBeenCalledWith({
      type: "submit",
      detail: { foo: "bar" },
    });
  });
});
