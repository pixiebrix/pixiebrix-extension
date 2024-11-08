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
import { useWindowSize } from "../../hooks/useWindowSize";
import { selectIsDimensionsWarningDismissed } from "../store/editor/editorSelectors";
import { useDispatch, useSelector } from "react-redux";
import { Button, Col, Row } from "react-bootstrap";
import { editorSlice } from "../store/editor/editorSlice";
import devtoolsToolbarScreenshot from "../../../img/devtools-pixiebrix-toolbar-screenshot.png";
import devtoolsDockingContextMenu from "../../../img/devtools-docking-context-menu.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";
import devtoolsDockBottomIcon from "../../../img/devtools-dock-bottom-icon.svg";
import { type EmptyObject } from "type-fest";

export const GatePanel: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  return (
    <div className="p-3">
      <h3>
        The Page Editor is designed to work with a horizontal orientation.
      </h3>

      <p>We recommend docking the DevTools to the bottom of the window.</p>
      <Row className="my-3">
        <Col>
          <img
            src={devtoolsToolbarScreenshot}
            alt="DevTools toolbar with three-dot menu icon included"
            className="img-fluid"
          />
        </Col>
        <Col>
          <img
            src={devtoolsDockingContextMenu}
            alt="The context menu that will show after clicking the DevTools three-dot menu, with 'Dock Side' option included"
            className="img-fluid"
          />
        </Col>
      </Row>

      <p>
        Click the ‘
        <FontAwesomeIcon
          icon={faEllipsisV}
          className="mx-1"
          title="Three-dot menu icon"
        />
        ’ menu in the top right of the DevTools
      </p>
      <p>
        Select the ‘
        <img
          src={devtoolsDockBottomIcon}
          alt="DevTools dock bottom icon"
          width="16px"
        />
        ’ (third option) under ‘Dock side’
      </p>
      <hr />

      <Button
        variant="warning"
        onClick={() => {
          dispatch(editorSlice.actions.dismissDimensionsWarning());
        }}
      >
        Dismiss Warning
      </Button>
    </div>
  );
};

/**
 * A React component to show a warning if the frame is in portrait layout.
 */
const DimensionGate: React.FunctionComponent<
  React.PropsWithChildren<EmptyObject>
> = ({ children }) => {
  const isDimensionsWarningDismissed = useSelector(
    selectIsDimensionsWarningDismissed,
  );

  const size = useWindowSize();

  if (!isDimensionsWarningDismissed && size.height > size.width) {
    return <GatePanel />;
  }

  return <>{children}</>;
};

export default DimensionGate;
