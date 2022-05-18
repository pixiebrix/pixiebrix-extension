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

import React from "react";
import BlockConfiguration from "./BlockConfiguration";
import { createFormikTemplate } from "@/testUtils/formHelpers";
import {
  blockFactory,
  formStateFactory,
  triggerFormStateFactory,
} from "@/testUtils/factories";
import blockRegistry from "@/blocks/registry";
import { echoBlock } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { render, screen } from "@testing-library/react";
import { waitForEffect } from "@/testUtils/testHelpers";
import { propertiesToSchema } from "@/validators/generic";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { RegistryId } from "@/core";
import { MarketplaceListing } from "@/types/contract";

jest.mock("@/services/api", () => ({
  useGetMarketplaceListingsQuery: () => ({
    data: {} as Record<RegistryId, MarketplaceListing>,
  }),
}));

beforeAll(() => {
  registerDefaultWidgets();
  // Precaution
  blockRegistry.clear();
});

afterEach(() => {
  // Being nice to other tests
  blockRegistry.clear();
});

test("renders", async () => {
  const block = echoBlock;
  blockRegistry.register(block);
  const initialState = formStateFactory({ apiVersion: "v3" }, { id: block.id });
  const FormikTemplate = createFormikTemplate(initialState);
  const rendered = render(
    <FormikTemplate>
      <BlockConfiguration
        name="extension.blockPipeline[0]"
        blockId={block.id}
      />
    </FormikTemplate>
  );

  await waitForEffect();

  expect(rendered.asFragment()).toMatchSnapshot();
});

test("shows root mode for trigger", async () => {
  const block = echoBlock;
  blockRegistry.register(block);
  const initialState = triggerFormStateFactory(
    { apiVersion: "v3" },
    { id: block.id }
  );
  const FormikTemplate = createFormikTemplate(initialState);
  render(
    <FormikTemplate>
      <BlockConfiguration
        name="extension.blockPipeline[0]"
        blockId={block.id}
      />
    </FormikTemplate>
  );

  await waitForEffect();

  const rootModeSelect = screen.getByLabelText("Root Mode");

  expect(rootModeSelect).not.toBeNull();
});

test.each`
  blockName      | propertyName   | expected | readableExpected
  ${"reader"}    | ${"read"}      | ${true}  | ${"should"}
  ${"effect"}    | ${"effect"}    | ${true}  | ${"should"}
  ${"transform"} | ${"transform"} | ${true}  | ${"should"}
  ${"renderer"}  | ${"render"}    | ${false} | ${"should not"}
`(
  "$readableExpected show Condition and Target settings for $blockName",
  async ({ propertyName, expected }) => {
    const block = blockFactory({
      [propertyName]: jest.fn(),
      inputSchema: propertiesToSchema({
        message: {
          type: "string",
        },
      }),
    });

    blockRegistry.register(block);
    const initialState = triggerFormStateFactory(
      { apiVersion: "v3" },
      { id: block.id }
    );
    const FormikTemplate = createFormikTemplate(initialState);
    render(
      <FormikTemplate>
        <BlockConfiguration
          name="extension.blockPipeline[0]"
          blockId={block.id}
        />
      </FormikTemplate>
    );

    await waitForEffect();

    const conditionInput = screen.queryByLabelText("Condition");
    const targetInput = screen.queryByLabelText("Target");

    if (expected) {
      expect(conditionInput).not.toBeNull();
      expect(targetInput).not.toBeNull();
    } else {
      expect(conditionInput).toBeNull();
      expect(targetInput).toBeNull();
    }
  }
);
