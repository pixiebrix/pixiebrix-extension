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
import AsyncRemoteSelectWidget, {
  type AsyncRemoteSelectWidgetProps,
} from "@/components/form/widgets/AsyncRemoteSelectWidget";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { type SanitizedIntegrationConfig } from "../../integrations/integrationTypes";
import type { WorkspaceType } from "./contract";
import { partial } from "lodash";
import type { Option } from "@/components/form/widgets/SelectWidget";

type RemoteOptionsFactory = (
  config: SanitizedIntegrationConfig,
  options: {
    workspaceType: WorkspaceType;
    query: string;
    value: string | null;
  },
) => Promise<Option[]>;

type RemoteFileSelectFieldProps = {
  fileIdFieldName: string;
  label: string;
  description: string;
  workspaceTypeFieldValue: WorkspaceType | null;
  controlRoomConfig: SanitizedIntegrationConfig;
  optionsFactory: RemoteOptionsFactory;
} & Pick<
  AsyncRemoteSelectWidgetProps,
  | "placeholder"
  | "extraFactoryArgs"
  | "loadingMessage"
  | "noOptionsMessage"
  | "unknownOptionLabel"
>;

const RemoteFileSelectField: React.FC<RemoteFileSelectFieldProps> = ({
  fileIdFieldName,
  workspaceTypeFieldValue,
  controlRoomConfig,
  optionsFactory,
  ...restProps
}) => (
  <ConnectedFieldTemplate
    name={fileIdFieldName}
    // Due to quirks with the memoization inside react-select, we need
    // to force this to re-render when the integration config or the
    // workspace fields change in order to force a fetch of new options
    // from the api.
    // See: https://github.com/JedWatson/react-select/issues/1581
    key={`${controlRoomConfig.id}-${workspaceTypeFieldValue}`}
    // Use AsyncRemoteSelectWidget instead of RemoteSelectWidget because the former can handle
    // Control Rooms with lots of bots by passing in a search query to the api calls
    // https://github.com/pixiebrix/pixiebrix-extension/issues/5260
    as={AsyncRemoteSelectWidget}
    isClearable
    defaultOptions
    optionsFactory={partial(optionsFactory, controlRoomConfig)}
    {...restProps}
  />
);

export default RemoteFileSelectField;
