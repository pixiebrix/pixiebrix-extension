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
import { useSelector } from "react-redux";
import { selectActiveRecipe } from "@/devTools/editor/slices/editorSelectors";
import { Alert } from "react-bootstrap";
import { RecipeDefinition } from "@/types/definitions";

const RecipeOptionsPane: React.FC<{ recipe: RecipeDefinition }> = () => {
  const recipe = useSelector(selectActiveRecipe);

  if (!recipe) {
    return <Alert variant="danger">Recipe not found</Alert>;
  }

  return <div>Recipe Options for {recipe.metadata.name}</div>;
};

export default RecipeOptionsPane;
