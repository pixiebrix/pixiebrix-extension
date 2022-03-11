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

import React from "react";
import { Button } from "react-bootstrap";
import { useAsyncState } from "@/hooks/common";
import { getAvailableVersion } from "@/background/messenger/api";
import reportError from "@/telemetry/reportError";
import Banner from "@/components/banner/Banner";
import { gt } from "semver";

// XXX: move this kind of async state to the Redux state.
export function useUpdateAvailable() {
  const [updateAvailable] = useAsyncState(async () => {
    try {
      const available = await getAvailableVersion();
      const installed = browser.runtime.getManifest().version;
      return available && installed !== available && gt(available, installed);
    } catch (error) {
      reportError(error);
      return false;
    }
  }, []);

  return updateAvailable;
}

const UpdateBanner: React.FunctionComponent = () => {
  const updateAvailable = useUpdateAvailable();

  if (!updateAvailable) {
    return null;
  }

  return (
    <Banner variant="warning">
      An update to PixieBrix is available
      <Button
        className="info ml-3"
        size="sm"
        onClick={() => {
          browser.runtime.reload();
        }}
      >
        Update
      </Button>
    </Banner>
  );
};

export default UpdateBanner;
