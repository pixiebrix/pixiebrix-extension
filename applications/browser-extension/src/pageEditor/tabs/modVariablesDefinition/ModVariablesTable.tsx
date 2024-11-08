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

import React from "react";
import {
  type ModVariable,
  type ModVariableFormValues,
  SYNC_OPTIONS,
  TYPE_OPTIONS,
} from "./modVariablesDefinitionEditorTypes";
import { Button, Table } from "react-bootstrap";
import styles from "./ModVariablesTable.module.scss";
import PopoverInfoLabel from "@/components/form/popoverInfoLabel/PopoverInfoLabel";
import { FieldArray } from "formik";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTimes } from "@fortawesome/free-solid-svg-icons";
import FieldTemplate from "@/components/form/FieldTemplate";
import { uuidv4 } from "../../../types/helpers";

const ModVariablesTable: React.FC<{
  values: ModVariableFormValues;
  missingVariables: ModVariable[];
}> = ({ values, missingVariables }) => (
  <Table size="sm" className={styles.table}>
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
        <th className={styles.asyncColumn}>
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
            description="Automatically synchronize the variable across tab frames/navigation, or across all tabs"
          />
        </th>
        <th>Action</th>
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
                    placeholder="Enter variable documentation"
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
                <td className={styles.asyncColumn}>
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
                <td className={styles.asyncColumn}>
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
            {values.variables.length === 0 && missingVariables.length === 0 && (
              <tr>
                <td colSpan={6}>This mod does use any mod variables</td>
              </tr>
            )}
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

export default ModVariablesTable;
