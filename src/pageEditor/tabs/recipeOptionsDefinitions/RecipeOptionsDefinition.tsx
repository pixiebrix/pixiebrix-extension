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

import React, { useCallback, useState } from "react";
import FieldRuntimeContext, {
  type RuntimeContext,
} from "@/components/fields/schemaFields/FieldRuntimeContext";
import { Card, Col, Container, Nav, Row, Tab } from "react-bootstrap";
import Loader from "@/components/Loader";
import { isEmpty } from "lodash";
import styles from "./RecipeOptionsDefinition.module.scss";
import ErrorBoundary from "@/components/ErrorBoundary";
import FormEditor from "@/components/formBuilder/edit/FormEditor";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import cx from "classnames";
import FormPreview from "@/components/formBuilder/preview/FormPreview";
import { type RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import {
  getMinimalSchema,
  getMinimalUiSchema,
  stringifyUiType,
} from "@/components/formBuilder/formBuilderHelpers";
import FORM_FIELD_TYPE_OPTIONS from "@/pageEditor/fields/formFieldTypeOptions";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveRecipeId,
  selectDirtyOptionDefinitionsForRecipeId,
} from "@/pageEditor/slices/editorSelectors";
import { PAGE_EDITOR_DEFAULT_BRICK_API_VERSION } from "@/pageEditor/extensionPoints/base";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { type OptionsDefinition } from "@/types/definitions";
import { actions } from "@/pageEditor/slices/editorSlice";
import Effect from "@/components/Effect";
import { getErrorMessage } from "@/errors/errorHelpers";
import { useRecipe } from "@/recipes/recipesHooks";

const fieldTypes = [
  ...FORM_FIELD_TYPE_OPTIONS.filter(
    (type) => !["File", "Image crop"].includes(type.label)
  ),
  {
    label: "Database selector",
    value: stringifyUiType({ propertyType: "string", uiWidget: "database" }),
  },
];

const formRuntimeContext: RuntimeContext = {
  apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  allowExpressions: false,
};

export const EMPTY_RECIPE_OPTIONS_DEFINITION: OptionsDefinition = {
  schema: getMinimalSchema(),
  uiSchema: getMinimalUiSchema(),
};

const RecipeOptionsDefinition: React.VFC = () => {
  const [activeField, setActiveField] = useState<string>();
  const recipeId = useSelector(selectActiveRecipeId);
  const { data: recipe, isFetching, error } = useRecipe(recipeId);

  const savedOptions = recipe?.options;
  const dirtyOptions = useSelector(
    selectDirtyOptionDefinitionsForRecipeId(recipeId)
  );

  const optionsDefinition =
    dirtyOptions ?? savedOptions ?? EMPTY_RECIPE_OPTIONS_DEFINITION;

  const initialValues = { optionsDefinition };

  const dispatch = useDispatch();
  const updateRedux = useCallback(
    (options: OptionsDefinition) => {
      dispatch(actions.editRecipeOptionsDefinitions(options));
    },
    [dispatch]
  );

  if (isFetching || error) {
    return (
      <Container>
        <Row>
          <Col>
            {isFetching ? (
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
                <Card>
                  <Card.Header>Advanced: Blueprint Options</Card.Header>
                  <Card.Body>
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
                  </Card.Body>
                </Card>
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

export default RecipeOptionsDefinition;
