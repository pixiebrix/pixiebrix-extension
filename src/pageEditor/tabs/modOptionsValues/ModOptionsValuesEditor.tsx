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
  selectDirtyOptionValuesForModId,
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
import { collectModOptions } from "@/store/extensionsUtils";
import useAsyncModOptionsValidationSchema from "@/hooks/useAsyncModOptionsValidationSchema";
import Effect from "@/components/Effect";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { DEFAULT_RUNTIME_API_VERSION } from "@/runtime/apiVersionOptions";
import ModIntegrationsContext from "@/mods/ModIntegrationsContext";
import { emptyModOptionsDefinitionFactory } from "@/utils/modUtils";
import { uniqBy } from "lodash";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/selectGetCleanComponentsAndDirtyFormStatesForMod";

const OPTIONS_FIELD_RUNTIME_CONTEXT: RuntimeContext = {
  apiVersion: DEFAULT_RUNTIME_API_VERSION,
  allowExpressions: false,
};

const NoModOptions: React.FC = () => (
  <div>This mod does not require any configuration</div>
);

const ModOptionsValuesContent: React.FC = () => {
  const dispatch = useDispatch();
  const activeModId = useSelector(selectActiveModId);

  const {
    data: mod,
    isFetching: isFetchingMod,
    error: modError,
  } = useOptionalModDefinition(activeModId);
  const dirtyModOptions = useSelector(
    selectDirtyOptionsDefinitionsForModId(activeModId),
  );
  const modifiedOptionValues = useSelector(
    selectDirtyOptionValuesForModId(activeModId),
  );
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );
  const { cleanModComponents, dirtyModComponentFormStates } =
    getCleanComponentsAndDirtyFormStatesForMod(activeModId);

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
    () =>
      modifiedOptionValues ??
      collectModOptions([
        ...cleanModComponents,
        ...dirtyModComponentFormStates,
      ]),
    [cleanModComponents, dirtyModComponentFormStates, modifiedOptionValues],
  );

  const integrationDependencies = useMemo(
    () =>
      uniqBy(
        [...cleanModComponents, ...dirtyModComponentFormStates].flatMap(
          ({ integrationDependencies }) => integrationDependencies ?? [],
        ),
        ({ integrationId }) => integrationId,
      ),
    [cleanModComponents, dirtyModComponentFormStates],
  );

  const updateRedux = useCallback(
    (options: OptionsArgs) => {
      dispatch(actions.editModOptionsValues(options));
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

const ModOptionsValuesEditor: React.FC = () => (
  <Container fluid className="pt-3">
    <ModOptionsValuesContent />
  </Container>
);

export default ModOptionsValuesEditor;
