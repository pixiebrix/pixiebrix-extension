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

import styles from "./Navbar.module.scss";

import React from "react";
import { Dropdown, Nav } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faCaretDown,
  faExternalLinkAlt,
  faSignOutAlt,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import axios from "axios";
import logo from "@img/logo.svg";
import logoSmall from "@img/logo-small-rounded.svg";
import { DEFAULT_SERVICE_URL, getBaseURL } from "@/services/baseService";
import { useAsyncState } from "@/hooks/common";
import { isLinked } from "@/auth/token";
import { useSelector } from "react-redux";
import { toggleSidebar } from "./toggleSidebar";
import { SettingsState } from "@/store/settingsTypes";
import cx from "classnames";
import { selectAuth } from "@/auth/authSelectors";

const Navbar: React.FunctionComponent = () => {
  const { email, extension } = useSelector(selectAuth);
  const [serviceURL] = useAsyncState<string>(getBaseURL);
  const [connected, connectedPending] = useAsyncState(isLinked);
  const mode = useSelector<{ settings: SettingsState }, string>(
    ({ settings }) => settings.mode
  );

  // Use `connectedPending` to optimistically show the toggle
  const showNavbarToggle = mode === "local" || connected || connectedPending;

  return (
    <nav className="navbar default-layout-navbar col-lg-12 col-12 p-0 fixed-top d-flex flex-row">
      <div className={cx(styles.collapsedWrapper, "navbar-brand-wrapper")}>
        <Link className="navbar-brand brand-logo" to="/">
          <img src={logo} alt="PixieBrix logo" />
        </Link>
        <Link className="navbar-brand brand-logo-mini" to="/">
          <img src={logoSmall} alt="PixieBrix mini logo" />
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

        <ul className="navbar-nav navbar-nav-right">
          {serviceURL && (
            <Nav.Link
              className="mb-1 px-3"
              target="_blank"
              href={serviceURL ?? DEFAULT_SERVICE_URL}
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
              Open Admin Console
            </Nav.Link>
          )}

          {email && !extension && (
            // FIXME: remove https://github.com/pixiebrix/pixiebrix-app/issues/494
            <li className="nav-item nav-profile">
              <Dropdown alignRight>
                <Dropdown.Toggle id="profile-dropdown" className="nav-link">
                  <div className="d-flex">
                    <div className="mb-1 text-black">{email}</div>
                    <div className="ml-2 text-primary">
                      <FontAwesomeIcon icon={faCaretDown} />
                    </div>
                  </div>
                </Dropdown.Toggle>

                <Dropdown.Menu className="navbar-dropdown">
                  <Dropdown.Item
                    href="#"
                    onClick={async (event) => {
                      event.preventDefault();
                      // Posting to the Django view, not the API
                      await axios.post("/logout/");
                      location.href = "/";
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faSignOutAlt}
                      className="mr-2 text-primary"
                    />
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </li>
          )}
          {email && extension && <div className="mb-1 text-black">{email}</div>}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
