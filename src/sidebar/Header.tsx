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
import styles from "./ConnectedSidebar.module.scss";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleRight, faCog } from "@fortawesome/free-solid-svg-icons";
import { hideSidebar } from "@/contentScript/messenger/api";
import { whoAmI } from "@/background/messenger/api";
import useTheme from "@/hooks/useTheme";

type HeaderProps = {};

const Header: React.FunctionComponent<HeaderProps> = (props) => {
  const { logo } = useTheme();

  return (
    <div className="d-flex p-2 justify-content-between align-content-center">
      <Button
        className={styles.button}
        onClick={async () => {
          const sidebar = await whoAmI();
          await hideSidebar({ tabId: sidebar.tab.id });
        }}
        size="sm"
        variant="link"
      >
        <FontAwesomeIcon icon={faAngleDoubleRight} className="fa-lg" />
      </Button>
      <div className="align-self-center">
        <img src={logo.regular} alt="PixieBrix logo" className={styles.logo} />
      </div>
      <Button
        href="/options.html"
        target="_blank"
        size="sm"
        variant="link"
        className={styles.button}
      >
        <span>
          Options <FontAwesomeIcon icon={faCog} />
        </span>
      </Button>
    </div>
  );
};

export default Header;
