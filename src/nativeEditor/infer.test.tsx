import { inferButtonHTML, inferPanelHTML } from "@/nativeEditor/infer";

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

test("infer bootstrap anchor button", () => {
  document.body.innerHTML =
    '<div><a href="/docs/5.0/getting-started/download/" class="btn btn-lg btn-outline-secondary mb-3">Download</a></div>';
  const inferred = inferButtonHTML(
    $(document).find("div").get(0),
    $(document).find("a").get()
  );
  expect(inferred).toBe(
    '<a href="#" class="btn btn-lg btn-outline-secondary mb-3">{{{ caption }}}</a>'
  );
});

test("do not duplicate button caption", () => {
  document.body.innerHTML =
    '<div><button type="button"><!---->\n' +
    '<span class="artdeco-button__text">\n' +
    "    View in Sales Navigator\n" +
    "</span></button></div>";
  const inferred = inferButtonHTML(
    $(document).find("div").get(0),
    $(document).find("a").get()
  );
  expect(inferred).toBe(
    '<button type="button"><span class="artdeco-button__text">{{{ caption }}}</span></button>'
  );
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
    "<button" +
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

test("infer single panel", () => {
  document.body.innerHTML =
    "<div>" +
    "<section><header><h2>Bar</h2></header><div><p>This is some other text</p></div></section>" +
    "</div>";

  const inferred = inferPanelHTML(
    $(document).find("div").get(0),
    $(document).find("section").get()
  );

  expect(inferred).toBe(
    "<section><header><h2>{{{ heading }}}</h2></header><div>{{{ body }}}</div></section>"
  );
});

test("infer basic panel structure with header", () => {
  document.body.innerHTML =
    "<div>" +
    "<section><header><h2>Foo</h2></header><div><p>This is some text</p></div></section>" +
    "<section><header><h2>Bar</h2></header><div><p>This is some other text</p></div></section>" +
    "</div>";

  const inferred = inferPanelHTML(
    $(document).find("div").get(0),
    $(document).find("section").get()
  );

  expect(inferred).toBe(
    "<section><header><h2>{{{ heading }}}</h2></header><div>{{{ body }}}</div></section>"
  );
});

test("infer basic panel structure with div header", () => {
  document.body.innerHTML =
    "<div>" +
    "<section><div><h2>Foo</h2></div><div><p>This is some text</p></div></section>" +
    "<section><div><h2>Bar</h2></div><div><p>This is some other text</p></div></section>" +
    "</div>";

  const inferred = inferPanelHTML(
    $(document).find("div").get(0),
    $(document).find("section").get()
  );

  expect(inferred).toBe(
    "<section><div><h2>{{{ heading }}}</h2></div><div>{{{ body }}}</div></section>"
  );
});

test("infer header structure mismatch", () => {
  document.body.innerHTML =
    "<div>" +
    "<section><h2>Foo</h2><div><p>This is some text</p></div></section>" +
    "<section><header><h2>Bar</h2></header><div><p>This is some other text</p></div></section>" +
    "</div>";

  const inferred = inferPanelHTML(
    $(document).find("div").get(0),
    $(document).find("section").get()
  );

  expect(inferred).toBe(
    "<section><h2>{{{ heading }}}</h2><div>{{{ body }}}</div></section>"
  );
});
