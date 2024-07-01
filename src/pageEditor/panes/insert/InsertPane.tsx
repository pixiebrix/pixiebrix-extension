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
import {
  type StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import InsertButtonPane from "@/pageEditor/panes/insert/InsertButtonPane";
import { useDispatch } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import useEscapeHandler from "@/pageEditor/hooks/useEscapeHandler";
import useAutoInsert from "@/pageEditor/panes/insert/useAutoInsert";
import { inspectedTab } from "@/pageEditor/context/connection";
import { cancelSelect } from "@/contentScript/messenger/api";

const InsertPane: React.FC<{ inserting: StarterBrickType }> = ({
  inserting,
}) => {
  // Auto-insert if the StarterBrickType supports it
  useAutoInsert(inserting);

  const dispatch = useDispatch();

  const cancelInsert = useCallback(async () => {
    dispatch(actions.toggleInsert(null));
    await cancelSelect(inspectedTab);
  }, [dispatch]);

  // Cancel insert with escape key
  useEscapeHandler(cancelInsert, inserting != null);

  switch (inserting) {
    case StarterBrickTypes.BUTTON: {
      return <InsertButtonPane cancel={cancelInsert} />;
    }

    default: {
      return null;
    }
  }
};

export default InsertPane;
