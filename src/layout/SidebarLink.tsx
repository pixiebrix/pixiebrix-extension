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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "react-router-dom";
import cx from "classnames";
import { useLocation } from "react-router";
import { Location } from "history";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { closeSidebarOnSmallScreen } from "./toggleSidebar";

interface LinkProps {
  isActive?: (match: any, location: Location) => boolean;
  title: string;
  icon: IconProp;
  route: string;
}

export const SidebarLink: React.FunctionComponent<LinkProps> = ({
  route,
  title,
  icon,
  isActive,
}) => {
  const location = useLocation();
  const rootPathname = location.pathname.split("/")[1];
  const rootRoute = route.split("/")[1];

  return (
    <li
      className={cx("nav-item", {
        active: rootPathname === rootRoute || isActive?.(null, location),
      })}
    >
      <NavLink
        to={route}
        className="nav-link"
        isActive={isActive}
        onClick={closeSidebarOnSmallScreen}
      >
        <span className="menu-title">{title}</span>
        <FontAwesomeIcon icon={icon} className="menu-icon" fixedWidth />
      </NavLink>
    </li>
  );
};
