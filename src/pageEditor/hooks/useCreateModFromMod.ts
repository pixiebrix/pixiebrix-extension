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

import { useCreateModDefinitionMutation } from "@/data/service/api";
import collectExistingConfiguredDependenciesForMod from "@/integrations/util/collectExistingConfiguredDependenciesForMod";
import useDeactivateMod from "@/pageEditor/hooks/useDeactivateMod";
import { type ModMetadataFormState } from "@/pageEditor/store/editor/pageEditorTypes";
import {
  selectDirtyModOptionsDefinitions,
  selectKeepLocalCopyOnCreateMod,
} from "@/pageEditor/store/editor/editorSelectors";
import { selectGetCleanComponentsAndDirtyFormStatesForMod } from "@/pageEditor/store/editor/selectGetCleanComponentsAndDirtyFormStatesForMod";
import { collectModOptions } from "@/store/modComponents/modComponentUtils";
import reportEvent from "@/telemetry/reportEvent";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Events } from "@/telemetry/events";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import useBuildAndValidateMod from "@/pageEditor/hooks/useBuildAndValidateMod";
import { BusinessError } from "@/errors/businessErrors";
import { ensureModComponentFormStatePermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";

type UseCreateModFromModReturn = {
  createModFromMod: (
    modDefinition: ModDefinition,
    metadata: ModMetadataFormState,
  ) => Promise<void>;
};

/**
 * This hook provides a callback function to create a mod copy from the
 * existing, active mod that HAS been saved on the server before.
 */
function useCreateModFromMod(): UseCreateModFromModReturn {
  const dispatch = useDispatch();
  const [createMod] = useCreateModDefinitionMutation();
  const deactivateMod = useDeactivateMod();
  const getCleanComponentsAndDirtyFormStatesForMod = useSelector(
    selectGetCleanComponentsAndDirtyFormStatesForMod,
  );
  const dirtyModOptions = useSelector(selectDirtyModOptionsDefinitions);
  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateMod);
  const { buildAndValidateMod } = useBuildAndValidateMod();

  const createModFromMod = useCallback(
    // eslint-disable-next-line @typescript-eslint/promise-function-async -- permissions check must be called in the user gesture context, `async-await` can break the call chain
    (modDefinition: ModDefinition, metadata: ModMetadataFormState) => {
      const modId = modDefinition.metadata.id;
      const { cleanModComponents, dirtyModComponentFormStates } =
        getCleanComponentsAndDirtyFormStatesForMod(modId);

      return ensureModComponentFormStatePermissionsFromUserGesture(
        dirtyModComponentFormStates,
        // eslint-disable-next-line promise/prefer-await-to-then -- permissions check must be called in the user gesture context, `async-await` can break the call chain
      ).then(async (hasPermissions) => {
        if (!hasPermissions) {
          return;
        }

        // eslint-disable-next-line security/detect-object-injection -- new mod IDs are sanitized in the form validation
        const dirtyModOptionsDefinition = dirtyModOptions[modId];

        try {
          const newModDefinition = await buildAndValidateMod({
            sourceMod: modDefinition,
            cleanModComponents,
            dirtyModComponentFormStates,
            dirtyModOptionsDefinition,
            dirtyModMetadata: metadata,
          });

          const upsertResponse = await createMod({
            modDefinition: newModDefinition,
            organizations: [],
            public: false,
          }).unwrap();

          const savedModDefinition: ModDefinition = {
            ...newModDefinition,
            sharing: {
              public: upsertResponse.public,
              organizations: upsertResponse.organizations,
            },
            updated_at: upsertResponse.updated_at,
          };

          if (!keepLocalCopy) {
            await deactivateMod({ modId, shouldShowConfirmation: false });
          }

          const modComponents = [
            ...dirtyModComponentFormStates,
            ...cleanModComponents,
          ];

          dispatch(
            modComponentActions.activateMod({
              modDefinition: savedModDefinition,
              configuredDependencies:
                collectExistingConfiguredDependenciesForMod(
                  savedModDefinition,
                  modComponents,
                ),
              optionsArgs: collectModOptions(modComponents),
              screen: "pageEditor",
              isReactivate: false,
            }),
          );
          dispatch(
            editorActions.setActiveModId(savedModDefinition.metadata.id),
          );
          dispatch(editorActions.checkAvailableActivatedModComponents());

          reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
            copiedFrom: modId,
            modId: savedModDefinition.metadata.id,
          });
        } catch (error) {
          if (error instanceof BusinessError) {
            // Error is already handled by buildAndValidateMod.
          } else {
            throw error;
          } // Other errors can be thrown during mod activation
        }
      });
    },
    [
      getCleanComponentsAndDirtyFormStatesForMod,
      dirtyModOptions,
      buildAndValidateMod,
      createMod,
      keepLocalCopy,
      dispatch,
      deactivateMod,
    ],
  );

  return {
    createModFromMod,
  };
}

export default useCreateModFromMod;
