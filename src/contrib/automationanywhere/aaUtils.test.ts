import {
  hostnameToUrl,
  interfaceToInputSchema,
  isCommunityControlRoom,
  selectBotOutput,
} from "@/contrib/automationanywhere/aaUtils";
import { type Execution } from "@/contrib/automationanywhere/contract";

describe("isCommunityControlRoom", () => {
  test.each([
    ["https://community2.cloud-2.automationanywhere.digital/"],
    ["https://community.cloud.automationanywhere.digital"],
  ])("detect community URL: %s", (url: string) => {
    expect(isCommunityControlRoom(url)).toBeTruthy();
  });

  test.each([
    ["community2.cloud-2.automationanywhere.digital/"],
    ["community.cloud.automationanywhere.digital"],
  ])("detect community hostname: %s", (url: string) => {
    expect(isCommunityControlRoom(url)).toBeTruthy();
  });

  test("detect enterprise cloud URL", () => {
    expect(
      isCommunityControlRoom("https://aa-dev-1.my.automationanywhere.digital/"),
    ).toBeFalsy();
  });
});

describe("hostnameToUrl", () => {
  test("nop for HTTPS URL", () => {
    expect(hostnameToUrl("https://example.com")).toBe("https://example.com");
  });

  test("nop for HTTP URL", () => {
    expect(hostnameToUrl("http://foo.example.com")).toBe(
      "http://foo.example.com",
    );
  });

  test("prefixes HTTPS:", () => {
    expect(hostnameToUrl("foo.example.com")).toBe("https://foo.example.com");
  });
});

describe("interfaceToInputSchema", () => {
  test("convert to JSON Schema", () => {
    const schema = interfaceToInputSchema({
      variables: [
        {
          name: "in_String",
          input: true,
          output: false,
          description: "The description",
          type: "STRING",
          defaultValue: {
            type: "STRING",
            string: "",
            number: "",
            boolean: "",
          },
        },
        {
          name: "in_Number",
          input: true,
          output: false,
          description: "The description",
          type: "NUMBER",
          defaultValue: {
            type: "NUMBER",
            string: "",
            number: "42",
            boolean: "",
          },
        },
        {
          name: "in_Boolean",
          input: true,
          output: false,
          description: "The description",
          type: "BOOLEAN",
          defaultValue: {
            type: "BOOLEAN",
            string: "",
            number: "",
            boolean: "true",
          },
        },
        {
          name: "out_Number",
          input: false,
          output: true,
          description: "The description",
          type: "NUMBER",
          defaultValue: {
            type: "NUMBER",
            string: "",
            number: "42",
            boolean: "",
          },
        },
      ],
    });

    expect(schema).toStrictEqual({
      type: "object",
      properties: {
        in_String: {
          type: "string",
          description: "The description",
          default: "",
        },
        in_Number: {
          type: "number",
          description: "The description",
          default: 42,
        },
        in_Boolean: {
          type: "boolean",
          description: "The description",
          default: true,
        },
      },
      required: ["in_String", "in_Number", "in_Boolean"],
    });
  });
});

describe("selectBotOutput", () => {
  test("select outputs", () => {
    const activity: Execution = {
      botOutVariables: {
        values: {
          out_String: {
            type: "STRING",
            string: "foo",
            number: "",
            boolean: "",
            dictionary: [],
          },
          out_Number: {
            type: "NUMBER",
            string: "",
            number: "42",
            boolean: "",
            dictionary: [],
          },
          out_Boolean: {
            type: "BOOLEAN",
            boolean: "true",
            string: "",
            number: "",
            dictionary: [],
          },
          out_Dictionary: {
            type: "DICTIONARY",
            boolean: "",
            string: "",
            number: "",
            dictionary: [
              {
                key: "foo",
                value: {
                  type: "STRING",
                  string: "bar",
                  number: "",
                  boolean: "",
                  dictionary: [],
                },
              },
              {
                key: "baz",
                value: {
                  type: "BOOLEAN",
                  boolean: "true",
                  string: "",
                  number: "",
                  dictionary: [],
                },
              },
              {
                key: "qux",
                value: {
                  type: "NUMBER",
                  string: "",
                  number: "42",
                  boolean: "",
                  dictionary: [],
                },
              },
            ],
          },
          out_Table: {
            type: "TABLE",
            boolean: "",
            string: "",
            number: "",
            dictionary: [],
            table: {
              schema: [
                {
                  name: "Date",
                  type: "STRING",
                  subtype: "STRING",
                },
                {
                  name: "Items",
                  type: "STRING",
                  subtype: "STRING",
                },
                {
                  name: "Total",
                  type: "STRING",
                  subtype: "STRING",
                },
              ],
              rows: [
                {
                  values: [
                    {
                      type: "STRING",
                      string: "2022-01-01",
                      number: "",
                      boolean: "",
                      dictionary: [],
                    },
                    {
                      type: "STRING",
                      string: "Foo, bar, baz",
                      number: "",
                      boolean: "",
                      dictionary: [],
                    },
                    {
                      type: "STRING",
                      string: "42",
                      number: "",
                      boolean: "",
                      dictionary: [],
                    },
                  ],
                },
                {
                  values: [
                    {
                      type: "STRING",
                      string: "2022-01-02",
                      number: "",
                      boolean: "",
                      dictionary: [],
                    },
                    {
                      type: "STRING",
                      string: "Qux, quux",
                      number: "",
                      boolean: "",
                      dictionary: [],
                    },
                    {
                      type: "STRING",
                      string: "24",
                      number: "",
                      boolean: "",
                      dictionary: [],
                    },
                  ],
                },
                {
                  values: [
                    {
                      type: "STRING",
                      string: "2022-01-03",
                      number: "",
                      boolean: "",
                      dictionary: [],
                    },
                    {
                      type: "STRING",
                      string: "Corge",
                      number: "",
                      boolean: "",
                      dictionary: [],
                    },
                    {
                      type: "STRING",
                      string: "12",
                      number: "",
                      boolean: "",
                      dictionary: [],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    };

    expect(selectBotOutput(activity)).toStrictEqual({
      out_String: "foo",
      out_Number: 42,
      out_Boolean: true,
      out_Dictionary: {
        foo: "bar",
        baz: true,
        qux: 42,
      },
      out_Table: [
        {
          Date: "2022-01-01",
          Items: "Foo, bar, baz",
          Total: "42",
        },
        {
          Date: "2022-01-02",
          Items: "Qux, quux",
          Total: "24",
        },
        {
          Date: "2022-01-03",
          Items: "Corge",
          Total: "12",
        },
      ],
    });
  });
});
