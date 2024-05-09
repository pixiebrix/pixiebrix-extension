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
import { Button, Modal } from "react-bootstrap";

const UnavailableOverlay = ({ onClose }: { onClose: () => void }) => (
  <div className={styles.blurOverlay}>
    <Modal.Dialog size="lg" className={cx(styles.modalDialog, "shadow")}>
      <Modal.Header className={styles.modalHeader}>
        <strong>Panel no longer available</strong>
      </Modal.Header>

      <Modal.Body className={styles.modalBody}>
        <p>The browser navigated away from the page</p>
        <Button
          onClick={onClose}
          variant="primary"
          size="sm"
          aria-label="Close the unavailable panel"
        >
          Close
        </Button>
      </Modal.Body>
    </Modal.Dialog>
  </div>
);

export default UnavailableOverlay;
