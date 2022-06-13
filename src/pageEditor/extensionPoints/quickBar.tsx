/* eslint-disable filenames/match-exported */
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

import { IExtension, Metadata } from "@/core";
import {
  baseFromExtension,
  baseSelectExtension,
  baseSelectExtensionPoint,
  cleanIsAvailable,
  extensionWithNormalizedPipeline,
  getImplicitReader,
  lookupExtensionPoint,
  makeInitialBaseState,
  makeIsAvailable,
  PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
  removeEmptyValues,
  selectIsAvailable,
} from "@/pageEditor/extensionPoints/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { uuidv4 } from "@/types/helpers";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { getDomain } from "@/permissions/patterns";
import {
  faExclamationTriangle,
  faThLarge,
} from "@fortawesome/free-solid-svg-icons";
import {
  ElementConfig,
  SingleLayerReaderConfig,
} from "@/pageEditor/extensionPoints/elementConfig";
import React from "react";
import { Alert } from "react-bootstrap";
import {
  QuickBarConfig,
  QuickBarDefinition,
  QuickBarExtensionPoint,
} from "@/extensionPoints/quickBarExtension";
import QuickBarConfiguration from "@/pageEditor/tabs/quickBar/QuickBarConfiguration";
import type { DynamicDefinition } from "@/contentScript/nativeEditor/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { QuickBarFormState } from "./formStateTypes";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";

function fromNativeElement(url: string, metadata: Metadata): QuickBarFormState {
  const base = makeInitialBaseState();

  const isAvailable = makeIsAvailable(url);

  const title = "Quick bar item";

  return {
    type: "quickBar",
    // To simplify the interface, this is kept in sync with the caption
    label: title,
    ...base,
    extensionPoint: {
      metadata,
      definition: {
        type: "quickBar",
        reader: getImplicitReader("quickBar"),
        documentUrlPatterns: isAvailable.matchPatterns,
        contexts: ["all"],
        targetMode: "eventTarget",
        defaultOptions: {},
        isAvailable,
      },
    },
    extension: {
      title,
      blockPipeline: [],
    },
  };
}

function selectExtensionPoint(
  formState: QuickBarFormState
): ExtensionPointConfig<QuickBarDefinition> {
  const { extensionPoint } = formState;
  const {
    definition: {
      isAvailable,
      documentUrlPatterns,
      reader,
      targetMode,
      contexts = ["all"],
    },
  } = extensionPoint;
  return removeEmptyValues({
    ...baseSelectExtensionPoint(formState),
    definition: {
      type: "quickBar",
      documentUrlPatterns,
      contexts,
      targetMode,
      reader,
      isAvailable: cleanIsAvailable(isAvailable),
    },
  });
}

function selectExtension(
  state: QuickBarFormState,
  options: { includeInstanceIds?: boolean } = {}
): IExtension<QuickBarConfig> {
  const { extension } = state;
  const config: QuickBarConfig = {
    title: extension.title,
    icon: extension.icon,
    action: options.includeInstanceIds
      ? extension.blockPipeline
      : omitEditorMetadata(extension.blockPipeline),
  };
  return removeEmptyValues({
    ...baseSelectExtension(state),
    config,
  });
}

async function fromExtension(
  config: IExtension<QuickBarConfig>
): Promise<QuickBarFormState> {
  const extensionPoint = await lookupExtensionPoint<
    QuickBarDefinition,
    QuickBarConfig,
    "quickBar"
  >(config, "quickBar");

  const { documentUrlPatterns, defaultOptions, contexts, targetMode, reader } =
    extensionPoint.definition;

  const base = baseFromExtension(config, extensionPoint.definition.type);
  const extension = extensionWithNormalizedPipeline(config.config, "action");

  return {
    ...base,

    extension,

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        type: "quickBar",
        documentUrlPatterns,
        defaultOptions,
        targetMode,
        contexts,
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },
  };
}

async function fromExtensionPoint(
  url: string,
  extensionPoint: ExtensionPointConfig<QuickBarDefinition>
): Promise<QuickBarFormState> {
  if (extensionPoint.definition.type !== "quickBar") {
    throw new Error("Expected quickBar extension point type");
  }

  const {
    defaultOptions = {},
    documentUrlPatterns = [],
    targetMode = "eventTarget",
    type,
    reader,
  } = extensionPoint.definition;

  return {
    uuid: uuidv4(),
    apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
    installed: true,
    type,
    label: `My ${getDomain(url)} quick bar item`,

    services: [],
    permissions: {},
    optionsArgs: {},

    extension: {
      title: defaultOptions.title ?? "Custom Action",
      blockPipeline: [],
    },

    extensionPoint: {
      metadata: extensionPoint.metadata,
      definition: {
        ...extensionPoint.definition,
        defaultOptions,
        documentUrlPatterns,
        targetMode,
        // See comment on SingleLayerReaderConfig
        reader: reader as SingleLayerReaderConfig,
        isAvailable: selectIsAvailable(extensionPoint),
      },
    },

    recipe: undefined,
  };
}

function asDynamicElement(element: QuickBarFormState): DynamicDefinition {
  return {
    type: "quickBar",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPoint: selectExtensionPoint(element),
  };
}

export const UnconfiguredQuickBarAlert: React.FunctionComponent = () => {
  const { isConfigured } = useQuickbarShortcut();

  if (!isConfigured) {
    return (
      <Alert variant="warning">
        <FontAwesomeIcon icon={faExclamationTriangle} />
        &nbsp;You have not{" "}
        <a
          href="chrome://extensions/shortcuts"
          onClick={(event) => {
            event.preventDefault();
            void browser.tabs.create({ url: event.currentTarget.href });
          }}
        >
          configured a Quick Bar shortcut
        </a>
      </Alert>
    );
  }

  return null;
};

const config: ElementConfig<undefined, QuickBarFormState> = {
  displayOrder: 1,
  elementType: "quickBar",
  label: "Quick Bar",
  baseClass: QuickBarExtensionPoint,
  EditorNode: QuickBarConfiguration,
  selectNativeElement: undefined,
  icon: faThLarge,
  fromNativeElement,
  fromExtensionPoint,
  asDynamicElement,
  selectExtensionPoint,
  selectExtension,
  fromExtension,
  InsertModeHelpText() {
    const { isConfigured, shortcut } = useQuickbarShortcut();

    return (
      <div className="text-center pb-2">
        {isConfigured ? (
          <p>
            You&apos;ve configured&nbsp;
            <kbd style={{ fontFamily: "system" }}>{shortcut}</kbd>&nbsp; to open
            the Quick Bar.{" "}
            <a
              href="chrome://extensions/shortcuts"
              onClick={(event) => {
                event.preventDefault();
                void browser.tabs.create({ url: event.currentTarget.href });
              }}
            >
              Change your Quick Bar shortcut
            </a>
          </p>
        ) : (
          <Alert variant="warning">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            &nbsp;You have not{" "}
            <a
              href="chrome://extensions/shortcuts"
              onClick={(event) => {
                event.preventDefault();
                void browser.tabs.create({ url: event.currentTarget.href });
              }}
            >
              configured a Quick Bar shortcut
            </a>
          </Alert>
        )}
      </div>
    );
  },
};

export default config;
