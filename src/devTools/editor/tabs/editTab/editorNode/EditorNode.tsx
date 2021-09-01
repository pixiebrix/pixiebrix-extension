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
import styles from "./EditorNode.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import cx from "classnames";

export type EditorNodeProps = {
  title: string;
  outputKey?: string;
  icon: IconProp;
  onClick: () => void;
  muted?: boolean;
};

const EditorNode: React.FC<EditorNodeProps> = ({
  onClick,
  icon,
  title,
  outputKey,
  muted,
}) => (
  // Use our own custom style here, not bootstrap
  <button type="button" className={styles.root} onClick={onClick}>
    {outputKey && <div className={styles.outputKey}>@{outputKey}</div>}
    <div className={cx(styles.box, { muted })}>
      <FontAwesomeIcon icon={icon} size="3x" fixedWidth />
    </div>
    <div className={styles.title}>{title}</div>
  </button>
);

export default EditorNode;
