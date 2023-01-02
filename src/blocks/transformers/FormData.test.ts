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

import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { neverPromise } from "@/testUtils/testHelpers";
import { html } from "@/utils";
import { FormData } from "./FormData";

describe("FormData block", () => {
  test("Basic form serialization", async () => {
    const brick = new FormData();

    document.body.innerHTML = html`
      <form id="serialize">
        <input name="no-value" />

        <input name="no-type" value="mongolia" />

        <input type="text" name="text" value="georgia" />

        <input type="checkbox" name="check" value="uruguay" />
        <input type="checkbox" name="check" value="burundi" checked />

        <input type="checkbox" name="check-no-val" checked />

        <input type="checkbox" name="check-no-val-unchecked" />

        <input type="radio" name="radio" value="bahamas" />
        <input type="radio" name="radio" value="benin" checked />
      </form>
    `;

    const arg = unsafeAssumeValidArg({ selector: "#serialize" });

    const result = await brick.run(arg, {
      ctxt: null,
      logger: null,
      root: null,
      runPipeline: neverPromise,
      runRendererPipeline: neverPromise,
    });

    expect(result).toEqual({
      "no-value": "",
      "no-type": "mongolia",
      text: "georgia",
      check: "burundi",
      "check-no-val": true,
      "check-no-val-unchecked": false,
      radio: "benin",
    });
  });

  test("Django Admin Logout Form Serialization", async () => {
    const brick = new FormData();

    // The name-less field was causing problems here: https://github.com/pixiebrix/pixiebrix-extension/issues/4593
    document.body.innerHTML = html`
      <form id="logout-form" method="post" action="/admin/logout/">
        <input type="hidden" name="csrfmiddlewaretoken" value="redacted" />
        <button type="submit">Log out</button>
      </form>
    `;

    const arg = unsafeAssumeValidArg({ selector: "#logout-form" });

    const result = await brick.run(arg, {
      ctxt: null,
      logger: null,
      root: null,
      runPipeline: neverPromise,
      runRendererPipeline: neverPromise,
    });

    expect(result).toEqual({
      csrfmiddlewaretoken: "redacted",
    });
  });

  test("Multiple matching forms iterates all fields", async () => {
    const brick = new FormData();
    document.body.innerHTML = html`
      <div>
        <form>
          <input type="text" name="foo" value="42" />
        </form>
        <form>
          <input type="text" name="bar" value="42" />
        </form>
      </div>
    `;

    const arg = unsafeAssumeValidArg({ selector: "form" });

    const result = await brick.run(arg, {
      ctxt: null,
      logger: null,
      root: null,
      runPipeline: neverPromise,
      runRendererPipeline: neverPromise,
    });

    expect(result).toEqual({
      foo: "42",
      bar: "42",
    });
  });
});
