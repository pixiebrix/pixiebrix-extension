import { inferButtonHTML } from "@/nativeEditor/infer";

test("infer basic button", () => {
  document.body.innerHTML = "<div><button>More</button></div>";

  const inferred = inferButtonHTML(
    $(document).find("div").get(0),
    $(document).find("button").get()
  );
  expect(inferred).toBe("<button>{{{ caption }}}</button>");
});

test("infer button with icon", () => {
  document.body.innerHTML = "<div><button><svg></svg>More</button></div>";

  const inferred = inferButtonHTML(
    $(document).find("div").get(0),
    $(document).find("button").get()
  );
  expect(inferred).toBe("<button>{{{ icon }}}{{{ caption }}}</button>");
});

test("infer submit button", () => {
  document.body.innerHTML = '<div><input type="submit" value="Submit" /></div>';
  const inferred = inferButtonHTML(
    $(document).find("div").get(0),
    $(document).find("input").get()
  );
  expect(inferred).toBe('<input type="button" value="{{{ caption }}}" />');
});

test("infer button", () => {
  document.body.innerHTML = '<div><input type="button" value="Action" /></div>';
  const inferred = inferButtonHTML(
    $(document).find("div").get(0),
    $(document).find("input").get()
  );
  expect(inferred).toBe('<input type="button" value="{{{ caption }}}" />');
});

test("infer ember button", () => {
  document.body.innerHTML =
    "<div>" +
    '<button aria-expanded="false" id="ember1167"' +
    ' class="ember-view artdeco-button"' +
    ' type="button" tabIndex="0">More<!----></button></div>';

  const inferred = inferButtonHTML(
    $(document).find("div").get(0),
    $(document).find("button").get()
  );

  expect(inferred).toBe(
    '<button aria-expanded="false"' +
      ' class="artdeco-button"' +
      ' type="button">{{{ caption }}}</button>'
  );
});

test("infer multiple buttons", () => {
  document.body.innerHTML =
    "<div>" +
    '<button class="a b">Foo</button>' +
    '<button class="a c">Bar</button>' +
    "</div>";

  const inferred = inferButtonHTML(
    $(document).find("div").get(0),
    $(document).find("button").get()
  );

  expect(inferred).toBe('<button class="a">{{{ caption }}}</button>');
});

test("infer list items", () => {
  document.body.innerHTML =
    "<div><ul>" + "<li>Foo</li>" + "<li>Bar</li>" + "</ul></div>";

  const inferred = inferButtonHTML(
    $(document).find("ul").get(0),
    $(document).find("li").get()
  );

  expect(inferred).toBe("<li>{{{ caption }}}</li>");
});

test("infer list item from inside div", () => {
  document.body.innerHTML =
    "<div><ul>" +
    "<li><div>Foo</div></li>" +
    "<li><div>Bar</div></li>" +
    "</ul></div>";

  const inferred = inferButtonHTML(
    $(document).find("ul").get(0),
    $(document).find("li div").get()
  );

  expect(inferred).toBe("<li><div>{{{ caption }}}</div></li>");
});
