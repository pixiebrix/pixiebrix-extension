/* eslint-disable filenames/match-exported */
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

import { type Metadata } from "@/types/registryTypes";
import { type IExtension } from "@/types/extensionTypes";
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
  removeEmptyValues,
  selectIsAvailable,
} from "@/pageEditor/extensionPoints/base";
import { omitEditorMetadata } from "./pipelineMapping";
import { type ExtensionPointConfig } from "@/extensionPoints/types";
import {
  faExclamationTriangle,
  faThLarge,
} from "@fortawesome/free-solid-svg-icons";
import {
  type ElementConfig,
  type SingleLayerReaderConfig,
} from "@/pageEditor/extensionPoints/elementConfig";
import React from "react";
import { Alert } from "react-bootstrap";
import {
  type QuickBarConfig,
  type QuickBarDefinition,
  QuickBarExtensionPoint,
} from "@/extensionPoints/quickBarExtension";
import QuickBarConfiguration from "@/pageEditor/tabs/quickBar/QuickBarConfiguration";
import type { DynamicDefinition } from "@/contentScript/pageEditor/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { type QuickBarFormState } from "./formStateTypes";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { openShortcutsTab, SHORTCUTS_URL } from "@/chrome";

function fromNativeElement(url: string, metadata: Metadata): QuickBarFormState {
  const base = makeInitialBaseState();

  const isAvailable = makeIsAvailable(url);

  const title = "Quick Bar item";

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

function selectExtensionPointConfig(
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
  const extension = await extensionWithNormalizedPipeline(
    config.config,
    "action"
  );

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

function asDynamicElement(element: QuickBarFormState): DynamicDefinition {
  return {
    type: "quickBar",
    extension: selectExtension(element, { includeInstanceIds: true }),
    extensionPointConfig: selectExtensionPointConfig(element),
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
          href={SHORTCUTS_URL}
          onClick={(event) => {
            event.preventDefault();
            void openShortcutsTab();
          }}
        >
          configured a Quick Bar shortcut
        </a>
      </Alert>
    );
  }

  return null;
};

export const InsertModeHelpText: React.FunctionComponent = () => {
  const { isConfigured, shortcut } = useQuickbarShortcut();

  return (
    <div className="text-center pb-2">
      {isConfigured ? (
        <p>
          You&apos;ve configured&nbsp;
          <kbd style={{ fontFamily: "system" }}>{shortcut}</kbd>&nbsp; to open
          the Quick Bar.{" "}
          <a
            href={SHORTCUTS_URL}
            onClick={(event) => {
              event.preventDefault();
              void openShortcutsTab();
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
            href={SHORTCUTS_URL}
            onClick={(event) => {
              event.preventDefault();
              void openShortcutsTab();
            }}
          >
            configured a Quick Bar shortcut
          </a>
        </Alert>
      )}
    </div>
  );
};

const config: ElementConfig<undefined, QuickBarFormState> = {
  displayOrder: 1,
  elementType: "quickBar",
  label: "Quick Bar Action",
  baseClass: QuickBarExtensionPoint,
  EditorNode: QuickBarConfiguration,
  selectNativeElement: undefined,
  icon: faThLarge,
  fromNativeElement,
  asDynamicElement,
  selectExtensionPointConfig,
  selectExtension,
  fromExtension,
  InsertModeHelpText,
};

export default config;
