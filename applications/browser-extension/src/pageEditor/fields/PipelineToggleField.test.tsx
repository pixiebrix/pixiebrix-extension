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
import { render } from "@/pageEditor/testHelpers";
import PipelineToggleField from "@/pageEditor/fields/PipelineToggleField";
import userEvent from "@testing-library/user-event";

import { toExpression } from "@/utils/expressionUtils";

describe("PipelineToggleField", () => {
  it("toggles formik state", async () => {
    const { getFormState } = render(
      <PipelineToggleField
        name="test"
        label="Pipeline Field"
        description="Test pipeline field"
      />,
      {
        initialValues: {
          test: null,
        },
      },
    );

    // eslint-disable-next-line testing-library/no-node-access -- screen doesn't have class selector
    await userEvent.click(document.querySelector(".btn")!);

    expect(getFormState()!.test).toStrictEqual(toExpression("pipeline", []));

    // eslint-disable-next-line testing-library/no-node-access -- screen doesn't have class selector
    await userEvent.click(document.querySelector(".btn")!);

    expect(getFormState()!.test).toBeNull();
  });

  it("can start toggled", async () => {
    const { getFormState } = render(
      <PipelineToggleField
        name="test"
        label="Pipeline Field"
        description="Test pipeline field"
      />,
      {
        initialValues: {
          test: toExpression("pipeline", []),
        },
      },
    );

    // eslint-disable-next-line testing-library/no-node-access -- screen doesn't have class selector
    await userEvent.click(document.querySelector(".btn")!);

    expect(getFormState()!.test).toBeNull();

    // eslint-disable-next-line testing-library/no-node-access -- screen doesn't have class selector
    await userEvent.click(document.querySelector(".btn")!);

    expect(getFormState()!.test).toStrictEqual(toExpression("pipeline", []));
  });
});
