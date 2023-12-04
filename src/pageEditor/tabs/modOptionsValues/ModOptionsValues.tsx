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
  selectActiveRecipeId,
  selectDirtyOptionDefinitionsForRecipeId,
  selectDirtyOptionValuesForRecipeId,
  selectNotDeletedElements,
  selectNotDeletedExtensions,
} from "@/pageEditor/slices/editorSelectors";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import genericOptionsFactory from "@/components/fields/schemaFields/genericOptionsFactory";
import FieldRuntimeContext, {
  type RuntimeContext,
} from "@/components/fields/schemaFields/FieldRuntimeContext";
import { Card, Col, Container, Row } from "react-bootstrap";
import Form, { type RenderBody } from "@/components/form/Form";
import Loader from "@/components/Loader";
import Alert from "@/components/Alert";
import { getErrorMessage } from "@/errors/errorHelpers";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  inferRecipeDependencies,
  inferRecipeOptions,
} from "@/store/extensionsUtils";
import { EMPTY_MOD_OPTIONS_DEFINITION } from "@/pageEditor/tabs/modOptionsDefinitions/ModOptionsDefinitionPane";
import useAsyncRecipeOptionsValidationSchema from "@/hooks/useAsyncRecipeOptionsValidationSchema";
import Effect from "@/components/Effect";
import { actions } from "@/pageEditor/slices/editorSlice";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { DEFAULT_RUNTIME_API_VERSION } from "@/runtime/apiVersionOptions";
import ModIntegrationsContext from "@/mods/ModIntegrationsContext";

const OPTIONS_FIELD_RUNTIME_CONTEXT: RuntimeContext = {
  apiVersion: DEFAULT_RUNTIME_API_VERSION,
  allowExpressions: false,
};

const NoModOptions: React.FC = () => (
  <div>This mod does not require any configuration</div>
);

const ModOptionsValuesContent: React.FC = () => {
  const dispatch = useDispatch();
  const recipeId = useSelector(selectActiveRecipeId);
  const {
    data: recipe,
    isFetching: isLoadingRecipe,
    error: recipeError,
  } = useOptionalModDefinition(recipeId);
  const dirtyRecipeOptions = useSelector(
    selectDirtyOptionDefinitionsForRecipeId(recipeId),
  );
  const modifiedOptionValues = useSelector(
    selectDirtyOptionValuesForRecipeId(recipeId),
  );
  const installedExtensions = useSelector(selectNotDeletedExtensions);
  const dirtyElements = useSelector(selectNotDeletedElements);

  const optionsDefinition = useMemo(() => {
    if (dirtyRecipeOptions) {
      return dirtyRecipeOptions;
    }

    return recipe?.options ?? EMPTY_MOD_OPTIONS_DEFINITION;
  }, [dirtyRecipeOptions, recipe?.options]);

  const {
    data: validationSchema,
    isLoading: isLoadingSchema,
    error: schemaError,
  } = useAsyncRecipeOptionsValidationSchema(optionsDefinition?.schema);

  const OptionsFieldGroup = useMemo(
    () =>
      genericOptionsFactory(
        optionsDefinition?.schema,
        optionsDefinition?.uiSchema,
        { NoOptionsComponent: NoModOptions },
      ),
    [optionsDefinition],
  );

  const recipeExtensions = useMemo(
    () =>
      installedExtensions.filter(
        (extension) => extension._recipe?.id === recipeId,
      ),
    [installedExtensions, recipeId],
  );

  const initialValues = useMemo(
    () => modifiedOptionValues ?? inferRecipeOptions(recipeExtensions),
    [modifiedOptionValues, recipeExtensions],
  );

  const recipeElements = useMemo(
    () => dirtyElements.filter((element) => element.recipe?.id === recipeId),
    [dirtyElements, recipeId],
  );

  const integrationDependencies = useMemo(
    () => inferRecipeDependencies(recipeExtensions, recipeElements),
    [recipeExtensions, recipeElements],
  );

  const updateRedux = useCallback(
    (options: OptionsArgs) => {
      dispatch(actions.editRecipeOptionsValues(options));
    },
    [dispatch],
  );

  if (isLoadingSchema || isLoadingRecipe) {
    return <Loader />;
  }

  const error = recipeError ?? schemaError;
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
            "The form's submit should not be called to save recipe option values, they are automatically synced with redux",
          );
        }}
        renderSubmit={() => null}
      />
    </ErrorBoundary>
  );
};

const ModOptionsValues: React.FC = () => (
  <Container fluid className="pt-3">
    <Row>
      <Col>
        <ModOptionsValuesContent />
      </Col>
    </Row>
  </Container>
);

export default ModOptionsValues;
