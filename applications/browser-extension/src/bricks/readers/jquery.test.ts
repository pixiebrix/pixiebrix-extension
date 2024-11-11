import { readJQuery } from "@/bricks/readers/jquery";

describe("jquery", () => {
  it("reads data attribute", async () => {
    document.body.innerHTML = '<div data-foo="bar"></div>';

    const result = await readJQuery({
      type: "jquery",
      selectors: {
        property: {
          selector: "div",
          // The data attribute should not have the prefix
          data: "foo",
        },
      },
    });

    expect(result).toEqual({
      property: "bar",
    });
  });

  it("reads attribute", async () => {
    document.body.innerHTML = '<div aria-label="bar"></div>';

    const result = await readJQuery({
      type: "jquery",
      selectors: {
        property: {
          selector: "div",
          attr: "aria-label",
        },
      },
    });

    expect(result).toEqual({
      property: "bar",
    });
  });

  it("reads simple selector", async () => {
    document.body.innerHTML = "<div>foo</div>";

    const result = await readJQuery({
      type: "jquery",
      selectors: {
        property: "div",
      },
    });

    expect(result).toEqual({
      property: "foo",
    });
  });

  it("reads value of input", async () => {
    document.body.innerHTML = '<input name="foo" value="bar">';

    const result = await readJQuery({
      type: "jquery",
      selectors: {
        property: 'input[name="foo"]',
      },
    });

    expect(result).toEqual({
      property: "bar",
    });
  });

  it("returns empty object if now sub-properties", async () => {
    document.body.innerHTML = "<div>foo</div>";

    const result = await readJQuery({
      type: "jquery",
      selectors: {
        property: {
          selector: "div",
          find: {},
        },
      },
    });

    expect(result).toEqual({
      property: {},
    });
  });

  it("casts to number", async () => {
    document.body.innerHTML = "<div>42</div>";

    const result = await readJQuery({
      type: "jquery",
      selectors: {
        property: {
          selector: "div",
          type: "number",
        },
      },
    });

    expect(result).toEqual({
      property: 42,
    });
  });
});
