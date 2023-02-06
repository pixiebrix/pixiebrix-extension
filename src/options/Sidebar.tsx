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
import OutsideClickHandler from "react-outside-click-handler";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloud,
  faCogs,
  faCubes,
  faHammer,
  faInfoCircle,
  faSeedling,
  faStoreAlt,
} from "@fortawesome/free-solid-svg-icons";
import { SidebarLink } from "./SidebarLink";
import { closeSidebarOnSmallScreen, SIDEBAR_ID } from "./toggleSidebar";
import useFlags from "@/hooks/useFlags";
import { appApi } from "@/services/api";
import { MARKETPLACE_URL } from "@/utils/strings";

const DEFAULT_DOCUMENTATION_URL = "https://docs.pixiebrix.com/";

const Sidebar: React.FunctionComponent = () => {
  const { permit } = useFlags();
  const { data: me } = appApi.endpoints.getMe.useQueryState();
  const hasPartner = Boolean(me?.partner);

  return (
    <OutsideClickHandler onOutsideClick={closeSidebarOnSmallScreen}>
      <nav className="sidebar sidebar-offcanvas" id={SIDEBAR_ID}>
        <ul className="nav">
          <SidebarLink
            route="/blueprints"
            title="Blueprints"
            icon={faCubes}
            isActive={(match, location) =>
              Boolean(match) ||
              location.pathname === "/" ||
              location.pathname.startsWith("/extensions/")
            }
          />

          {permit("workshop") && (
            <SidebarLink route="/workshop" title="Workshop" icon={faHammer} />
          )}

          {permit("services") && (
            <SidebarLink
              route="/services"
              title="Integrations"
              icon={faCloud}
            />
          )}

          <SidebarLink route="/settings" title="Settings" icon={faCogs} />

          <hr />
          <li className="nav-text-item">
            <span className="nav-text">Quick Links</span>
          </li>

          {permit("marketplace") && (
            <li className="nav-item">
              <a
                href={MARKETPLACE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                <span className="menu-title">Marketplace</span>
                <FontAwesomeIcon icon={faStoreAlt} className="menu-icon" />
              </a>
            </li>
          )}
          {!hasPartner && (
            // Hide for partner users because we don't support custom community links yet
            <li className="nav-item">
              <a
                href="https://community.pixiebrix.com"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                <span className="menu-title">Community</span>
                <FontAwesomeIcon icon={faSeedling} className="menu-icon" />
              </a>
            </li>
          )}

          <li className="nav-item">
            <a
              href={me?.partner?.documentation_url ?? DEFAULT_DOCUMENTATION_URL}
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
