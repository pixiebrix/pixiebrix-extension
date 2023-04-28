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
import UrlMatchPatternField from "@/pageEditor/fields/UrlMatchPatternField";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import ExtraPermissionsSection from "@/pageEditor/tabs/ExtraPermissionsSection";
import MatchRulesSection from "@/pageEditor/tabs/MatchRulesSection";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";

const TourConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => (
  <>
    <UrlMatchPatternField
      name="extensionPoint.definition.isAvailable.matchPatterns"
      {...makeLockableFieldProps("Sites", isLocked)}
    />

    <ConnectedFieldTemplate
      name="extensionPoint.definition.autoRunSchedule"
      as="select"
      description="Schedule to run the tour automatically when the user visits a page where the tour is available"
      {...makeLockableFieldProps("Auto-Run Schedule", isLocked)}
    >
      <option value="never">Never</option>
      <option value="once">Once</option>
      <option value="always">Always</option>
    </ConnectedFieldTemplate>

    <ConnectedFieldTemplate
      name="extensionPoint.definition.allowUserRun"
      as={SwitchButtonWidget}
      schema={{
        type: "boolean",
        description:
          "Toggle on to enable the user manually run the tour from the Quick Bar",
        default: true,
      }}
      {...makeLockableFieldProps("Allow User Run", isLocked)}
    />

    <MatchRulesSection isLocked={isLocked} />

    <ExtraPermissionsSection />
  </>
);

export default TourConfiguration;
