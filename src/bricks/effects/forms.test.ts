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

import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { FormFill, SetInputValue } from "@/bricks/effects/forms";
import { BusinessError, NoElementsFoundError } from "@/errors/businessErrors";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";

const setInputValueBrick = new SetInputValue();
const formFillBrick = new FormFill();

describe("SetInputValue", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <html>
        <body>
          <div id="noForm"></div>
          <div id="hasForm">
            <form>
              <input type="text" name="name" value="John Doe" />
            </form>
          </div>
        </body>
      </html>
    `;
  });

  test("isRootAware", async () => {
    await expect(setInputValueBrick.isRootAware()).resolves.toBe(true);
  });

  it("sets text field value", async () => {
    await setInputValueBrick.run(
      unsafeAssumeValidArg({
        inputs: [{ selector: "[name='name']", value: "Bob Smith" }],
      }),
      brickOptionsFactory(),
    );

    expect(document.querySelector("[name='name']")).toHaveValue("Bob Smith");
  });

  it("is root aware", async () => {
    await setInputValueBrick.run(
      unsafeAssumeValidArg({
        inputs: [{ selector: "[name='name']", value: "Bob Smith" }],
        isRootAware: true,
      }),
      brickOptionsFactory({
        root: document.querySelector<HTMLElement>("#noForm")!,
      }),
    );

    // Will have original value because root it on the other path
    expect(document.querySelector("[name='name']")).toHaveValue("John Doe");

    await setInputValueBrick.run(
      unsafeAssumeValidArg({
        inputs: [{ selector: "[name='name']", value: "Bob Smith" }],
        isRootAware: true,
      }),
      brickOptionsFactory({
        root: document.querySelector<HTMLElement>("#hasForm")!,
      }),
    );

    expect(document.querySelector("[name='name']")).toHaveValue("Bob Smith");
  });

  test("accepts field root and blank selector", async () => {
    await setInputValueBrick.run(
      unsafeAssumeValidArg({
        inputs: [{ value: "Bob Smith" }],
        isRootAware: true,
      }),
      brickOptionsFactory({ root: document.querySelector("input")! }),
    );

    expect(document.querySelector("[name='name']")).toHaveValue("Bob Smith");
  });

  test("requires selector for document root", async () => {
    const promise = setInputValueBrick.run(
      unsafeAssumeValidArg({
        inputs: [{ value: "Bob Smith" }],
        isRootAware: false,
      }),
      brickOptionsFactory(),
    );

    await expect(promise).rejects.toThrow(BusinessError);
  });

  test("rejects non-field root", async () => {
    const promise = setInputValueBrick.run(
      unsafeAssumeValidArg({
        inputs: [{ value: "Bob Smith" }],
        isRootAware: true,
      }),
      brickOptionsFactory({ root: document.querySelector("div")! }),
    );

    await expect(promise).rejects.toThrow(BusinessError);
  });
});

describe("FormFill", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <html>
        <body>
          <div id="noForm"></div>
          <div id="hasForm">
            <form>
              <input type="text" name="name" value="John Doe" />
            </form>
          </div>
        </body>
      </html>
    `;
  });

  test("isRootAware", async () => {
    await expect(formFillBrick.isRootAware()).resolves.toBe(true);
  });

  it("sets text field value", async () => {
    await formFillBrick.run(
      unsafeAssumeValidArg({
        formSelector: "form",
        fieldNames: { name: "Bob Smith" },
      }),
      brickOptionsFactory(),
    );

    expect(document.querySelector("[name='name']")).toHaveValue("Bob Smith");
  });

  it("is root aware", async () => {
    const promise = formFillBrick.run(
      unsafeAssumeValidArg({
        formSelector: "form",
        fieldNames: { name: "Bob Smith" },
        isRootAware: true,
      }),
      brickOptionsFactory({
        root: document.querySelector<HTMLElement>("#noForm")!,
      }),
    );

    await expect(promise).rejects.toThrow(NoElementsFoundError);

    await formFillBrick.run(
      unsafeAssumeValidArg({
        formSelector: "form",
        fieldNames: { name: "Bob Smith" },
        isRootAware: true,
      }),
      brickOptionsFactory({
        root: document.querySelector<HTMLElement>("#hasForm")!,
      }),
    );

    expect(document.querySelector("[name='name']")).toHaveValue("Bob Smith");
  });
});
