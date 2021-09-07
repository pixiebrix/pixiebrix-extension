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

import React, { useContext } from "react";
import OutsideClickHandler from "react-outside-click-handler";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClipboardCheck,
  faCloud,
  faCogs,
  faCubes,
  faHammer,
  faInfoCircle,
  faStoreAlt,
} from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import AuthContext from "@/auth/AuthContext";
import { SidebarLink } from "./SidebarLink";
import { closeSidebarOnSmallScreen, SIDEBAR_ID } from "./toggleSidebar";

const Sidebar: React.FunctionComponent = () => {
  const { flags } = useContext(AuthContext);

  return (
    <OutsideClickHandler onOutsideClick={closeSidebarOnSmallScreen}>
      <nav className="sidebar sidebar-offcanvas" id={SIDEBAR_ID}>
        <ul className="nav">
          <SidebarLink
            route="/installed"
            title="Active Bricks"
            icon={faCubes}
            isActive={(match, location) =>
              match ||
              location.pathname === "/" ||
              location.pathname.startsWith("/extensions/")
            }
          />
          <SidebarLink
            route="/templates"
            title="Templates"
            icon={faClipboardCheck}
          />
          {flags.includes("marketplace") && (
            <SidebarLink
              route="/marketplace"
              title="Marketplace"
              icon={faStoreAlt}
            />
          )}
          {flags.includes("workshop") && (
            <SidebarLink route="/workshop" title="Workshop" icon={faHammer} />
          )}
          {/* <ConnectedNavLink route="build" title="Build Brick" icon={faTools} /> */}
          <SidebarLink route="/services" title="Integrations" icon={faCloud} />
          <SidebarLink route="/settings" title="Settings" icon={faCogs} />
          <li className={cx("nav-item")}>
            <a
              href="https://docs.pixiebrix.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-link"
            >
              <span className="menu-title">Documentation</span>
              <FontAwesomeIcon icon={faInfoCircle} className="menu-icon" />
            </a>
          </li>
        </ul>
      </nav>
    </OutsideClickHandler>
  );
};

export default Sidebar;
