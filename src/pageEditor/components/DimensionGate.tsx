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

import React from "react";
import { useWindowSize } from "@/hooks/useWindowSize";
import { selectIsDimensionsWarningDismissed } from "@/pageEditor/slices/editorSelectors";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "react-bootstrap";
import { editorSlice } from "@/pageEditor/slices/editorSlice";

const DimensionGate: React.FunctionComponent = ({ children }) => {
  const dispatch = useDispatch();
  const isDimensionsWarningDismissed = useSelector(
    selectIsDimensionsWarningDismissed
  );

  const size = useWindowSize();

  if (!isDimensionsWarningDismissed && size.height > size.width) {
    return (
      <div className="p-3">
        <div>
          The Page Editor is designed to work with a horizontal orientation.
        </div>

        <div>
          We recommend docking the DevTools to the bottom of the window.
        </div>

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
  }

  return <>{children}</>;
};

export default DimensionGate;
