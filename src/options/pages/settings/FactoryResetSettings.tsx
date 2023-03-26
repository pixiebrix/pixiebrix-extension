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

import { Button, Card } from "react-bootstrap";
import React from "react";
import { useDispatch } from "react-redux";
import notify from "@/utils/notify";
import extensionsSlice from "@/store/extensionsSlice";
import servicesSlice from "@/store/servicesSlice";
import { clearPackages } from "@/baseRegistry";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { recipesSlice } from "@/recipes/recipesSlice";
import { authSlice } from "@/auth/authSlice";
import { clearLogs } from "@/background/messenger/api";
import blueprintsSlice from "@/options/pages/blueprints/blueprintsSlice";
import settingsSlice from "@/store/settingsSlice";
import workshopSlice from "@/store/workshopSlice";
import { sessionChangesSlice } from "@/store/sessionChanges/sessionChangesSlice";

const { resetOptions } = extensionsSlice.actions;
const { resetServices } = servicesSlice.actions;
const { resetEditor } = editorSlice.actions;
const { resetRecipes } = recipesSlice.actions;
const { resetAuth } = authSlice.actions;
const { resetScreen: resetBlueprintsScreen } = blueprintsSlice.actions;
const { resetSettings } = settingsSlice.actions;
const { resetWorkshop } = workshopSlice.actions;
const { resetSessionChanges } = sessionChangesSlice.actions;

const FactoryResetSettings: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  return (
    <Card border="danger">
      <Card.Header className="danger">Factory Reset</Card.Header>
      <Card.Body className="text-danger">
        <p className="card-text">
          Click here to reset your local PixieBrix data.{" "}
          <b>This will deactivate any mods you&apos;ve installed.</b>
        </p>
        <Button
          variant="danger"
          onClick={async () => {
            try {
              dispatch(resetOptions());
              dispatch(resetServices());
              dispatch(resetEditor());
              dispatch(resetRecipes());
              dispatch(resetAuth());
              dispatch(resetBlueprintsScreen());
              dispatch(resetSettings());
              dispatch(resetWorkshop());
              dispatch(resetSessionChanges());
              dispatch(sessionChangesSlice.actions.setSessionChanges());
              resetEditor();

              await Promise.allSettled([
                clearLogs(),
                browser.contextMenus.removeAll(),
                clearPackages(),
              ]);

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
        </Button>
      </Card.Body>
    </Card>
  );
};

export default FactoryResetSettings;
