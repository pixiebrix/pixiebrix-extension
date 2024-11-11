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
import ModVersionHistory from "@/pageEditor/tabs/modVersionHistory/ModVersionHistory";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { screen, waitFor } from "@testing-library/react";
import { appApiMock } from "@/testUtils/appApiMock";
import { API_PATHS } from "@/data/service/urlPaths";
import {
  editablePackageMetadataFactory,
  packageVersionDeprecatedFactory,
} from "@/testUtils/factories/registryFactories";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import type { UnknownRecord } from "type-fest";
import { createNewUnsavedModMetadata } from "@/utils/modUtils";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";

beforeEach(() => {
  appApiMock.resetHistory();
});

describe("ModVersionHistory", () => {
  it("renders table if version exists", async () => {
    const formState = formStateFactory({
      formStateConfig: {
        modMetadata: modMetadataFactory({
          // Default factory returns an unsaved mod id
          id: registryIdFactory(),
        }),
      },
    });

    const editablePackageMetadata = editablePackageMetadataFactory({
      name: formState.modMetadata.id,
    });

    appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackageMetadata]);

    appApiMock
      .onGet(API_PATHS.BRICK_VERSIONS(editablePackageMetadata.id))
      .reply(200, [
        packageVersionDeprecatedFactory({
          id: editablePackageMetadata.id,
          version: editablePackageMetadata.version,
          config: modDefinitionFactory({
            metadata: metadataFactory({ id: formState.modMetadata.id }),
          }) as unknown as UnknownRecord,
        }),
      ]);

    render(<ModVersionHistory />, {
      setupRedux(dispatch) {
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata.id));
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText(editablePackageMetadata.version!),
      ).toBeInTheDocument();
    });
  });

  it("renders message if mod is unsaved", async () => {
    render(<ModVersionHistory />, {
      setupRedux(dispatch) {
        const formState = formStateFactory({
          formStateConfig: {
            modMetadata: createNewUnsavedModMetadata({ modName: "Test Mod" }),
          },
        });
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata.id));
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Version History unavailable for unsaved mods"),
      ).toBeInTheDocument();
    });

    expect(appApiMock.history.get).toHaveLength(0);
  });

  it("renders message if user doesn't have write access to the mod", async () => {
    // No editable packages/versions
    appApiMock.onGet().reply(200, []);

    render(<ModVersionHistory />, {
      setupRedux(dispatch) {
        const formState = formStateFactory({
          formStateConfig: {
            modMetadata: modMetadataFactory({
              // Default factory returns an unsaved mod id
              id: registryIdFactory(),
            }),
          },
        });
        dispatch(editorActions.addModComponentFormState(formState));
        dispatch(editorActions.setActiveModId(formState.modMetadata.id));
      },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Version History requires mod write permission"),
      ).toBeInTheDocument();
    });

    // Only the call to editable packages
    expect(appApiMock.history.get).toHaveLength(1);
  });
});
