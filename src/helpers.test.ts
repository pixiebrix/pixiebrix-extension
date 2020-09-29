import { isSimplePath, mapArgs } from "@/helpers";

test("can detect path", () => {
  expect(isSimplePath("array.0", { array: [] })).toBeTruthy();
  expect(isSimplePath("@anOutputKey", { "@anOutputKey": "foo" })).toBeTruthy();
  expect(isSimplePath("kebab-case", { "kebab-case": "foo" })).toBeTruthy();
  expect(isSimplePath("snake_case", { snake_case: "foo" })).toBeTruthy();
});

test("can detect path with optional chaining", () => {
  expect(isSimplePath("array?.0", { array: [] })).toBeTruthy();
});

test("first path must exist in context", () => {
  expect(isSimplePath("array", {})).toBeFalsy();
  expect(isSimplePath("@anOutputKey", { anOutputKey: "foo" })).toBeFalsy();
  expect(isSimplePath("kebab-case", { kebab_case: "foo" })).toBeFalsy();
  expect(isSimplePath("snake_case", { "snake-case": "foo" })).toBeFalsy();
});

test("prefer path to renderer", () => {
  expect(mapArgs({ foo: "array.0" }, { array: ["bar"] })).toEqual({
    foo: "bar",
  });
});

test("default to handlebars template", () => {
  expect(mapArgs({ foo: "array.0" }, { otherVar: ["bar"] })).toEqual({
    foo: "array.0",
  });
});
