/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import React, { useMemo, useState } from "react";
import { partial } from "lodash";
import { UIPATH_PROPERTIES as REMOTE_UIPATH_PROPERTIES } from "@/contrib/uipath/process";
import { Expression, Schema } from "@/core";
import { useAsyncEffect } from "use-async-effect";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";
import { BlockOptionProps } from "@/components/fields/schemaFields/genericOptionsFactory";
import { useSelectedRelease } from "@/contrib/uipath/uipathHooks";
import { joinName } from "@/utils";
import RequireServiceConfig from "@/contrib/RequireServiceConfig";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import RemoteSelectWidget from "@/components/form/widgets/RemoteSelectWidget";
import { thisTab } from "@/devTools/utils";
import { getProcesses, initRobot } from "@/contentScript/messenger/api";
import { isDevToolsPage } from "webext-detect-page";
import { useField } from "formik";
import { isExpression } from "@/runtime/mapArgs";
import WorkshopMessage from "@/components/fields/schemaFields/WorkshopMessage";

function useLocalRobot() {
  const [robotAvailable, setRobotAvailable] = useState(false);
  const [consentCode, setConsentCode] = useState(null);
  const [initError, setInitError] = useState(null);

  useAsyncEffect(async () => {
    if (!isDevToolsPage()) {
      setInitError(
        new Error("UiPath Assistant can only be configured from a page context")
      );
      return;
    }

    try {
      const { available, consentCode } = await initRobot(thisTab);
      setConsentCode(consentCode);
      setRobotAvailable(available);
    } catch (error) {
      setInitError(error);
    }
  }, [setConsentCode, setRobotAvailable, setInitError]);

  return {
    robotAvailable,
    consentCode,
    initError,
  };
}

const LocalProcessOptions: React.FunctionComponent<BlockOptionProps> = ({
  name,
  configKey,
}) => {
  const configName = partial(joinName, name, configKey);

  const [{ value: releaseKey }] = useField<string | Expression>(
    configName("releaseKey")
  );

  const { robotAvailable, consentCode } = useLocalRobot();
  const { selectedRelease } = useSelectedRelease(configName("releaseKey"));

  const processesPromise = useMemo(async () => {
    if (robotAvailable) {
      return getProcesses(thisTab);
    }

    return [];
  }, [robotAvailable]);

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

  return isExpression(releaseKey) ? (
    <WorkshopMessage />
  ) : (
    <div>
      {consentCode && (
        <span className="text-info">
          UiPath Assistant consent code: {consentCode}
        </span>
      )}

      <RequireServiceConfig
        // FIXME: this service use is options-only. As-is this will create an integration entry in the background. We
        //  need to support 1) making RemoteServiceConfig optional, and 2) not storing the state in Formik
        serviceSchema={REMOTE_UIPATH_PROPERTIES.uipath as Schema}
        serviceFieldName={configName("service")}
      >
        {() => (
          <>
            <ConnectedFieldTemplate
              label="Process"
              description="Select a local process"
              name={configName("releaseKey")}
              as={RemoteSelectWidget}
              blankValue={null}
              optionsFactory={processesPromise}
            />

            <ChildObjectField
              heading={selectedRelease?.release?.Name ?? "Input Arguments"}
              schema={selectedRelease?.schema}
              name={configName("inputArguments")}
            />
          </>
        )}
      </RequireServiceConfig>
    </div>
  );
};

export default LocalProcessOptions;
