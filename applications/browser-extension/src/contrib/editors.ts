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

import optionsRegistry from "@/components/fields/optionsRegistry";
import PushOptions from "./zapier/PushOptions";
import ProcessOptions from "./uipath/ProcessOptions";
import AppendSpreadsheetOptions from "./google/sheets/ui/AppendSpreadsheetOptions";
import { ZAPIER_ID } from "./zapier/push";
import { UIPATH_ID } from "./uipath/process";
import { GOOGLE_SHEETS_APPEND_ID } from "./google/sheets/bricks/append";
import BotOptions from "./automationanywhere/BotOptions";
import { RunBot } from "./automationanywhere/RunBot";
import FormModalOptions, {
  FORM_MODAL_ID,
} from "../pageEditor/fields/FormModalOptions";
import FormRendererOptions from "../pageEditor/fields/FormRendererOptions";
import { GOOGLE_SHEETS_LOOKUP_ID } from "./google/sheets/bricks/lookup";
import LookupSpreadsheetOptions from "./google/sheets/ui/LookupSpreadsheetOptions";
import DatabaseGetOptions, {
  DATABASE_GET_ID,
} from "../pageEditor/fields/DatabaseGetOptions";
import DatabasePutOptions, {
  DATABASE_PUT_ID,
} from "../pageEditor/fields/DatabasePutOptions";
import DocumentOptions from "../pageEditor/documentBuilder/edit/DocumentOptions";
import RemoteMethodOptions, {
  REMOTE_METHOD_ID,
} from "../pageEditor/fields/RemoteMethodOptions";
import { ALERT_EFFECT_ID } from "@/bricks/effects/alert";
import AlertOptions from "../pageEditor/fields/AlertOptions";
import { JQueryReader } from "@/bricks/transformers/jquery/JQueryReader";
import JQueryReaderOptions from "@/bricks/transformers/jquery/JQueryReaderOptions";
import AssignModVariable from "@/bricks/effects/assignModVariable";
import AssignModVariableOptions from "../pageEditor/fields/AssignModVariableOptions";
import IdentityTransformer from "@/bricks/transformers/IdentityTransformer";
import IdentityTransformerOptions from "@/bricks/transformers/IdentityTransformerOptions";
import CommentEffect from "@/bricks/effects/comment";
import CommentOptions from "@/bricks/effects/CommentOptions";
import { DocumentRenderer } from "@/bricks/renderers/document";
import { CustomFormRenderer } from "@/bricks/renderers/customForm";
import { RunApiTask } from "./automationanywhere/RunApiTask";
import ApiTaskOptions from "./automationanywhere/ApiTaskOptions";

/**
 * Custom BlockConfiguration pageEditor components.
 *
 * @see BlockOptionProps
 * @see BlockConfiguration
 */
export default function registerEditors() {
  optionsRegistry.set(ZAPIER_ID, PushOptions);
  optionsRegistry.set(UIPATH_ID, ProcessOptions);
  optionsRegistry.set(GOOGLE_SHEETS_APPEND_ID, AppendSpreadsheetOptions);
  optionsRegistry.set(GOOGLE_SHEETS_LOOKUP_ID, LookupSpreadsheetOptions);
  optionsRegistry.set(RunBot.BRICK_ID, BotOptions);
  optionsRegistry.set(FORM_MODAL_ID, FormModalOptions);
  optionsRegistry.set(CustomFormRenderer.BRICK_ID, FormRendererOptions);
  optionsRegistry.set(DATABASE_GET_ID, DatabaseGetOptions);
  optionsRegistry.set(DATABASE_PUT_ID, DatabasePutOptions);
  optionsRegistry.set(REMOTE_METHOD_ID, RemoteMethodOptions);
  optionsRegistry.set(DocumentRenderer.BRICK_ID, DocumentOptions);
  optionsRegistry.set(ALERT_EFFECT_ID, AlertOptions);
  optionsRegistry.set(JQueryReader.BRICK_ID, JQueryReaderOptions);
  optionsRegistry.set(AssignModVariable.BRICK_ID, AssignModVariableOptions);
  optionsRegistry.set(IdentityTransformer.BRICK_ID, IdentityTransformerOptions);
  optionsRegistry.set(CommentEffect.BRICK_ID, CommentOptions);
  optionsRegistry.set(RunApiTask.BRICK_ID, ApiTaskOptions);
}
