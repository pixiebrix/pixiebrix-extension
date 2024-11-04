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
import cx from "classnames";
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
} from "@/pageEditor/tabs/modVariablesDefinition/modVariablesDefinitionEditorTypes";
import useInferredModVariablesQuery from "@/pageEditor/tabs/modVariablesDefinition/useInferredModVariablesQuery";

const VariableTable: React.FC<{
  values: ModVariableFormValues;
  missingVariables: ModVariable[];
}> = ({ values, missingVariables }) => (
  <Table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Description</th>
        <th>
          <PopoverInfoLabel
            name="async"
            label="Async"
            description="Whether the variable tracks loading/error state"
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
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      arrayHelpers.remove(index);
                    }}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}

            {(missingVariables ?? []).map((variable, index) => (
              <tr key={variable.name} className="text-muted">
                <td>{variable.name}</td>
                <td>Found in brick configuration</td>
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
                    size="sm"
                    onClick={() => {
                      arrayHelpers.push(variable);
                    }}
                  >
                    Add
                  </Button>
                </td>
              </tr>
            ))}
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
        <Card.Body>
          <VariableTable values={values} missingVariables={missingVariables} />
        </Card.Body>
      </Card>
    </>
  );

  return (
    <Container className={cx(styles.root, "ml-0")}>
      <ErrorBoundary>
        <Form
          initialValues={initialValues}
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
