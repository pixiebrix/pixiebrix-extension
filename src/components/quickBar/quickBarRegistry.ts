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

const defaultActions: Action[] = [
  {
    id: "blog",
    name: "Blog",
    shortcut: ["b"],
    keywords: "writing words",
    perform: () => {
      window.location.pathname = "blog";
    },
  },
];

class QuickBarRegistry {
  private _actions: Action[];

  constructor() {
    this._actions = defaultActions;
  }

  add(action: Action): void {
    this._actions = this._actions.filter((x) => x.id !== action.id);
    this._actions.push(action);
  }

  remove(id: string): void {
    this._actions = this._actions.filter((x) => x.id !== id);
  }

  public get actions(): Action[] {
    return this._actions;
  }
}

// Singleton registry
const quickBarRegistry = new QuickBarRegistry();

export default quickBarRegistry;
