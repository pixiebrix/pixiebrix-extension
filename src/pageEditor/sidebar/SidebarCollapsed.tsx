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

import styles from "./Sidebar.module.scss";
import React from "react";
import { Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import useFlags from "@/hooks/useFlags";
import ReloadButton from "./ReloadButton";
import Logo from "./Logo";

const SidebarCollapsed: React.VoidFunctionComponent<{
  expandSidebar: () => void;
}> = ({ expandSidebar }) => {
  const { flagOn } = useFlags();

  const showDeveloperUI =
    process.env.ENVIRONMENT === "development" ||
    flagOn("page-editor-developer");

  return (
    <div className={cx(styles.root, styles.collapsed)}>
      <Button
        variant="light"
        className={styles.toggle}
        type="button"
        onClick={expandSidebar}
      >
        <Logo />
        <FontAwesomeIcon icon={faAngleDoubleRight} />
      </Button>
      {showDeveloperUI && <ReloadButton />}
    </div>
  );
};

export default SidebarCollapsed;
