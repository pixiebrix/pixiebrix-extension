/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useMemo } from "react";
import { Tab } from "react-bootstrap";
import { actionSchema } from "@/extensionPoints/menuItemExtension";
import { defaultFieldRenderer } from "@/options/pages/extensionEditor/fieldRenderer";
import { useAsyncState } from "@/hooks/common";
import blockRegistry from "@/blocks/registry";
import { GridLoader } from "react-spinners";
import { RendererContext } from "@/components/fields/blockOptions";
import devtoolFields from "@/devTools/editor/Fields";

const EffectTab: React.FunctionComponent<{
  eventKey?: string;
}> = ({ eventKey = "effect" }) => {
  const [blocks] = useAsyncState(blockRegistry.all(), []);
  const Field = useMemo(() => defaultFieldRenderer(actionSchema), [blocks]);

  return (
    <Tab.Pane eventKey={eventKey} className="h-100">
      <RendererContext.Provider value={devtoolFields}>
        {blocks?.length ? (
          <Field
            name="extension.action"
            schema={actionSchema}
            // @ts-ignore: need to type field props to allow extra types
            blocks={blocks}
          />
        ) : (
          <GridLoader />
        )}
      </RendererContext.Provider>
    </Tab.Pane>
  );
};

export default EffectTab;
