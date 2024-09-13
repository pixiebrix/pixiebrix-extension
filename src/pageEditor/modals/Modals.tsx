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

import AddBrickModal from "@/pageEditor/modals/addBrickModal/AddBrickModal";
import React from "react";
import CreateModModal from "@/pageEditor/modListingPanel/modals/CreateModModal";
import MoveFromModModal from "@/pageEditor/modListingPanel/modals/MoveFromModModal";
import SaveDataIntegrityErrorModal from "@/pageEditor/panes/save/SaveDataIntegrityErrorModal";
import SaveAsNewModModal from "@/pageEditor/modListingPanel/modals/SaveAsNewModModal";

const Modals: React.FunctionComponent = () => (
  <>
    <MoveFromModModal />
    <SaveAsNewModModal />
    <CreateModModal />
    <AddBrickModal />
    <SaveDataIntegrityErrorModal />
  </>
);

export default Modals;
