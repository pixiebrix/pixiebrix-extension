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

import React, { useCallback, useState } from "react";
import { Prompt, useHistory } from "react-router";
import { Location } from "history";
import { FormikValues, useFormikContext } from "formik";
import { Button, Modal } from "react-bootstrap";

/**
 * Confirm navigation modal using the `dirty` flag of the Formik context.
 */
const ConfirmNavigationModal: React.FunctionComponent = () => {
  const history = useHistory();
  const [nextLocation, setNextLocation] = useState<Location>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { dirty } = useFormikContext<FormikValues>();

  const cancelNavigation = useCallback(() => {
    setModalVisible(false);
  }, [setModalVisible]);

  const showUnsavedNavigationModal = useCallback(
    (location: Location) => {
      setNextLocation(location);
      setModalVisible(true);
      return false;
    },
    [setModalVisible, setNextLocation]
  );

  const confirmNavigation = useCallback(() => {
    setModalVisible(false);
    if (nextLocation) {
      history.push(nextLocation.pathname);
    }
  }, [history, setModalVisible, nextLocation]);

  return (
    <>
      <Prompt
        when={dirty && !modalVisible}
        message={showUnsavedNavigationModal}
      />
      <Modal show={modalVisible}>
        <Modal.Header>
          <Modal.Title>Unsaved changes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to leave this page? Unsaved changes will be
          discarded.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={confirmNavigation}>
            Discard changes
          </Button>
          <Button variant="primary" onClick={cancelNavigation}>
            Stay on this page
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ConfirmNavigationModal;
