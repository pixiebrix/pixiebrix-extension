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

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type MessageContext } from "@/types/loggerTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";

type LogsContext = {
  title: string;
  messageContext: MessageContext;
};

export type ShareContext = {
  blueprintId?: RegistryId;
  extensionId?: UUID;
};

export type PublishContext = ShareContext & {
  cancelingPublish?: boolean;
};

type BlueprintModalsState = {
  showLogsContext: LogsContext;
  showShareContext: ShareContext;
  showPublishContext: PublishContext;
};

export type BlueprintModalsRootState = {
  blueprintModals: BlueprintModalsState;
};

const initialState: BlueprintModalsState = Object.freeze<BlueprintModalsState>({
  showLogsContext: null,
  showShareContext: null,
  showPublishContext: null,
});

export const blueprintModalsSlice = createSlice({
  name: "blueprintModals",
  initialState,
  reducers: {
    setLogsContext(state, action: PayloadAction<LogsContext>) {
      state.showLogsContext = action.payload;
      state.showShareContext = null;
      state.showPublishContext = null;
    },
    setShareContext(state, action: PayloadAction<ShareContext | null>) {
      state.showShareContext = action.payload;
      state.showLogsContext = null;
      state.showPublishContext = null;
    },
    setPublishContext(state, action: PayloadAction<PublishContext | null>) {
      state.showPublishContext = action.payload;
      state.showLogsContext = null;
      state.showShareContext = null;
    },
    setCancelingPublish(state) {
      state.showPublishContext.cancelingPublish = true;
    },
    closeModal() {
      return initialState;
    },
  },
});
