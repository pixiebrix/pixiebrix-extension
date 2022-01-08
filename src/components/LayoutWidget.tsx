/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { Button, ButtonGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";

const LayoutWidget: React.FC<{
  canMoveUp: boolean;
  moveUp: () => void;
  canMoveDown: boolean;
  moveDown: () => void;
}> = ({ canMoveUp, moveUp, canMoveDown, moveDown }) => (
  <ButtonGroup>
    <Button onClick={moveUp} disabled={!canMoveUp} variant="light" size="sm">
      <FontAwesomeIcon icon={faArrowUp} /> Move up
    </Button>
    <Button
      onClick={moveDown}
      disabled={!canMoveDown}
      variant="light"
      size="sm"
    >
      <FontAwesomeIcon icon={faArrowDown} /> Move down
    </Button>
  </ButtonGroup>
);

export default LayoutWidget;
