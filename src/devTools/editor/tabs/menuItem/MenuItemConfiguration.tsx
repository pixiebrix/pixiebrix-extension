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

import React, { useMemo } from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import UrlMatchPatternWidget from "@/devTools/editor/components/UrlMatchPatternWidget";
import { Card } from "react-bootstrap";
import styles from "./MenuItemConfiguration.module.scss";
import SelectorSelectorField from "@/devTools/editor/fields/SelectorSelectorField";
import { useField } from "formik";
import TemplateWidget from "@/devTools/editor/tabs/menuItem/TemplateWidget";

const MenuItemConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => {
  const [containerInfoField] = useField("containerInfo");

  const LocationField = useMemo(() => {
    const LocationField = (props: any) => (
      <SelectorSelectorField
        {...props}
        initialElement={containerInfoField.value}
        selectMode="container"
      />
    );
    LocationField.displayName = "LocationField";
    return LocationField;
  }, [containerInfoField.value]);

  return (
    <Card>
      <Card.Header className={styles.cardHeader}>Configuration</Card.Header>

      <ConnectedFieldTemplate
        name="extension.caption"
        layout="vertical"
        label="Caption"
        description="Button Caption"
      />

      <ConnectedFieldTemplate
        name="extensionPoint.definition.containerSelector"
        layout="vertical"
        label="Location"
        as={LocationField}
        description="Location on the page"
      />

      <ConnectedFieldTemplate
        name="extensionPoint.definition.isAvailable.matchPatterns"
        layout="vertical"
        as={UrlMatchPatternWidget}
        disabled={isLocked}
        label="Sites"
        description={
          <span>
            URL match pattern for which pages to show the menu. See{" "}
            <a
              href="https://developer.chrome.com/docs/extensions/mv2/match_patterns/"
              target="_blank"
              rel="noreferrer"
            >
              Patterns Documentation
            </a>{" "}
            for examples
          </span>
        }
      />

      <Card.Header className={styles.cardHeader}>Advanced</Card.Header>

      <ConnectedFieldTemplate
        name="extensionPoint.definition.template"
        layout="vertical"
        label="Template"
        as={TemplateWidget}
        description="A template for the item, with a placeholder for the caption and/or icon"
      />
    </Card>
  );
};

export default MenuItemConfiguration;
