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
  selectDirtyOptionsDefinitionsForModId,
  selectDirtyOptionsArgsForModId,
  selectGetDraftModComponentsForMod,
} from "@/pageEditor/store/editor/editorSelectors";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import genericOptionsFactory from "@/components/fields/schemaFields/genericOptionsFactory";
import FieldRuntimeContext, {
  type RuntimeContext,
} from "@/components/fields/schemaFields/FieldRuntimeContext";
import { Card, Container } from "react-bootstrap";
import Form, { type RenderBody } from "@/components/form/Form";
import Loader from "@/components/Loader";
import Alert from "@/components/Alert";
import { getErrorMessage } from "@/errors/errorHelpers";
import ErrorBoundary from "@/components/ErrorBoundary";
import { collectModOptionsArgs } from "@/store/modComponents/modComponentUtils";
import useAsyncModOptionsValidationSchema from "@/hooks/useAsyncModOptionsValidationSchema";
import Effect from "@/components/Effect";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { DEFAULT_RUNTIME_API_VERSION } from "@/runtime/apiVersionOptions";
import ModIntegrationsContext from "@/mods/ModIntegrationsContext";
import { emptyModOptionsDefinitionFactory } from "@/utils/modUtils";
import { uniqBy } from "lodash";
import { assertNotNullish } from "@/utils/nullishUtils";

const OPTIONS_FIELD_RUNTIME_CONTEXT: RuntimeContext = {
  apiVersion: DEFAULT_RUNTIME_API_VERSION,
  allowExpressions: false,
};

const NoModOptions: React.FC = () => (
  <div>This mod does not require any configuration</div>
);

const ModOptionsArgsContent: React.FC = () => {
  const dispatch = useDispatch();
  const activeModId = useSelector(selectActiveModId);

  assertNotNullish(activeModId, "activeModId is required");

  const {
    data: mod,
    isFetching: isFetchingMod,
    error: modError,
  } = useOptionalModDefinition(activeModId);
  const dirtyModOptions = useSelector(
    selectDirtyOptionsDefinitionsForModId(activeModId),
  );
  const modifiedOptionValues = useSelector(
    selectDirtyOptionsArgsForModId(activeModId),
  );
  const getDraftModComponentsForMod = useSelector(
    selectGetDraftModComponentsForMod,
  );
  const draftModComponents = getDraftModComponentsForMod(activeModId);

  const optionsDefinition = useMemo(() => {
    if (dirtyModOptions) {
      return dirtyModOptions;
    }

    return mod?.options ?? emptyModOptionsDefinitionFactory();
  }, [dirtyModOptions, mod?.options]);

  const {
    data: validationSchema,
    isLoading: isLoadingSchema,
    error: schemaError,
  } = useAsyncModOptionsValidationSchema(optionsDefinition?.schema);

  const OptionsFieldGroup = useMemo(
    () =>
      genericOptionsFactory(
        optionsDefinition?.schema,
        optionsDefinition?.uiSchema,
        { NoOptionsComponent: NoModOptions },
      ),
    [optionsDefinition],
  );

  const initialValues = useMemo(
    () => modifiedOptionValues ?? collectModOptionsArgs(draftModComponents),
    [draftModComponents, modifiedOptionValues],
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

  if (isLoadingSchema || isFetchingMod) {
    return <Loader />;
  }

  const error = modError ?? schemaError;
  if (error) {
    console.error(error);
    return <Alert variant="danger">{getErrorMessage(error)}</Alert>;
  }

  const renderBody: RenderBody = ({ values }) => (
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

  return (
    <ErrorBoundary>
      <Form
        validationSchema={validationSchema}
        initialValues={initialValues}
        enableReinitialize
        renderBody={renderBody}
        onSubmit={() => {
          console.error(
            "The form's submit should not be called to save mod option values, they are automatically synced with redux",
          );
        }}
        renderSubmit={() => null}
      />
    </ErrorBoundary>
  );
};

const ModOptionsArgsEditor: React.FC = () => (
  <Container fluid className="pt-3">
    <ModOptionsArgsContent />
  </Container>
);

export default ModOptionsArgsEditor;
