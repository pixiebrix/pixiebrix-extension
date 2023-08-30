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
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Card, Form } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import settingsSlice from "@/store/settingsSlice";
import { faFlask } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { selectSettings } from "@/store/settingsSelectors";
import { type SkunkworksSettings } from "@/store/settingsTypes";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import SettingToggle from "@/extensionConsole/pages/settings/SettingToggle";

const ExperimentalSettings: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const {
    suggestElements,
    excludeRandomClasses,
    selectionTools,
    varAutosuggest,
    performanceTracing,
  } = useSelector(selectSettings);

  const flagChangeHandlerFactory =
    (flag: keyof SkunkworksSettings) => (value: boolean) => {
      reportEvent(Events.SETTINGS_EXPERIMENTAL_CONFIGURE, {
        name: flag,
        value,
      });

      dispatch(
        settingsSlice.actions.setFlag({
          flag,
          value,
        })
      );
    };

  return (
    <Card>
      <Card.Header>
        Skunkworks <FontAwesomeIcon icon={faFlask} />
      </Card.Header>
      <Card.Body>
        <Form>
          <SettingToggle
            controlId="suggestElements"
            label="Suggest Elements in Selection Mode:"
            description="Toggle on to enable element suggestions/filtering in Page Editor
            selection mode"
            isEnabled={suggestElements}
            onChange={flagChangeHandlerFactory("suggestElements")}
          />
          <SettingToggle
            controlId="excludeRandomClasses"
            label="Detect and Exclude Random Classes from Selectors:"
            description="Toggle on to avoid using randomly-generated classes when picking
            elements from a website"
            isEnabled={excludeRandomClasses}
            onChange={flagChangeHandlerFactory("excludeRandomClasses")}
          />
          <SettingToggle
            controlId="selectionTools"
            label="Detect and Support Multi-Element Selection Tools:"
            description="Toggle on to support multi-element selection tools"
            isEnabled={selectionTools}
            onChange={flagChangeHandlerFactory("selectionTools")}
          />
          <SettingToggle
            controlId="varAutosuggest"
            label="Autosuggest Variables in Page Editor:"
            description="Toggle on to enable variable autosuggest for variable and text template entry modes"
            isEnabled={varAutosuggest}
            onChange={flagChangeHandlerFactory("varAutosuggest")}
          />
          <SettingToggle
            controlId="performanceTracing"
            label="Performance Tracing:"
            description="Toggle on to trace runtime performance"
            isEnabled={performanceTracing}
            onChange={flagChangeHandlerFactory("performanceTracing")}
          />
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ExperimentalSettings;
