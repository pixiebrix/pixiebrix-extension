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
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import serviceRegistry from "@/services/registry";
import extensionPointRegistry from "@/extensionPoints/registry";
import AsyncStateGate from "@/components/AsyncStateGate";

/**
 * Loading gate that requires brick definitions to be available before rendering children.
 * @param children
 */
const RequireBrickRegistry: React.FC = ({ children }) => {
  const state = useAsyncState(
    async () =>
      Promise.all([
        blockRegistry.all(),
        serviceRegistry.all(),
        extensionPointRegistry.all(),
      ]),
    []
  );

  return <AsyncStateGate state={state}>{() => <>{children}</>}</AsyncStateGate>;
};

export default RequireBrickRegistry;
