/*
 * Copyright (C) 2020 Pixie Brix, LLC
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

import React, { useState } from "react";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ServiceDependency } from "@/core";
import { Field, FieldArray, FieldInputProps, useField } from "formik";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import "./ServicesFormCard.scss";
import ServiceAuthSelector, {
  AuthOption,
  useAuthOptions,
} from "@/options/pages/extensionEditor/ServiceAuthSelector";
import ServiceModal from "@/components/fields/ServiceModal";
import { useFetch } from "@/hooks/fetch";
import { ServiceDefinition } from "@/types/definitions";

export const DependencyRow: React.FunctionComponent<{
  field: FieldInputProps<unknown>;
  authOptions: AuthOption[];
  dependency: ServiceDependency;
  index: number;
  remove: (x: number) => void;
}> = ({ field, authOptions, index, remove, dependency }) => {
  return (
    <tr>
      <td style={{ width: 250 }}>
        <Field name={`${field.name}.${index}.outputKey`}>
          {/* @ts-ignore: not sure what's going on with the type definition for this */}
          {({ field, meta }) => (
            <Form.Group>
              <Form.Control
                {...field}
                size="default"
                isInvalid={!!meta.error}
              />
              {meta.touched && meta.error && (
                <Form.Control.Feedback type="invalid">
                  {meta.error}
                </Form.Control.Feedback>
              )}
            </Form.Group>
          )}
        </Field>
      </td>
      <td>
        <Form.Group>
          {/* TODO: indicate if the service no longer exists */}
          <input
            type="hidden"
            name={`${field.name}.${index}.id`}
            value={dependency.id}
          />
          <code>{dependency.id}</code>
        </Form.Group>
      </td>
      <td style={{ width: 350 }}>
        <ServiceAuthSelector
          name={`${field.name}.${index}.config`}
          serviceId={dependency.id}
          authOptions={authOptions}
        />
      </td>
      <td>
        <Form.Group>
          <Button variant="danger" size="sm" onClick={() => remove(index)}>
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </Form.Group>
      </td>
    </tr>
  );
};

const ServicesFormCard: React.FunctionComponent<{ name: string }> = ({
  ...props
}) => {
  const [selectKey, setKey] = useState(0);
  const [field, meta] = useField(props);
  const [authOptions] = useAuthOptions();
  const services = useFetch<ServiceDefinition[]>("/api/services/");

  return (
    <FieldArray name={props.name}>
      {({ push, remove }) => (
        <>
          <Card.Body className="pb-2">
            <p>
              Add services to re-use external accounts and resources that you or
              your team have configured.
            </p>
          </Card.Body>
          {field.value.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <th style={{ width: 250 }}>Key</th>
                  <th>Type</th>
                  <th style={{ width: 350 }}>Service</th>
                  <th>&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {field.value.map(
                  (dependency: ServiceDependency, index: number) => (
                    <DependencyRow
                      key={index}
                      field={field}
                      authOptions={authOptions}
                      dependency={dependency}
                      index={index}
                      remove={remove}
                    />
                  )
                )}
              </tbody>
            </Table>
          )}
          <Card.Footer>
            <div>
              <ServiceModal
                key={selectKey}
                services={services}
                caption="Add Integration"
                onSelect={(x) => {
                  setKey((k) => k + 1);
                  push({
                    id: x.metadata.id,
                    outputKey: "",
                    config: undefined,
                  });
                }}
              />
            </div>
            {typeof meta.error === "string" && <span>{meta.error}</span>}
          </Card.Footer>
        </>
      )}
    </FieldArray>
  );
};

export default ServicesFormCard;
