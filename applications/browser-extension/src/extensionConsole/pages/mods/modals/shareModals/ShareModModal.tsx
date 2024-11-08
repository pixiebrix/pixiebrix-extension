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
import { selectShowShareContext } from "../modModalsSelectors";
import { modModalsSlice } from "../modModalsSlice";
import { RequireScope } from "../../../../../auth/RequireScope";
import ModalLayout from "../../../../../components/ModalLayout";
import ShareModModalBody from "./ShareModModalBody";

const ShareModModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const closeModal = () => {
    dispatch(modModalsSlice.actions.closeModal());
  };

  const showShareContext = useSelector(selectShowShareContext);

  return (
    <ModalLayout
      show={showShareContext?.modId != null}
      title="Share with Teams"
      onHide={closeModal}
    >
      <RequireScope scopeSettingsDescription="To share a mod, you must first set an account alias for your PixieBrix account">
        <ShareModModalBody />
      </RequireScope>
    </ModalLayout>
  );
};

export default ShareModModal;
