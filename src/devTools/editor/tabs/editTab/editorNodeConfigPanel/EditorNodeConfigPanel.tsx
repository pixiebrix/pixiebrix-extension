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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "react-bootstrap";
import styles from "./EditorNodeConfigPanel.module.scss";

const EditorNodeConfigPanel: React.FC<{
  onRemoveNode?: () => void;
}> = ({ onRemoveNode, children }) => (
  <div>
    {children}
    {onRemoveNode && (
      <Button
        variant="danger"
        onClick={onRemoveNode}
        className={styles.removeButton}
      >
        <FontAwesomeIcon icon={faTrash} /> Remove Node
      </Button>
    )}
  </div>
);

export default EditorNodeConfigPanel;
