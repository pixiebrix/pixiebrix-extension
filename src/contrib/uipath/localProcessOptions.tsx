/*
 * Copyright (C) 2021 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useMemo } from "react";
import {
  BlockOptionProps,
  FieldRenderer,
} from "@/components/fields/blockOptions";
import { identity } from "lodash";
import { UIPATH_PROPERTIES } from "@/contrib/uipath/localProcess";
import { Schema } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { Card, Form } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import Select from "react-select";
import { FieldProps } from "@/components/fields/propTypes";
import { inputProperties } from "@/helpers";

interface Process {
  id: string;
  name: string;
}

export const ProcessField: React.FunctionComponent<
  FieldProps<string> & { processes: Process[]; fetchError: unknown }
> = ({ label, schema, processes, fetchError, ...props }) => {
  const [{ value, ...field }, meta, helpers] = useField(props);

  const options = useMemo(() => {
    return (processes ?? []).map((x) => ({
      value: x.id,
      label: x.name,
      process: x,
    }));
  }, [processes]);

  return (
    <Form.Group>
      <Form.Label>{label ?? fieldLabel(field.name)}</Form.Label>
      <Select
        options={options}
        value={options.find((x) => x.value === value)}
        onChange={(option) => helpers.setValue((option as any)?.value)}
      />
      {schema.description && (
        <Form.Text className="text-muted">The UIPath process to run</Form.Text>
      )}
      {fetchError && (
        <span className="text-danger small">
          Error fetching processes: {fetchError.toString()}
        </span>
      )}
      {meta.touched && meta.error && (
        <span className="text-danger small">{meta.error}</span>
      )}
    </Form.Group>
  );
};

const LocalProcessOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
  showOutputKey,
}) => {
  const basePath = [name, configKey].filter(identity).join(".");

  const [{ value: releaseKey }] = useField<string>(`${basePath}.releaseKey`);

  const [UiPathRobot, , initError] = useAsyncState(async () => {
    const module = await import("@uipath/robot");
    const { UiPathRobot } = module;
    UiPathRobot.init();
    return UiPathRobot;
  }, []);

  const [processes, , processesError] = useAsyncState(async () => {
    if (UiPathRobot) {
      return await UiPathRobot.getProcesses();
    } else {
      return [];
    }
  }, [UiPathRobot]);

  const process = useMemo(() => {
    return processes?.find((x) => x.id === releaseKey);
  }, [processes, releaseKey]);

  return (
    <div>
      <ProcessField
        label="process"
        name={`${basePath}.releaseKey`}
        schema={UIPATH_PROPERTIES["releaseKey"] as Schema}
        processes={processes}
        fetchError={initError?.toString() ?? processesError?.toString()}
      />
      {process && (
        <Form.Group>
          <Form.Label>inputArguments</Form.Label>
          <Card>
            <Card.Header>{process}</Card.Header>
            <Card.Body>
              {Object.entries(
                inputProperties({ additionalProperties: true })
              ).map(([prop, fieldSchema]) => {
                if (typeof fieldSchema === "boolean") {
                  throw new Error("Expected schema for input property type");
                }
                return (
                  <FieldRenderer
                    key={prop}
                    name={[name, configKey, "inputArguments", prop]
                      .filter(identity)
                      .join(".")}
                    schema={fieldSchema}
                  />
                );
              })}
            </Card.Body>
          </Card>
        </Form.Group>
      )}

      {showOutputKey && (
        <FieldRenderer
          name={`${name}.outputKey`}
          label="Output Variable"
          schema={{
            type: "string",
            description: "A name to refer to this brick in subsequent bricks",
          }}
        />
      )}
    </div>
  );
};

export default LocalProcessOptions;
