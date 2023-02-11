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

import { getFormDefinition } from "@/contentScript/messenger/api";
import { render } from "@testing-library/react";
import React from "react";
import EphemeralForm from "@/blocks/transformers/ephemeralForm/EphemeralForm";
import { waitForEffect } from "@/testUtils/testHelpers";

jest.mock("@/contentScript/messenger/api", () => ({
  getFormDefinition: jest.fn(),
}));

const getFormDefinitionMock = getFormDefinition as jest.MockedFunction<
  typeof getFormDefinition
>;

describe("EphemeralForm", () => {
  it("shows field titles", async () => {
    getFormDefinitionMock.mockResolvedValue({
      schema: {
        title: "Test Form",
        type: "object",
        properties: {
          foo: {
            type: "string",
          },
        },
      },
      uiSchema: {},
      cancelable: false,
      submitCaption: "Submit",
    });

    const result = render(<EphemeralForm />);

    await waitForEffect();

    // https://github.com/pixiebrix/pixiebrix-extension/pull/4913#issuecomment-1400379452
    expect(result.queryByLabelText("foo")).not.toBeNull();
    expect(result).toMatchSnapshot();
  });

  it("supports markdown in field descriptions", async () => {
    getFormDefinitionMock.mockResolvedValue({
      schema: {
        title: "Test Form",
        type: "object",
        properties: {
          foo: {
            title: "Foo",
            type: "string",
            description: "I am **bold**",
          },
        },
      },
      uiSchema: {},
      cancelable: false,
      submitCaption: "Submit",
    });

    const result = render(<EphemeralForm />);

    await waitForEffect();

    // https://github.com/pixiebrix/pixiebrix-extension/pull/4913#issuecomment-1400379452
    expect(result).toMatchSnapshot();
    expect(result.container.querySelector("b")).not.toBeNull();
  });

  it("supports markdown in form description", async () => {
    getFormDefinitionMock.mockResolvedValue({
      schema: {
        title: "Test Form",
        description: "I am **bold**",
        type: "object",
        properties: {},
      },
      uiSchema: {},
      cancelable: false,
      submitCaption: "Submit",
    });

    const result = render(<EphemeralForm />);

    await waitForEffect();

    // https://github.com/pixiebrix/pixiebrix-extension/pull/4913#issuecomment-1400379452
    expect(result).toMatchSnapshot();
    expect(result.container.querySelector("b")).not.toBeNull();
  });
});
