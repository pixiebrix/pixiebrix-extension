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
import { faFlask } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { selectSettings } from "../../../store/settings/settingsSelectors";
import SettingToggle from "./SettingToggle";

const ExperimentalSettings: React.FunctionComponent = () => {
  const { suggestElements, excludeRandomClasses, performanceTracing } =
    useSelector(selectSettings);

  return (
    <Card>
      <Card.Header>
        Experimental Settings <FontAwesomeIcon icon={faFlask} />
      </Card.Header>
      <Card.Body>
        <Form>
          <SettingToggle
            controlId="suggestElements"
            label="Suggest Elements in Selection Mode"
            description="Toggle on to enable element suggestions/filtering in Page Editor
            selection mode"
            isEnabled={suggestElements ?? false}
            flag="suggestElements"
          />
          <SettingToggle
            controlId="excludeRandomClasses"
            label="Detect and Exclude Random Classes from Selectors"
            description="Toggle on to avoid using randomly-generated classes when picking
            elements from a website"
            isEnabled={excludeRandomClasses ?? false}
            flag="excludeRandomClasses"
          />
          <SettingToggle
            controlId="performanceTracing"
            label="Performance Tracing"
            description="Toggle on to trace runtime performance"
            isEnabled={performanceTracing ?? false}
            flag="performanceTracing"
          />
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ExperimentalSettings;
