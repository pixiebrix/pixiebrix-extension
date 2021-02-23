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

import React, { useContext, useMemo, useState } from "react";
import {
  BlockOptionProps,
  FieldRenderer,
} from "@/components/fields/blockOptions";
import { identity } from "lodash";
import { UIPATH_PROPERTIES } from "@/contrib/uipath/localProcess";
import { Schema } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { Form } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import Select from "react-select";
import { FieldProps } from "@/components/fields/propTypes";
import { openTab } from "@/background/executor";
import useAsyncEffect from "use-async-effect";
import {
  getUiPathProcesses,
  initUiPathRobot,
} from "@/background/devtools/protocol";
import { DevToolsContext } from "@/devTools/context";
import { RobotProcess } from "@uipath/robot/dist/models";
import { ObjectField } from "@/components/fields/FieldTable";

interface Process {
  id: string;
  name: string;
}

export const ProcessField: React.FunctionComponent<
  FieldProps<string> & {
    processes: Process[];
    isPending: boolean;
    fetchError: unknown;
  }
> = ({ label, schema, processes, fetchError, isPending, ...props }) => {
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
        <Form.Text className="text-muted">The UiPath process to run</Form.Text>
      )}
      {isPending && (
        <span className="text-info small">
          Fetching processes from UiPath Assistant...
        </span>
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
  const { port } = useContext(DevToolsContext);
  const basePath = [name, configKey].filter(identity).join(".");

  const [{ value: releaseKey }] = useField<string>(`${basePath}.releaseKey`);

  const [robotAvailable, setRobotAvailable] = useState(false);
  const [consentCode, setConsentCode] = useState(null);
  const [initError, setInitError] = useState(null);

  useAsyncEffect(async () => {
    if (!port) {
      setInitError(
        new Error("UiPath Assistant can only be configured from a page context")
      );
      return;
    }
    try {
      const { available, consentCode } = await initUiPathRobot(port);
      setConsentCode(consentCode);
      setRobotAvailable(available);
    } catch (err) {
      setInitError(err);
    }
  }, [port, setConsentCode, setRobotAvailable, setInitError]);

  const [processes, processesPending, processesError] = useAsyncState<
    Array<RobotProcess>
  >(async () => {
    if (robotAvailable) {
      return await getUiPathProcesses(port);
    } else {
      return [];
    }
  }, [robotAvailable]);

  // const [UiPathRobot, , initError] = useAsyncState(async () => {
  //   const module = await import(
  //     /* webpackChunkName: "uipath" */
  //     "@uipath/robot"
  //   );
  //   const { UiPathRobot } = module;
  //
  //   UiPathRobot.settings.appOrigin = "PixieBrix";
  //
  //   UiPathRobot.on("missing-components", () => {
  //     setRobotAvailable(false);
  //   });
  //
  //   UiPathRobot.on("consent-prompt", (consentCode) => {
  //     setConsentCode(consentCode);
  //   });
  //
  //   UiPathRobot.init();
  //
  //   return UiPathRobot;
  // }, [setRobotAvailable, setConsentCode]);
  //
  // const [processes, , processesError] = useAsyncState(async () => {
  //   if (UiPathRobot) {
  //     return await UiPathRobot.getProcesses();
  //   } else {
  //     return [];
  //   }
  // }, [UiPathRobot]);

  const process = useMemo(() => {
    return processes?.find((x) => x.id === releaseKey);
  }, [processes, releaseKey]);

  if (!port) {
    return (
      <div>
        <span className="text-danger">
          This action can only be configured from the Page Editor
        </span>
      </div>
    );
  } else if (!robotAvailable) {
    return (
      <div>
        <span className="text-danger">
          UiPath Assistant not found. Don&apos;t have the UiPath Assistant?{" "}
          <a
            href="#"
            onClick={async () => {
              await openTab({
                url: "https://robotjs.uipath.com/download",
                active: true,
              });
            }}
          >
            Get it now.
          </a>
        </span>
      </div>
    );
  }

  return (
    <div>
      {consentCode && (
        <span className="text-info">
          UiPath Assistant consent code: {consentCode}
        </span>
      )}
      <ProcessField
        label="process"
        name={`${basePath}.releaseKey`}
        schema={UIPATH_PROPERTIES["releaseKey"] as Schema}
        isPending={processesPending}
        processes={processes}
        fetchError={initError?.toString() ?? processesError?.toString()}
      />
      {process && (
        <ObjectField
          schema={{ type: "object", additionalProperties: true }}
          label={process.name}
          name={[name, configKey, "inputArguments"].filter(identity).join(".")}
        />
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
