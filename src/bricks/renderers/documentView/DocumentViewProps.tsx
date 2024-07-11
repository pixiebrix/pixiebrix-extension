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

import { type DocumentBuilderElement } from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { type SubmitPanelAction } from "@/bricks/errors";
import { type BrickArgsContext, type BrickOptions } from "@/types/runtimeTypes";
import { type UUID } from "@/types/stringTypes";

export type DocumentViewProps = {
  /**
   * Action handler for submitting or closing the panel from a button handler.
   */
  onAction?: (action: SubmitPanelAction) => void;
  /**
   * Top-level elements in the document.
   */
  body: DocumentBuilderElement[];
  /**
   * Remote stylesheets (URLs) to include in the document.
   */
  stylesheets?: string[];
  /**
   * Whether to disable the base (bootstrap) styles, plus any inherited styles, on the document (and children).
   */
  disableParentStyles?: boolean;

  options: BrickOptions<BrickArgsContext>;
  meta: {
    runId: UUID;
    modComponentId: UUID;
  };
};
