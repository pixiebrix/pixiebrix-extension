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
import { render } from "../../testHelpers";
import ModVariablesDefinitionEditor from "./ModVariablesDefinitionEditor";
import { formStateFactory } from "../../../testUtils/factories/pageEditorFactories";
import { actions as editorActions } from "../../store/editor/editorSlice";
import { actions as modComponentsActions } from "../../../store/modComponents/modComponentSlice";
import { screen } from "@testing-library/react";
import { modInstanceFactory } from "../../../testUtils/factories/modInstanceFactories";
import { modDefinitionFactory } from "../../../testUtils/factories/modDefinitionFactories";
import { mapModInstanceToActivatedModComponents } from "../../../store/modComponents/modInstanceUtils";
import AssignModVariable from "@/bricks/effects/assignModVariable";
import { uuidv4 } from "../../../types/helpers";
import brickRegistry from "@/bricks/registry";
import userEvent from "@testing-library/user-event";
import { waitForEffect } from "../../../testUtils/testHelpers";

beforeEach(() => {
  brickRegistry.register([new AssignModVariable()]);
});

describe("ModVariablesDefinitionEditor", () => {
  it("renders no variables", async () => {
    render(<ModVariablesDefinitionEditor />, {
      setupRedux(dispatch) {
        const formState = formStateFactory();
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata.id));
      },
    });

    await waitForEffect();

    expect(
      screen.getByRole("button", { name: "Add new mod variable" }),
    ).toBeInTheDocument();
  });

  it("renders dirty variables", async () => {
    render(<ModVariablesDefinitionEditor />, {
      setupRedux(dispatch) {
        const formState = formStateFactory();
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata.id));
        dispatch(
          editorActions.editModVariablesDefinition({
            schema: {
              properties: {
                declaredAny: {
                  description: "Test description",
                },
              },
            },
          }),
        );
      },
    });

    await waitForEffect();

    expect(
      screen.getByRole("cell", { name: "declaredAny" }),
    ).toBeInTheDocument();
  });

  it("renders declared variables", async () => {
    render(<ModVariablesDefinitionEditor />, {
      setupRedux(dispatch) {
        const modInstance = modInstanceFactory({
          definition: modDefinitionFactory({
            variables: {
              schema: {
                properties: {
                  declaredAny: {
                    description: "Test description",
                  },
                },
              },
            },
          }),
        });

        const [modComponent] =
          mapModInstanceToActivatedModComponents(modInstance);

        dispatch(modComponentsActions.UNSAFE_setModComponents([modComponent!]));
        dispatch(
          editorActions.setActiveModId(modInstance.definition.metadata.id),
        );
      },
    });

    await waitForEffect();

    expect(
      screen.getByRole("cell", { name: "declaredAny" }),
    ).toBeInTheDocument();
  });

  it("renders inferred variables", async () => {
    render(<ModVariablesDefinitionEditor />, {
      setupRedux(dispatch) {
        const formState = formStateFactory({
          brickPipeline: [
            {
              id: AssignModVariable.BRICK_ID,
              instanceId: uuidv4(),
              config: { variableName: "inferredAny" },
            },
          ],
        });

        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata.id));
      },
    });

    await waitForEffect();

    expect(
      screen.getByRole("cell", { name: "inferredAny" }),
    ).toBeInTheDocument();
  });

  it("add/remove variable", async () => {
    render(<ModVariablesDefinitionEditor />, {
      setupRedux(dispatch) {
        const formState = formStateFactory();
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata.id));
      },
    });

    expect(
      screen.getByText("This mod does use any mod variables"),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Add new mod variable" }),
    );
    expect(screen.getByRole("cell", { name: "newVar" })).toBeInTheDocument();

    expect(
      screen.queryByText("This mod does use any mod variables"),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Remove mod variable" }),
    );
    expect(
      screen.queryByRole("cell", { name: "newVar" }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText("This mod does use any mod variables"),
    ).toBeInTheDocument();
  });
});
