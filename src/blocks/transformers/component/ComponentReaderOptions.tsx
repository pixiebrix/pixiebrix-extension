import React, { useContext, useEffect, useMemo } from "react";
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { PageEditorTabContext } from "@/pageEditor/context";
import { useField } from "formik";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { Framework, FrameworkMeta } from "@/messaging/constants";
import { isNullOrBlank, joinName } from "@/utils";
import { Schema } from "@/core";
import SchemaField from "@/components/fields/schemaFields/SchemaField";

type FrameworkOption = {
  value: Framework;
  label: string;
  detected?: FrameworkMeta;
};

export const readerOptions: FrameworkOption[] = [
  { value: "react", label: "React" },
  {
    // XXX: check if this needs to be vue or vuejs
    value: "vue",
    label: "Vue.js",
  },
  {
    value: "angularjs",
    label: "AngularJS",
  },
  { value: "emberjs", label: "Ember.js" },
];

const selectorFieldSchema: Schema = {
  type: "string",
  format: "selector",
  title: "Component Selector",
  description:
    "A CSS/JQuery selector for an element corresponding to the component",
};

const optionalFieldSchema: Schema = {
  type: "boolean",
  title: "Optional",
  description:
    "Toggle to produce null/undefined if a component is not found (instead of raising an error)",
};

function useFrameworkOptions(frameworks: FrameworkMeta[]): FrameworkOption[] {
  return useMemo(
    () =>
      readerOptions.map((option) => {
        const detected = frameworks.find(({ id }) => option.value === id);
        return {
          ...option,
          detected,
          label: `${option.label} - ${
            detected ? detected.version ?? "Unknown Version" : "Not detected"
          }`,
        };
      }),
    [frameworks]
  );
}

const ComponentReaderOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const configFieldName = joinName(name, configKey);
  const frameworkFieldName = joinName(configFieldName, "framework");

  const {
    tabState: { meta },
  } = useContext(PageEditorTabContext);

  const [{ value: framework }, , frameworkHelpers] =
    useField<Framework>(frameworkFieldName);

  const frameworkOptions = useFrameworkOptions(meta.frameworks);

  useEffect(() => {
    if (isNullOrBlank(framework)) {
      const option = frameworkOptions.find((x) => x.detected);
      console.debug("Defaulting framework", { option, frameworkOptions });
      frameworkHelpers.setValue(option?.value ?? "react");
    }
  }, [framework, frameworkHelpers, frameworkOptions]);

  return (
    <>
      <ConnectedFieldTemplate
        name={frameworkFieldName}
        label="Framework"
        description="Select the front-end framework (auto-detected)"
        as={SelectWidget}
        blankValue={null}
        options={frameworkOptions}
      />

      <SchemaField
        name={joinName(configFieldName, "selector")}
        schema={selectorFieldSchema}
      />

      <SchemaField
        isRequired
        name={joinName(configFieldName, "optional")}
        schema={optionalFieldSchema}
      />
    </>
  );
};

export default ComponentReaderOptions;
