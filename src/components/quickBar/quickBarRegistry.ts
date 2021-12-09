/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { Action } from "kbar";

export const DEFAULT_SERVICE_URL = process.env.SERVICE_URL;

const defaultActions: Action[] = [
  {
    id: "marketplace",
    name: "Open PixieBrix Marketplace",
    keywords: "marketplace",
    perform: () => {
      window.location.href = "https://www.pixiebrix.com/marketplace/";
    },
  },
  {
    id: "admin",
    name: "Open PixieBrix Admin Console",
    keywords: "admin",
    perform: () => {
      window.location.href = DEFAULT_SERVICE_URL;
    },
  },
  {
    id: "quick-start",
    name: "Open PixieBrix Quick Start",
    keywords: "quick start, tutorials",
    perform: () => {
      window.location.href = "https://docs.pixiebrix.com/quick-start-guide";
    },
  },
  {
    id: "documentation",
    name: "Open PixieBrix Documentation",
    keywords: "docs, tutorials, documentation, how to",
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
    this._actions.push(action);
    this.notifyListeners();
  }

  remove(id: string): void {
    this._actions = this._actions.filter((x) => x.id !== id);
  }

  addListener(handler: ChangeHandler) {
    this.listeners.push(handler);
    this.notifyListeners();
  }

  public get actions(): Action[] {
    return this._actions;
  }
}

// Singleton registry
const quickBarRegistry = new QuickBarRegistry();

export default quickBarRegistry;
