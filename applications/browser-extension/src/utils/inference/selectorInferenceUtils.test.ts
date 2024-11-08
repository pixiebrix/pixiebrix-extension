import { getAttributeSelectorRegex } from "./selectorInferenceUtils";

function testAttribute(regex: RegExp, attribute: string) {
  expect(`[${attribute}]`).toMatch(regex);
  expect(`[${attribute}=anything]`).toMatch(regex);
  expect(`[${attribute}='anything']`).toMatch(regex);

  expect(`[no${attribute}]`).not.toMatch(regex);
  expect(`[no-${attribute}]`).not.toMatch(regex);
  expect(`[${attribute}d]`).not.toMatch(regex);
  expect(`[${attribute}-user]`).not.toMatch(regex);
  expect(`[${attribute}]:checked`).not.toMatch(regex);
}

test("getAttributeSelectorRegex", () => {
  const singleAttributeRegex = getAttributeSelectorRegex("name");
  testAttribute(singleAttributeRegex, "name");
  expect(singleAttributeRegex).toStrictEqual(/^\[name(=|]$)/);

  const multipleAttributeRegex = getAttributeSelectorRegex(
    "name",
    "aria-label",
  );
  testAttribute(multipleAttributeRegex, "name");
  testAttribute(multipleAttributeRegex, "aria-label");
  expect(multipleAttributeRegex).toStrictEqual(
    /^\[name(=|]$)|^\[aria-label(=|]$)/,
  );
});
