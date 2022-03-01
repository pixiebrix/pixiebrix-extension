/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { FormikErrorTree } from "@/pageEditor/tabs/editTab/editTabTypes";
import validateStringTemplates from "@/pageEditor/validation/validateStringTemplates";
import { pipelineFactory } from "@/tests/factories";

describe("validateStringTemplates()", () => {
  test("no error for empty string mustache", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "mustache",
            __value__: "",
          },
        },
      })
    );

    expect(errors).toEqual({});
  });

  test("no error for empty string nunjucks", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "nunjucks",
            __value__: "",
          },
        },
      })
    );

    expect(errors).toEqual({});
  });

  test("no error for regular text mustache", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "mustache",
            __value__: "abc def",
          },
        },
      })
    );

    expect(errors).toEqual({});
  });

  test("no error for regular text nunjucks", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "nunjucks",
            __value__: "abc def",
          },
        },
      })
    );

    expect(errors).toEqual({});
  });

  test("no error for nunjucks template string", () => {
    const errors: FormikErrorTree = {};
    const str =
      "<ul>\n" +
      "  {% for name, item in items %}\n" +
      "  <li>{{ name }}: {{ item }}</li>\n" +
      "  {% endfor %}\n" +
      "</ul>";
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "nunjucks",
            __value__: str,
          },
        },
      })
    );

    expect(errors).toEqual({});
  });

  test("no error for mustache template string", () => {
    const errors: FormikErrorTree = {};
    const str = "my string {{{@foo.bar}}}";
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "mustache",
            __value__: str,
          },
        },
      })
    );

    expect(errors).toEqual({});
  });

  test("error for {{{", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "nunjucks",
            __value__: "{{{@foo.mustache}}}",
          },
        },
      })
    );

    expect(errors).toEqual({
      0: {
        config: {
          foo: expect.any(String),
        },
      },
      1: {
        config: {
          foo: expect.any(String),
        },
      },
    });
  });

  test("error for {{!", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "nunjucks",
            __value__: "string with comment {{! this is a comment }}",
          },
        },
      })
    );

    expect(errors).toEqual({
      0: {
        config: {
          foo: expect.any(String),
        },
      },
      1: {
        config: {
          foo: expect.any(String),
        },
      },
    });
  });

  test("error for {{#", () => {
    const errors: FormikErrorTree = {};
    const str =
      "<ul>\n" +
      "  {{#items}}\n" +
      "  <li>{{ name }}: {{ value }}</li>\n" +
      "  {{/items}}\n" +
      "</ul>";
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "nunjucks",
            __value__: str,
          },
        },
      })
    );

    expect(errors).toEqual({
      0: {
        config: {
          foo: expect.any(String),
        },
      },
      1: {
        config: {
          foo: expect.any(String),
        },
      },
    });
  });

  test("error for {{&", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "nunjucks",
            __value__: "string with literal {{&foo.bar}}",
          },
        },
      })
    );

    expect(errors).toEqual({
      0: {
        config: {
          foo: expect.any(String),
        },
      },
      1: {
        config: {
          foo: expect.any(String),
        },
      },
    });
  });

  test("error for {{>", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "nunjucks",
            __value__: "string calling partial {{> fooBar}}",
          },
        },
      })
    );

    expect(errors).toEqual({
      0: {
        config: {
          foo: expect.any(String),
        },
      },
      1: {
        config: {
          foo: expect.any(String),
        },
      },
    });
  });

  test("error for {{^", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            __type__: "nunjucks",
            __value__: "{{^items}}Items not found{{/items}}",
          },
        },
      })
    );

    expect(errors).toEqual({
      0: {
        config: {
          foo: expect.any(String),
        },
      },
      1: {
        config: {
          foo: expect.any(String),
        },
      },
    });
  });

  test("handles nested fields", () => {
    const errors: FormikErrorTree = {};
    validateStringTemplates(
      errors,
      pipelineFactory({
        config: {
          foo: {
            bar: {
              __type__: "nunjucks",
              __value__: "{{^items}}Items not found{{/items}}",
            },
            baz: 42,
          },
        },
      })
    );

    expect(errors).toEqual({
      0: {
        config: {
          foo: {
            bar: expect.any(String),
          },
        },
      },
      1: {
        config: {
          foo: {
            bar: expect.any(String),
          },
        },
      },
    });
  });
});
