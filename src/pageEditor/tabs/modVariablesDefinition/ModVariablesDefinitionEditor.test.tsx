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
import ModVariablesDefinitionEditor from "@/pageEditor/tabs/modVariablesDefinition/ModVariablesDefinitionEditor";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { actions as modComponentsActions } from "@/store/modComponents/modComponentSlice";
import { screen, waitFor } from "@testing-library/react";
import { modInstanceFactory } from "@/testUtils/factories/modInstanceFactories";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { mapModInstanceToActivatedModComponents } from "@/store/modComponents/modInstanceUtils";
import AssignModVariable from "@/bricks/effects/assignModVariable";
import { uuidv4 } from "@/types/helpers";
import brickRegistry from "@/bricks/registry";

beforeEach(() => {
  brickRegistry.register([new AssignModVariable()]);
});

describe("ModVariablesDefinitionEditor", () => {
  it("renders no variables", () => {
    render(<ModVariablesDefinitionEditor />, {
      setupRedux(dispatch) {
        const formState = formStateFactory();
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata.id));
      },
    });
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

    await waitFor(() => {
      expect(
        screen.getByRole("cell", { name: "declaredAny" }),
      ).toBeInTheDocument();
    });
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

    await waitFor(() => {
      expect(
        screen.getByRole("cell", { name: "inferredAny" }),
      ).toBeInTheDocument();
    });
  });
});
