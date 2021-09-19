/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useContext, useMemo, useState } from "react";
import { compact } from "lodash";
import { UIPATH_PROPERTIES } from "@/contrib/uipath/localProcess";
import { Schema } from "@/core";
import { useField } from "formik";
import { useAsyncState } from "@/hooks/common";
import { Button } from "react-bootstrap";
import { fieldLabel } from "@/components/fields/fieldUtils";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { useAsyncEffect } from "use-async-effect";
import {
  getUiPathProcesses,
  initUiPathRobot,
} from "@/background/devtools/protocol";
import { DevToolsContext } from "@/devTools/context";
import { RobotProcess } from "@uipath/robot/dist/models";
import ObjectField from "@/components/fields/schemaFields/ObjectField";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useReleases } from "@/contrib/uipath/ProcessOptions";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import useDependency from "@/services/useDependency";
import { UIPATH_SERVICE_IDS } from "@/contrib/uipath/process";
import { getErrorMessage } from "@/errors";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SelectWidget from "@/devTools/editor/fields/SelectWidget";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import { releaseSchema } from "@/contrib/uipath/typeUtils";
import {
  BlockOptionProps,
  OUTPUT_KEY_SCHEMA,
} from "@/components/fields/schemaFields/genericOptionsFactory";
import SchemaField from "@/components/fields/schemaFields/SchemaField";

interface Process {
  id: string;
  name: string;
}

export const ProcessField: React.FunctionComponent<
  SchemaFieldProps<string> & {
    processes: Process[];
    isPending: boolean;
    fetchError: unknown;
  }
> = ({ label, schema, processes, fetchError, isPending, ...props }) => {
  const [{ value, ...field }] = useField(props);

  const options = useMemo(
    () =>
      (processes ?? []).map((x) => ({
        value: x.id,
        label: x.name,
        process: x,
      })),
    [processes]
  );

  return (
    <ConnectedFieldTemplate
      label={label ?? fieldLabel(field.name)}
      description="The UiPath process to run"
      as={SelectWidget}
      isLoading={isPending}
      error={fetchError}
      loadingMessage="Loading processes from UiPath Assistant"
      options={options}
      value={options.find((x) => x.value === value)}
    />
  );
};

function useReleaseSchema(releaseKey: string) {
  const { releases, isPending, error, hasConfig } = useReleases();
  const schema = useMemo(() => {
    if (releaseKey != null && releases != null) {
      const release = releases.find((x) => x.Key === releaseKey);
      if (release) {
        return releaseSchema(release);
      }
    }

    return null;
  }, [releaseKey, releases]);

  return { schema, isPending, error, hasConfig };
}

const LocalProcessOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
  showOutputKey,
}) => {
  const { port } = useContext(DevToolsContext);
  const basePath = compact([name, configKey]).join(".");

  const [{ value: releaseKey }] = useField<string>(`${basePath}.releaseKey`);

  const {
    config: remoteConfig,
    hasPermissions,
    requestPermissions,
  } = useDependency(UIPATH_SERVICE_IDS);

  const { schema, error: schemaError } = useReleaseSchema(releaseKey);

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
    } catch (error: unknown) {
      setInitError(error);
    }
  }, [port, setConsentCode, setRobotAvailable, setInitError]);

  const [processes, processesPending, processesError] = useAsyncState<
    RobotProcess[]
  >(async () => {
    if (robotAvailable) {
      return getUiPathProcesses(port);
    }

    return [];
  }, [robotAvailable]);

  const process = useMemo(() => processes?.find((x) => x.id === releaseKey), [
    processes,
    releaseKey,
  ]);

  if (!port) {
    return (
      <div>
        <span className="text-danger">
          This action can only be configured from the Page Editor
        </span>
      </div>
    );
  }

  if (!robotAvailable) {
    return (
      <div>
        <span className="text-danger">
          UiPath Assistant not found. Don&apos;t have the UiPath Assistant?{" "}
          <a
            href="https://robotjs.uipath.com/download"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get it now.
          </a>
        </span>
      </div>
    );
  }

  const argumentsName = compact([name, configKey, "inputArguments"]).join(".");

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
        schema={UIPATH_PROPERTIES.releaseKey as Schema}
        isPending={processesPending}
        processes={processes}
        fetchError={initError ?? processesError}
      />

      {!remoteConfig && (
        <span className="text-info">
          <FontAwesomeIcon icon={faInfo} /> Add a UiPath Orchestrator API
          integration to automatically fetch the input argument definitions.
        </span>
      )}

      {!hasPermissions && remoteConfig != null && (
        <div>
          <div>
            <span className="text-info">
              <FontAwesomeIcon icon={faInfo} /> Grant PixieBrix access to
              connect to UiPath to fetch the input argument definitions
            </span>
          </div>
          <div>
            <Button onClick={requestPermissions}>Grant Permissions</Button>
          </div>
        </div>
      )}

      {schemaError && (
        <span className="text-danger">
          Error fetching input arguments: {getErrorMessage(schemaError)}
        </span>
      )}

      {schema ? (
        <ChildObjectField
          heading={process?.name}
          name={argumentsName}
          schema={schema}
        />
      ) : (
        <ObjectField
          name={argumentsName}
          label={process?.name ?? "inputArguments"}
          schema={{ type: "object", additionalProperties: true }}
        />
      )}

      {showOutputKey && (
        <SchemaField
          name={`${name}.outputKey`}
          label="Output Variable"
          schema={OUTPUT_KEY_SCHEMA}
        />
      )}
    </div>
  );
};

export default LocalProcessOptions;
