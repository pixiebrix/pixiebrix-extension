import React, { CSSProperties, useMemo } from "react";
import { useField } from "formik";
import Form from "react-bootstrap/Form";
import Select, { StylesConfig } from "react-select";
import { useSelector } from "react-redux";
import { RootState } from "@/options/store";
import { RawServiceConfiguration } from "@/core";
import { useFetch } from "@/hooks/fetch";
import { SanitizedAuth } from "@/types/contract";

export interface AuthOption {
  value: string;
  label: string;
  serviceId: string;
}

function defaultLabel(label: string): string {
  const normalized = (label ?? "").trim();
  return normalized === "" ? "Default" : normalized;
}

export function useAuthOptions(): [AuthOption[]] {
  const configuredServices = useSelector<RootState, RawServiceConfiguration[]>(
    ({ services }) => Object.values(services.configured)
  );

  const remoteAuths = useFetch<SanitizedAuth[]>("/api/services/shared/?meta=1");

  const authOptions = useMemo(() => {
    const localOptions = (configuredServices ?? []).map((x) => ({
      value: x.id,
      label: `${defaultLabel(x.label)} — Private`,
      serviceId: x.serviceId,
    }));

    const sharedOptions = (remoteAuths ?? []).map((x) => ({
      value: x.id,
      label: `${defaultLabel(x.label)} — ${
        x.organization.name ?? "✨ Built-in"
      }`,
      serviceId: x.service.config.metadata.id,
    }));

    return [...localOptions, ...sharedOptions];
  }, [remoteAuths, configuredServices]);

  return [authOptions];
}

// customStyles.js
const colors = {
  error: "#dc3545",
  divider: "#ebedf2",
};

export const customStyles: StylesConfig = {
  // @ts-ignore: not sure how to pass the genetic argument to the react-select types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: (base: CSSProperties, state: { selectProps: any }) => {
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

export default ServiceAuthSelector;
