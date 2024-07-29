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

import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { render } from "@/pageEditor/testHelpers";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import React from "react";
import EditorNodeConfigPanel from "@/pageEditor/tabs/editTab/editorNodeConfigPanel/EditorNodeConfigPanel";
import brickRegistry from "@/bricks/registry";
import IdentityTransformer from "@/bricks/transformers/IdentityTransformer";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import userEvent from "@testing-library/user-event";
import { screen, act } from "@testing-library/react";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";

beforeAll(() => {
  registerDefaultWidgets();
  brickRegistry.register([new IdentityTransformer()]);
});

describe("OutputVariableField", () => {
  it("renames the output variable", async () => {
    const user = userEvent.setup();

    const formState = formStateFactory({
      brickPipeline: [
        {
          id: IdentityTransformer.BRICK_ID,
          instanceId: autoUUIDSequence(),
          outputKey: validateOutputKey("output"),
          config: {},
        },
      ],
    });

    const { getFormState } = render(<EditorNodeConfigPanel />, {
      initialValues: formState,
      setupRedux(dispatch) {
        dispatch(actions.addModComponentFormState(formState));
        dispatch(actions.setActiveModComponentId(formState.uuid));
        dispatch(
          actions.setActiveNodeId(
            formState.modComponent.brickPipeline[0]!.instanceId!,
          ),
        );
      },
    });

    // Assert initial value to verify test setup
    expect(getFormState()!.modComponent.brickPipeline[0].outputKey).toBe(
      validateOutputKey("output"),
    );

    await act(async () => {
      await user.dblClick(screen.getByLabelText("Output Variable"));
      await user.type(
        screen.getByLabelText("Output Variable"),
        "{backspace}newOutput",
        {
          // Already double-clicked to select all text
          skipClick: true,
        },
      );
    });

    expect(screen.getByLabelText("Output Variable")).toHaveValue("newOutput");

    expect(getFormState()!.modComponent.brickPipeline[0].outputKey).toBe(
      validateOutputKey("newOutput"),
    );

    await user.clear(screen.getByLabelText("Output Variable"));

    expect(
      getFormState()!.modComponent.brickPipeline[0].outputKey,
    ).toBeUndefined();
  });
});
