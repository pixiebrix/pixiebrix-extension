/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { createFormikTemplate } from "@/tests/formHelpers";
import { formStateFactory, triggerFormStateFactory } from "@/tests/factories";
import blockRegistry from "@/blocks/registry";
import { echoBlock } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { render, screen } from "@testing-library/react";
import { waitForEffect } from "@/tests/testHelpers";

beforeAll(() => {
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
  const initialState = formStateFactory({}, { id: block.id });
  const FormikTemplate = createFormikTemplate(initialState);
  const rendered = render(
    <FormikTemplate>
      <BlockConfiguration name="testBlockConfiguration" blockId={block.id} />
    </FormikTemplate>
  );

  await waitForEffect();

  expect(rendered.asFragment()).toMatchSnapshot();
});

test("shows root mode for trigger", async () => {
  const block = echoBlock;
  blockRegistry.register(block);
  const initialState = triggerFormStateFactory({}, { id: block.id });
  const FormikTemplate = createFormikTemplate(initialState);
  render(
    <FormikTemplate>
      <BlockConfiguration name="testBlockConfiguration" blockId={block.id} />
    </FormikTemplate>
  );

  await waitForEffect();

  const rootModeSelect = screen.getByLabelText("Root Mode");

  expect(rootModeSelect).not.toBeNull();
});
