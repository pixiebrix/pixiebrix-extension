import { UnknownObject } from "@/types/objectTypes";
import { define } from "cooky-cutter";
import { StarterBrickConfig } from "@/starterBricks/types";
import {
  QuickBarConfig,
  QuickBarDefinition,
} from "@/starterBricks/quickBarExtension";
import { validateRegistryId } from "@/types/helpers";
import { Metadata } from "@/types/registryTypes";
import { ResolvedModComponent } from "@/types/modComponentTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { BrickPipeline } from "@/bricks/types";
import {
  SidebarConfig,
  SidebarDefinition,
  fromJS,
} from "@/starterBricks/sidebarExtension";
import { RunReason } from "@/types/runtimeTypes";
import { RootReader } from "@/starterBricks/starterBrickTestUtils";
import { getReservedPanelEntries } from "@/contentScript/sidebarController";
import { object } from "yup";

const rootReader = new RootReader();

const starterBrickFactory = (definitionOverrides: UnknownObject = {}) =>
  define<StarterBrickConfig<SidebarDefinition>>({
    apiVersion: "v3",
    kind: "extensionPoint",
    metadata: (n: number) =>
      ({
        id: validateRegistryId(`test/starter-brick-${n}`),
        name: "Test Starter Brick",
      } as Metadata),
    definition: define<SidebarDefinition>({
      type: "actionPanel",
      isAvailable: () => ({
        matchPatterns: ["*://*/*"],
      }),
      reader: () => [rootReader.id],
      ...definitionOverrides,
    }),
  });

const extensionFactory = define<ResolvedModComponent<SidebarConfig>>({
  apiVersion: "v3",
  _resolvedModComponentBrand: undefined,
  id: uuidSequence,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/starter-brick-${n}`),
  _recipe: null,
  label: "Test Extension",
  config: define<SidebarConfig>({
    heading: "Test Action",
    body: () => [] as BrickPipeline,
  }),
});

describe("sidebarExtension", () => {
  it("reserves panel on load", async () => {
    const extensionPoint = fromJS(starterBrickFactory()());

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();
    await extensionPoint.run({ reason: RunReason.MANUAL });

    // Not run until shown
    expect(rootReader.readCount).toBe(0);

    expect(getReservedPanelEntries()).toStrictEqual({
      forms: [],
      panels: [
        expect.objectContaining({
          extensionPointId: extensionPoint.id,
        }),
      ],
      temporaryPanels: [],
      recipeToActivate: null,
    });

    extensionPoint.uninstall();
  });

  it("synchronize clears panel", async () => {
    const extensionPoint = fromJS(starterBrickFactory()());

    extensionPoint.addExtension(
      extensionFactory({
        extensionPointId: extensionPoint.id,
      })
    );

    await extensionPoint.install();

    expect(getReservedPanelEntries().panels).toHaveLength(1);

    extensionPoint.syncExtensions([]);

    // Synchronize removes the panel
    expect(getReservedPanelEntries().panels).toHaveLength(0);

    extensionPoint.uninstall();
  });

  it("remove clears panel", async () => {
    const extensionPoint = fromJS(starterBrickFactory()());

    const extension = extensionFactory({
      extensionPointId: extensionPoint.id,
    });

    extensionPoint.addExtension(extension);

    await extensionPoint.install();

    expect(getReservedPanelEntries().panels).toHaveLength(1);

    extensionPoint.removeExtension(extension.id);

    // Synchronize removes the panel
    expect(getReservedPanelEntries().panels).toHaveLength(0);

    extensionPoint.uninstall();
  });
});
