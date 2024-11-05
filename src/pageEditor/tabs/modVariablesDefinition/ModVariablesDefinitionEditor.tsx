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
} from "@/pageEditor/store/editor/editorSelectors";
import { Button, Card, Container, Table } from "react-bootstrap";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import ErrorBoundary from "@/components/ErrorBoundary";
import Effect from "@/components/Effect";
import styles from "./ModVariablesDefinitionEditor.module.scss";
import Form, { type RenderBody } from "@/components/form/Form";
import { assertNotNullish } from "@/utils/nullishUtils";
import { FieldArray } from "formik";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import FieldTemplate from "@/components/form/FieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import {
  mapDefinitionToFormValues,
  mapFormValuesToDefinition,
} from "@/pageEditor/tabs/modVariablesDefinition/modVariablesDefinitionEditorHelpers";
import {
  type ModVariable,
  type ModVariableFormValues,
  SYNC_OPTIONS,
  TYPE_OPTIONS,
} from "@/pageEditor/tabs/modVariablesDefinition/modVariablesDefinitionEditorTypes";
import useInferredModVariablesQuery from "@/pageEditor/tabs/modVariablesDefinition/useInferredModVariablesQuery";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTimes } from "@fortawesome/free-solid-svg-icons";
import { uuidv4 } from "@/types/helpers";
import * as Yup from "yup";

const validationSchema = Yup.object().shape({
  variables: Yup.array().of(
    Yup.object().shape({
      name: Yup.string()
        .required("Required")
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

const VariableTable: React.FC<{
  values: ModVariableFormValues;
  missingVariables: ModVariable[];
}> = ({ values, missingVariables }) => (
  <Table responsive size="sm" className={styles.table}>
    <thead>
      <tr>
        <th>Name</th>
        <th>Description</th>
        <th>
          <PopoverInfoLabel
            name="type"
            label="Type"
            description="Variable type. Currently documentation-only"
          />
        </th>
        <th>
          <PopoverInfoLabel
            name="async"
            label="Async"
            description="Advanced: Toggle on if the variable tracks loading/error state"
          />
        </th>
        <th>
          <PopoverInfoLabel
            name="synchronization"
            label="Synchronization"
            description="Automatically synchronize the variable across tab reloads, or across all tabs"
          />
        </th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <FieldArray
        name="variables"
        render={(arrayHelpers) => (
          <>
            {values.variables.map(({ formReactKey }, index) => (
              <tr key={formReactKey}>
                <td>
                  <ConnectedFieldTemplate
                    name={`variables.${index}.name`}
                    type="text"
                  />
                </td>
                <td>
                  <ConnectedFieldTemplate
                    name={`variables.${index}.description`}
                    type="text"
                  />
                </td>
                <td>
                  <ConnectedFieldTemplate
                    name={`variables.${index}.type`}
                    size="sm"
                    as={SelectWidget}
                    isClearable={false}
                    options={TYPE_OPTIONS}
                    blankValue={TYPE_OPTIONS}
                  />
                </td>
                <td>
                  <ConnectedFieldTemplate
                    name={`variables.${index}.isAsync`}
                    size="sm"
                    as={SwitchButtonWidget}
                  />
                </td>
                <td>
                  <ConnectedFieldTemplate
                    name={`variables.${index}.syncPolicy`}
                    size="sm"
                    as={SelectWidget}
                    isClearable={false}
                    options={SYNC_OPTIONS}
                    blankValue={SYNC_OPTIONS[0]}
                  />
                </td>
                <td>
                  <Button
                    variant="danger"
                    title="Remove mod variable"
                    onClick={() => {
                      arrayHelpers.remove(index);
                    }}
                  >
                    <FontAwesomeIcon fixedWidth icon={faTimes} />
                  </Button>
                </td>
              </tr>
            ))}

            {(missingVariables ?? []).map((variable, index) => (
              <tr key={variable.name} className="text-muted">
                <td>
                  <FieldTemplate
                    name={`variables.${index}.name`}
                    type="text"
                    disabled
                    value={variable.name}
                  />
                </td>
                <td>
                  <FieldTemplate
                    name={`variables.${index}.description`}
                    type="text"
                    disabled
                    value="Found in brick configuration"
                  />
                </td>
                <td>
                  <FieldTemplate
                    name={`variables.${index}.type`}
                    size="sm"
                    disabled
                    as={SelectWidget}
                    isClearable={false}
                    options={TYPE_OPTIONS}
                    value={variable.type}
                  />
                </td>
                <td>
                  <FieldTemplate
                    name={`inferred.${index}.isAsync`}
                    as={SwitchButtonWidget}
                    disabled
                    size="sm"
                    value={variable.isAsync}
                  />
                </td>
                <td>
                  <FieldTemplate
                    name={`inferred.${index}.syncPolicy`}
                    size="sm"
                    disabled
                    as={SelectWidget}
                    isClearable={false}
                    options={SYNC_OPTIONS}
                    value={SYNC_OPTIONS[0].value}
                  />
                </td>
                <td>
                  <Button
                    title="Declare mod variable"
                    variant="info"
                    onClick={() => {
                      arrayHelpers.push({
                        ...variable,
                        description: "Found in brick configuration",
                      });
                    }}
                  >
                    <FontAwesomeIcon fixedWidth icon={faPlus} />
                  </Button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={6}>
                <Button
                  size="sm"
                  onClick={() => {
                    arrayHelpers.push({
                      formReactKey: uuidv4(),
                      name: "newVar",
                      isAsync: false,
                      syncPolicy: "none",
                      type: "any",
                    });
                  }}
                >
                  <FontAwesomeIcon icon={faPlus} /> Add new mod variable
                </Button>
              </td>
            </tr>
          </>
        )}
      />
    </tbody>
  </Table>
);

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
        <Card.Body className={styles.cardBody}>
          <VariableTable values={values} missingVariables={missingVariables} />
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
