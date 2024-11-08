/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveModId,
  selectGetModVariablesDefinitionForModId,
} from "../../store/editor/editorSelectors";
import { Card, Container } from "react-bootstrap";
import { actions } from "../../store/editor/editorSlice";
import ErrorBoundary from "../../../components/ErrorBoundary";
import Effect from "../../../components/Effect";
import styles from "./ModVariablesDefinitionEditor.module.scss";
import Form, { type RenderBody } from "../../../components/form/Form";
import { assertNotNullish } from "../../../utils/nullishUtils";
import {
  mapDefinitionToFormValues,
  mapFormValuesToDefinition,
} from "./modVariablesDefinitionEditorHelpers";
import { type ModVariableFormValues } from "./modVariablesDefinitionEditorTypes";
import useInferredModVariablesQuery from "./useInferredModVariablesQuery";
import * as Yup from "yup";
import useReportError from "../../../hooks/useReportError";
import { isOutputKey } from "../../../runtime/runtimeTypes";
import ModVariablesTable from "./ModVariablesTable";

const validationSchema = Yup.object().shape({
  variables: Yup.array().of(
    Yup.object().shape({
      name: Yup.string()
        .required("Required")
        .test("identifier", "Name must be a valid identifier", (value) =>
          isOutputKey(value),
        )
        .test("unique", "Name must be unique", (value, { options }) => {
          const { variables } = options.context as ModVariableFormValues;
          const duplicate =
            variables.filter((x) => x.name === value).length > 1;
          return !duplicate;
        }),
      description: Yup.string(),
      type: Yup.string().required("Required"),
      isAsync: Yup.boolean().required("Required"),
      syncPolicy: Yup.string().required("Required"),
    }),
  ),
});

const ModVariablesDefinitionEditor: React.FC = () => {
  const dispatch = useDispatch();
  const modId = useSelector(selectActiveModId);

  assertNotNullish(modId, "No active mod id");

  const getModVariablesDefinitionForModId = useSelector(
    selectGetModVariablesDefinitionForModId,
  );

  const initialValues = mapDefinitionToFormValues(
    getModVariablesDefinitionForModId(modId),
  );

  const inferredModVariablesQuery = useInferredModVariablesQuery(modId);
  useReportError(inferredModVariablesQuery.error);

  const missingVariables = (inferredModVariablesQuery.data ?? []).filter(
    (inferredVariable) =>
      !initialValues.variables.some((x) => x.name === inferredVariable.name),
  );

  const updateRedux = useCallback(
    (formValues: ModVariableFormValues) => {
      dispatch(
        actions.editModVariablesDefinition(
          mapFormValuesToDefinition(formValues),
        ),
      );
    },
    [dispatch],
  );

  const renderBody: RenderBody<ModVariableFormValues> = ({ values }) => (
    <>
      <Effect values={values} onChange={updateRedux} delayMillis={100} />
      <Card>
        <Card.Header>Mod Variables</Card.Header>
        <Card.Body>
          <ModVariablesTable
            values={values}
            missingVariables={missingVariables}
          />
        </Card.Body>
      </Card>
    </>
  );

  return (
    <Container fluid className={styles.root}>
      <ErrorBoundary>
        <Form
          initialValues={initialValues}
          validationSchema={validationSchema}
          validateOnMount
          onSubmit={() => {
            console.error(
              "The form's submit should not be called to save mod variables. Use 'saveMod' from 'useSaveMod' instead.",
            );
          }}
          renderBody={renderBody}
          renderSubmit={() => null}
        />
      </ErrorBoundary>
    </Container>
  );
};

export default ModVariablesDefinitionEditor;
