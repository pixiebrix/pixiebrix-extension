/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { Card } from "react-bootstrap";
import UrlMatchPatternField from "@/pageEditor/fields/UrlMatchPatternField";
import FieldSection from "@/pageEditor/fields/FieldSection";
import TemplateWidget, { Snippet } from "@/pageEditor/fields/TemplateWidget";
import LocationWidget from "@/pageEditor/fields/LocationWidget";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";

const panelSnippets: Snippet[] = [
  { label: "heading", value: "{{{heading}}}" },
  { label: "body", value: "{{{body}}}" },
];

const PanelConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => (
  <Card>
    <FieldSection title="Configuration">
      <ConnectedFieldTemplate
        name="extension.heading"
        label="Heading"
        description="Panel heading"
      />

      <ConnectedFieldTemplate
        name="extensionPoint.definition.containerSelector"
        as={LocationWidget}
        description="Location on the page"
        {...makeLockableFieldProps("Location", isLocked)}
      />

      <UrlMatchPatternField
        name="extensionPoint.definition.isAvailable.matchPatterns"
        {...makeLockableFieldProps("Sites", isLocked)}
      />
    </FieldSection>

    <FieldSection title="Advanced">
      <ConnectedFieldTemplate
        name="extension.collapsible"
        as={SwitchButtonWidget}
        label="Collapsible"
        description="Render the panel as a collapsible drawer"
      />

      <ConnectedFieldTemplate
        name="extension.shadowDOM"
        as={SwitchButtonWidget}
        label="Shadow DOM"
        description="Isolate the panel style with a Shadow DOM"
      />

      <ConnectedFieldTemplate
        name="extensionPoint.definition.template"
        as={TemplateWidget}
        description="A template for the item, with a placeholder for the heading and body"
        snippets={panelSnippets}
        {...makeLockableFieldProps("Template", isLocked)}
      />
    </FieldSection>
  </Card>
);

export default PanelConfiguration;
