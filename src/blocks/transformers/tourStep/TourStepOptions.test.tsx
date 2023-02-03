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

import { menuItemFormStateFactory } from "@/testUtils/factories";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import { render } from "@/options/testHelpers";
// eslint-disable-next-line no-restricted-imports -- Formik just needed as wrapper
import { Formik } from "formik";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import React from "react";
import { createNewBlock } from "@/pageEditor/exampleBlockConfigs";
import TourStep from "@/blocks/transformers/tourStep/tourStep";
import TourStepOptions from "@/blocks/transformers/tourStep/TourStepOptions";
import { waitForEffect } from "@/testUtils/testHelpers";

function makeBaseState() {
  // Extension type doesn't really matter here...
  const baseFormState = menuItemFormStateFactory();
  baseFormState.extension.blockPipeline = [createNewBlock(TourStep.BLOCK_ID)];
  return baseFormState;
}

function renderOptions(formState: FormState = makeBaseState()) {
  return render(
    <Formik onSubmit={jest.fn()} initialValues={formState}>
      <TourStepOptions name="extension.blockPipeline.0" configKey="config" />
    </Formik>
  );
}

beforeAll(() => {
  registerDefaultWidgets();
});

describe("TourStepOptions", () => {
  it("should render example config", async () => {
    const output = renderOptions(makeBaseState());
    await waitForEffect();
    expect(output.asFragment()).toMatchSnapshot();
  });
});
