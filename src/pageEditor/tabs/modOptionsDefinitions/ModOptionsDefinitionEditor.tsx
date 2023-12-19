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
import styles from "./ModOptionsDefinitionEditor.module.scss";
import ErrorBoundary from "@/components/ErrorBoundary";
import FormEditor from "@/components/formBuilder/edit/FormEditor";
import dataPanelStyles from "@/pageEditor/tabs/dataPanelTabs.module.scss";
import FormPreview from "@/components/formBuilder/preview/FormPreview";
import { type RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import { stringifyUiType } from "@/components/formBuilder/formBuilderHelpers";
import FORM_FIELD_TYPE_OPTIONS from "@/pageEditor/fields/formFieldTypeOptions";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveRecipeId,
  selectDirtyOptionDefinitionsForRecipeId,
} from "@/pageEditor/slices/editorSelectors";
import { PAGE_EDITOR_DEFAULT_BRICK_API_VERSION } from "@/pageEditor/starterBricks/base";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { actions } from "@/pageEditor/slices/editorSlice";
import Effect from "@/components/Effect";
import { getErrorMessage } from "@/errors/errorHelpers";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import SchemaField from "@/components/fields/schemaFields/SchemaField";
import { type Schema } from "@/types/schemaTypes";
import { emptyModOptionsDefinitionFactory } from "@/utils/modUtils";

const fieldTypes = [
  ...FORM_FIELD_TYPE_OPTIONS.filter(
    (type) => !["File", "Image crop"].includes(type.label),
  ),
  {
    label: "Database selector",
    value: stringifyUiType({ propertyType: "string", uiWidget: "database" }),
  },
  {
    label: "Database automatically created at activation",
    value: stringifyUiType({
      propertyType: "string",
      uiWidget: "database",
      propertyFormat: "preview",
    }),
  },
  {
    label: "Google Sheet",
    value: stringifyUiType({
      propertyType: "string",
      uiWidget: "googleSheet",
    }),
  },
];

const activationInstructionsSchema: Schema = {
  type: "string",
  format: "markdown",
};

const formRuntimeContext: RuntimeContext = {
  apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  allowExpressions: false,
};

const ModOptionsDefinitionEditor: React.VFC = () => {
  const [activeField, setActiveField] = useState<string>();
  const modId = useSelector(selectActiveRecipeId);
  const { data: mod, isFetching, error } = useOptionalModDefinition(modId);

  const savedOptions = mod?.options;
  const dirtyOptions = useSelector(
    selectDirtyOptionDefinitionsForRecipeId(modId),
  );

  const optionsDefinition =
    dirtyOptions ?? savedOptions ?? emptyModOptionsDefinitionFactory();

  const initialValues = { optionsDefinition };

  const dispatch = useDispatch();
  const updateRedux = useCallback(
    (options: ModOptionsDefinition) => {
      dispatch(actions.editRecipeOptionsDefinitions(options));
    },
    [dispatch],
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
              "Formik's submit should not be called to save mod options. Use 'saveRecipe' from 'useRecipeSaver' instead.",
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
                  <Card.Header>Advanced: Mod Options</Card.Header>
                  <Card.Body>
                    <FieldRuntimeContext.Provider value={formRuntimeContext}>
                      <SchemaField
                        name="optionsDefinition.schema.description"
                        label="Activation Instructions"
                        description="Optional instructions to display during activation. Supports [Markdown](https://docs.pixiebrix.com/developing-mods/developer-concepts/working-with-markdown)"
                        schema={activationInstructionsSchema}
                      />

                      {noOptions && (
                        <div className="mb-3">
                          No options defined for this mod
                        </div>
                      )}

                      <FormEditor
                        name="optionsDefinition"
                        showFormIntroFields={false}
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
                        className={dataPanelStyles.tabPane}
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

export default ModOptionsDefinitionEditor;
