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

import React, { useMemo } from "react";
import { type RegistryId } from "@/types/registryTypes";
import RequireMods, {
  type RequiredModDefinition,
} from "@/sidebar/activateRecipe/RequireMods";
import AsyncStateGate from "@/components/AsyncStateGate";
import { getOptionsValidationSchema } from "@/hooks/useAsyncRecipeOptionsValidationSchema";
import useDatabaseOptions from "@/hooks/useDatabaseOptions";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import useDeriveAsyncState from "@/hooks/useDeriveAsyncState";
import { type Option } from "@/components/form/widgets/SelectWidget";
import { wizardStateFactory } from "@/activation/useActivateRecipeWizard";
import useActivateRecipe, {
  type ActivateResult,
} from "@/activation/useActivateRecipe";
import { SuccessPanel } from "@/sidebar/activateRecipe/ActivateModPanel";
import { getTopLevelFrame } from "webext-messenger";
import { hideSidebar } from "@/contentScript/messenger/api";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { selectSidebarHasModPanels } from "@/sidebar/sidebarSelectors";

type ModResultPair = {
  mod: RequiredModDefinition;
  result: ActivateResult;
};

const ResultsPanel: React.FC<{ results: ModResultPair[] }> = ({ results }) => {
  const reduxDispatch = useDispatch();
  const sidebarHasModPanels = useSelector(selectSidebarHasModPanels);

  async function handleActivationDecision() {
    reduxDispatch(sidebarSlice.actions.hideModActivationPanel());

    if (!sidebarHasModPanels) {
      const topFrame = await getTopLevelFrame();
      void hideSidebar(topFrame);
    }
  }

  return (
    <SuccessPanel
      title="Your mods are ready to use!"
      includesQuickBar={results.some((x) => x.mod.includesQuickBar)}
      handleActivationDecision={handleActivationDecision}
    />
  );
};

/**
 * React Component Panel to automatically activate multiple mods and show a success message.
 * @param mods
 */
const ActivateModWizardPanel: React.FC<{ mods: RequiredModDefinition[] }> = ({
  mods,
}) => {
  const activate = useActivateRecipe("marketplace");

  // Only activate new mods that the user does not already have activated. If there are updates available, the
  // user will be prompted to update according to marketplace mod updater rules.
  const newMods = useMemo(() => mods.filter((x) => !x.isActive), [mods]);
  const activatedModComponents = useSelector(selectExtensions);
  const databaseOptionsState = useDatabaseOptions({ refetchOnMount: true });

  // Automatically activate the mods on mount
  const activationResultState = useDeriveAsyncState(
    databaseOptionsState,
    async (databaseOptions: Option[]) => {
      if (newMods.some((x) => x.requiresConfiguration)) {
        throw new Error(
          `Mod ${newMods[0].modDefinition.metadata.name} requires configuration`
        );
      }

      return Promise.all(
        newMods.map(async (mod) => {
          const optionsValidationSchema = await getOptionsValidationSchema(
            mod.modDefinition.options?.schema
          );

          const wizard = wizardStateFactory({
            modDefinition: mod.modDefinition,
            defaultAuthOptions: mod.defaultAuthOptions,
            databaseOptions,
            optionsValidationSchema,
            installedExtensions: activatedModComponents,
          });

          const result = await activate(
            wizard.initialValues,
            mod.modDefinition
          );

          if (result.error) {
            throw new Error(
              `Error activating ${mod.modDefinition.metadata.name}`
            );
          }

          return {
            result,
            mod,
          };
        })
      );
    }
  );

  return (
    <AsyncStateGate state={activationResultState}>
      {({ data: results }) => <ResultsPanel results={results} />}
    </AsyncStateGate>
  );
};

/**
 * React Component Panel to automatically activate multiple mods and show a success message.
 * @param modId the mod id
 *
 * @since 1.7.35
 */
const ActivateMultipleModsPanel: React.FC<{ modIds: RegistryId[] }> = ({
  modIds,
}) => (
  <RequireMods modIds={modIds}>
    {(mods) => <ActivateModWizardPanel mods={mods} />}
  </RequireMods>
);

export default ActivateMultipleModsPanel;
