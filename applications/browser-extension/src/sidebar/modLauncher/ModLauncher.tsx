/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import styles from "./ModLauncher.module.scss";

import React from "react";
import cx from "classnames";
import { Navbar } from "react-bootstrap";
import { ActiveSidebarModsList } from "./ActiveSidebarModsList";
import useFlags from "../../hooks/useFlags";
import reportEvent from "../../telemetry/reportEvent";
import { Events } from "../../telemetry/events";
import { showWalkthroughModal } from "../../contentScript/messenger/api";
import { getConnectedTarget } from "../connectedTarget";
import { RestrictedFeatures } from "../../auth/featureFlags";

const ModLauncher: React.FunctionComponent = () => {
  const { permit } = useFlags();

  return (
    <>
      <ActiveSidebarModsList />
      {permit(RestrictedFeatures.PAGE_EDITOR) && (
        <Navbar className={cx([styles.footer, "flex-grow-0"])}>
          <button
            onClick={async (event) => {
              event.preventDefault();

              reportEvent(Events.PAGE_EDITOR_WALKTHROUGH_LINK_CLICK, {
                source: "ModLauncher",
              });

              const frame = await getConnectedTarget();
              showWalkthroughModal(frame);
            }}
          >
            Learn: Open the Page Editor
          </button>
          <span className="mx-2">•</span>{" "}
          <a href="https://docs.pixiebrix.com/">Documentation</a>
        </Navbar>
      )}
    </>
  );
};

export default ModLauncher;
