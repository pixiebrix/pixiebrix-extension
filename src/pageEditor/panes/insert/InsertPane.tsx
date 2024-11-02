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

import React, { createContext, useCallback, useContext, useState } from "react";
import {
  type StarterBrickType,
  StarterBrickTypes,
} from "@/types/starterBrickTypes";
import InsertButtonPane from "@/pageEditor/panes/insert/InsertButtonPane";
import useEscapeHandler from "@/pageEditor/hooks/useEscapeHandler";
import { inspectedTab } from "@/pageEditor/context/connection";
import { cancelSelect } from "@/contentScript/messenger/api";

type InsertPaneContextProps = {
  insertingStarterBrickType: StarterBrickType | null;
  setInsertingStarterBrickType: (
    starterBrickType: StarterBrickType | null,
  ) => void;
};

const InsertPaneContext = createContext<InsertPaneContextProps>({
  insertingStarterBrickType: null,
  setInsertingStarterBrickType() {
    throw new Error("setInsertingStarterBrickType not configured");
  },
});

export const InsertPaneProvider: React.FunctionComponent<
  React.PropsWithChildren
> = ({ children }) => {
  const [insertingStarterBrickType, setInsertingStarterBrickType] =
    useState<StarterBrickType | null>(null);

  return (
    <InsertPaneContext.Provider
      value={{ insertingStarterBrickType, setInsertingStarterBrickType }}
    >
      {children}
    </InsertPaneContext.Provider>
  );
};

export function useInsertPane(): InsertPaneContextProps {
  return useContext(InsertPaneContext);
}

const InsertPane: React.FC = () => {
  const { insertingStarterBrickType, setInsertingStarterBrickType } =
    useInsertPane();

  const cancelInsert = useCallback(async () => {
    setInsertingStarterBrickType(null);
    await cancelSelect(inspectedTab);
  }, [setInsertingStarterBrickType]);

  // Cancel insert with escape key
  useEscapeHandler(cancelInsert, insertingStarterBrickType != null);

  switch (insertingStarterBrickType) {
    case StarterBrickTypes.BUTTON: {
      return <InsertButtonPane cancel={cancelInsert} />;
    }

    default: {
      return null;
    }
  }
};

export default InsertPane;
