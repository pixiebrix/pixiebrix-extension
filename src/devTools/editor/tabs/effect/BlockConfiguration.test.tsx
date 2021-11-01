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
import { blockFactory, triggerFormStateFactory } from "@/tests/factories";
import blockRegistry from "@/blocks/registry";
import { echoBlock } from "@/runtime/pipelineTests/pipelineTestHelpers";
import { render } from "@testing-library/react";
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
  const block = blockFactory(echoBlock);
  blockRegistry.register(block);
  const initialState = triggerFormStateFactory({}, { id: block.id });
  const FormikTemplate = createFormikTemplate(initialState);
  const rendered = render(
    <FormikTemplate>
      <BlockConfiguration name="testBlockConfiguration" blockId={block.id} />
    </FormikTemplate>
  );

  await waitForEffect();

  expect(rendered.asFragment()).toMatchSnapshot();
});
