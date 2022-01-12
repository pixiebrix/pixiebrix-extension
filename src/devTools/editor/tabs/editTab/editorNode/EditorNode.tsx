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

import React, { useEffect, useRef } from "react";
import styles from "./EditorNode.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { ListGroup } from "react-bootstrap";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { NodeId } from "@/devTools/editor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import cx from "classnames";

export type EditorNodeProps = {
  nodeId?: NodeId;
  title: string;
  outputKey?: string;
  icon?: IconProp | React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  hasError?: boolean;
  hasWarning?: boolean;
  canMoveAnything?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onClickMoveUp?: () => void;
  onClickMoveDown?: () => void;
};

function isFontAwesomeIcon(
  maybeIcon: IconProp | React.ReactNode
): maybeIcon is IconProp {
  return (
    typeof maybeIcon === "string" ||
    (typeof maybeIcon === "object" && "icon" in maybeIcon)
  );
}

const EditorNode: React.FC<EditorNodeProps> = ({
  onClick,
  icon: iconProp,
  title,
  outputKey,
  active,
  hasError,
  hasWarning,
  canMoveAnything,
  canMoveUp,
  canMoveDown,
  onClickMoveUp,
  onClickMoveDown,
}) => {
  const nodeRef = useRef<HTMLAnchorElement>(null);
  const outputName = outputKey ? `@${outputKey}` : "";

  const icon = isFontAwesomeIcon(iconProp) ? (
    <FontAwesomeIcon icon={iconProp as IconProp} size="2x" fixedWidth />
  ) : (
    iconProp
  );

  const errorBadge =
    hasError || hasWarning ? (
      <span className={styles.errorBadge}>
        <img
          src={
            hasError
              ? "/img/fa-exclamation-circle-custom.svg"
              : "/img/fa-exclamation-triangle-custom.svg"
          }
          alt=""
        />
      </span>
    ) : null;

  useEffect(() => {
    if (active) {
      nodeRef.current?.focus();
    }
  }, [active]);
  return (
    <ListGroup.Item
      ref={nodeRef}
      tabIndex={0} // Avoid using `button` because this item includes more buttons #2343
      onClick={onClick}
      active={active}
      className={cx(styles.root, "list-group-item-action")}
    >
      <div className={styles.icon}>
        {icon}
        {errorBadge}
      </div>
      <div className={styles.text}>
        <div>{title}</div>
        {outputName && <div className={styles.outputKey}>{outputName}</div>}
      </div>
      {canMoveAnything && (
        <div className={styles.moveButtons}>
          {(canMoveUp || canMoveDown) && (
            <>
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
            </>
          )}
        </div>
      )}
    </ListGroup.Item>
  );
};

export default EditorNode;
