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

import React, { useCallback } from "react";
import { Button } from "react-bootstrap";
import browser from "webextension-polyfill";
import { useAsyncState } from "@/hooks/common";
import { getAvailableVersion } from "@/background/messenger/api";
import { reportError } from "@/telemetry/logging";
import Banner from "@/components/banner/Banner";

const UpdateBanner: React.FunctionComponent = () => {
  const [updateAvailable] = useAsyncState(async () => {
    try {
      const available = await getAvailableVersion();
      const installed = browser.runtime.getManifest().version;
      return available && installed !== available;
    } catch (error) {
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
    <Banner variant="warning">
      An update to PixieBrix is available
      <Button className="info ml-3" size="sm" onClick={update}>
        Update
      </Button>
    </Banner>
  );
};

export default UpdateBanner;
