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

import React, { useCallback } from "react";
import { Button } from "react-bootstrap";
import "@/layout/Banner";
import { browser } from "webextension-polyfill-ts";
import { useAsyncState } from "@/hooks/common";
import { getAvailableVersion } from "@/background/installer";
import { reportError } from "@/telemetry/logging";

const UpdateBanner: React.FunctionComponent = () => {
  const [updateAvailable] = useAsyncState(async () => {
    try {
      const { installed, available } = await getAvailableVersion();
      return available && installed !== available;
    } catch (error: unknown) {
      reportError(error);
      return false;
    }
  }, []);

  const update = useCallback(() => {
    browser.runtime.reload();
  }, []);

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="update-banner w-100">
      <div className="mx-auto d-flex">
        <div className="flex-grow-1" />
        <div className="align-self-center">
          An update to PixieBrix is available
        </div>
        <div className="ml-3">
          <Button className="info" size="sm" onClick={update}>
            Update
          </Button>
        </div>
        <div className="flex-grow-1" />
      </div>
    </div>
  );
};

export default UpdateBanner;
