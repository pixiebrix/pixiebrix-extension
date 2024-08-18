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

import { render } from "@/pageEditor/testHelpers";
import React from "react";
import ModMetadataEditor from "@/pageEditor/tabs/modMetadata/ModMetadataEditor";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import {
  activatedModComponentFactory,
  modMetadataFactory,
} from "@/testUtils/factories/modComponentFactories";
import { type ModMetadata } from "@/types/modComponentTypes";
import { screen } from "@testing-library/react";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { waitForEffect } from "@/testUtils/testHelpers";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { type SemVerString } from "@/types/registryTypes";

// :shrug: ideally would mock the definitions returned from the server. But that's more complicated than it's worth,
// because you can't just mock the /api/registry/bricks/ endpoint due to the way our tests mock the background worker
jest.mock("@/modDefinitions/modDefinitionHooks");

const useOptionalModDefinitionMock = jest.mocked(useOptionalModDefinition);

beforeEach(() => {
  useOptionalModDefinitionMock.mockReset();
});

describe("ModMetadataEditor", () => {
  it("should render latest version", async () => {
    const modMetadata: ModMetadata = modMetadataFactory();
    const formState = formStateFactory({ formStateConfig: { modMetadata } });

    const modComponent = activatedModComponentFactory({
      _recipe: modMetadata,
    });

    useOptionalModDefinitionMock.mockReturnValue(
      valueToAsyncState(modDefinitionFactory({ metadata: modMetadata })),
    );

    render(<ModMetadataEditor />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.UNSAFE_setModComponents([modComponent]),
        );
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata!.id));
      },
    });

    await waitForEffect();

    expect(screen.getByLabelText("Name")).toHaveValue(modMetadata.name);
    expect(screen.getByLabelText("Version")).toHaveValue(modMetadata.version);
  });

  it("should render if newer version", async () => {
    const modMetadata: ModMetadata = modMetadataFactory();

    const formState = formStateFactory({ formStateConfig: { modMetadata } });

    const modComponent = activatedModComponentFactory({
      _recipe: modMetadata,
    });

    useOptionalModDefinitionMock.mockReturnValue(
      valueToAsyncState(
        modDefinitionFactory({
          metadata: {
            ...modMetadata,
            version: "999.999.999" as SemVerString,
          },
        }),
      ),
    );

    render(<ModMetadataEditor />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.UNSAFE_setModComponents([modComponent]),
        );
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata!.id));
      },
    });

    expect(screen.getByText("re-activate the mod")).toBeInTheDocument();
    // Should be the version of the activated mod component, not the latest version
    expect(screen.getByLabelText("Version")).toHaveValue(modMetadata.version);
  });
});
