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

import React, { useCallback, useRef, useState } from "react";
import FieldRuntimeContext, {
  RuntimeContext,
} from "@/components/fields/schemaFields/FieldRuntimeContext";
import { Col, Container, Nav, Row, Tab } from "react-bootstrap";
import Loader from "@/components/Loader";
import { isEmpty, isEqual } from "lodash";
import styles from "./RecipeOptions.module.scss";
import ErrorBoundary from "@/components/ErrorBoundary";
import FormEditor from "@/components/formBuilder/FormEditor";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import cx from "classnames";
import FormPreview from "@/components/formBuilder/FormPreview";
import { RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import { FIELD_TYPE_OPTIONS } from "@/components/formBuilder/formBuilderHelpers";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveRecipeId,
  selectDirtyOptionsForRecipe,
} from "@/pageEditor/slices/editorSelectors";
import { PAGE_EDITOR_DEFAULT_BRICK_API_VERSION } from "@/pageEditor/extensionPoints/base";
import { useGetRecipesQuery } from "@/services/api";
import { Formik } from "formik";
import { OptionsDefinition } from "@/types/definitions";
import { actions } from "@/pageEditor/slices/editorSlice";
import Effect from "@/pageEditor/components/Effect";
import { getErrorMessage } from "@/errors";
import { propertiesToSchema } from "@/validators/generic";
import { Schema, SchemaProperties, UiSchema } from "@/core";
import { sort } from "semver";
import { RootState } from "@/pageEditor/store";

const fieldTypes = FIELD_TYPE_OPTIONS.filter(
  (type) => !["File", "Image crop"].includes(type.label)
);

const formRuntimeContext: RuntimeContext = {
  apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  allowExpressions: false,
};

const RecipeOptions: React.VoidFunctionComponent = () => {
  const [activeField, setActiveField] = useState<string>();
  const recipeId = useSelector(selectActiveRecipeId);
  const { data: recipes, isLoading, error } = useGetRecipesQuery();
  const recipe = recipes?.find((recipe) => recipe.metadata.id === recipeId);
  const recipeSchema = recipe?.options?.schema ?? {};
  const schema: Schema =
    "type" in recipeSchema &&
    recipeSchema.type === "object" &&
    "properties" in recipeSchema
      ? recipeSchema
      : propertiesToSchema(recipeSchema as SchemaProperties);
  const uiSchema: UiSchema = recipe?.options?.uiSchema ?? {
    "ui:order": sort(Object.keys(schema.properties ?? {})),
  };
  const options: OptionsDefinition = { schema, uiSchema };

  const dirtyOptions = useSelector((state: RootState) =>
    selectDirtyOptionsForRecipe(state, recipeId)
  );

  const initialValues = { optionsDefinition: dirtyOptions ?? options };

  const dispatch = useDispatch();
  const prevOptions = useRef(initialValues.optionsDefinition);
  const updateRedux = useCallback(
    (options: OptionsDefinition) => {
      if (!isEqual(prevOptions.current, options)) {
        dispatch(actions.editRecipeOptions(options));
        prevOptions.current = options;
      }
    },
    [dispatch]
  );

  if (isLoading || error) {
    return (
      <Container>
        <Row>
          <Col>
            {isLoading ? (
              <Loader />
            ) : (
              <div className="text-danger">{getErrorMessage(error)}</div>
            )}
          </Col>
        </Row>
      </Container>
    );
  }

  const noOptions = isEmpty(initialValues.optionsDefinition.schema.properties);

  return (
    <div className={styles.paneContent}>
      <ErrorBoundary>
        <Formik
          initialValues={initialValues}
          onSubmit={() => {
            console.error(
              "Formik's submit should not be called to save recipe options. Use 'saveRecipe' from 'useRecipeSaver' instead."
            );
          }}
        >
          {({ values }) => (
            <>
              <Effect
                values={values.optionsDefinition}
                onChange={updateRedux}
                delayMillis={100}
              />

              <div className={styles.configPanel}>
                <h5 className="mb-3">
                  Editing Options for Blueprint &quot;{recipe.metadata.name}
                  &quot;
                </h5>

                {noOptions && (
                  <div className="mb-3">
                    No options defined for this Blueprint
                  </div>
                )}

                <FieldRuntimeContext.Provider value={formRuntimeContext}>
                  <FormEditor
                    name="optionsDefinition"
                    showFormTitle={false}
                    activeField={activeField}
                    setActiveField={setActiveField}
                    fieldTypes={fieldTypes}
                  />
                </FieldRuntimeContext.Provider>
              </div>
              <div className={styles.dataPanel}>
                <Tab.Container activeKey="preview">
                  <div className={dataPanelStyles.tabContainer}>
                    <Nav variant="tabs">
                      <Nav.Item className={dataPanelStyles.tabNav}>
                        <Nav.Link eventKey="preview">Preview</Nav.Link>
                      </Nav.Item>
                    </Nav>

                    <Tab.Content className={dataPanelStyles.tabContent}>
                      <Tab.Pane
                        eventKey="preview"
                        className={cx(
                          dataPanelStyles.tabPane,
                          dataPanelStyles.selectablePreviewContainer
                        )}
                      >
                        <ErrorBoundary>
                          <FormPreview
                            rjsfSchema={values.optionsDefinition as RJSFSchema}
                            activeField={activeField}
                            setActiveField={setActiveField}
                          />
                        </ErrorBoundary>
                      </Tab.Pane>
                    </Tab.Content>
                  </div>
                </Tab.Container>
              </div>
            </>
          )}
        </Formik>
      </ErrorBoundary>
    </div>
  );
};

export default RecipeOptions;
