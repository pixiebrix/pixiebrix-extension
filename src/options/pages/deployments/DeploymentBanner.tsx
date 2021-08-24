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

import React from "react";
import "@/layout/Banner";
import cx from "classnames";
import useDeployments from "@/hooks/useDeployments";
import AsyncButton from "@/components/AsyncButton";
import { useRouteMatch } from "react-router";

const DeploymentBanner: React.FunctionComponent<{ className?: string }> = ({
  className,
}) => {
  const { hasUpdate, update } = useDeployments();
  const matchInstalled = useRouteMatch({ path: "/installed", exact: true });
  const matchMarketplace = useRouteMatch({ path: "/marketplace", exact: true });
  const matchTemplates = useRouteMatch({ path: "/templates", exact: true });

  if (!hasUpdate) {
    return null;
  }

  if (!(matchInstalled || matchMarketplace || matchTemplates)) {
    // Only show on certain pages where the user expects to see a top-level install button. It's especially confusing
    // to show the banner on other pages with an activate button (e.g., the marketplace wizard, in the workshop, etc.)
    return null;
  }

  return (
    <div
      className={cx("deployment-banner w-100", className)}
      style={{ flex: "none" }}
    >
      <div className="mx-auto d-flex">
        <div className="flex-grow-1" />
        <div className="align-self-center">
          New team bricks are ready to activate
        </div>
        <div className="ml-3">
          <AsyncButton className="info" size="sm" onClick={update}>
            Activate
          </AsyncButton>
        </div>
        <div className="flex-grow-1" />
      </div>
    </div>
  );
};

export default DeploymentBanner;
