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

import { type Middleware } from "@reduxjs/toolkit";
import { type Action } from "redux";

const actions: Action[] = [];

// eslint-disable-next-line unicorn/consistent-function-scoping -- idiomatic redux
const testMiddleware: Middleware = (store) => (next) => (action) => {
  actions.push(action);
  next(action);
};

export function resetTestMiddleware(): void {
  actions.length = 0;
}

export function actionTypes(): string[] {
  return actions.map((x) => x.type);
}

export default testMiddleware;
