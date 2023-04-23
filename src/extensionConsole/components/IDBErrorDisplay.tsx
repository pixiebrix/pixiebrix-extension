/* eslint-disable unicorn/filename-case -- IDB is an abbreviation */
/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
  DefaultErrorComponent,
  type ErrorDisplayProps,
} from "@/components/ErrorBoundary";
import { isIDBConnectionError, isIDBQuotaError } from "@/utils/idbUtils";
import useUserAction from "@/hooks/useUserAction";
import { clearLogs, recreateDB as recreateLogDB } from "@/telemetry/logging";
import { clearTraces, recreateDB as recreateTraceDB } from "@/telemetry/trace";
import { recreateDB as recreateBrickDB } from "@/registry/localRegistry";
import {
  recreateDB as recreateEventDB,
  clear as clearEvents,
  // eslint-disable-next-line import/no-restricted-paths -- safe import because IDB is shared resource
} from "@/background/telemetry";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRedo } from "@fortawesome/free-solid-svg-icons";
import AsyncButton from "@/components/AsyncButton";
import { sleep } from "@/utils";
import { useAsyncState } from "@/hooks/common";
import { type StorageEstimate } from "@/types/browserTypes";
import { expectContext } from "@/utils/expectContext";
import AsyncStateGate from "@/components/AsyncStateGate";
import { round } from "lodash";
import { reportEvent } from "@/telemetry/events";

const ConnectionErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errorMessage,
  errorContext,
}) => {
  const recoverAction = useUserAction(
    async () => {
      await Promise.all([
        recreateLogDB(),
        recreateTraceDB(),
        recreateBrickDB(),
        recreateEventDB(),
      ]);
    },
    {
      successMessage: "Recreated local databases. Reloading page.",
      errorMessage: "Error recreating local databases",
    },
    []
  );

  return (
    <div className="p-3">
      <h1>Something went wrong.</h1>
      <div>
        <p>Error connecting to local database.</p>
      </div>
      <div>
        <AsyncButton
          onClick={async () => {
            await recoverAction();
            // Must happen after the clear so the event doesn't get cleared from the event DB buffer
            reportEvent("IDBRecoverConnection", { errorMessage, errorContext });
            // Put outside the action so user can see the success message before the page reloads.
            await sleep(250);
            location.reload();
          }}
        >
          <FontAwesomeIcon icon={faRedo} /> Retry
        </AsyncButton>
      </div>
    </div>
  );
};

const QuotaErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errorMessage,
  errorContext,
}) => {
  const state = useAsyncState(
    async () => ({
      storageEstimate: (await navigator.storage.estimate()) as StorageEstimate,
    }),
    []
  );

  const recoverAction = useUserAction(
    async () => {
      await Promise.all([clearLogs(), clearTraces(), clearEvents()]);
    },
    {
      successMessage: "Reclaimed local space. Reloading page.",
      errorMessage: "Error reclaiming local space",
    },
    []
  );

  return (
    <div className="p-3">
      <h1>Something went wrong.</h1>
      <div>
        <p>Insufficient storage space available to PixieBrix.</p>
        <AsyncStateGate state={state} renderLoader={() => <p></p>}>
          {({ data: { storageEstimate } }) => (
            <p className="text-small">
              Using
              {round(storageEstimate.usage / 1e6, 1).toLocaleString()} MB of
              {round(storageEstimate.quota / 1e6, 0).toLocaleString()} MB
              available
            </p>
          )}
        </AsyncStateGate>
      </div>
      <div>
        <AsyncButton
          onClick={async () => {
            await recoverAction();
            // Must happen after the re-create so the event doesn't get cleared from the event DB buffer
            reportEvent("IDBReclaimQuota", {
              errorContext,
              errorMessage,
              usage: state[0]?.storageEstimate.usage,
              quota: state[0]?.storageEstimate.quota,
            });
            // Put outside the action so user can see the success message before the page reloads.
            await sleep(250);
            location.reload();
          }}
        >
          <FontAwesomeIcon icon={faRedo} /> Reclaim Space
        </AsyncButton>
      </div>
    </div>
  );
};

/**
 * A component that displays custom error messages for IDB errors.
 *
 * Use with ErrorBoundary.ErrorComponent
 *
 * @see ErrorBoundary
 */
const IDBErrorDisplay: React.FC<ErrorDisplayProps> = (props) => {
  expectContext("extension");

  const { error } = props;

  if (isIDBConnectionError(error)) {
    return <ConnectionErrorDisplay {...props} />;
  }

  if (isIDBQuotaError(error)) {
    return <QuotaErrorDisplay {...props} />;
  }

  return <DefaultErrorComponent {...props} />;
};

export default IDBErrorDisplay;
