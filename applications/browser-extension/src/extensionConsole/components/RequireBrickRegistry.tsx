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
import useAsyncState from "@/hooks/useAsyncState";
import brickRegistry from "@/bricks/registry";
import integrationRegistry from "../../integrations/registry";
import starterBrickRegistry from "../../starterBricks/registry";
import AsyncStateGate from "@/components/AsyncStateGate";
import type { EmptyObject } from "type-fest";

/**
 * Loading gate that requires brick definitions to be available before rendering children.
 */
const RequireBrickRegistry: React.FC<React.PropsWithChildren<EmptyObject>> = ({
  children,
}) => {
  const state = useAsyncState(
    async () =>
      Promise.all([
        brickRegistry.all(),
        integrationRegistry.all(),
        starterBrickRegistry.all(),
      ]),
    [],
  );

  return <AsyncStateGate state={state}>{() => <>{children}</>}</AsyncStateGate>;
};

export default RequireBrickRegistry;
