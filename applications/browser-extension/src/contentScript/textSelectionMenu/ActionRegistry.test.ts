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

import ActionRegistry from "./ActionRegistry";
import { uuidv4 } from "../../types/helpers";

describe("actionRegistry", () => {
  it("sets emoji from title", () => {
    const componentId = uuidv4();
    const registry = new ActionRegistry();

    registry.register(componentId, {
      title: "👋 Hello",
      icon: null,
      handler() {},
    });

    expect(registry.actions.get(componentId)?.emoji).toBe("👋");
  });

  it("defaults icon to box", () => {
    const componentId = uuidv4();
    const registry = new ActionRegistry();

    registry.register(componentId, {
      title: "Hello",
      icon: null,
      handler() {},
    });

    expect(registry.actions.get(componentId)?.icon).toStrictEqual({
      id: "box",
      library: "bootstrap",
    });
  });

  it("fires event listener on register and unregister", () => {
    const componentId = uuidv4();
    const registry = new ActionRegistry();
    const listener = jest.fn();

    registry.onChange.add(listener);
    registry.register(componentId, {
      title: "Hello",
      icon: null,
      handler() {},
    });

    expect(listener).toHaveBeenCalledTimes(1);

    registry.unregister(componentId);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
