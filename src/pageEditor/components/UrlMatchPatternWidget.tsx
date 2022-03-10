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
import { getCurrentURL } from "@/pageEditor/utils";
import {
  createDomainPattern,
  createSitePattern,
  HTTPS_PATTERN,
  SITES_PATTERN,
} from "@/permissions/patterns";
import { CustomFieldWidget } from "@/components/form/FieldTemplate";
import { useField } from "formik";
import { LinkButton } from "@/components/LinkButton";
import ArrayWidget from "@/components/fields/schemaFields/widgets/ArrayWidget";
import FieldRuntimeContext from "@/components/fields/schemaFields/FieldRuntimeContext";
import { PAGE_EDITOR_DEFAULT_BRICK_API_VERSION } from "@/pageEditor/extensionPoints/base";
import produce from "immer";

const UrlMatchShortcut: React.FC<{
  caption: string;
  onClick: () => void;
}> = ({ caption, onClick }) => (
  <LinkButton className="ml-2" onClick={onClick}>
    {caption}
  </LinkButton>
);

export type Shortcut = {
  caption: string;
  getPattern: () => Promise<string>;
};

export const DEFAULT_SHORTCUTS: Shortcut[] = [
  {
    caption: "Site",
    async getPattern() {
      const url = await getCurrentURL();
      return createSitePattern(url);
    },
  },
  {
    caption: "Domain",
    async getPattern() {
      const url = await getCurrentURL();
      return createDomainPattern(url);
    },
  },
  { caption: "HTTPS", getPattern: async () => HTTPS_PATTERN },
  { caption: "All URLs", getPattern: async () => SITES_PATTERN },
];

const UrlMatchPatternWidget: CustomFieldWidget = (props) => {
  const { name, disabled } = props;

  // XXX: the generic type CustomFieldWidget doesn't seem to support exposing custom props for the widget
  const shortcuts =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((props as any).shortcuts as Shortcut[]) ?? DEFAULT_SHORTCUTS;

  // XXX: can we use props.onChange here? Maybe not unless we construct an event?
  const [{ value }, , { setValue }] = useField<string[]>(name);

  const onShortcutClick = (pattern: string) => {
    const nextMatchPatters = produce(value, (draft) => {
      if (draft.length === 0) {
        draft.push(pattern);
      } else {
        draft[draft.length - 1] = pattern;
      }
    });

    setValue(nextMatchPatters);
  };

  return (
    <>
      {!disabled && (
        <div className="small">
          <span>Shortcuts:</span>
          {shortcuts.map(({ caption, getPattern }) => (
            <UrlMatchShortcut
              key={caption}
              caption={caption}
              onClick={async () => onShortcutClick(await getPattern())}
            />
          ))}
        </div>
      )}
      <FieldRuntimeContext.Provider
        value={{
          // TODO use the brick's API version
          apiVersion: PAGE_EDITOR_DEFAULT_BRICK_API_VERSION,
          allowExpressions: false,
        }}
      >
        <ArrayWidget schema={{ items: { type: "string" } }} {...props} />
      </FieldRuntimeContext.Provider>
    </>
  );
};

export default UrlMatchPatternWidget;
