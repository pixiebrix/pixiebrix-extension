/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import UrlMatchPatternField from "@/devTools/editor/fields/UrlMatchPatternField";
import FieldSection from "@/devTools/editor/fields/FieldSection";
import TemplateWidget, {
  Snippet,
} from "@/devTools/editor/fields/TemplateWidget";
import LocationWidget from "@/devTools/editor/fields/LocationWidget";

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
        label="Location"
        as={LocationWidget}
        description="Location on the page"
      />

      <UrlMatchPatternField
        name="extensionPoint.definition.isAvailable.matchPatterns"
        label="Sites"
        disabled={isLocked}
      />
    </FieldSection>

    <FieldSection title="Configuration">
      <ConnectedFieldTemplate
        name="extension.collapsible"
        layout="switch"
        label="Collapsible"
        description="Panel heading to show in the sidebar"
      />

      <ConnectedFieldTemplate
        name="extension.shadowDOM"
        layout="switch"
        label="Shadow DOM"
        description="Isolate the panel style with a Shadow DOM"
      />

      <ConnectedFieldTemplate
        name="extensionPoint.definition.template"
        label="Template"
        as={TemplateWidget}
        description="A template for the item, with a placeholder for the heading and body"
        snippets={panelSnippets}
      />
    </FieldSection>
  </Card>
);

export default PanelConfiguration;
