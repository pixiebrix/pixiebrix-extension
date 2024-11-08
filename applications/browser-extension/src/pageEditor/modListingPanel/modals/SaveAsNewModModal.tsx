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
import { useDispatch, useSelector } from "react-redux";
import { actions } from "../../store/editor/editorSlice";
import { Button, Modal } from "react-bootstrap";
import {
  selectCurrentModId,
  selectEditorModalVisibilities,
} from "../../store/editor/editorSelectors";
import { useOptionalModDefinition } from "../../../modDefinitions/modDefinitionHooks";
import { assertNotNullish } from "../../../utils/nullishUtils";

const SaveAsNewModModal: React.FC = () => {
  const dispatch = useDispatch();
  const { isSaveAsNewModModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );

  const modId = useSelector(selectCurrentModId);
  const { data: mod, isFetching } = useOptionalModDefinition(modId);
  const modName = mod?.metadata?.name ?? "this mod";

  const hideModal = () => {
    dispatch(actions.hideModal());
  };

  return (
    <Modal show={show} onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>Save as new mod?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        You do not have permissions to edit <em>{modName}</em>. Save as a new
        mod?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="info" onClick={hideModal}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={isFetching}
          onClick={() => {
            assertNotNullish(modId, "Expected selected mod");
            dispatch(
              // Don't keep the old mod actived
              actions.showCreateModModal({
                keepLocalCopy: false,
                sourceModId: modId,
              }),
            );
          }}
        >
          Save as New
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SaveAsNewModModal;
