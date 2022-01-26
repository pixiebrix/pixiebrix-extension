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

import optionsRegistry from "@/components/fields/optionsRegistry";
import PushOptions from "@/contrib/zapier/pushOptions";
import ProcessOptions from "@/contrib/uipath/ProcessOptions";
import LocalProcessOptions from "@/contrib/uipath/LocalProcessOptions";
import AppendSpreadsheetOptions from "@/contrib/google/sheets/AppendSpreadsheetOptions";
import SheetServiceOptions, {
  SERVICE_GOOGLE_SHEET_ID,
} from "@/contrib/google/sheets/SheetServiceOptions";
import { ZAPIER_ID } from "@/contrib/zapier/push";
import { UIPATH_ID } from "@/contrib/uipath/process";
import { UIPATH_ID as LOCAL_UIPATH_ID } from "@/contrib/uipath/localProcess";
import { GOOGLE_SHEETS_APPEND_ID } from "@/contrib/google/sheets/append";
import BotOptions from "@/contrib/automationanywhere/BotOptions";
import { AUTOMATION_ANYWHERE_RUN_BOT_ID } from "@/contrib/automationanywhere/run";
import FormModalOptions, {
  FORM_MODAL_ID,
} from "@/devTools/editor/fields/FormModalOptions";
import FormRendererOptions, {
  FORM_RENDERER_ID,
} from "@/devTools/editor/fields/FormRendererOptions";
import { COMPONENT_READER_ID } from "@/blocks/transformers/component/ComponentReader";
import ComponentReaderOptions from "@/blocks/transformers/component/ComponentReaderOptions";
import { GOOGLE_SHEETS_LOOKUP_ID } from "@/contrib/google/sheets/lookup";
import LookupSpreadsheetOptions from "@/contrib/google/sheets/LookupSpreadsheetOptions";
import DatabaseGetOptions, {
  DATABASE_GET_ID,
} from "@/devTools/editor/fields/DatabaseGetOptions";
import DatabasePutOptions, {
  DATABASE_PUT_ID,
} from "@/devTools/editor/fields/DatabasePutOptions";
import DocumentOptions, {
  DOCUMENT_ID,
} from "@/devTools/editor/fields/DocumentOptions";

optionsRegistry.set(SERVICE_GOOGLE_SHEET_ID, SheetServiceOptions);
optionsRegistry.set(ZAPIER_ID, PushOptions);
optionsRegistry.set(UIPATH_ID, ProcessOptions);
optionsRegistry.set(LOCAL_UIPATH_ID, LocalProcessOptions);
optionsRegistry.set(GOOGLE_SHEETS_APPEND_ID, AppendSpreadsheetOptions);
optionsRegistry.set(GOOGLE_SHEETS_LOOKUP_ID, LookupSpreadsheetOptions);
optionsRegistry.set(AUTOMATION_ANYWHERE_RUN_BOT_ID, BotOptions);
optionsRegistry.set(FORM_MODAL_ID, FormModalOptions);
optionsRegistry.set(FORM_RENDERER_ID, FormRendererOptions);
optionsRegistry.set(DATABASE_GET_ID, DatabaseGetOptions);
optionsRegistry.set(DATABASE_PUT_ID, DatabasePutOptions);
optionsRegistry.set(COMPONENT_READER_ID, ComponentReaderOptions);
optionsRegistry.set(DOCUMENT_ID, DocumentOptions);
