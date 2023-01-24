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

import React from "react";
import { type Action } from "kbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAppleAlt,
  faInfoCircle,
  faSeedling,
  faStore,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { type RegistryId, type UUID } from "@/core";
import { pull, remove } from "lodash";
import { MARKETPLACE_URL } from "@/utils/strings";

const DEFAULT_SERVICE_URL = process.env.SERVICE_URL;

const PIXIEBRIX_SECTION = "PixieBrix";

/**
 * `kbar` action with additional metadata about the extension point that added it.
 */
export type CustomAction = Action & {
  extensionPointId?: RegistryId;
  extensionId?: UUID;
};

const defaultActions: Action[] = [
  {
    id: "marketplace",
    name: "Open Marketplace",
    keywords: "marketplace",
    icon: <FontAwesomeIcon icon={faStore} fixedWidth />,
    section: PIXIEBRIX_SECTION,
    perform() {
      window.location.href = MARKETPLACE_URL;
    },
  },
  {
    id: "admin",
    name: "Open Admin Console",
    keywords: "admin, admin console",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faUsers} fixedWidth />,
    perform() {
      window.location.href = DEFAULT_SERVICE_URL;
    },
  },
  {
    id: "quick-start",
    name: "Open Quick Start",
    keywords: "quick start, tutorials",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faAppleAlt} fixedWidth />,
    perform() {
      window.location.href = "https://docs.pixiebrix.com/quick-start-guide";
    },
  },
  {
    id: "community",
    name: "Open Community",
    keywords: "community, how to",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faSeedling} fixedWidth />,
    perform() {
      window.location.href = "https://community.pixiebrix.com/";
    },
  },
  {
    id: "documentation",
    name: "Open Documentation",
    keywords: "docs, tutorials, documentation, how to",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faInfoCircle} fixedWidth />,
    perform() {
      window.location.href = "https://docs.pixiebrix.com/";
    },
  },
];

type ChangeHandler = (actions: CustomAction[]) => void;

type GeneratorArgs = { query: string; rootActionId: string | null };

export type ActionGenerator = (args: GeneratorArgs) => Promise<void>;

class QuickBarRegistry {
  private readonly actions: CustomAction[] = defaultActions;
  private readonly listeners: ChangeHandler[] = [];

  private readonly actionGenerators: ActionGenerator[] = [];

  private readonly generatorRootIdMap: Map<ActionGenerator, string> = new Map<
    ActionGenerator,
    string
  >();

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.actions);
    }
  }

  get currentActions() {
    return this.actions;
  }

  get knownGeneratorRootIds(): Set<string> {
    return new Set(this.generatorRootIdMap.values());
  }

  addAction(action: CustomAction): void {
    remove(this.actions, (x) => x.id === action.id);
    this.actions.unshift(action);
    this.notifyListeners();
  }

  removeExtensionPointActions(id: RegistryId) {
    remove(this.actions, (x) => x.extensionPointId === id);
    this.notifyListeners();
  }

  removeExtensionActions(id: UUID) {
    remove(this.actions, (x) => x.extensionId === id);
    this.notifyListeners();
  }

  removeAction(id: string): void {
    remove(this.actions, (x) => x.id === id);
    this.notifyListeners();
  }

  addListener(handler: ChangeHandler): void {
    this.listeners.push(handler);
  }

  removeListener(handler: ChangeHandler): void {
    pull(this.listeners, handler);
  }

  addGenerator(generator: ActionGenerator, rootActionId: string | null): void {
    this.actionGenerators.push(generator);
    this.generatorRootIdMap.set(generator, rootActionId);
  }

  removeGenerator(generator: ActionGenerator): void {
    pull(this.actionGenerators, generator);
    this.generatorRootIdMap.delete(generator);
  }

  generateActions(args: GeneratorArgs) {
    for (const generator of this.actionGenerators) {
      void generator(args);
    }
  }
}

// Singleton registry for the content script
const quickBarRegistry = new QuickBarRegistry();

export default quickBarRegistry;
