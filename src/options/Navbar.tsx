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

import styles from "./Navbar.module.scss";

import React, { useEffect } from "react";
import { Nav } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import { DEFAULT_SERVICE_URL, getBaseURL } from "@/services/baseService";
import { useAsyncState } from "@/hooks/common";
import {
  addListener as addAuthListener,
  readPartnerAuthData,
  removeListener as removeAuthListener,
} from "@/auth/token";
import { useSelector } from "react-redux";
import { toggleSidebar } from "./toggleSidebar";
import { type SettingsState } from "@/store/settingsTypes";
import cx from "classnames";
import { selectAuth } from "@/auth/authSelectors";
import { type ThemeLogo } from "@/utils/themeUtils";
import useLinkState from "@/auth/useLinkState";

function useAdminConsoleUrl(): string {
  // Need to update serviceURL on changes to partner auth data:
  // https://github.com/pixiebrix/pixiebrix-extension/issues/4594
  const [serviceURL, _serviceUrlPending, _serviceUrlError, refreshServiceUrl] =
    useAsyncState<string>(async () => {
      const baseURL = await getBaseURL();
      const partnerAuth = await readPartnerAuthData();
      const url = partnerAuth?.token
        ? new URL("partner-auth", baseURL)
        : new URL(baseURL);
      return url.toString();
    });

  useEffect(() => {
    // Listen for token invalidation
    const handler = async () => {
      void refreshServiceUrl();
    };

    addAuthListener(handler);

    return () => {
      removeAuthListener(handler);
    };
  }, [refreshServiceUrl]);

  return serviceURL ?? DEFAULT_SERVICE_URL;
}

const Navbar: React.FunctionComponent<{ logo: ThemeLogo }> = ({ logo }) => {
  const { email } = useSelector(selectAuth);

  const { hasToken: connected, tokenLoading: connectedPending } =
    useLinkState();

  const serviceURL = useAdminConsoleUrl();

  const mode = useSelector<{ settings: SettingsState }, string>(
    ({ settings }) => settings.mode
  );

  // Use `connectedPending` to optimistically show the toggle
  const showNavbarToggle = mode === "local" || connected || connectedPending;

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
            <Nav.Link className="px-3" target="_blank" href={serviceURL}>
              <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-1" />
              Open Admin Console
            </Nav.Link>
          }
          {connected && email && <div className="text-black">{email}</div>}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
