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
import useDeployments from "@/hooks/useDeployments";
import AsyncButton from "@/components/AsyncButton";
import { useRouteMatch } from "react-router";
import browser from "webextension-polyfill";
import chromeP from "webext-polyfill-kinda";
import Banner from "@/components/banner/Banner";

const DeploymentBanner: React.FunctionComponent = () => {
  const { hasUpdate, update, extensionUpdateRequired } = useDeployments();

  // Only show on certain pages where the user expects to see a top-level install button. It's especially confusing
  // to show the banner on other pages with an activate button (e.g., the marketplace wizard, in the workshop, etc.)
  const matchRoot = useRouteMatch({ path: "/", exact: true });
  const matchInstalled = useRouteMatch({ path: "/installed", exact: true });
  const matchMarketplace = useRouteMatch({ path: "/blueprints", exact: true });

  const updateExtension = useCallback(async () => {
    await chromeP.runtime.requestUpdateCheck();
    browser.runtime.reload();
  }, []);

  if (!hasUpdate) {
    return null;
  }

  if (!(matchRoot || matchInstalled || matchMarketplace)) {
    return null;
  }

  if (extensionUpdateRequired) {
    return (
      <Banner variant="info">
        Update the PixieBrix extension to activate team bricks
        <AsyncButton className="info ml-3" size="sm" onClick={updateExtension}>
          Update
        </AsyncButton>
      </Banner>
    );
  }

  return (
    <Banner variant="info">
      Team bricks are ready to activate
      <AsyncButton className="info ml-3" size="sm" onClick={update}>
        Activate
      </AsyncButton>
    </Banner>
  );
};

export default DeploymentBanner;
