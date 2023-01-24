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
import PanelBody from "@/sidebar/PanelBody";
import { type RendererError } from "@/sidebar/types";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { serializeError } from "serialize-error";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { type RendererPayload } from "@/runtime/runtimeTypes";
import { waitForEffect } from "@/testUtils/testHelpers";
import blocksRegistry from "@/blocks/registry";
import { HtmlRenderer } from "@/blocks/renderers/html";

jest.mock("@/blocks/registry", () => ({
  __esModule: true,
  default: {
    lookup: jest.fn().mockRejectedValue(new Error("Not implemented")),
  },
}));

const lookupMock = blocksRegistry.lookup as jest.Mock;

describe("PanelBody", () => {
  beforeEach(() => {
    lookupMock.mockReset();
  });

  it("renders application error", () => {
    const payload: RendererError = {
      key: uuidv4(),
      error: serializeError(new Error("test error")),
      runId: uuidv4(),
      extensionId: uuidv4(),
    };

    const result = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{}}
        payload={payload}
      />
    );

    expect(result).toMatchSnapshot();
  });

  it("renders business error", () => {
    const payload: RendererError = {
      key: uuidv4(),
      error: serializeError(new BusinessError("test error")),
      runId: uuidv4(),
      extensionId: uuidv4(),
    };

    const result = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{}}
        payload={payload}
      />
    );

    expect(result).toMatchSnapshot();
  });

  it("renders cancellation", () => {
    const payload: RendererError = {
      key: uuidv4(),
      error: serializeError(new CancelError("test error")),
      runId: uuidv4(),
      extensionId: uuidv4(),
    };

    const result = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{}}
        payload={payload}
      />
    );

    expect(result).toMatchSnapshot();
  });

  it("renders html brick", async () => {
    const payload: RendererPayload = {
      key: uuidv4(),
      runId: uuidv4(),
      extensionId: uuidv4(),
      blockId: validateRegistryId("@pixiebrix/html"),
      args: {
        html: "<h1>Test</h1>",
      },
      ctxt: {},
    };

    lookupMock.mockResolvedValue(new HtmlRenderer());

    const result = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{}}
        payload={payload}
      />
    );

    await waitForEffect();

    // There's a shadow root in BodyContainer, so the snapshot cuts off at the div
    expect(result).toMatchSnapshot();
  });
});
