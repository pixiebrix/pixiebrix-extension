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

import styles from "./Navbar.module.scss";

import React from "react";
import { Nav } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { toggleSidebar } from "./toggleSidebar";
import cx from "classnames";
import { selectAuth } from "@/auth/authSelectors";
import { type ThemeLogo } from "@/themes/themeUtils";
import useLinkState from "@/auth/useLinkState";
import useAdminConsoleUrl from "@/hooks/useAdminConsoleUrl";
import { fallbackValue } from "@/utils/asyncStateUtils";
import { DEFAULT_SERVICE_URL } from "@/urlConstants";

const Navbar: React.FunctionComponent<{ logo: ThemeLogo }> = ({ logo }) => {
  const { email } = useSelector(selectAuth);
  const { data: isLinked, isLoading: isLinkedLoading } = useLinkState();
  const { data: adminConsoleUrl } = fallbackValue(
    useAdminConsoleUrl(),
    DEFAULT_SERVICE_URL,
  );

  // Only show sidebar toggle if the extension is linked. Allow `isLinkedLoading` to optimistically show the toggle
  const showNavbarToggle = isLinked || isLinkedLoading;

  return (
    <nav className="navbar default-layout-navbar col-lg-12 col-12 p-0 fixed-top d-flex flex-row">
      <div className={cx(styles.collapsedWrapper, "navbar-brand-wrapper")}>
        <Link className="navbar-brand brand-logo" to="/">
          <img src={logo.regular} alt="PixieBrix logo" />
        </Link>
        <Link className="navbar-brand brand-logo-mini" to="/">
          <img src={logo.small} alt="PixieBrix mini logo" />
        </Link>
        {showNavbarToggle && (
          <button
            className={cx("navbar-toggler", styles.collapsedSidebarToggler)}
            type="button"
            onClick={toggleSidebar}
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        )}
      </div>
      <div className={cx(styles.expandedWrapper, "navbar-menu-wrapper")}>
        {showNavbarToggle && (
          <button
            className="navbar-toggler align-self-center"
            type="button"
            onClick={toggleSidebar}
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        )}

        <div
          className={cx(styles.extensionConsoleHeading, "d-none d-md-inline")}
        >
          Extension Console
        </div>

        <ul className="navbar-nav navbar-nav-right flex-grow-1 justify-content-end">
          {
            <Nav.Link className="px-3" target="_blank" href={adminConsoleUrl}>
              <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
              Open Admin Console
            </Nav.Link>
          }
          {isLinked && email && <div className="text-black">{email}</div>}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
