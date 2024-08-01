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

import { type BasePageObject } from "../basePageObject";

type AsyncFunction<T> = (...args: any[]) => Promise<T>;

// Decorator used for functions that modify the Page Editor mod form state.
// This is used to wait for Redux to update before continuing.
export function ModifiesModFormState<T>(
  value: AsyncFunction<T>,
  context: ClassMethodDecoratorContext<BasePageObject, AsyncFunction<T>>,
) {
  return async function (this: BasePageObject, ...args: any[]): Promise<T> {
    const result = await value.apply(this, args);
    // See EditorPane.tsx: REDUX_SYNC_WAIT_MILLIS+CHANGE_DETECT_DELAY_MILLIS --> 500 + 100 = 600ms
    // eslint-disable-next-line playwright/no-wait-for-timeout -- Wait for Redux to update
    await this.page.waitForTimeout(600);
    return result;
  };
}
