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
import { type Action, Priority } from "kbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faAppleAlt,
  faInfoCircle,
  faStore,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { MARKETPLACE_URL } from "@/utils/strings";
import { faSlack } from "@fortawesome/free-brands-svg-icons";

const DEFAULT_SERVICE_URL = process.env.SERVICE_URL;

const PIXIEBRIX_SECTION = "PixieBrix";

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
      window.location.href = "https://docs.pixiebrix.com/quick-start-guide";
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

export default defaultActions;
