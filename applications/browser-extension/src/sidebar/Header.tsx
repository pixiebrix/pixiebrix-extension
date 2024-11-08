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

import React from "react";
import styles from "./ConnectedSidebar.module.scss";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog, faSync } from "@fortawesome/free-solid-svg-icons";
import useTheme from "@/hooks/useTheme";
import cx from "classnames";
import useFlags from "@/hooks/useFlags";
import { DEFAULT_THEME } from "../themes/themeTypes";
import { getExtensionConsoleUrl } from "../utils/extensionUtils";
import { FeatureFlags } from "@/auth/featureFlags";

function reloadSidebar() {
  location.reload();
}

const Header: React.FunctionComponent = () => {
  const {
    activeTheme: { logo, showSidebarLogo, customSidebarLogo, themeName },
    isLoading: isThemeLoading,
  } = useTheme();

  const { flagOn } = useFlags();
  const showDeveloperUI =
    process.env.ENVIRONMENT === "development" ||
    flagOn(FeatureFlags.PAGE_EDITOR_DEVELOPER);

  const headerButtonClassName = cx(styles.button, {
    [styles.themeColorOverride || ""]: themeName === DEFAULT_THEME,
    [styles.themeColor || ""]: themeName !== DEFAULT_THEME,
  });

  return (
    <div className="d-flex py-2 pl-2 pr-0 align-items-center">
      <div className="mx-auto">
        {!isThemeLoading && showSidebarLogo && (
          <img
            src={customSidebarLogo ?? logo.regular}
            alt={customSidebarLogo ? "Custom logo" : "PixieBrix logo"}
            className={styles.logo}
            data-testid="sidebarHeaderLogo"
          />
        )}
      </div>
      {showDeveloperUI && (
        <Button
          type="button"
          size="sm"
          variant="link"
          onClick={reloadSidebar}
          className={headerButtonClassName}
          title="Reload sidebar (button only shown in dev builds)"
        >
          <FontAwesomeIcon icon={faSync} />
        </Button>
      )}
      <Button
        href={getExtensionConsoleUrl()}
        size="sm"
        variant="link"
        className={headerButtonClassName}
        title="Open Extension Console"
      >
        <FontAwesomeIcon icon={faCog} />
      </Button>
    </div>
  );
};

export default Header;
