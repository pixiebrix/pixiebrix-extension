/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "react-router-dom";
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
import { useLocation } from "react-router";
import { Location } from "history";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { AuthContext } from "@/auth/context";

interface LinkProps {
  isActive?: (match: any, location: Location) => boolean;
  title: string;
  icon: IconProp;
  route: string;
}

const SidebarLink: React.FunctionComponent<LinkProps> = ({
  route,
  title,
  icon,
  isActive,
}) => {
  const location = useLocation();
  return (
    <li
      className={cx("nav-item", {
        active:
          location.pathname.startsWith(route) ||
          (isActive && isActive(null, location)),
      })}
    >
      <NavLink to={route} className="nav-link" isActive={isActive}>
        <span className="menu-title">{title}</span>
        <FontAwesomeIcon icon={icon} className="menu-icon" fixedWidth />
      </NavLink>
    </li>
  );
};

const Sidebar: React.FunctionComponent = () => {
  const { flags } = useContext(AuthContext);

  return (
    <nav className="sidebar sidebar-offcanvas" id="sidebar">
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
        {/*<ConnectedNavLink route="build" title="Build Brick" icon={faTools} />*/}
        <SidebarLink
          route="/services"
          title="Configure Services"
          icon={faCloud}
        />
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
  );
};

export default Sidebar;
