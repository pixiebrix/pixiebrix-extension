import { getPropByPath } from "@/utils";

test("can get array element by index", () => {
  expect(getPropByPath({ array: [1, 2, 3] }, "array.0")).toBe(1);
});

test("can get integer object property", () => {
  expect(getPropByPath({ array: { 0: "foo" } }, "array.0")).toBe("foo");
});

test("can get object path in array", () => {
  expect(getPropByPath({ array: [{ key: "foo" }] }, "array.0.key")).toBe("foo");
});

test("can apply null coalescing to array index", () => {
  expect(getPropByPath({ array: [{ key: "foo" }] }, "array.1?.key")).toBeNull();
});
