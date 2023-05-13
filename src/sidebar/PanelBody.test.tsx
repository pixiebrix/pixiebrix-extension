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
import registerBuiltinBlocks from "@/blocks/registerBuiltinBlocks";

import { registryIdFactory } from "@/testUtils/factories/stringFactories";

const extensionId = uuidv4();
const blueprintId = registryIdFactory();

describe("PanelBody", () => {
  beforeAll(() => {
    registerBuiltinBlocks();
  });

  it("renders application error", () => {
    const payload: RendererError = {
      key: uuidv4(),
      error: serializeError(new Error("test error")),
      runId: uuidv4(),
      extensionId,
    };

    const result = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ extensionId, blueprintId }}
        payload={payload}
      />
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  it("renders business error", () => {
    const payload: RendererError = {
      key: uuidv4(),
      error: serializeError(new BusinessError("test error")),
      runId: uuidv4(),
      extensionId,
    };

    const result = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ extensionId, blueprintId }}
        payload={payload}
      />
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  it("renders cancellation", () => {
    const payload: RendererError = {
      key: uuidv4(),
      error: serializeError(new CancelError("test error")),
      runId: uuidv4(),
      extensionId,
    };

    const result = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ extensionId, blueprintId }}
        payload={payload}
      />
    );

    expect(result.asFragment()).toMatchSnapshot();
  });

  it("renders html brick", async () => {
    const payload: RendererPayload = {
      key: uuidv4(),
      runId: uuidv4(),
      extensionId,
      blockId: validateRegistryId("@pixiebrix/html"),
      args: {
        html: "<h1>Test</h1>",
      },
      ctxt: {},
    };

    const result = render(
      <PanelBody
        isRootPanel
        onAction={jest.fn()}
        context={{ extensionId, blueprintId }}
        payload={payload}
      />
    );

    await waitForEffect();

    // There's a shadow root in BodyContainer, so the snapshot cuts off at the div
    expect(result.asFragment()).toMatchSnapshot();
  });
});
