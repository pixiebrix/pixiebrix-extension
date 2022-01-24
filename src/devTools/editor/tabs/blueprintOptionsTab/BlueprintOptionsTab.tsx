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
import { Col, Container, Row, Tab } from "react-bootstrap";
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

const BlueprintOptionsTab: React.VoidFunctionComponent<{
  eventKey: string;
}> = ({ eventKey }) => {
  const [activeField, setActiveField] = useState<string>();
  const { values: formState } = useFormikContext<FormState>();

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

  const hasOptions =
    formState.optionsDefinition?.schema?.properties &&
    Object.keys(formState.optionsDefinition.schema.properties).length > 0;

  return (
    <Tab.Pane eventKey={eventKey} className={styles.root}>
      <Container>
        <Row>
          <ErrorBoundary>
            <Col md="8">
              <div>
                Editing Options for Blueprint &quot;{formState.recipe.name}
                &quot;
              </div>
              {!hasOptions && <div>No options defined for this Blueprint</div>}
              <FieldRuntimeContext.Provider value={formRuntimeContext}>
                <FormEditor
                  name="optionsDefinition"
                  showFormTitle={false}
                  activeField={activeField}
                  setActiveField={setActiveField}
                />
              </FieldRuntimeContext.Provider>
            </Col>
            <Col md="4">
              <div>Preview</div>
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
