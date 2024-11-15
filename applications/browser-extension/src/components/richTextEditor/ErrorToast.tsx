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
import { Toast, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle, faTimes } from "@fortawesome/free-solid-svg-icons";
import styles from "./RichTextEditor.module.scss";

interface ErrorToastProps {
  error: string | null;
  onClose: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ error, onClose }) => (
  <Toast
    show={Boolean(error)}
    onClose={onClose}
    className={styles.error}
    autohide
    animation={false}
    delay={5000}
  >
    <span>
    <FontAwesomeIcon className="mr-2" icon={faExclamationCircle} /> {error}
    <Button variant="outline-danger" onClick={onClose}>
      <FontAwesomeIcon icon={faTimes} />
    </Button>
      </span>
  </Toast>
);

export default ErrorToast;
