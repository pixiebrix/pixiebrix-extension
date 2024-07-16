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

import React, { useCallback } from "react";
import { StarterBrickTypes } from "@/types/starterBrickTypes";
import InsertButtonPane from "@/pageEditor/panes/insert/InsertButtonPane";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import useEscapeHandler from "@/pageEditor/hooks/useEscapeHandler";
import useAutoInsert from "@/pageEditor/panes/insert/useAutoInsert";
import { inspectedTab } from "@/pageEditor/context/connection";
import { cancelSelect } from "@/contentScript/messenger/api";
import { selectInsertingStarterBrickType } from "@/pageEditor/store/editor/editorSelectors";

const InsertPane: React.FC = () => {
  const starterBrickType = useSelector(selectInsertingStarterBrickType);

  // Auto-insert if the StarterBrickType supports it
  useAutoInsert(starterBrickType);

  const dispatch = useDispatch();

  const cancelInsert = useCallback(async () => {
    dispatch(actions.clearInsertingStarterBrickType());
    await cancelSelect(inspectedTab);
  }, [dispatch]);

  // Cancel insert with escape key
  useEscapeHandler(cancelInsert, starterBrickType != null);

  switch (starterBrickType) {
    case StarterBrickTypes.BUTTON: {
      return <InsertButtonPane cancel={cancelInsert} />;
    }

    default: {
      return null;
    }
  }
};

export default InsertPane;
