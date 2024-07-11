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
import { render } from "@/sidebar/testHelpers";
import PanelBody from "@/sidebar/PanelBody";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { serializeError } from "serialize-error";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { waitForEffect } from "@/testUtils/testHelpers";
import registerBuiltinBricks from "@/bricks/registerBuiltinBricks";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import {
  type RendererErrorPayload,
  type RendererRunPayload,
} from "@/types/rendererTypes";
import { screen } from "shadow-dom-testing-library";

const modComponentId = uuidv4();
const modId = registryIdFactory();

describe("PanelBody", () => {
  beforeAll(() => {
    registerBuiltinBricks();
  });

  it("renders application error", () => {
    const payload: RendererErrorPayload = {
      key: uuidv4(),
      error: serializeError(new Error("test error")),
      runId: uuidv4(),
      modComponentId: modComponentId,
    };

    const { asFragment } = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ modComponentId, modId }}
        payload={payload}
      />,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it("renders business error", () => {
    const payload: RendererErrorPayload = {
      key: uuidv4(),
      error: serializeError(new BusinessError("test error")),
      runId: uuidv4(),
      modComponentId: modComponentId,
    };

    const { asFragment } = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ modComponentId, modId }}
        payload={payload}
      />,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it("renders cancellation", () => {
    const payload: RendererErrorPayload = {
      key: uuidv4(),
      error: serializeError(new CancelError("test error")),
      runId: uuidv4(),
      modComponentId: modComponentId,
    };

    const { asFragment } = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ modComponentId, modId }}
        payload={payload}
      />,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  it("renders html brick", async () => {
    const payload: RendererRunPayload = {
      key: uuidv4(),
      runId: uuidv4(),
      modComponentId: modComponentId,
      brickId: validateRegistryId("@pixiebrix/html"),
      args: {
        html: "<h1>Test</h1>",
      },
      ctxt: {},
    };

    const { asFragment } = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ modComponentId, modId }}
        payload={payload}
      />,
    );

    await waitForEffect();

    // There's a shadow root in BodyContainer, so the snapshot cuts off at the div
    expect(asFragment()).toMatchSnapshot();
  });

  it("delays loading indicator render", async () => {
    const payload: RendererRunPayload = {
      key: uuidv4(),
      runId: uuidv4(),
      modComponentId: modComponentId,
      brickId: validateRegistryId("@pixiebrix/html"),
      args: {
        html: "<h1>Test</h1>",
      },
      ctxt: {},
    };

    render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ modComponentId, modId }}
        payload={payload}
      />,
    );

    expect(screen.queryByShadowText("Test")).not.toBeInTheDocument();

    await waitForEffect();

    expect(screen.getByShadowText("Test")).toBeVisible();
  });

  it("renders document", async () => {
    const payload: RendererRunPayload = {
      key: uuidv4(),
      runId: uuidv4(),
      modComponentId: modComponentId,
      brickId: validateRegistryId("@pixiebrix/document"),
      args: {
        body: [
          {
            type: "container",
            config: {},
            children: [
              {
                type: "row",
                config: {},
                children: [
                  {
                    type: "column",
                    config: {},
                    children: [
                      {
                        type: "header",
                        config: {
                          title: "Example document",
                          heading: "h1",
                        },
                      },
                    ],
                  },
                ],
              },
              {
                type: "row",
                config: {},
                children: [
                  {
                    type: "column",
                    config: {},
                    children: [
                      {
                        type: "text",
                        config: {
                          text: "Example styled text element",
                          enableMarkdown: true,
                          className: "override-styles",
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      ctxt: {},
    };

    render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ modComponentId, modId }}
        payload={payload}
      />,
    );

    const header1 = await screen.findByShadowText("Example document");
    expect(header1).toBeInTheDocument();

    const textElement = await screen.findByShadowText(
      "Example styled text element",
    );
    expect(textElement).toBeInTheDocument();
  });
});
