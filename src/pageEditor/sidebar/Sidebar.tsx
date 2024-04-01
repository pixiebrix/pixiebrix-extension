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

import styles from "./Sidebar.module.scss";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import { Button, Collapse } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
} from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import useFlags from "@/hooks/useFlags";
import { selectModuleListExpanded } from "@/pageEditor/slices/editorSelectors";
import HomeButton from "./HomeButton";
import ReloadButton from "./ReloadButton";
import AddStarterBrickButton from "./AddStarterBrickButton";
import Extensions from "./Extensions";

const Sidebar: React.VFC = () => {
  const dispatch = useDispatch();

  const expanded = useSelector(selectModuleListExpanded);

  const { flagOn } = useFlags();
  const showDeveloperUI =
    process.env.ENVIRONMENT === "development" ||
    flagOn("page-editor-developer");

  const collapseSidebar = () => {
    dispatch(
      actions.setModListExpanded({
        isExpanded: !expanded,
      }),
    );
  };

  return (
    <div className={cx(styles.root, "flex-shrink-0")}>
      {/* Expanded sidebar: Actions list (+ always visible Home button) */}

      <div className={styles.header}>
        <HomeButton />
        <Collapse
          dimension="width"
          in={expanded}
          unmountOnExit={true}
          mountOnEnter={true}
        >
          <div className={styles.horizontalActions}>
            <AddStarterBrickButton />
            {showDeveloperUI && <ReloadButton />}
          </div>
        </Collapse>
        <Collapse
          dimension="width"
          in={expanded}
          unmountOnExit={true}
          mountOnEnter={true}
        >
          <Button
            size="sm"
            type="button"
            variant="light"
            className={styles.toggle}
            onClick={collapseSidebar}
          >
            <FontAwesomeIcon icon={faAngleDoubleLeft} fixedWidth />
          </Button>
        </Collapse>
      </div>

      {/* Collapsed sidebar: Actions list */}
      <Collapse in={!expanded} unmountOnExit={true} mountOnEnter={true}>
        <div className={styles.verticalActions}>
          <Button
            size="sm"
            type="button"
            variant="light"
            className={styles.toggle}
            onClick={collapseSidebar}
          >
            <FontAwesomeIcon icon={faAngleDoubleRight} fixedWidth />
          </Button>
          {showDeveloperUI && <ReloadButton />}
        </div>
      </Collapse>

      {/* Expanded sidebar: Extensions list */}
      <Collapse
        dimension="width"
        timeout={5000}
        in={expanded}
        unmountOnExit={true}
        mountOnEnter={true}
      >
        {/*
        Double wrapper needed so that the list does not wrap during the
        shrinking animation, but instead it's clipped.
        */}
        <div className="d-flex flex-column flex-grow-1">
          <div
            className="d-flex flex-column flex-grow-1"
            style={{
              width: "270px",
            }}
          >
            <Extensions />
          </div>
        </div>
      </Collapse>
    </div>
  );
};

export default Sidebar;
