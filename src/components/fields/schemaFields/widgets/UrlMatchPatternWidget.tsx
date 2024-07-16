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
import {
  createDomainPattern,
  createSitePattern,
  HTTPS_PATTERN,
  SITES_PATTERN,
} from "@/permissions/patterns";
import { useField, useFormikContext } from "formik";
import { LinkButton } from "@/components/LinkButton";
import ArrayWidget from "@/components/fields/schemaFields/widgets/ArrayWidget";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { PAGE_EDITOR_DEFAULT_BRICK_API_VERSION } from "@/pageEditor/starterBricks/base";
import {
  type Shortcut,
  type UrlMatchPatternWidgetProps,
} from "./urlMatchPatternWidgetTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { getCurrentInspectedURL } from "@/pageEditor/context/connection";

const UrlMatchShortcut: React.FC<{
  caption: string;
  onClick: () => void;
}> = ({ caption, onClick }) => (
  <LinkButton className="ml-2" onClick={onClick}>
    {caption}
  </LinkButton>
);

const DEFAULT_SHORTCUTS: Shortcut[] = [
  {
    caption: "Site",
    async getPattern() {
      const url = await getCurrentInspectedURL();
      return createSitePattern(url);
    },
  },
  {
    caption: "Domain",
    async getPattern() {
      const url = await getCurrentInspectedURL();
      return createDomainPattern(url);
    },
  },
  { caption: "HTTPS", getPattern: async () => HTTPS_PATTERN },
  { caption: "All URLs", getPattern: async () => SITES_PATTERN },
];

const UrlMatchPatternWidget: React.VFC<UrlMatchPatternWidgetProps> = (
  props,
) => {
  const {
    name,
    disabled,
    shortcuts = DEFAULT_SHORTCUTS,
    addButtonCaption = "Add Site",
  } = props;

  const { values: formState } = useFormikContext<ModComponentFormState>();
  const [{ value }, , { setValue }] = useField<string[]>(name);

  return (
    <>
      {!disabled && (
        <div className="small">
          <span>Shortcuts:</span>
          {shortcuts.map(({ caption, getPattern }) => (
            <UrlMatchShortcut
              key={caption}
              caption={caption}
              onClick={async () => {
                await setValue([...value, await getPattern()]);
              }}
            />
          ))}
        </div>
      )}
      <FieldRuntimeContext.Provider
        value={{
          apiVersion:
            formState.apiVersion ?? PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
          allowExpressions: false,
        }}
      >
        <ArrayWidget
          addButtonCaption={addButtonCaption}
          {...props}
          schema={{ items: { type: "string" } }}
        />
      </FieldRuntimeContext.Provider>
    </>
  );
};

export default UrlMatchPatternWidget;
