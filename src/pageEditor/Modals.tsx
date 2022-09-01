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

import AddBlockModal from "@/components/addBlockModal/AddBlockModal";
import React from "react";
import AddToRecipeModal from "./sidebar/AddToRecipeModal";
import CreateRecipeModal from "./sidebar/CreateRecipeModal";
import RemoveFromRecipeModal from "./sidebar/RemoveFromRecipeModal";
import SaveAsNewRecipeModal from "./sidebar/SaveAsNewRecipeModal";

const Modals: React.FunctionComponent = () => (
  <>
    <AddToRecipeModal />
    <RemoveFromRecipeModal />
    <SaveAsNewRecipeModal />
    <CreateRecipeModal />
    <AddBlockModal />
  </>
);

export default Modals;
