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
import type CommandRegistry from "@/contentScript/commandPopover/CommandRegistry";
import useCommandRegistry from "@/contentScript/commandPopover/useCommandRegistry";
import type { EditableTextElement } from "@/contentScript/commandPopover/commandTypes";
import useCommandQuery from "@/contentScript/commandPopover/useCommandQuery";

type ActionCallbacks = {
  onHide: () => void;
};

const CommandPopover: React.FunctionComponent<
  { registry: CommandRegistry; element: EditableTextElement } & ActionCallbacks
> = ({ registry, element, onHide }) => {
  const commands = useCommandRegistry(registry);
  const query = useCommandQuery({ element, onHide, commandKey: "/" });

  return (
    <div>
      <p>Command Popover: {query}</p>
      <ul>
        {commands.map((command) => (
          <li key={command.shortcut}>{command.title}</li>
        ))}
      </ul>
    </div>
  );
};

export default CommandPopover;
