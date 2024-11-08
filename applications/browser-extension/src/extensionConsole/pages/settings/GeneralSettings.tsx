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

import React from "react";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Card, Form } from "react-bootstrap";
import { useSelector } from "react-redux";
import { selectSettings } from "../../../store/settings/settingsSelectors";
import useIsEnterpriseUser from "../../../hooks/useIsEnterpriseUser";
import SettingToggle from "./SettingToggle";

const GeneralSettings: React.FunctionComponent = () => {
  const {
    isFloatingActionButtonEnabled,
    varAutosuggest,
    textSelectionMenu,
    snippetShortcutMenu,
  } = useSelector(selectSettings);

  // Disable FAB for enterprise and partner users
  const disableFloatingActionButton = useIsEnterpriseUser();

  const checked = isFloatingActionButtonEnabled && !disableFloatingActionButton;

  return (
    <Card>
      <Card.Header>General Settings</Card.Header>
      <Card.Body>
        <Form>
          <SettingToggle
            controlId="isFloatingActionButtonEnabled"
            label="Floating action button"
            description={
              disableFloatingActionButton
                ? "The floating action button is not available for enterprise and partner users"
                : "Toggle on to enable floating button that opens the Quick Bar"
            }
            isEnabled={checked ?? false}
            disabled={disableFloatingActionButton}
            flag="isFloatingActionButtonEnabled"
          />

          <SettingToggle
            controlId="varAutosuggest"
            label="Autosuggest Variables in Page Editor"
            description="Toggle on to enable variable autosuggest for variable and text template entry modes"
            isEnabled={varAutosuggest}
            flag="varAutosuggest"
          />

          <SettingToggle
            controlId="textSelectionMenu"
            label="Text Selection Menu"
            description="Show context menu items in a selection menu"
            isEnabled={textSelectionMenu}
            flag="textSelectionMenu"
          />

          <SettingToggle
            controlId="snippetShortcutMenu"
            label="Snippet Shortcut Menu"
            description="Show a text snippet shortcut menu"
            isEnabled={snippetShortcutMenu}
            flag="snippetShortcutMenu"
          />
        </Form>
      </Card.Body>
    </Card>
  );
};

export default GeneralSettings;
