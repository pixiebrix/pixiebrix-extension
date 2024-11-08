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

import styles from "./ModLogsModal.module.scss";

import React, { useEffect } from "react";
import { Modal } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import LogCard from "../../../../../components/logViewer/LogCard";
import { logActions } from "../../../../../components/logViewer/logSlice";
import { modModalsSlice } from "../modModalsSlice";
import ModalLayout from "../../../../../components/ModalLayout";
import { selectShowLogsContext } from "../modModalsSelectors";

const ModLogsModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const closeModal = () => {
    dispatch(modModalsSlice.actions.closeModal());
    dispatch(logActions.setContext({ messageContext: null }));
  };

  const showLogsContext = useSelector(selectShowLogsContext);
  useEffect(() => {
    if (showLogsContext == null) {
      return;
    }

    dispatch(
      logActions.setContext({ messageContext: showLogsContext.messageContext }),
    );
  }, [showLogsContext, dispatch]);

  return (
    <ModalLayout
      show={showLogsContext != null}
      title={`Logs: ${showLogsContext?.title}`}
      onHide={closeModal}
      className={styles.root}
      dialogClassName={styles.modalDialog}
      contentClassName={styles.modalContent}
    >
      <Modal.Body className={styles.body}>
        <LogCard />
      </Modal.Body>
    </ModalLayout>
  );
};

export default ModLogsModal;
