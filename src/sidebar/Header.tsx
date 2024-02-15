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
import { faAngleDoubleRight, faCog } from "@fortawesome/free-solid-svg-icons";
import { hideSidebar } from "@/contentScript/messenger/strict/api";
import useTheme, { useGetTheme } from "@/hooks/useTheme";
import cx from "classnames";
import { getTopLevelFrame } from "webext-messenger";
import { isMV3 } from "@/mv3/api";

const Header: React.FunctionComponent = () => {
  const { logo, showSidebarLogo, customSidebarLogo } = useTheme();
  const theme = useGetTheme();
  /* In MV3, Chrome offers a native Close button */
  const showCloseButton = !isMV3();

  return (
    <div className="d-flex py-2 pl-2 pr-0 align-items-center">
      {showCloseButton && (
        <Button
          className={cx(
            styles.button,
            theme === "default" ? styles.themeColorOverride : styles.themeColor,
          )}
          onClick={async () => {
            // This piece of code is MV2-only, it only needs to handle being run in an iframe
            const topLevelFrame = await getTopLevelFrame();
            await hideSidebar(topLevelFrame);
          }}
          size="sm"
          variant="link"
        >
          <FontAwesomeIcon icon={faAngleDoubleRight} className="fa-lg" />
        </Button>
      )}
      {showSidebarLogo && (
        // `mx-auto` centers the logo
        <div className="mx-auto">
          <img
            src={customSidebarLogo ?? logo.regular}
            alt={customSidebarLogo ? "Custom logo" : "PixieBrix logo"}
            className={styles.logo}
            data-testid="sidebarHeaderLogo"
          />
        </div>
      )}
      <Button
        href="/options.html"
        target="_blank"
        size="sm"
        variant="link"
        className={cx(
          styles.button,
          theme === "default" ? styles.themeColorOverride : styles.themeColor,
        )}
      >
        <FontAwesomeIcon icon={faCog} />
      </Button>
    </div>
  );
};

export default Header;
