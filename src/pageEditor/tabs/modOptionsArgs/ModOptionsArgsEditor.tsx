/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import React, { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveModId,
  selectDirtyOptionsArgsForModId,
  selectDirtyOptionsDefinitionForModId,
  selectGetDraftModComponentsForMod,
} from "@/pageEditor/store/editor/editorSelectors";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import genericOptionsFactory, {
  type BrickOptionProps,
} from "@/components/fields/schemaFields/genericOptionsFactory";
import FieldRuntimeContext, {
  type RuntimeContext,
} from "@/components/fields/schemaFields/FieldRuntimeContext";
import { Card, Container } from "react-bootstrap";
import Form from "@/components/form/Form";
import ErrorBoundary from "@/components/ErrorBoundary";
import { collectModOptionsArgs } from "@/store/modComponents/modComponentUtils";
import { getOptionsValidationSchema } from "@/hooks/useAsyncModOptionsValidationSchema";
import Effect from "@/components/Effect";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { DEFAULT_RUNTIME_API_VERSION } from "@/runtime/apiVersionOptions";
import ModIntegrationsContext from "@/mods/ModIntegrationsContext";
import { emptyModOptionsDefinitionFactory } from "@/utils/modUtils";
import { uniqBy } from "lodash";
import { assertNotNullish } from "@/utils/nullishUtils";
import type { RegistryId } from "@/types/registryTypes";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { mergeAsyncState, valueToAsyncState } from "@/utils/asyncStateUtils";
import type {
  ModDefinition,
  ModOptionsDefinition,
} from "@/types/modDefinitionTypes";
import AsyncStateGate from "@/components/AsyncStateGate";
import type { FormikValues } from "formik";

const OPTIONS_FIELD_RUNTIME_CONTEXT: RuntimeContext = {
  apiVersion: DEFAULT_RUNTIME_API_VERSION,
  allowExpressions: false,
};

const NoModOptions: React.FC = () => (
  <div>This mod does not require any configuration</div>
);

function useOptionsFieldGroupQuery(modId: RegistryId) {
  const modDefinitionQuery = useOptionalModDefinition(modId);

  const dirtyModOptionsDefinition = useSelector(
    selectDirtyOptionsDefinitionForModId(modId),
  );

  return useDeriveAsyncState(
    // Map undefined to null because `useDeriveAsyncState` does not support undefined values in isSuccess state
    mergeAsyncState(
      modDefinitionQuery,
      (x: ModDefinition | undefined) => x ?? null,
    ),
    valueToAsyncState(dirtyModOptionsDefinition ?? null),
    async (
      modDefinition: ModDefinition,
      dirtyModOptionsDefinition: ModOptionsDefinition,
    ) => {
      const optionsDefinition =
        dirtyModOptionsDefinition ??
        modDefinition?.options ??
        emptyModOptionsDefinitionFactory();

      return {
        validationSchema: await getOptionsValidationSchema(
          optionsDefinition.schema,
        ),
        OptionsFieldGroup: genericOptionsFactory(
          optionsDefinition.schema,
          optionsDefinition.uiSchema,
          { NoOptionsComponent: NoModOptions },
        ),
      };
    },
  );
}

const ModOptionsArgsContent: React.FC = () => {
  const dispatch = useDispatch();
  const activeModId = useSelector(selectActiveModId);

  assertNotNullish(activeModId, "activeModId is required");

  const getDraftModComponentsForMod = useSelector(
    selectGetDraftModComponentsForMod,
  );
  const draftModComponents = getDraftModComponentsForMod(activeModId);

  const fieldGroupQuery = useOptionsFieldGroupQuery(activeModId);

  const dirtyOptionsArgs = useSelector(
    selectDirtyOptionsArgsForModId(activeModId),
  );

  const integrationDependencies = useMemo(
    () =>
      uniqBy(
        draftModComponents.flatMap(
          ({ integrationDependencies }) => integrationDependencies ?? [],
        ),
        ({ integrationId }) => integrationId,
      ),
    [draftModComponents],
  );

  const updateRedux = useCallback(
    (options: OptionsArgs) => {
      dispatch(actions.editModOptionsArgs(options));
    },
    [dispatch],
  );

  const optionsFieldBody = (OptionsFieldGroup: React.FC<BrickOptionProps>) => {
    // Name local variable so React has a display name
    const renderBody = ({ values }: { values: FormikValues }) => (
      <ModIntegrationsContext.Provider value={{ integrationDependencies }}>
        <Effect values={values} onChange={updateRedux} delayMillis={300} />
        <Card>
          <Card.Header>Mod Input Options</Card.Header>
          <Card.Body>
            <FieldRuntimeContext.Provider value={OPTIONS_FIELD_RUNTIME_CONTEXT}>
              <OptionsFieldGroup name="" />
            </FieldRuntimeContext.Provider>
          </Card.Body>
        </Card>
      </ModIntegrationsContext.Provider>
    );

    return renderBody;
  };

  return (
    <AsyncStateGate state={fieldGroupQuery}>
      {({ data: { validationSchema, OptionsFieldGroup } }) => (
        <Form
          validationSchema={validationSchema}
          initialValues={
            dirtyOptionsArgs ?? collectModOptionsArgs(draftModComponents)
          }
          renderBody={optionsFieldBody(OptionsFieldGroup)}
          onSubmit={() => {
            console.error(
              "The form's submit should not be called to save mod option args, they are automatically synced with redux",
            );
          }}
          renderSubmit={() => null}
        />
      )}
    </AsyncStateGate>
  );
};

const ModOptionsArgsEditor: React.FC = () => (
  <Container fluid className="pt-3">
    <ErrorBoundary>
      <ModOptionsArgsContent />
    </ErrorBoundary>
  </Container>
);

export default ModOptionsArgsEditor;
