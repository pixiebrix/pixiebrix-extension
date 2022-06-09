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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import styles from "./MoveBrickControl.module.scss";

export type MoveBrickControlProps = {
  onClickMoveUp?: () => void;
  onClickMoveDown?: () => void;
};

const MoveBrickControl: React.VFC<MoveBrickControlProps> = ({
  onClickMoveUp,
  onClickMoveDown,
}) => {
  const canMoveUp = Boolean(onClickMoveUp);
  const canMoveDown = Boolean(onClickMoveDown);

  return (
    (canMoveUp || canMoveDown) && (
      <div className={styles.root}>
        <button
          type="button"
          onClick={(event) => {
            onClickMoveUp();
            event.stopPropagation();
          }}
          title="Move brick higher"
          disabled={!canMoveUp}
          className={styles.moveButton}
        >
          <FontAwesomeIcon icon={faArrowUp} size="sm" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            onClickMoveDown();
            event.stopPropagation();
          }}
          title="Move brick lower"
          disabled={!canMoveDown}
          className={styles.moveButton}
        >
          <FontAwesomeIcon icon={faArrowDown} size="sm" />
        </button>
      </div>
    )
  );
};

export default MoveBrickControl;
