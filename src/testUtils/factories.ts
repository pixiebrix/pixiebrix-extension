/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import {
  array,
  type Config,
  define,
  derive,
  type FactoryConfig,
} from "cooky-cutter";
import { type BlockConfig, type BlockPipeline } from "@/blocks/types";
import {
  type ApiVersion,
  type IBlock,
  type IExtension,
  type InnerDefinitionRef,
  type InnerDefinitions,
  type Metadata,
  type OutputKey,
  type RecipeMetadata,
  type RegistryId,
  type RenderedArgs,
  type SafeString,
  type SanitizedConfig,
  type SanitizedServiceConfiguration,
  type Schema,
  type ServiceDependency,
  type UserOptions,
  type UUID,
} from "@/core";
import { type TraceError, type TraceRecord } from "@/telemetry/trace";
import {
  validateRegistryId,
  validateSemVerString,
  validateTimestamp,
  validateUUID,
} from "@/types/helpers";
import { type BaseExtensionState } from "@/pageEditor/extensionPoints/elementConfig";
import trigger from "@/pageEditor/extensionPoints/trigger";
import menuItem from "@/pageEditor/extensionPoints/menuItem";
import {
  type ActionFormState,
  type ContextMenuFormState,
  type FormState,
  type QuickBarFormState,
  type SidebarFormState,
  type TriggerFormState,
} from "@/pageEditor/extensionPoints/formStateTypes";
import {
  type ExtensionPointConfig,
  type RecipeDefinition,
  type SharingDefinition,
} from "@/types/definitions";
import {
  type ExtensionPointConfig as ExtensionPointDefinition,
  type ExtensionPointDefinition as ExtensionPointConfigDefinition,
  type ExtensionPointType,
} from "@/extensionPoints/types";
import {
  type CloudExtension,
  type Deployment,
  type MarketplaceListing,
  type MarketplaceTag,
  type Milestone,
  UserRole,
} from "@/types/contract";
import { type ButtonSelectionResult } from "@/contentScript/pageEditor/types";
import getType from "@/runtime/getType";
import { freshIdentifier } from "@/utils";
import { DEFAULT_EXTENSION_POINT_VAR } from "@/pageEditor/extensionPoints/base";
import { padStart } from "lodash";
import {
  type AuthState,
  type AuthUserOrganization,
  type OrganizationAuthState,
} from "@/auth/authTypes";
import { type JsonObject } from "type-fest";
import objectHash from "object-hash";
import { makeEmptyPermissions } from "@/utils/permissions";
import { type Permissions } from "webextension-polyfill";
import quickBar from "@/pageEditor/extensionPoints/quickBar";
import contextMenu from "@/pageEditor/extensionPoints/contextMenu";
import sidebar from "@/pageEditor/extensionPoints/sidebar";

// UUID sequence generator that's predictable across runs. A couple characters can't be 0
// https://stackoverflow.com/a/19989922/402560
export const uuidSequence = (n: number) =>
  validateUUID(`${padStart(String(n), 8, "0")}-0000-4000-A000-000000000000`);

const timestampFactory = () => new Date().toISOString();

export const organizationFactory = define<AuthUserOrganization>({
  id: uuidSequence,
  name(n: number): string {
    return `Test Organization ${n}`;
  },
  role: UserRole.developer,
  scope(n: number): string {
    return `@organization-${n}`;
  },
  isDeploymentManager: false,
  hasComplianceAuthToken: false,
});

export const authStateFactory = define<AuthState>({
  userId: uuidSequence,
  email: (n: number) => `user${n}@test.com`,
  scope: (n: number) => `@user${n}`,
  isLoggedIn: true,
  isOnboarded: true,
  extension: true,
  enforceUpdateMillis: null,
  organizations() {
    return [
      organizationFactory({
        role: UserRole.developer,
      }),
      organizationFactory({
        name(n: number): string {
          return `Test Admin Organization ${n}`;
        },
        role: UserRole.admin,
      }),
      organizationFactory({
        name(n: number): string {
          return `Test Member Organization ${n}`;
        },
        role: UserRole.member,
      }),
      organizationFactory({
        name(n: number): string {
          return `Test Restricted Organization ${n}`;
        },
        role: UserRole.restricted,
      }),
      organizationFactory({
        name(n: number): string {
          return `Test Manager Organization ${n}`;
        },
        role: UserRole.manager,
      }),
    ];
  },
  organization: derive<AuthState, OrganizationAuthState>(
    ({ organizations }) => organizations[0],
    "organizations"
  ),
  groups() {
    const groups: AuthState["groups"] = [];
    return groups;
  },
  flags() {
    const flags: AuthState["flags"] = [];
    return flags;
  },
  milestones(): Milestone[] {
    return [];
  },
});

export const recipeMetadataFactory = define<Metadata>({
  id: (n: number) => validateRegistryId(`test/recipe-${n}`),
  name: (n: number) => `Recipe ${n}`,
  description: "Recipe generated from factory",
  version: validateSemVerString("1.0.0"),
});

export const sharingDefinitionFactory = define<SharingDefinition>({
  public: false,
  organizations: () => [] as UUID[],
});

export const installedRecipeMetadataFactory = define<RecipeMetadata>({
  id: (n: number) => validateRegistryId(`test/recipe-${n}`),
  name: (n: number) => `Recipe ${n}`,
  description: "Recipe generated from factory",
  version: validateSemVerString("1.0.0"),
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  sharing: sharingDefinitionFactory,
});

export const extensionFactory = define<IExtension>({
  id: uuidSequence,
  apiVersion: "v3" as ApiVersion,
  extensionPointId: (n: number) =>
    validateRegistryId(`test/extension-point-${n}`),
  _recipe: undefined,
  _deployment: undefined,
  label: "Test label",
  services(): ServiceDependency[] {
    return [];
  },
  config: (n: number) => ({
    apiVersion: "v3" as ApiVersion,
    kind: "component",
    metadata: recipeMetadataFactory({
      id: validateRegistryId(`test/component-${n}`),
      name: "Test config",
    }),
    inputSchema: {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {},
      required: [] as string[],
    },

    // This is the pipeline prop for the MenuItem extension point, which is the default for extensionPointDefinitionFactory
    action: [
      {
        id: "@pixiebrix/browser/open-tab",
        config: {
          url: "http://www.amazon.com/s",
          params: {
            url: "search-alias={{{department}}}{{^department}}all{{/department}}&field-keywords={{{query}}}",
          },
        },
      },
    ],
  }),
  active: true,
});

export const cloudExtensionFactory = (
  override?: Partial<Config<CloudExtension>>
) => {
  const extension = extensionFactory(
    override as Config<IExtension>
  ) as CloudExtension;

  // @ts-expect-error -- removing the IExtension property that is not in the CloudExtension type
  delete extension.active;

  const timestamp = timestampFactory();
  extension.createTimestamp = timestamp;
  extension.updateTimestamp = timestamp;

  return extension;
};

const TEST_BLOCK_ID = validateRegistryId("testing/block-id");

export const traceRecordFactory = define<TraceRecord>({
  timestamp: timestampFactory,
  extensionId: uuidSequence,
  runId: uuidSequence,
  branches(): TraceRecord["branches"] {
    return [];
  },
  // XXX: callId should be derived from branches
  callId: objectHash([]),
  blockInstanceId: uuidSequence,
  blockId: TEST_BLOCK_ID,
  templateContext(): TraceRecord["templateContext"] {
    return {};
  },
  renderedArgs(): RenderedArgs {
    return {} as RenderedArgs;
  },
  renderError: null,
  blockConfig(): BlockConfig {
    return {
      id: TEST_BLOCK_ID,
      config: {},
    };
  },
});

export const traceErrorFactory = (config?: FactoryConfig<TraceRecord>) =>
  traceRecordFactory({
    error: {
      message: "Trace error for tests",
    },
    skippedRun: false,
    isFinal: true,
    isRenderer: false,
    ...config,
  }) as TraceError;

export const blockFactory = define<IBlock>({
  id: (i: number) => validateRegistryId(`${TEST_BLOCK_ID}_${i}`),
  name: (i: number) => `${TEST_BLOCK_ID} ${i}`,
  inputSchema: null as Schema,
  defaultOptions: null,
  permissions: makeEmptyPermissions(),
  run: jest.fn(),
});

export const typedBlockFactory = async (
  partialBlock?: FactoryConfig<IBlock>
) => {
  const block = blockFactory(partialBlock);
  return {
    block,
    type: await getType(block),
  };
};

export const blockConfigFactory = define<BlockConfig>({
  instanceId: uuidSequence,
  id: (i: number) => validateRegistryId(`${TEST_BLOCK_ID}_${i}`),
  config: () => ({}),
});

export const pipelineFactory: (
  blockConfigOverride?: FactoryConfig<BlockConfig>
) => BlockPipeline = (blockConfigProps) => {
  const blockConfig1 = blockConfigFactory(blockConfigProps);
  const blockConfig2 = blockConfigFactory(blockConfigProps);

  return [blockConfig1, blockConfig2] as BlockPipeline;
};

export const baseExtensionStateFactory = define<BaseExtensionState>({
  blockPipeline: () => pipelineFactory(),
});

export const extensionPointConfigFactory = define<ExtensionPointConfig>({
  id: "extensionPoint" as InnerDefinitionRef,
  label: (n: number) => `Test Extension ${n}`,
  services(): Record<OutputKey, RegistryId> {
    return {};
  },
  permissions(): Permissions.Permissions {
    return makeEmptyPermissions();
  },
  config: () => ({
    caption: "Button",
    action: [] as BlockPipeline,
  }),
});

export const recipeDefinitionFactory = define<RecipeDefinition>({
  kind: "recipe",
  apiVersion: "v3",
  metadata: (n: number) =>
    recipeMetadataFactory({
      id: validateRegistryId(`test/blueprint-${n}`),
      name: `Blueprint ${n}`,
    }),
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  sharing: sharingDefinitionFactory,
  extensionPoints: array(extensionPointConfigFactory, 1),
});

export const extensionPointDefinitionFactory = define<ExtensionPointDefinition>(
  {
    kind: "extensionPoint",
    apiVersion: "v3",
    metadata: (n: number) =>
      recipeMetadataFactory({
        id: validateRegistryId(`test/extension-point-${n}`),
        name: `Extension Point ${n}`,
      }),
    definition(n: number) {
      const definition: ExtensionPointConfigDefinition = {
        type: "menuItem" as ExtensionPointType,
        isAvailable: {
          matchPatterns: [`https://www.mySite${n}.com/*`],
        },
        reader: validateRegistryId("@pixiebrix/document-context"),
      };
      return definition;
    },
  }
);

type ExternalExtensionPointParams = {
  extensionPointId?: RegistryId;
};

/**
 * Factory to create a RecipeDefinition that refers to a versioned extensionPoint
 */
export const versionedExtensionPointRecipeFactory = ({
  extensionPointId,
}: ExternalExtensionPointParams = {}) =>
  define<RecipeDefinition>({
    kind: "recipe",
    apiVersion: "v3",
    metadata: (n: number) => ({
      id: validateRegistryId(`test/recipe-${n}`),
      name: `Recipe ${n}`,
      description: "Recipe generated from factory",
      version: validateSemVerString("1.0.0"),
    }),
    sharing: sharingDefinitionFactory,
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
    definitions: undefined,
    options: undefined,
    extensionPoints: (n: number) => [
      {
        id: extensionPointId ?? validateRegistryId("test/extension-point"),
        label: `Test Extension for Recipe ${n}`,
        services: {},
        permissions: makeEmptyPermissions(),
        config: {
          caption: "Button",
          action: [] as BlockPipeline,
        },
      },
    ],
  });

/**
 * Factory to create a RecipeDefinition with a definitions section and resolved extensions
 */
export const versionedRecipeWithResolvedExtensions = (extensionCount = 1) => {
  const extensionPoints: ExtensionPointConfig[] = [];
  for (let i = 0; i < extensionCount; i++) {
    // Don't use array(factory, count) here, because it will keep incrementing
    // the modifier number across multiple test runs and cause non-deterministic
    // test execution behavior.
    const extensionPoint = extensionPointConfigFactory();
    const ids = extensionPoints.map((x) => x.id);
    const id = freshIdentifier(DEFAULT_EXTENSION_POINT_VAR as SafeString, ids);
    extensionPoints.push({
      ...extensionPoint,
      id: id as InnerDefinitionRef,
    });
  }

  const definitions: InnerDefinitions = {};

  for (const extensionPoint of extensionPoints) {
    definitions[extensionPoint.id] = {
      kind: "extensionPoint",
      definition: extensionPointDefinitionFactory().definition,
    };
  }

  return define<RecipeDefinition>({
    kind: "recipe",
    apiVersion: "v3",
    metadata: (n: number) => ({
      id: validateRegistryId(`test/recipe-${n}`),
      name: `Recipe ${n}`,
      description: "Recipe generated from factory",
      version: validateSemVerString("1.0.0"),
    }),
    sharing: sharingDefinitionFactory,
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
    definitions,
    options: undefined,
    extensionPoints,
  });
};

type InnerExtensionPointParams = {
  extensionPointRef?: InnerDefinitionRef;
};

/**
 * Factory to create a factory that creates a RecipeDefinition that refers to a versioned extensionPoint
 */
export const innerExtensionPointRecipeFactory = ({
  extensionPointRef = "extensionPoint" as InnerDefinitionRef,
}: InnerExtensionPointParams = {}) =>
  define<RecipeDefinition>({
    kind: "recipe",
    apiVersion: "v3",
    metadata: recipeMetadataFactory,
    sharing: (): SharingDefinition => ({ public: false, organizations: [] }),
    updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
    definitions: (): InnerDefinitions => ({
      [extensionPointRef]: {
        kind: "extensionPoint",
        definition: {
          type: "menuItem",
          isAvailable: {
            matchPatterns: ["https://*/*"],
            urlPatterns: [],
            selectors: [],
          },
          reader: validateRegistryId("@pixiebrix/document-context"),
        },
      },
    }),
    options: undefined,
    extensionPoints: () => [
      extensionPointConfigFactory({ id: extensionPointRef }),
    ],
  });

/**
 * A default Recipe factory
 */
export const recipeFactory = innerExtensionPointRecipeFactory();

export const deploymentPackageFactory = define<Deployment["package"]>({
  id: uuidSequence,
  name: derive<Deployment["package"], string>(
    ({ config }) => config.metadata.name,
    "config"
  ),
  version: derive<Deployment["package"], string>(
    ({ config }) => config.metadata.version,
    "config"
  ),
  package_id: derive<Deployment["package"], RegistryId>(
    ({ config }) => config.metadata.id,
    "config"
  ),
  config: recipeDefinitionFactory,
});

export const deploymentFactory = define<Deployment>({
  id: uuidSequence,
  name: (n: number) => `Deployment ${n}`,
  created_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  updated_at: validateTimestamp("2021-10-07T12:52:16.189Z"),
  active: true,
  bindings: () => [] as Deployment["bindings"],
  services: () => [] as Deployment["services"],
  package_version: derive<Deployment, string>(
    ({ package: deploymentPackage }) => deploymentPackage.version,
    "package"
  ),
  package: deploymentPackageFactory,
});

const internalFormStateFactory = define<FormState>({
  apiVersion: "v3" as ApiVersion,
  uuid: uuidSequence,
  installed: true,
  optionsArgs: null as UserOptions,
  services(): ServiceDependency[] {
    return [];
  },
  recipe: null,
  type: "panel" as ExtensionPointType,
  label: (i: number) => `Element ${i}`,
  extension: baseExtensionStateFactory,
  extensionPoint: derive<FormState, ExtensionPointDefinition>(({ type }) => {
    const extensionPoint = extensionPointDefinitionFactory();
    extensionPoint.definition.type = type;
    return extensionPoint;
  }, "type"),
} as any);

export const formStateFactory = (
  override?: FactoryConfig<FormState>,
  pipelineOverride?: BlockPipeline
) => {
  if (pipelineOverride) {
    return internalFormStateFactory({
      ...override,
      extension: baseExtensionStateFactory({
        blockPipeline: pipelineOverride,
      }),
    } as any);
  }

  return internalFormStateFactory(override);
};

export const triggerFormStateFactory = (
  override?: FactoryConfig<TriggerFormState>,
  pipelineOverride?: BlockPipeline
) => {
  const defaultTriggerProps = trigger.fromNativeElement(
    "https://test.com",
    recipeMetadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    null
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as any,
    pipelineOverride
  ) as TriggerFormState;
};

export const sidebarPanelFormStateFactory = (
  override?: FactoryConfig<SidebarFormState>,
  pipelineOverride?: BlockPipeline
) => {
  const defaultTriggerProps = sidebar.fromNativeElement(
    "https://test.com",
    recipeMetadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    // TypeScript complains if the 3rd positional argument is left off
    undefined as never
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as any,
    pipelineOverride
  ) as SidebarFormState;
};

export const contextMenuFormStateFactory = (
  override?: FactoryConfig<ContextMenuFormState>,
  pipelineOverride?: BlockPipeline
) => {
  const defaultTriggerProps = contextMenu.fromNativeElement(
    "https://test.com",
    recipeMetadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    null
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as any,
    pipelineOverride
  ) as ContextMenuFormState;
};

export const quickbarFormStateFactory = (
  override?: FactoryConfig<QuickBarFormState>,
  pipelineOverride?: BlockPipeline
) => {
  const defaultTriggerProps = quickBar.fromNativeElement(
    "https://test.com",
    recipeMetadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    null
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as any,
    pipelineOverride
  ) as QuickBarFormState;
};

export const menuItemFormStateFactory = (
  override?: FactoryConfig<ActionFormState>,
  pipelineOverride?: BlockPipeline
) => {
  const defaultTriggerProps = menuItem.fromNativeElement(
    "https://test.com",
    recipeMetadataFactory({
      id: (n: number) => validateRegistryId(`test/extension-point-${n}`),
      name: (n: number) => `Extension Point ${n}`,
    }),
    {
      item: {
        caption: "Caption for test",
      },
    } as ButtonSelectionResult
  );

  return formStateFactory(
    {
      ...defaultTriggerProps,
      ...override,
    } as any,
    pipelineOverride
  ) as ActionFormState;
};

export const sanitizedServiceConfigurationFactory =
  define<SanitizedServiceConfiguration>({
    id: uuidSequence,
    proxy: false,
    serviceId: (n: number) => validateRegistryId(`test/service-${n}`),
    config: () => ({} as SanitizedConfig),
  } as unknown as SanitizedServiceConfiguration);

const foundationOutputFactory = define<JsonObject>({
  "@input": () => ({
    icon: "",
    title: "Test website title | test.com",
    language: "en",
    url: "https://www.testwebsite.com/",
    provider: "test",
  }),
  "@options": () => ({
    option1: "test string option",
    option2: 42,
  }),
});

export const formStateWithTraceDataFactory = define<{
  formState: FormState;
  records: TraceRecord[];
}>({
  formState(): FormState {
    return formStateFactory();
  },
  records: derive<
    {
      formState: FormState;
      records: TraceRecord[];
    },
    TraceRecord[]
  >(({ formState: { uuid: extensionId, extension } }) => {
    let outputKey = "" as OutputKey;
    let output: JsonObject = foundationOutputFactory();
    return extension.blockPipeline.map((block, index) => {
      const context = output;
      outputKey = `output${index}` as OutputKey;
      output = {
        foo: `bar number ${index}`,
        baz: index * 3,
        qux: {
          thing1: [index * 7, index * 9, index * 11],
          thing2: false,
        },
      };

      return traceRecordFactory({
        extensionId,
        blockInstanceId: block.instanceId,
        blockId: block.id,
        templateContext: context,
        blockConfig: block,
        outputKey,
        output,
      });
    });
  }, "formState"),
});

export const marketplaceTagFactory = define<MarketplaceTag>({
  id: uuidSequence,
  name: (n: number) => `Tag ${n}`,
  slug: (n: number) => `tag-${n}`,
  subtype: "generic",
  fa_icon: "fab abacus",
});

export const marketplaceListingFactory = define<MarketplaceListing>({
  id: uuidSequence,
  fa_icon: "fab abacus",
  image: (n: number) => ({
    url: `https://marketplace.dev/${n}`,
  }),
  assets: () => [] as MarketplaceListing["assets"],
  tags: () => [] as MarketplaceListing["tags"],
  package: (n: number) =>
    ({
      id: uuidSequence,
      name: `@test/test-${n}`,
    } as unknown as MarketplaceListing["package"]),
});
