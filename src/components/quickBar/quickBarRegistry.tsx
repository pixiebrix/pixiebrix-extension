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

export const DEFAULT_SERVICE_URL = process.env.SERVICE_URL;

const PIXIEBRIX_SECTION = "PixieBrix";

const defaultActions: Action[] = [
  {
    id: "marketplace",
    name: "Open Marketplace",
    keywords: "marketplace",
    icon: <FontAwesomeIcon icon={faStore} fixedWidth />,
    section: PIXIEBRIX_SECTION,
    perform: () => {
      window.location.href = "https://www.pixiebrix.com/marketplace/";
    },
  },
  {
    id: "admin",
    name: "Open Admin Console",
    keywords: "admin, admin console",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faUsers} fixedWidth />,
    perform: () => {
      window.location.href = DEFAULT_SERVICE_URL;
    },
  },
  {
    id: "quick-start",
    name: "Open Quick Start",
    keywords: "quick start, tutorials",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faAppleAlt} fixedWidth />,
    perform: () => {
      window.location.href = "https://docs.pixiebrix.com/quick-start-guide";
    },
  },
  {
    id: "community",
    name: "Open Community",
    keywords: "community, how to",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faSeedling} fixedWidth />,
    perform: () => {
      window.location.href = "https://community.pixiebrix.com/";
    },
  },
  {
    id: "documentation",
    name: "Open Documentation",
    keywords: "docs, tutorials, documentation, how to",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faInfoCircle} fixedWidth />,
    perform: () => {
      window.location.href = "https://docs.pixiebrix.com/";
    },
  },
];

type ChangeHandler = (actions: Action[]) => void;

class QuickBarRegistry {
  private _actions: Action[];
  private readonly listeners: ChangeHandler[] = [];

  constructor() {
    this._actions = defaultActions;
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this._actions);
    }
  }

  add(action: Action): void {
    this._actions = this._actions.filter((x) => x.id !== action.id);
    this._actions.unshift(action);
    this.notifyListeners();
  }

  remove(id: string): void {
    this._actions = this._actions.filter((x) => x.id !== id);
  }

  addListener(handler: ChangeHandler) {
    this.listeners.push(handler);
    this.notifyListeners();
  }

  // These must be added dynamically or else they're static and unremovable/unsortable
  // https://github.com/timc1/kbar/issues/66
  addDefaults(): void {
    this._actions.push(...defaultActions);
  }

  public get actions(): Action[] {
    return this._actions;
  }
}

// Singleton registry
const quickBarRegistry = new QuickBarRegistry();

export default quickBarRegistry;
