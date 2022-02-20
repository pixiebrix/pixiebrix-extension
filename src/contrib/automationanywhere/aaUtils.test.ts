import {
  interfaceToInputSchema,
  isCommunityControlRoom,
  selectBotOutput,
} from "@/contrib/automationanywhere/aaUtils";
import { Activity } from "@/contrib/automationanywhere/contract";

describe("isCommunityControlRoom", () => {
  test("detect community URL", () => {
    expect(
      isCommunityControlRoom(
        "https://community2.cloud-2.automationanywhere.digital/"
      )
    ).toBeTruthy();
  });

  test("detect enterprise cloud URL", () => {
    expect(
      isCommunityControlRoom("https://aa-dev-1.my.automationanywhere.digital/")
    ).toBeFalsy();
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
      },
      required: ["in_String", "in_Number"],
    });
  });
});

describe("selectBotOutput", () => {
  test("select outputs", () => {
    const activity: Activity = {
      status: "COMPLETED",
      outputVariables: {
        out_String: {
          string: "foo",
        },
        out_Number: {
          number: 42,
        },
        out_Boolean: {
          boolean: true,
        },
      },
    };

    expect(selectBotOutput(activity)).toStrictEqual({
      out_String: "foo",
      out_Number: 42,
      out_Boolean: true,
    });
  });
});
