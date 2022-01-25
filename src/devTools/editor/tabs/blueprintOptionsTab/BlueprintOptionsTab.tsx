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
import { useFormikContext } from "formik";
import React, { useMemo, useState } from "react";
import { Alert, Col, Container, Row, Tab } from "react-bootstrap";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import styles from "./BlueprintOptionsTab.module.scss";
import { RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import FormEditor from "@/components/formBuilder/FormEditor";
import FormPreview from "@/components/formBuilder/FormPreview";
import GridLoader from "react-spinners/GridLoader";
import FieldRuntimeContext, {
  RuntimeContext,
} from "@/components/fields/schemaFields/FieldRuntimeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { isEmpty } from "lodash";
import { FIELD_TYPE_OPTIONS } from "@/components/formBuilder/formBuilderHelpers";
import { useGetRecipesQuery } from "@/services/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";

const fieldTypes = FIELD_TYPE_OPTIONS.filter((type) =>
  ["Single line text", "Number", "Checkbox"].includes(type.label)
);

const BlueprintOptionsTab: React.VoidFunctionComponent<{
  eventKey: string;
}> = ({ eventKey }) => {
  const [activeField, setActiveField] = useState<string>();
  const { values: formState } = useFormikContext<FormState>();
  const { data: recipes } = useGetRecipesQuery();
  const recipe = recipes?.find((x) => x.metadata.id === formState.recipe.id);
  const countOfExtensionsInRecipe = recipe.extensionPoints.length;

  const formRuntimeContext = useMemo<RuntimeContext>(
    () => ({
      apiVersion: formState.apiVersion,
      allowExpressions: false,
    }),
    [formState.apiVersion]
  );

  if (formState.optionsDefinition == null) {
    return (
      <Tab.Pane eventKey={eventKey} className={styles.root}>
        <Container>
          <Row>
            <Col>
              <GridLoader />
            </Col>
          </Row>
        </Container>
      </Tab.Pane>
    );
  }

  const noOptions = isEmpty(formState.optionsDefinition?.schema?.properties);

  return (
    <Tab.Pane eventKey={eventKey} className={styles.root}>
      <Container className="pt-3">
        <Row>
          <ErrorBoundary>
            <Col md="8">
              <h5 className="mb-3">
                Editing Options for Blueprint &quot;{formState.recipe.name}
                &quot;
              </h5>

              {countOfExtensionsInRecipe > 1 && (
                <Alert variant="warning">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                  This options are shared with{" "}
                  {countOfExtensionsInRecipe > 2
                    ? `other ${countOfExtensionsInRecipe - 1} extensions`
                    : "another extension"}{" "}
                  in the blueprint.
                </Alert>
              )}

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
            </Col>
            <Col md="4">
              <h5 className="mb-3">Preview</h5>
              <FormPreview
                rjsfSchema={formState.optionsDefinition as RJSFSchema}
                activeField={activeField}
                setActiveField={setActiveField}
              />
            </Col>
          </ErrorBoundary>
        </Row>
      </Container>
    </Tab.Pane>
  );
};

export default BlueprintOptionsTab;
