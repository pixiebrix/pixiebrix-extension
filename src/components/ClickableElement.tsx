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
import { type Except } from "type-fest";

/**
 * An alternative to `button` where `button` cannot be used (e.g. nested clickable elements)
 * It automatically handles focusability, `role`, keyboard events:
 * - https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-static-element-interactions.md
 * - https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md
 *
 */
const ClickableElement: React.FC<
  Except<
    React.HTMLProps<HTMLDivElement> & {
      onClick: (
        event:
          | React.MouseEvent<HTMLDivElement>
          | React.KeyboardEvent<HTMLDivElement>,
      ) => void;
    },
    // `onKeyPress` is forbidden because it will be overridden
    // XXX: If needed, add support for that by merging it with the `onKeyPress` in the props
    "role" | "tabIndex" | "onKeyPress"
  >
> = ({ children, ...props }) => (
  <div
    {...props}
    tabIndex={0}
    role="button"
    onKeyPress={(event) => {
      if (event.key === "Enter") {
        props.onClick(event);
      }
    }}
    // TODO: also handle onMouseOver -> onFocus as defined in https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/mouse-events-have-key-events.md
  >
    {children}
  </div>
);

export default ClickableElement;
