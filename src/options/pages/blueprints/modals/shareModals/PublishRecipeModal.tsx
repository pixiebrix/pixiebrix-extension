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

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectShowPublishContext } from "@/options/pages/blueprints/modals/blueprintModalsSelectors";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import { RequireScope } from "@/auth/RequireScope";
import ModalLayout from "@/options/pages/blueprints/modals/ModalLayout";
import PublishRecipeModalBody from "./PublishRecipeModalBody";

const PublishRecipeModal: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const showPublishContext = useSelector(selectShowPublishContext);

  const closeModal = () => {
    dispatch(blueprintModalsSlice.actions.closeModal());
  };

  return (
    <ModalLayout
      show={showPublishContext?.blueprintId != null}
      title="Publish to Marketplace"
      onHide={closeModal}
    >
      <RequireScope scopeSettingsDescription="To publish a blueprint, you must first set an account alias for your PixieBrix account">
        <PublishRecipeModalBody />
      </RequireScope>
    </ModalLayout>
  );
};

export default PublishRecipeModal;
