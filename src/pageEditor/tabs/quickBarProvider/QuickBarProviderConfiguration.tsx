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

import React, { type ChangeEvent } from "react";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import UrlMatchPatternField from "@/pageEditor/fields/UrlMatchPatternField";
import { makeLockableFieldProps } from "@/pageEditor/fields/makeLockableFieldProps";
import IconWidget from "@/components/fields/IconWidget";
import ExtraPermissionsSection from "@/pageEditor/tabs/ExtraPermissionsSection";
import { useField, useFormikContext } from "formik";
import FieldTemplate from "@/components/form/FieldTemplate";
import { type QuickBarProviderConfig } from "@/extensionPoints/quickBarProviderExtension";
import { type QuickBarProviderFormState } from "@/pageEditor/extensionPoints/formStateTypes";
import SwitchButtonWidget, {
  type CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import AccordionFieldSection from "@/pageEditor/fields/AccordionFieldSection";

const QuickBarProviderConfiguration: React.FC<{
  isLocked: boolean;
}> = ({ isLocked = false }) => {
  const { setFieldValue } = useFormikContext<QuickBarProviderFormState>();

  const [rootActionField] = useField<
    QuickBarProviderConfig["rootAction"] | null
  >("extension.rootAction");

  return (
    <>
      <UrlMatchPatternField
        name="extensionPoint.definition.documentUrlPatterns"
        {...makeLockableFieldProps("Sites", isLocked)}
        description={
          <span>
            URL match patterns to show the menu item on. See{" "}
            <a
              href="https://developer.chrome.com/docs/extensions/mv2/match_patterns/"
              target="_blank"
              rel="noreferrer"
            >
              <code>match_patterns</code> Documentation
            </a>{" "}
            for examples.
          </span>
        }
      />

      <FieldTemplate
        name="extension.rootAction"
        label="Parent Action"
        as={SwitchButtonWidget}
        value={Boolean(rootActionField.value)}
        description="Toggle on to show a parent action that contains child actions when selected"
        onChange={({ target }: ChangeEvent<CheckBoxLike>) => {
          if (target.value) {
            setFieldValue("extension.rootAction", {
              title: null,
              icon: null,
              requireActiveRoot: false,
            });
          } else {
            setFieldValue("extension.rootAction", null);
          }
        }}
      />

      {rootActionField.value && (
        <>
          <ConnectedFieldTemplate
            name="extension.rootAction.title"
            label="Action Title"
            description="Quick Bar action title"
          />

          <ConnectedFieldTemplate
            name="extension.rootAction.icon"
            label="Action Icon"
            as={IconWidget}
            description="Icon to show in the Quick Bar for the action"
          />

          <ConnectedFieldTemplate
            name="extension.rootAction.requireActiveRoot"
            label="Require Active Root"
            as={SwitchButtonWidget}
            description="Toggle on to only generate actions when the parent action is selected"
          />
        </>
      )}

      <AccordionFieldSection title="Advanced">
        <UrlMatchPatternField
          name="extensionPoint.definition.isAvailable.matchPatterns"
          description={
            <span>
              URL match patterns give PixieBrix access to a page without you
              first clicking the context menu. Including URLs here helps
              PixieBrix run you action quicker, and accurately detect which page
              element you clicked to invoke the context menu.
            </span>
          }
          {...makeLockableFieldProps("Automatic Permissions", isLocked)}
        />
      </AccordionFieldSection>

      <ExtraPermissionsSection />
    </>
  );
};

export default QuickBarProviderConfiguration;
