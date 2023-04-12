/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import styles from "./RecipePane.module.scss";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveRecipeId,
  selectSelectionSeq,
} from "@/pageEditor/slices/editorSelectors";
import { Alert } from "react-bootstrap";
import Centered from "@/components/Centered";
import EditorTabLayout, {
  type TabItem,
} from "@/components/tabLayout/EditorTabLayout";
import Logs from "@/pageEditor/tabs/Logs";
import EditRecipe from "@/pageEditor/tabs/editRecipeTab/EditRecipe";
import { type MessageContext } from "@/types/loggerTypes";
import { logActions } from "@/components/logViewer/logSlice";
import useLogsBadgeState from "@/pageEditor/tabs/logs/useLogsBadgeState";
import RecipeOptionsDefinition from "@/pageEditor/tabs/recipeOptionsDefinitions/RecipeOptionsDefinition";
import RecipeOptionsValues from "@/pageEditor/tabs/recipeOptionsValues/RecipeOptionsValues";

const RecipePane: React.VFC = () => {
  const dispatch = useDispatch();

  const activeRecipeId = useSelector(selectActiveRecipeId);

  const selectionSeq = useSelector(selectSelectionSeq);
  const layoutKey = `${activeRecipeId}-${selectionSeq}`;

  useEffect(() => {
    const messageContext: MessageContext = {
      blueprintId: activeRecipeId,
    };
    dispatch(logActions.setContext(messageContext));
  }, [dispatch, activeRecipeId]);

  const [unreadLogsCount, logsBadgeVariant] = useLogsBadgeState();

  const tabItems: TabItem[] = [
    {
      name: "Edit",
      TabContent: EditRecipe,
    },
    {
      name: "Current Inputs",
      TabContent: RecipeOptionsValues,
    },
    {
      name: "Input Form",
      TabContent: RecipeOptionsDefinition,
    },
    {
      name: "Logs",
      badgeCount: unreadLogsCount,
      badgeVariant: logsBadgeVariant,
      TabContent: Logs,
      mountWhenActive: true,
    },
  ];

  if (!activeRecipeId) {
    return (
      <Centered>
        <Alert variant="danger">Recipe not found</Alert>
      </Centered>
    );
  }

  return (
    <div className={styles.root}>
      <EditorTabLayout key={layoutKey} tabs={tabItems} />
    </div>
  );
};

export default RecipePane;
