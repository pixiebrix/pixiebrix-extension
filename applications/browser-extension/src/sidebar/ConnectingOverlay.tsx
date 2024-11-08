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
import styles from "./blurSidebarOverlay.module.scss";
import cx from "classnames";
import { Modal } from "react-bootstrap";
import Loader from "../components/Loader";

const ConnectingOverlay = () => (
  <div className={styles.blurOverlay}>
    <Modal.Dialog size="lg" className={cx(styles.modalDialog, "shadow")}>
      <Modal.Header className={styles.modalHeader}>
        <strong>Connecting to page</strong>
      </Modal.Header>

      <Modal.Body className={styles.modalBody}>
        <Loader />
      </Modal.Body>
    </Modal.Dialog>
  </div>
);

export default ConnectingOverlay;
