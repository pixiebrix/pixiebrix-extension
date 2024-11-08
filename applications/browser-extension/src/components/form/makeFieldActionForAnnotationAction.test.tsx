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
import { triggerFormStateFactory } from "../../testUtils/factories/pageEditorFactories";
import { ContextBrick } from "../../runtime/pipelineTests/testHelpers";
import { toExpression } from "../../utils/expressionUtils";
import { validateOutputKey } from "../../runtime/runtimeTypes";
import { makeFieldActionForAnnotationAction } from "./makeFieldActionForAnnotationAction";
import { render } from "../../pageEditor/testHelpers";
import { useFormikContext } from "formik";
import { AnalysisAnnotationActionType } from "@/analysis/analysisTypes";
import AsyncButton from "../AsyncButton";
import { screen, act } from "@testing-library/react";

describe("makeFieldActionForAnnotationAction", () => {
  it("unsets field value", async () => {
    const expectedCaption = "Unset Value";

    const formState = triggerFormStateFactory(undefined, [
      {
        id: ContextBrick.BRICK_ID,
        config: {},
        if: toExpression("nunjucks", " "),
        outputKey: validateOutputKey("foo"),
      },
    ]);

    const TestComponent = () => {
      const formik = useFormikContext();

      const { caption, action } = makeFieldActionForAnnotationAction(
        {
          caption: expectedCaption,
          type: AnalysisAnnotationActionType.UnsetValue,
          path: "modComponent.brickPipeline.0.if",
        },
        formik,
      );

      return (
        <AsyncButton
          onClick={async () => {
            await action();
          }}
        >
          {caption}
        </AsyncButton>
      );
    };

    const { getFormState } = render(<TestComponent />, {
      initialValues: formState,
    });

    expect(getFormState()!.modComponent.brickPipeline[0].if).toBeDefined();

    await act(async () => {
      screen.getByRole("button", { name: expectedCaption }).click();
    });

    expect(getFormState()!.modComponent.brickPipeline[0].if).toBeUndefined();
  });
});
