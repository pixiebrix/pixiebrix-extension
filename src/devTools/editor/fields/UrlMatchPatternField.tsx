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

import UrlMatchPatternWidget from "@/devTools/editor/components/UrlMatchPatternWidget";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import React from "react";
import LockedLabel from "@/components/form/lockedLabel/LockedLabel";

const defaultDescription = (
  <span>
    URL match pattern for which pages to run the extension on. See{" "}
    <a
      href="https://developer.chrome.com/docs/extensions/mv2/match_patterns/"
      target="_blank"
      rel="noreferrer"
    >
      Patterns Documentation
    </a>{" "}
    for examples
  </span>
);

const UrlMatchPatternField: React.FC<{
  name: string;
  disabled: boolean;
  label?: string;
  description?: React.ReactNode;
}> = ({
  name,
  disabled,
  description = defaultDescription,
  label = "Sites",
}) => {
  const displayLabel = disabled ? (
    <LockedLabel
      label={label}
      message="Value comes from published foundation"
    />
  ) : (
    label
  );

  return (
    <ConnectedFieldTemplate
      name={name}
      as={UrlMatchPatternWidget}
      disabled={disabled}
      label={displayLabel}
      description={description}
    />
  );
};

export default UrlMatchPatternField;
