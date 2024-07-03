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
import FormModalOptions from "@/pageEditor/fields/FormModalOptions";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { createNewConfiguredBrick } from "@/pageEditor/exampleBrickConfigs";
import { FormTransformer } from "@/bricks/transformers/ephemeralForm/formTransformer";
import { screen } from "@testing-library/react";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import {
  baseModComponentStateFactory,
  formStateFactory,
} from "@/testUtils/factories/pageEditorFactories";

beforeAll(() => {
  registerDefaultWidgets();
});

describe("FormModalOptions", () => {
  it("renders default values without crashing", async () => {
    const brick = createNewConfiguredBrick(FormTransformer.BRICK_ID);

    const initialValues = formStateFactory({
      modComponent: baseModComponentStateFactory({
        brickPipeline: [brick],
      }),
    });

    render(
      <FormModalOptions
        name="modComponent.brickPipeline.0"
        configKey="config"
      />,
      {
        initialValues,
        setupRedux(dispatch) {
          dispatch(editorActions.addModComponentFormState(initialValues));
          dispatch(editorActions.setActiveModComponentId(initialValues.uuid));
          dispatch(editorActions.setActiveNodeId(brick.instanceId));
        },
      },
    );

    expect(screen.getByDisplayValue("Example Field")).toBeInTheDocument();
  });
});
