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
import { Card, Table } from "react-bootstrap";
import { useAsyncState } from "@/hooks/common";
import { round } from "lodash";
import {
  count as registrySize,
  recreateDB as recreateBrickDB,
} from "@/registry/localRegistry";
import {
  clearLogs,
  recreateDB as recreateLogDB,
  count as logSize,
} from "@/telemetry/logging";
import AsyncButton from "@/components/AsyncButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBroom, faDatabase } from "@fortawesome/free-solid-svg-icons";
import useUserAction from "@/hooks/useUserAction";
import {
  clearTraces,
  recreateDB as recreateTraceDB,
  count as traceSize,
} from "@/telemetry/trace";
import AsyncStateGate, { StandardError } from "@/components/AsyncStateGate";
import cx from "classnames";
import styles from "@/extensionConsole/pages/settings/SettingsCard.module.scss";

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate
 */
type StorageEstimate = {
  /**
   * A numeric value in bytes approximating the amount of storage space currently being used by the site or Web app,
   * out of the available space as indicated by quota. Unit is byte.
   */
  usage: number;
  /**
   * A numeric value in bytes which provides a conservative approximation of the total storage the user's device or
   * computer has available for the site origin or Web app. It's possible that there's more than this amount of space
   * available though you can't rely on that being the case.
   */
  quota: number;

  /**
   * An object containing a breakdown of usage by storage system. All included properties will have a usage greater
   * than 0 and any storage system with 0 usage will be excluded from the object.
   */
  usageDetails: {
    // https://github.com/whatwg/storage/issues/63#issuecomment-437990804
    indexedDB?: number;
    caches?: number;
    serviceWorkerRegistrations?: number;
    other: number;
  };
};

/**
 * React component to display local storage usage (to help identify storage problems)
 * @constructor
 */
const StorageSettings: React.FunctionComponent = () => {
  const state = useAsyncState(
    async () => ({
      storageEstimate: (await navigator.storage.estimate()) as StorageEstimate,
      brickCount: await registrySize(),
      logCount: await logSize(),
      traceCount: await traceSize(),
    }),
    []
  );

  const recalculate = state[3];

  const clearLogsAction = useUserAction(
    async () => {
      await Promise.all([clearLogs(), clearTraces()]);
      await recalculate();
    },
    {
      successMessage: "Cleaned up unnecessary local data",
      errorMessage: "Error cleaning unnecessary local data",
    },
    [recalculate]
  );

  const recoverStorageAction = useUserAction(
    async () => {
      await Promise.all([
        recreateLogDB(),
        recreateTraceDB(),
        recreateBrickDB(),
      ]);
      await recalculate();
    },
    {
      successMessage: "Recreated local databases",
      errorMessage: "Error recreating local databases",
    },
    [recalculate]
  );

  return (
    <Card>
      <Card.Header>Extension Storage Statistics</Card.Header>
      <Card.Body
        className={
          // Make table flush with card body borders
          cx({ "p-0": Boolean(state[0]) })
        }
      >
        <AsyncStateGate
          state={state}
          renderError={(props) => <StandardError {...props} />}
        >
          {({
            data: { storageEstimate, brickCount, logCount, traceCount },
          }) => (
            <Table>
              <tbody>
                <tr>
                  <td>Usage (MB)</td>
                  <td>
                    {round(storageEstimate.usage / 1e6, 1).toLocaleString()} /{" "}
                    {round(storageEstimate.quota / 1e6, 0).toLocaleString()}
                  </td>
                </tr>
                {Object.entries(storageEstimate.usageDetails ?? {}).map(
                  ([key, value]) => (
                    <tr key={key}>
                      <td>{key} (MB)</td>
                      <td>{round(value / 1e6, 1)}</td>
                    </tr>
                  )
                )}
                <tr>
                  <td># Brick Versions</td>
                  <td>{brickCount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td># Log Records</td>
                  <td>{logCount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td># Trace Records</td>
                  <td>{traceCount.toLocaleString()}</td>
                </tr>
              </tbody>
            </Table>
          )}
        </AsyncStateGate>
      </Card.Body>
      <Card.Footer className={styles.cardFooter}>
        <AsyncButton variant="info" onClick={clearLogsAction}>
          <FontAwesomeIcon icon={faBroom} /> Cleanup Unnecessary Data
        </AsyncButton>

        <AsyncButton variant="warning" onClick={recoverStorageAction}>
          <FontAwesomeIcon icon={faDatabase} /> Recover Databases
        </AsyncButton>
      </Card.Footer>
    </Card>
  );
};

export default StorageSettings;
