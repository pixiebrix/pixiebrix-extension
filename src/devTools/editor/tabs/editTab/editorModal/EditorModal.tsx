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
import { Button, Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

const EditorModal: React.FC<{
  show?: boolean;
  onRemove?: () => void;
  onHide: () => void;
  title: string;
}> = ({ show = true, title, onHide, onRemove, children }) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      scrollable
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      {onRemove && (
        <Modal.Footer>
          <Button variant="danger" onClick={onRemove}>
            <FontAwesomeIcon icon={faTrash} /> Delete
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default EditorModal;
