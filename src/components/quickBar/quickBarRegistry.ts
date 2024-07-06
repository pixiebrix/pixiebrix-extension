/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { pull, remove } from "lodash";
import {
  type ActionGenerator,
  type GeneratorArgs,
} from "@/components/quickBar/quickbarTypes";
import { allSettled } from "@/utils/promiseUtils";
import { ReusableAbortController } from "abort-utils";
import type {
  CustomAction,
  QuickBarProtocol,
} from "@/platform/platformTypes/quickBarProtocol";
import { SimpleEventTarget } from "@/utils/SimpleEventTarget";

class QuickBarRegistry implements QuickBarProtocol {
  /**
   * Current set of actions, including static and generated actions.
   * @see actionGenerators
   * @see addAction
   */
  private readonly actions: CustomAction[] = [];

  /**
   * Registry of action listeners, called when the set of actions changes.
   */
  readonly changeEvent = new SimpleEventTarget<CustomAction[]>();

  /**
   * Registry of action generators. The generators are called when the user types in the Quick Bar.
   */
  private readonly actionGenerators: ActionGenerator[] = [];

  /**
   * Abort controller for the currently running action generator.
   */
  private readonly generatorAbortController = new ReusableAbortController();

  /**
   * Mapping from action generator to the rootActionId.
   *
   * Used to determine whether to nest a generated action under a root action because the AddQuickBarAction doesn't
   * have access to the generator.
   *
   * @see AddQuickBarAction
   * @see knownGeneratorRootIds
   */
  private readonly generatorRootIdMap: Map<ActionGenerator, string> = new Map<
    ActionGenerator,
    string
  >();

  /**
   * Helper method to notify all action listeners that the set of actions changed.
   */
  private notifyListeners() {
    // Need to copy the array because the registry mutates the array in-place, and listeners might be keeping a
    // reference to the argument passed to them
    const copy = [...this.actions];
    this.changeEvent.emit(copy);
  }

  /**
   * Get the current actions registered with the Quick Bar.
   */
  get currentActions(): CustomAction[] {
    // Return a copy, since this.actions is mutated in-place
    return [...this.actions];
  }

  /**
   * Return set of root action ids in the KBar. The caller can use to determine whether to nest a generated action
   * under a given root action.
   */
  get knownGeneratorRootIds(): Set<string> {
    return new Set(this.generatorRootIdMap.values());
  }

  /**
   * Add or replace a Quick Bar action.
   * @param action the quick bar action to add.
   */
  addAction(action: CustomAction): void {
    const index = this.actions.findIndex((x) => x.id === action.id);

    if (index >= 0) {
      // Preserve the relative insertion order of actions with the same priority.
      // eslint-disable-next-line security/detect-object-injection -- guaranteed to be a number
      this.actions[index] = action;
    } else if (action.parent) {
      // Items with a parent must appear _after_ the parent in this.actions. Otherwise, KBar won't properly
      // nest the items because the parent item will be overwritten with no children.
      this.actions.push(action);
    } else {
      // Put at the front of the list, so the action appear before the other actions with the same Priority
      this.actions.unshift(action);
    }

    this.notifyListeners();
  }

  /**
   * Remove all actions added by a given starter brick.
   */
  removeStarterBrickActions(starterBrickId: RegistryId): void {
    remove(
      this.actions,
      (x) => x.modComponentRef?.extensionPointId === starterBrickId,
    );
    this.notifyListeners();
  }

  /**
   * Remove all actions added by a given mod component. Excludes the root action.
   * @param modComponentId the ModComponentBase UUID
   */
  removeModComponentActions(modComponentId: UUID): void {
    remove(
      this.actions,
      (x) =>
        x.modComponentRef?.extensionId === modComponentId &&
        // Exclude the root action
        !this.knownGeneratorRootIds.has(x.id),
    );
    this.notifyListeners();
  }

  /**
   * Remove a single action from the Quick Bar
   * @param actionId the action id (not the action name)
   */
  removeAction(actionId: string): void {
    remove(this.actions, (x) => x.id === actionId);
    this.notifyListeners();
  }

  /**
   * Register an action generator.
   * @param generator the action generator
   * @param rootActionId an optional rootActionId to associate with the generator
   */
  addGenerator(generator: ActionGenerator, rootActionId: string | null): void {
    this.actionGenerators.push(generator);
    if (rootActionId) {
      this.generatorRootIdMap.set(generator, rootActionId);
    }
  }

  /**
   * Remove a registered action generator, or NOP if the generator is not registered.
   * @param generator the action generator
   */
  removeGenerator(generator: ActionGenerator): void {
    pull(this.actionGenerators, generator);
    this.generatorRootIdMap.delete(generator);
  }

  /**
   * Generate actions for all registered generators.
   *
   * The generator is responsible for cleaning up any previously added actions.
   *
   * @param args arguments to pass to action generators
   */
  async generateActions(args: GeneratorArgs): Promise<void> {
    // Abort previously running generators
    this.generatorAbortController.abortAndReset();
    const abortSignal = this.generatorAbortController.signal;

    // Run all generators in parallel
    await allSettled(
      this.actionGenerators.map(async (x) => x({ ...args, abortSignal })),
      { catch: "ignore" },
    );
  }
}

/**
 * Singleton registry for the content script.
 */
// eslint-disable-next-line local-rules/persistBackgroundData -- OK to re-init on load
const quickBarRegistry = new QuickBarRegistry();

export default quickBarRegistry;
