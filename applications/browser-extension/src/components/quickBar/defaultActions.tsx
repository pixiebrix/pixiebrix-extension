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
import { type Action, Priority } from "kbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAppleAlt,
  faBook,
  faInfoCircle,
  faStore,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { faSlack } from "@fortawesome/free-brands-svg-icons";
import { DEFAULT_SERVICE_URL, MARKETPLACE_URL } from "@/urlConstants";
import { Events } from "@/telemetry/events";
import reportEvent from "@/telemetry/reportEvent";
import showWalkthroughModal from "@/components/walkthroughModal/showWalkthroughModal";

const PIXIEBRIX_SECTION = "PixieBrix";

// eslint-disable-next-line local-rules/persistBackgroundData -- Static
const defaultActions: Action[] = [
  {
    id: "marketplace",
    name: "Open Marketplace",
    keywords: "marketplace",
    icon: <FontAwesomeIcon icon={faStore} fixedWidth />,
    section: PIXIEBRIX_SECTION,
    priority: Priority.LOW,
    perform() {
      window.location.href = MARKETPLACE_URL;
    },
  },
  {
    id: "admin",
    name: "Open Admin Console",
    keywords: "admin, admin console",
    section: PIXIEBRIX_SECTION,
    priority: Priority.LOW,
    icon: <FontAwesomeIcon icon={faUsers} fixedWidth />,
    perform() {
      window.location.href = DEFAULT_SERVICE_URL;
    },
  },
  {
    id: "quick-start",
    name: "Open Quick Start",
    keywords: "quick start, tutorials",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faAppleAlt} fixedWidth />,
    priority: Priority.LOW,
    perform() {
      window.location.href = "https://docs.pixiebrix.com/quick-start";
    },
  },
  {
    id: "community",
    name: "Open Community Slack",
    keywords: "community, how to",
    section: PIXIEBRIX_SECTION,
    priority: Priority.LOW,
    icon: <FontAwesomeIcon icon={faSlack} fixedWidth />,
    perform() {
      window.location.href = "https://slack.pixiebrix.com/";
    },
  },
  {
    id: "documentation",
    name: "Open Documentation",
    keywords: "docs, tutorials, documentation, how to",
    section: PIXIEBRIX_SECTION,
    icon: <FontAwesomeIcon icon={faInfoCircle} fixedWidth />,
    priority: Priority.LOW,
    perform() {
      window.location.href = "https://docs.pixiebrix.com/";
    },
  },
];

export const pageEditorAction: Action = {
  id: "page-editor",
  name: "Learn: Open the Page Editor",
  keywords: "mod, edit, page, page editor, editor, how to, open, learn",
  section: PIXIEBRIX_SECTION,
  priority: Priority.LOW,
  icon: <FontAwesomeIcon icon={faBook} fixedWidth />,
  perform() {
    reportEvent(Events.PAGE_EDITOR_WALKTHROUGH_LINK_CLICK, {
      source: "quick bar",
    });
    void showWalkthroughModal();
  },
};

export default defaultActions;
