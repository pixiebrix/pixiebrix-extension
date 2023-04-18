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
import { Card } from "react-bootstrap";
import { useAsyncState } from "@/hooks/common";
import Loader from "@/components/Loader";
import { round } from "lodash";
import { count as registrySize } from "@/registry/localRegistry";
import { count as logSize } from "@/telemetry/logging";

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
    serviceWorkerRegistrations: number;
    other: number;
  };
};

const StorageSettings: React.FunctionComponent = () => {
  const [storageEstimate] = useAsyncState(
    async () => navigator.storage.estimate() as Promise<StorageEstimate>,
    []
  );

  const [brickCount] = useAsyncState(async () => registrySize(), []);
  const [logCount] = useAsyncState(async () => logSize(), []);

  return (
    <Card>
      <Card.Header>Extension Storage</Card.Header>
      <Card.Body>
        {storageEstimate ? (
          <div>
            <p>
              Usage: {round(storageEstimate.usage / 1e6, 1).toLocaleString()} /{" "}
              {round(storageEstimate.quota / 1e6, 0).toLocaleString()} MB
            </p>
            {Object.entries(storageEstimate.usageDetails ?? {}).map(
              ([key, value]) => (
                <p key={key}>
                  {key}: {round(value / 1e6, 1)}
                </p>
              )
            )}
          </div>
        ) : (
          <Loader />
        )}

        <div>Local Brick Definitions: {brickCount.toLocaleString()}</div>
        <div>Local Log Items: {logCount.toLocaleString()}</div>
      </Card.Body>
    </Card>
  );
};

export default StorageSettings;
