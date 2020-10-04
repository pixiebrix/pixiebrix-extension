import React, { useMemo, useState } from "react";
import Table from "react-bootstrap/Table";
import Select from "react-select";
import Button from "react-bootstrap/Button";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { RawServiceConfiguration, ServiceDependency } from "@/core";
import { useFetch } from "@/hooks/fetch";
import { ConfigurableAuth } from "@/types/contract";
import ServiceSelector from "@/components/ServiceSelector";
import { Field, FieldArray, FieldInputProps, useField } from "formik";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import "./ServicesFormCard.scss";

interface AuthOption {
  value: string;
  label: string;
  serviceId: string;
}

// customStyles.js
const colors = {
  error: "#dc3545",
  divider: "#ebedf2",
};

export const customStyles = {
  control: (base: any, state: any) => {
    let statusColor = colors.divider;

    if (state.selectProps.error) {
      // "state.selectProps" references the component props
      statusColor = colors.error;
    }

    return {
      ...base,
      borderColor: statusColor,
    };
  },
};

const ServiceAuthSelector: React.FunctionComponent<{
  name: string;
  serviceId: string;
  authOptions: AuthOption[];
}> = ({ authOptions, serviceId, ...props }) => {
  const [field, meta, helpers] = useField(props);

  const options = useMemo(
    () => authOptions.filter((x) => x.serviceId === serviceId),
    [authOptions, serviceId]
  );

  const value = useMemo(
    () => authOptions.filter((x) => x.value === field.value),
    [authOptions, serviceId]
  );

  return (
    <Form.Group controlId={field.name}>
      <Select
        styles={customStyles}
        name={field.name}
        options={options}
        value={value}
        error={!!meta.error}
        onChange={(x: AuthOption) => {
          helpers.setValue(x.value);
        }}
      />
      {meta.error && (
        <Form.Control.Feedback type="invalid" style={{ display: "inline" }}>
          {meta.error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

function useAuthOptions(): [AuthOption[]] {
  const configuredServices = useSelector<RootState, RawServiceConfiguration[]>(
    ({ services }) => Object.values(services.configured)
  );

  const remoteAuths = useFetch<ConfigurableAuth[]>(
    "/api/services/shared/?meta=1"
  );

  const authOptions = useMemo(() => {
    const localOptions = (configuredServices ?? []).map((x) => ({
      value: x.id,
      label: `${x.label ?? "Default"} — Private`,
      serviceId: x.serviceId,
    }));

    const sharedOptions = (remoteAuths ?? []).map((x) => ({
      value: x.id,
      label: `${x.label ?? "Default"} — ${x.organization ?? "✨ Built-in"}`,
      serviceId: x.service.config.metadata.id,
    }));

    return [...localOptions, ...sharedOptions];
  }, [remoteAuths, configuredServices]);

  return [authOptions];
}

const DependencyRow: React.FunctionComponent<{
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
            <div style={{ width: 300 }}>
              <ServiceSelector
                key={selectKey}
                placeholder="Pick a service to add"
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
