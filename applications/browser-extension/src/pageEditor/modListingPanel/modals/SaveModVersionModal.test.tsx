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
import useSaveMod from "@/pageEditor/hooks/useSaveMod";
import SaveModVersionModal from "@/pageEditor/modListingPanel/modals/SaveModVersionModal";
import AsyncButton from "@/components/AsyncButton";
import {
  type EditablePackageMetadata,
  type PackageUpsertResponse,
} from "@/types/contract";
import {
  registryIdFactory,
  timestampFactory,
} from "@/testUtils/factories/stringFactories";
import { createPrivateSharing } from "@/utils/registryUtils";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { appApiMock } from "@/testUtils/appApiMock";
import { editablePackageMetadataFactory } from "@/testUtils/factories/registryFactories";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { normalizeSemVerString } from "@/types/semVerHelpers";
import modDefinitionRegistry from "@/modDefinitions/registry";
import { API_PATHS } from "@/data/service/urlPaths";
import { render } from "@/pageEditor/testHelpers";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import notify from "@/utils/notify";
import type { components } from "@/types/swagger";
import { loadBrickYaml } from "@/runtime/brickYaml";
import { propertiesToSchema } from "@/utils/schemaUtils";

jest.mock("@/utils/notify");

beforeEach(() => {
  jest.clearAllMocks();
});

const modId = registryIdFactory();

const Wrapper: React.VFC = () => {
  const saveMod = useSaveMod();
  return (
    <div>
      <SaveModVersionModal />
      <AsyncButton
        onClick={async () => {
          await saveMod(modId);
        }}
      >
        Save Mod
      </AsyncButton>
    </div>
  );
};

function packageUpsertResponseFactory(
  editablePackage: EditablePackageMetadata,
): PackageUpsertResponse {
  return {
    ...editablePackage,
    ...createPrivateSharing(),
    updated_at: timestampFactory(),
    // OK to pass empty string because it's not relevant to the tests
    config: "",
  };
}

function setupModDefinitionMocks(
  definitionOverrides: Partial<ModDefinition> = {},
) {
  appApiMock.reset();

  const editablePackage = editablePackageMetadataFactory({
    name: modId,
  });

  const modDefinition = defaultModDefinitionFactory({
    metadata: {
      id: editablePackage.name,
      name: editablePackage.verbose_name!,
      version: normalizeSemVerString(editablePackage.version!),
    },
    ...definitionOverrides,
  });

  // Register directly in modDefinitionRegistry because background call to sync with the bricks registry endpoint is mocked
  modDefinitionRegistry.register([
    {
      id: modId,
      ...modDefinition,
    },
  ]);

  appApiMock.onGet(API_PATHS.BRICKS).reply(200, [editablePackage]);

  appApiMock
    .onPut(API_PATHS.BRICK(editablePackage.id))
    .reply(200, packageUpsertResponseFactory(editablePackage));

  return {
    modDefinition,
  };
}

async function fillMessageAndSave(message = "Test message") {
  await userEvent.click(
    await screen.findByRole("button", { name: "Save Mod" }),
  );
  await expect(screen.findByRole("dialog")).resolves.toBeInTheDocument();
  await userEvent.type(
    await screen.findByRole("textbox", { name: "Message" }),
    message,
  );
  await userEvent.click(await screen.findByRole("button", { name: "Save" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
}

describe("SaveModVersionModal", () => {
  it("requires message", async () => {
    const { modDefinition } = setupModDefinitionMocks();

    render(<Wrapper />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await userEvent.click(
      await screen.findByRole("button", { name: "Save Mod" }),
    );

    await expect(screen.findByRole("dialog")).resolves.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves with no dirty changes", async () => {
    const { modDefinition } = setupModDefinitionMocks();

    render(<Wrapper />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
      },
    });

    await fillMessageAndSave();

    expect(notify.error).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith({ message: "Saved mod" });
  });

  it("preserves original options if no dirty options", async () => {
    const { modDefinition } = setupModDefinitionMocks({
      options: {
        schema: {
          type: "object",
          properties: {
            test: {
              type: "string",
            },
          },
        },
      },
    });

    render(<Wrapper />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );

        dispatch(editorActions.setActiveModId(modId));
      },
    });

    await fillMessageAndSave();

    // Assert error first to assist with debugging failures
    expect(notify.success).toHaveBeenCalledWith({ message: "Saved mod" });

    const yamlConfig = (
      JSON.parse(
        appApiMock.history.put[0]!.data,
      ) as components["schemas"]["Package"]
    ).config;

    expect((loadBrickYaml(yamlConfig) as ModDefinition).options).toStrictEqual({
      schema: {
        type: "object",
        properties: {
          test: {
            type: "string",
          },
        },
      },
    });
  });

  it("saves dirty options", async () => {
    const { modDefinition } = setupModDefinitionMocks();

    render(<Wrapper />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.setActiveModId(modId));
        dispatch(
          editorActions.editModOptionsDefinition({
            schema: {
              type: "object",
              properties: {
                test: {
                  type: "string",
                },
              },
            },
          }),
        );
      },
    });

    await fillMessageAndSave();

    // Assert error first to assist with debugging failures
    expect(notify.error).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith({ message: "Saved mod" });

    const yamlConfig = (
      JSON.parse(
        appApiMock.history.put[0]!.data,
      ) as components["schemas"]["Package"]
    ).config;

    expect((loadBrickYaml(yamlConfig) as ModDefinition).options).toStrictEqual({
      schema: {
        type: "object",
        properties: {
          test: {
            type: "string",
          },
        },
      },
      uiSchema: {
        "ui:order": ["test", "*"],
      },
    });
  });

  it("saves dirty mod variable definitions", async () => {
    const { modDefinition } = setupModDefinitionMocks();

    render(<Wrapper />, {
      setupRedux(dispatch) {
        dispatch(
          modComponentSlice.actions.activateMod({
            modDefinition,
            screen: "pageEditor",
            isReactivate: false,
          }),
        );
        dispatch(editorActions.setActiveModId(modId));
        dispatch(
          editorActions.editModVariablesDefinition({
            schema: propertiesToSchema(
              { modVariableName: { type: "string" } },
              [],
            ),
          }),
        );
      },
    });

    await fillMessageAndSave();

    const yamlConfig = (
      JSON.parse(
        appApiMock.history.put[0]!.data,
      ) as components["schemas"]["Package"]
    ).config;

    expect(
      (loadBrickYaml(yamlConfig) as ModDefinition).variables,
    ).toStrictEqual({
      schema: {
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        type: "object",
        properties: {
          modVariableName: {
            type: "string",
          },
        },
        required: [],
      },
    });
  });
});
