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
import { useField, useFormikContext } from "formik";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Col, Container, Row, Tab } from "react-bootstrap";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import styles from "./BlueprintOptionsTab.module.scss";
import { useGetRecipesQuery } from "@/services/api";
import { RJSFSchema } from "@/components/formBuilder/formBuilderTypes";
import FormEditor from "@/components/formBuilder/FormEditor";
import FormPreview from "@/components/formBuilder/FormPreview";
import GridLoader from "react-spinners/GridLoader";
import {
  MINIMAL_SCHEMA,
  MINIMAL_UI_SCHEMA,
} from "@/components/formBuilder/formBuilderHelpers";
import FieldRuntimeContext, {
  RuntimeContext,
} from "@/components/fields/schemaFields/FieldRuntimeContext";

const BlueprintOptionsTab: React.VoidFunctionComponent<{
  eventKey: string;
}> = ({ eventKey }) => {
  const [activeField, setActiveField] = useState<string>();
  const { data: recipes, isLoading: recipesLoading } = useGetRecipesQuery();

  const { values: formState, setFieldValue } = useFormikContext<FormState>();

  const formRuntimeContext = useMemo<RuntimeContext>(
    () => ({
      apiVersion: formState.apiVersion,
      allowExpressions: false,
    }),
    [formState.apiVersion]
  );

  useEffect(() => {
    if (formState.optionsDefinition != null || recipesLoading) {
      return;
    }

    // ToDo: create selector or refactor RTK query here and in useSavingWizard
    const recipe = recipes?.find((x) => x.metadata.id === formState.recipe.id);
    console.log("BlueprintOptionsTab", { recipe });
    // ToDo: move setFieldValue to a function and markSaved the extension if it wasn't dirty
    if (recipe?.options == null) {
      setFieldValue("optionsDefinition", {
        schema: MINIMAL_SCHEMA,
        uiSchema: MINIMAL_UI_SCHEMA,
      });
      return;
    }

    setFieldValue("optionsDefinition", {
      schema: {
        type: "object",
        properties: recipe.options.schema,
      },
      uiSchema: recipe.options.uiSchema,
    });
  }, [recipes]);

  console.log("BlueprintOptionsTab", { formState });

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
          <Col md="8">
            <div>
              Editing Options for Blueprint &quot;{formState.recipe.name}&quot;
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
        </Row>
      </Container>
    </Tab.Pane>
  );
};

export default BlueprintOptionsTab;
