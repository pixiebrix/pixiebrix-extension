import { checkModDefinitionPermissions } from "./modDefinitionPermissionsHelpers";
import {
  modDefinitionFactory,
  starterBrickDefinitionFactory,
} from "../testUtils/factories/modDefinitionFactories";
import starterBrickRegistry from "../starterBricks/registry";
import { fromJS } from "../starterBricks/factory";

// Mocked by default via testAfterEnv and permissionsMock
jest.unmock("./modDefinitionPermissionsHelpers");

const containsMock = jest.mocked(browser.permissions.contains);

beforeEach(() => {
  jest.clearAllMocks();
  starterBrickRegistry.clear();
});

describe("checkModDefinitionPermissions", () => {
  it("handles required clipboard write permissions", async () => {
    const modDefinition = modDefinitionFactory();
    modDefinition.extensionPoints[0]!.permissions!.permissions = [
      "clipboardWrite",
    ];
    const starterBrick = fromJS(starterBrickDefinitionFactory());
    starterBrickRegistry.register([starterBrick]);
    modDefinition.extensionPoints[0]!.id = starterBrick.id;

    await expect(
      checkModDefinitionPermissions(modDefinition, []),
    ).resolves.toStrictEqual({
      hasPermissions: false,
      permissions: {
        origins: starterBrick.permissions.origins,
        permissions: [
          ...starterBrick.permissions.permissions!,
          "clipboardWrite",
        ],
      },
    });

    expect(containsMock).toHaveBeenCalledExactlyOnceWith({
      origins: starterBrick.permissions.origins,
      permissions: [...starterBrick.permissions.permissions!, "clipboardWrite"],
    });
  });

  it("handles optional clipboard write permissions", async () => {
    const modDefinition = modDefinitionFactory();
    modDefinition.extensionPoints[0]!.permissions!.permissions = [
      "clipboardWrite",
    ];
    const starterBrick = fromJS(starterBrickDefinitionFactory());
    starterBrickRegistry.register([starterBrick]);
    modDefinition.extensionPoints[0]!.id = starterBrick.id;

    await expect(
      checkModDefinitionPermissions(modDefinition, [], {
        optionalPermissions: ["clipboardWrite"],
      }),
    ).resolves.toStrictEqual({
      hasPermissions: false,
      permissions: {
        origins: starterBrick.permissions.origins,
        permissions: [
          ...starterBrick.permissions.permissions!,
          "clipboardWrite",
        ],
      },
    });

    expect(containsMock).toHaveBeenCalledExactlyOnceWith({
      origins: starterBrick.permissions.origins,
      // `clipboardWrite` is included in the declared permissions, but not in the call to contains
      permissions: [...starterBrick.permissions.permissions!],
    });
  });
});
