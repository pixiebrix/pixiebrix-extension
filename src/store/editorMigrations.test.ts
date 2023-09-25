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

import {
  migrateEditorStateV1,
  type PersistedEditorStateV1,
  type PersistedEditorStateV2,
} from "@/store/editorMigrations";
import { initialState } from "@/pageEditor/slices/editorSlice";
import { mapValues, omit } from "lodash";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import {
  type IntegrationDependencyV1,
  type IntegrationDependencyV2,
} from "@/types/integrationTypes";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { validateRegistryId } from "@/types/helpers";
import {
  type BaseFormStateV1,
  type BaseFormStateV2,
} from "@/pageEditor/baseFormStateTypes";

const initialStateV1: PersistedEditorStateV1 = {
  ...omit(initialState, "elements", "deletedElementsByRecipeId"),
  elements: [],
  deletedElementsByRecipeId: {},
  _persist: {
    version: 1,
    rehydrated: false,
  },
};
const initialStateV2: PersistedEditorStateV2 = {
  ...initialState,
  // Function under test does not handle updating the persistence, this is handled by redux-persist
  _persist: {
    version: 1,
    rehydrated: false,
  },
};

describe("migrateEditorStateV1", () => {
  it("migrates empty state", () => {
    expect(migrateEditorStateV1(initialStateV1)).toStrictEqual(initialStateV2);
  });

  function unmigrateServices(
    integrationDependencies: IntegrationDependencyV2[] = []
  ): IntegrationDependencyV1[] {
    return integrationDependencies.map(
      ({ integrationId, outputKey, configId, isOptional, apiVersion }) => ({
        id: integrationId,
        outputKey,
        config: configId,
        isOptional,
        apiVersion,
      })
    );
  }

  function unmigrateFormState(formState: BaseFormStateV2): BaseFormStateV1 {
    return {
      ...omit(formState, "integrationDependencies"),
      services: unmigrateServices(formState.integrationDependencies),
    };
  }

  function unmigrateDeletedElements(
    deletedElements: Record<string, BaseFormStateV2[]>
  ): Record<string, BaseFormStateV1[]> {
    return mapValues(deletedElements, (formStates) =>
      formStates.map((formState) => unmigrateFormState(formState))
    );
  }

  function unmigrateEditorState(
    state: PersistedEditorStateV2
  ): PersistedEditorStateV1 {
    return {
      ...omit(state, "elements", "deletedElementsByRecipeId"),
      elements: state.elements.map((element) => unmigrateFormState(element)),
      deletedElementsByRecipeId: unmigrateDeletedElements(
        state.deletedElementsByRecipeId
      ),
    };
  }

  it("migrates state with elements with no services", () => {
    const expectedState = {
      ...initialStateV2,
      elements: [formStateFactory(), formStateFactory()],
    };
    const unmigrated = unmigrateEditorState(expectedState);
    expect(migrateEditorStateV1(unmigrated)).toStrictEqual(expectedState);
  });

  it("migrates state with elements with services and deleted elements", () => {
    const fooElement1 = formStateFactory({
      recipe: modMetadataFactory({
        id: validateRegistryId("foo"),
      }),
      integrationDependencies: [
        integrationDependencyFactory({
          configId: uuidSequence,
        }),
        integrationDependencyFactory({
          configId: uuidSequence,
        }),
      ],
    });
    const fooElement2 = formStateFactory({
      recipe: modMetadataFactory({
        id: validateRegistryId("foo"),
      }),
      integrationDependencies: [
        integrationDependencyFactory({
          configId: uuidSequence,
        }),
        integrationDependencyFactory({
          configId: uuidSequence,
        }),
      ],
    });
    const barElement = formStateFactory({
      recipe: modMetadataFactory({
        id: validateRegistryId("bar"),
      }),
      integrationDependencies: [
        integrationDependencyFactory({
          configId: uuidSequence,
        }),
        integrationDependencyFactory({
          configId: uuidSequence,
        }),
      ],
    });
    const expectedState = {
      ...initialStateV2,
      elements: [
        formStateFactory({
          integrationDependencies: [
            integrationDependencyFactory({
              configId: uuidSequence,
            }),
          ],
        }),
        fooElement1,
        fooElement2,
        barElement,
      ],
      deletedElementsByRecipeId: {
        foo: [fooElement1, fooElement2],
        bar: [barElement],
      },
    };
    const unmigrated = unmigrateEditorState(expectedState);
    expect(migrateEditorStateV1(unmigrated)).toStrictEqual(expectedState);
  });
});
