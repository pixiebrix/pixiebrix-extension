import React, { useContext, useEffect, useMemo } from "react";
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { DevToolsContext } from "@/devTools/context";
import { useField } from "formik";
import { compact } from "lodash";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import { Framework, FrameworkMeta } from "@/messaging/constants";
import SelectorSelectorWidget from "@/devTools/editor/fields/SelectorSelectorWidget";

type FrameworkOption = {
  value: Framework;
  label: string;
  detected?: FrameworkMeta;
};

export const readerOptions: FrameworkOption[] = [
  { value: "react", label: "React" },
  {
    value: "angularjs",
    label: "AngularJS",
  },
  { value: "emberjs", label: "Ember.js" },
  {
    // XXX: check if this needs to be vue or vuejs
    value: "vue",
    label: "Vue.js",
  },
];

function useFrameworkOptions(frameworks: FrameworkMeta[]): FrameworkOption[] {
  return useMemo(
    () =>
      readerOptions.map((option) => {
        const detected = frameworks.find(({ id }) => option.value === id);
        return {
          ...option,
          detected,
          label:
            option.value === "jquery"
              ? option.label
              : `${option.label} - ${
                  detected
                    ? detected.version ?? "Unknown Version"
                    : "Not detected"
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
  const configFieldName = compact([name, configKey]).join(".");
  const frameworkFieldName = [configFieldName, "framework"].join(".");

  const {
    tabState: { meta },
  } = useContext(DevToolsContext);

  const [{ value: framework }, , helpers] = useField<Framework>(
    frameworkFieldName
  );

  const frameworkOptions = useFrameworkOptions(meta.frameworks);

  useEffect(() => {
    if (!framework) {
      helpers.setValue(
        meta.frameworks.find((x) => x.version)?.id ?? meta.frameworks[0].id
      );
    }
  }, [framework, helpers, meta.frameworks]);

  return (
    <>
      <ConnectedFieldTemplate
        name={frameworkFieldName}
        label="Framework"
        description="Select the front-end framework (auto-detected)"
        as={SelectWidget}
        options={frameworkOptions}
      />

      <ConnectedFieldTemplate
        name={[configFieldName, "selector"].join(".")}
        label="Component Selector"
        description="A CSS/JQuery selector for an element corresponding to the component"
        as={SelectorSelectorWidget}
      />

      <ConnectedFieldTemplate
        name={[configFieldName, "optional"].join(".")}
        label="Optional"
        description="Toggle to produce null/undefined if a component is not found (instead of raising an error)"
        layout="switch"
      />
    </>
  );
};

export default ComponentReaderOptions;
