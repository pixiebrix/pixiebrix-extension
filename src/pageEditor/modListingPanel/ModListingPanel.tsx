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

import styles from "./ModListingPanel.module.scss";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { Button, Collapse as BootstrapCollapse } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
} from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import useFlags from "@/hooks/useFlags";
import { selectIsEditorSidebarExpanded } from "@/pageEditor/store/editor/editorSelectors";
import HomeButton from "./HomeButton";
import ReloadButton from "./ReloadButton";
import AddStarterBrickButton from "./AddStarterBrickButton";
import ModComponents from "./ModComponents";
import { FeatureFlags } from "@/auth/featureFlags";

/**
 * React Bootstrap Collapsed component that includes a div wrapper.
 * The native component only accepts one child and it alters it, so it frustratingly
 * conflicts with our own layout.
 */
const CollapsedElement: React.FC<
  Omit<React.ComponentProps<typeof BootstrapCollapse>, "children"> & {
    className?: string;
  }
> = ({ children, className, ...props }) => (
  <BootstrapCollapse unmountOnExit={true} {...props}>
    <div className={className}>{children}</div>
  </BootstrapCollapse>
);

const ModListingPanel: React.VFC = () => {
  const dispatch = useDispatch();

  const isExpanded = useSelector(selectIsEditorSidebarExpanded);

  const { flagOn } = useFlags();
  const showDeveloperUI =
    process.env.ENVIRONMENT === "development" ||
    flagOn(FeatureFlags.PAGE_EDITOR_DEVELOPER);

  const collapseSidebar = () => {
    dispatch(
      actions.setModListExpanded({
        isExpanded: !isExpanded,
      }),
    );
  };

  return (
    <div
      className={cx(styles.root, "flex-shrink-0")}
      data-testid="modListingPanel"
    >
      {/* Expanded sidebar: Actions list (+ always visible Home button) */}

      <div className={styles.header}>
        <HomeButton />
        <CollapsedElement
          dimension="width"
          in={isExpanded}
          className={styles.horizontalActions}
        >
          <AddStarterBrickButton />
          {showDeveloperUI && <ReloadButton />}
        </CollapsedElement>
        <CollapsedElement
          dimension="width"
          in={isExpanded}
          className="d-flex flex-grow-1"
        >
          <Button
            size="sm"
            type="button"
            variant="light"
            className={cx(styles.toggle, "ml-auto")}
            onClick={collapseSidebar}
          >
            <FontAwesomeIcon icon={faAngleDoubleLeft} fixedWidth />
          </Button>
        </CollapsedElement>
      </div>

      {/* Collapsed sidebar: Actions list */}
      <CollapsedElement in={!isExpanded} className={styles.verticalActions}>
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
      </CollapsedElement>

      {/* Expanded sidebar: Mod Components list */}
      <CollapsedElement
        dimension="width"
        in={isExpanded}
        className="d-flex flex-column flex-grow-1"
      >
        {/*
        Double wrapper needed so that the list does not wrap during the
        shrinking animation, but instead it's clipped.
        */}
        <div
          className="d-flex flex-column flex-grow-1"
          style={{
            width: "270px",
          }}
        >
          <ModComponents />
        </div>
      </CollapsedElement>
    </div>
  );
};

export default ModListingPanel;
