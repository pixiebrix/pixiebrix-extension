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
import { Action } from "kbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAppleAlt,
  faInfoCircle,
  faSeedling,
  faStore,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { RegistryId } from "@/core";
import { pull, remove } from "lodash";

export const DEFAULT_SERVICE_URL = process.env.SERVICE_URL;

const PIXIEBRIX_SECTION = "PixieBrix";

/**
 * `kbar` action with additional metadata about the extension point that added it.
 */
type CustomAction = Action & {
  extensionPointId?: RegistryId;
};

const defaultActions: Action[] = [
  {
    id: "marketplace",
    name: "Open Marketplace",
    keywords: "marketplace",
    icon: <FontAwesomeIcon icon={faStore} fixedWidth />,
    section: PIXIEBRIX_SECTION,
    perform() {
      window.location.href = "https://www.pixiebrix.com/marketplace/";
    },
  },
  {
    id: "admin",
    name: "Open Admin Console",
    keywords: "admin, admin console",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faUsers} fixedWidth />,
    perform() {
      window.location.href = DEFAULT_SERVICE_URL;
    },
  },
  {
    id: "quick-start",
    name: "Open Quick Start",
    keywords: "quick start, tutorials",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faAppleAlt} fixedWidth />,
    perform() {
      window.location.href = "https://docs.pixiebrix.com/quick-start-guide";
    },
  },
  {
    id: "community",
    name: "Open Community",
    keywords: "community, how to",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faSeedling} fixedWidth />,
    perform() {
      window.location.href = "https://community.pixiebrix.com/";
    },
  },
  {
    id: "documentation",
    name: "Open Documentation",
    keywords: "docs, tutorials, documentation, how to",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faInfoCircle} fixedWidth />,
    perform() {
      window.location.href = "https://docs.pixiebrix.com/";
    },
  },
];

type ChangeHandler = (actions: CustomAction[]) => void;

class QuickBarRegistry {
  private readonly actions: CustomAction[] = defaultActions;
  private readonly listeners: ChangeHandler[] = [];

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.actions);
    }
  }

  get currentActions() {
    return this.actions;
  }

  add(action: CustomAction): void {
    remove(this.actions, (x) => x.id === action.id);
    this.actions.unshift(action);
    this.notifyListeners();
  }

  removeExtensionPointActions(id: RegistryId) {
    remove(this.actions, (x) => x.extensionPointId === id);
    this.notifyListeners();
  }

  remove(id: string): void {
    remove(this.actions, (x) => x.id === id);
    this.notifyListeners();
  }

  addListener(handler: ChangeHandler) {
    this.listeners.push(handler);
  }

  removeListener(handler: ChangeHandler) {
    pull(this.listeners, handler);
  }
}

// Singleton registry for the content script
const quickBarRegistry = new QuickBarRegistry();

export default quickBarRegistry;
