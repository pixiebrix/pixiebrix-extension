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

import { Card } from "react-bootstrap";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import notify from "@/utils/notify";
import extensionsSlice from "@/store/extensionsSlice";
import servicesSlice from "@/store/servicesSlice";
import { clearPackages } from "@/baseRegistry";
import { recipesSlice } from "@/recipes/recipesSlice";
import { authSlice } from "@/auth/authSlice";
import { clearLogs, reactivateEveryTab } from "@/background/messenger/api";
import blueprintsSlice from "@/options/pages/blueprints/blueprintsSlice";
import settingsSlice from "@/store/settingsSlice";
import workshopSlice from "@/store/workshopSlice";
import { sessionChangesActions } from "@/store/sessionChanges/sessionChangesSlice";
import AsyncButton from "@/components/AsyncButton";
import { reportEvent } from "@/telemetry/events";
import { useModals } from "@/components/ConfirmationModal";
import { type Permissions } from "webextension-polyfill";
import { selectAdditionalPermissionsSync } from "webext-additional-permissions";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { persistor } from "@/store/optionsStore";

const { resetOptions } = extensionsSlice.actions;
const { resetServices } = servicesSlice.actions;
const { resetRecipes } = recipesSlice.actions;
const { resetAuth } = authSlice.actions;
const { resetScreen: resetBlueprintsScreen } = blueprintsSlice.actions;
const { resetSettings } = settingsSlice.actions;
const { resetWorkshop } = workshopSlice.actions;

async function revokeAllAdditionalPermissions() {
  const permissions: Permissions.AnyPermissions =
    await browser.permissions.getAll();
  const additional = selectAdditionalPermissionsSync(permissions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- typings appear to be incorrect
  await browser.permissions.remove(additional as any);
}

const FactoryResetSettings: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const { showConfirmation } = useModals();
  const sessionId = useSelector(selectSessionId);

  return (
    <Card border="danger">
      <Card.Header className="danger">Factory Reset</Card.Header>
      <Card.Body className="text-danger">
        <p className="card-text">
          Click here to reset your local PixieBrix data.{" "}
          <b>
            This will deactivate any mods you&apos;ve activated and reset all
            browser extension settings.
          </b>
        </p>
        <AsyncButton
          variant="danger"
          onClick={async () => {
            const confirmed = await showConfirmation({
              title: "Factory Reset",
              message:
                "Deactivate all mods and reset all browser extension settings?",
              submitCaption: "Yes, reset extension",
              cancelCaption: "Back to safety",
            });

            if (!confirmed) {
              return;
            }

            reportEvent("FactoryReset");

            try {
              // Reset all persisted state -- see optionsStore.ts
              dispatch(resetBlueprintsScreen());
              dispatch(resetOptions());
              dispatch(resetServices());
              dispatch(resetRecipes());
              dispatch(resetAuth());
              dispatch(resetSettings());
              dispatch(resetWorkshop());
              dispatch(sessionChangesActions.resetSessionChanges());
              // Force all open page editors to be reloaded
              dispatch(sessionChangesActions.setSessionChanges({ sessionId }));

              await Promise.allSettled([
                // Clear persisted editor state directly because it's not attached to the options page store.
                browser.storage.local.remove("persist:editor"),
                persistor.flush(),
                revokeAllAdditionalPermissions(),
                clearLogs(),
                browser.contextMenus.removeAll(),
                clearPackages(),
              ]);

              reactivateEveryTab();

              notify.success("Reset all mods and integration configurations");
            } catch (error) {
              notify.error({
                message: "Error resetting mods and integration configurations",
                error,
              });
            }
          }}
        >
          Factory Reset
        </AsyncButton>
      </Card.Body>
    </Card>
  );
};

export default FactoryResetSettings;
