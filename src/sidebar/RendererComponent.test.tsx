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

import React from "react";
import { render } from "@/sidebar/testHelpers";
import RendererComponent from "@/sidebar/RendererComponent";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import DocumentView from "@/blocks/renderers/documentView/DocumentView";
import { screen } from "shadow-dom-testing-library";
import { act } from "@testing-library/react";
import { SubmitPanelAction } from "@/blocks/errors";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { runEffectPipeline } from "@/contentScript/messenger/api";

jest.mock("@/contentScript/messenger/api", () => ({
  runEffectPipeline: jest.fn().mockRejectedValue(new Error("not implemented")),
}));

const runEffectPipelineMock = runEffectPipeline as jest.MockedFunction<
  typeof runEffectPipeline
>;

describe("RendererComponent", () => {
  beforeEach(() => {
    runEffectPipelineMock.mockReset();
  });

  test("provide onAction to document renderer", async () => {
    const runId = uuidv4();
    const extensionId = uuidv4();
    const onAction = jest.fn();

    runEffectPipelineMock.mockRejectedValue(
      new SubmitPanelAction("submit", { foo: "bar" })
    );

    const config = {
      type: "button",
      config: {
        title: "Button under test",
        variant: "primary",
        className: "test-class",
        onClick: {
          __type__: "pipeline",
          __value__: jest.fn(),
        },
      },
    };

    const props = {
      body: [config],
      options: { ctxt: {}, logger: new ConsoleLogger() },
    };

    render(
      <RendererComponent
        blockId={validateRegistryId("@pixiebrix/document")}
        body={{ Component: DocumentView as any, props }}
        meta={{ runId, extensionId }}
        onAction={onAction}
      />
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
