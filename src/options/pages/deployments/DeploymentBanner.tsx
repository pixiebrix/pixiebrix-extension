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
import useDeployments from "@/hooks/useDeployments";
import AsyncButton from "@/components/AsyncButton";
import { useRouteMatch } from "react-router";
import Banner from "@/components/banner/Banner";
import DeploymentModal from "@/options/pages/deployments/DeploymentModal";

/**
 * Banner to install deployments. Always is displayed even if used has snoozed deployment installation.
 * @see DeploymentModal
 */
const DeploymentBanner: React.FunctionComponent = () => {
  // Use a single useDeployments for both the banner and modal because useDeployments makes a network call. In the
  // future, we need to move the state to Redux
  const deploymentState = useDeployments();
  const { hasUpdate, update, extensionUpdateRequired, updateExtension } =
    deploymentState;

  // Only show on certain pages where the user expects to see a top-level install button. It's especially confusing
  // to show the banner on other pages with an activate button (e.g., the marketplace wizard, in the workshop, etc.)
  const matchRoot = useRouteMatch({ path: "/", exact: true });
  const matchInstalled = useRouteMatch({ path: "/installed", exact: true });
  const matchMarketplace = useRouteMatch({ path: "/blueprints", exact: true });

  if (!hasUpdate) {
    return null;
  }

  if (!(matchRoot || matchInstalled || matchMarketplace)) {
    return null;
  }

  if (extensionUpdateRequired) {
    return (
      <>
        <DeploymentModal {...deploymentState} />
        <Banner variant="info">
          Update the PixieBrix Browser Extension to activate team deployments
          <AsyncButton
            className="info ml-3"
            size="sm"
            onClick={updateExtension}
          >
            Update
          </AsyncButton>
        </Banner>
      </>
    );
  }

  return (
    <>
      <DeploymentModal {...deploymentState} />
      <Banner variant="info">
        Team deployments are ready to activate
        <AsyncButton className="info ml-3" size="sm" onClick={update}>
          Activate
        </AsyncButton>
      </Banner>
    </>
  );
};

export default DeploymentBanner;
