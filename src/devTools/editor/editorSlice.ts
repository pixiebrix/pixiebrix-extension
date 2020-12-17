/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { IconConfig, Metadata, Schema, ServiceDependency } from "@/core";
import { ElementInfo } from "@/nativeEditor/frameworks";
import { MenuPosition } from "@/extensionPoints/menuItemExtension";
import { BlockPipeline } from "@/blocks/combinators";
import { Trigger } from "@/extensionPoints/triggerExtension";

export interface BaseFormState {
  readonly uuid: string;
  readonly type: "menuItem" | "trigger" | "panel";
  autoReload?: boolean;

  services: ServiceDependency[];

  reader: {
    metadata: Metadata;
    outputSchema: Schema;
    definition: {
      /**
       * Reader type corresponding to built-in reader factory, e.g., jquery, react.
       */
      type: string | null;
      selector: string | null;
      selectors: { [field: string]: string };
    };
  };

  extensionPoint: unknown;

  extension: unknown;
}

export interface TriggerFormState extends BaseFormState {
  extensionPoint: {
    metadata: Metadata;
    definition: {
      rootSelector: string | null;
      trigger: Trigger;
      isAvailable: {
        matchPatterns: string;
        selectors: string;
      };
    };
  };

  extension: {
    action: BlockPipeline;
  };
}

export interface PanelFormState extends BaseFormState {
  containerInfo: ElementInfo;

  extensionPoint: {
    metadata: Metadata;
    definition: {
      containerSelector: string;
      position?: MenuPosition;
      template: string;
      isAvailable: {
        matchPatterns: string;
        selectors: string;
      };
    };
    traits: {
      style: {
        mode: "default" | "inherit";
      };
    };
  };

  extension: {
    heading: string;
    body: BlockPipeline;
    collapsible?: boolean;
    shadowDOM?: boolean;
  };
}

export interface ActionFormState extends BaseFormState {
  containerInfo: ElementInfo;

  extensionPoint: {
    metadata: Metadata;
    definition: {
      containerSelector: string;
      position?: MenuPosition;
      template: string;
      isAvailable: {
        matchPatterns: string;
        selectors: string;
      };
    };
    traits: {
      style: {
        mode: "default" | "inherit";
      };
    };
  };

  extension: {
    caption: string;
    icon?: IconConfig;
    action: BlockPipeline;
  };
}

export type FormState = ActionFormState | TriggerFormState | PanelFormState;

export interface EditorState {
  inserting: boolean;
  activeElement: string | null;
  readonly elements: FormState[];
}

export const initialState: EditorState = {
  activeElement: null,
  elements: [],
  inserting: false,
};

export const editorSlice = createSlice({
  name: "editor",
  initialState,
  reducers: {
    toggleInsert: (state, action: PayloadAction<boolean>) => {
      state.inserting = action.payload;
    },
    addElement: (state, action: PayloadAction<FormState>) => {
      const element = action.payload;
      state.elements.push(element);
      state.activeElement = element.uuid;
    },
    selectElement: (state, action: PayloadAction<string>) => {
      state.activeElement = action.payload;
    },
    removeElement: (state, action: PayloadAction<string>) => {
      const uuid = action.payload;
      if (state.activeElement === uuid) {
        state.activeElement = null;
      }
      state.elements.splice(
        state.elements.findIndex((x) => x.uuid === uuid),
        1
      );
    },
  },
});

export const actions = editorSlice.actions;
