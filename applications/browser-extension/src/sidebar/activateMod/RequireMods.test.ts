import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { requiresUserConfiguration } from "@/sidebar/activateMod/RequireMods";

describe("requiresUserConfiguration", () => {
  it("treats no options as required if required is missing", () => {
    const definition = modDefinitionFactory({
      options: {
        schema: {
          properties: {
            foo: {
              type: "string",
            },
          },
        },
      },
    });

    expect(requiresUserConfiguration(definition, [], {})).toBe(false);
  });

  it("handles empty required prop", () => {
    const definition = modDefinitionFactory({
      options: {
        schema: {
          properties: {
            foo: {
              type: "string",
            },
          },
          required: [],
        },
      },
    });

    expect(requiresUserConfiguration(definition, [], {})).toBe(false);
  });

  it("considers required field", () => {
    const definition = modDefinitionFactory({
      options: {
        schema: {
          properties: {
            foo: {
              type: "string",
            },
          },
          required: ["foo"],
        },
      },
    });

    expect(requiresUserConfiguration(definition, [], {})).toBe(true);
  });

  it("databases don't require configuration when required", () => {
    const definition = modDefinitionFactory({
      options: {
        schema: {
          properties: {
            foo: {
              $ref: "https://app.pixiebrix.com/schemas/database#",
              format: "preview",
            },
          },
          required: ["foo"],
        },
      },
    });

    expect(requiresUserConfiguration(definition, [], {})).toBe(false);
  });

  it("non-preview databases require configuration", () => {
    const definition = modDefinitionFactory({
      options: {
        schema: {
          properties: {
            foo: {
              $ref: "https://app.pixiebrix.com/schemas/database#",
            },
          },
          required: ["foo"],
        },
      },
    });

    expect(requiresUserConfiguration(definition, [], {})).toBe(true);
  });

  it("treat initial option as not missing", () => {
    const definition = modDefinitionFactory({
      options: {
        schema: {
          properties: {
            foo: {
              type: "string",
            },
          },
          required: ["foo"],
        },
      },
    });

    expect(requiresUserConfiguration(definition, [], { foo: "hello" })).toBe(
      false,
    );
  });
});
