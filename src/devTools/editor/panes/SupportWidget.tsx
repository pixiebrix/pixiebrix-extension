/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExternalLinkAlt,
  faPhone,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import ChatWidget from "@/components/ChatWidget";

const SupportWidget: React.FunctionComponent<{ onClose: () => void }> = ({
  onClose,
}) => (
  <div className="d-flex flex-column h-100">
    <div className="d-flex pl-2">
      <div className="flex-grow-1">
        <div className="small">
          <span className="text-muted">
            <FontAwesomeIcon icon={faPhone} />
          </span>{" "}
          <a
            href="https://calendly.com/pixiebrix-todd/live-support-session"
            target="_blank"
            rel="noreferrer"
          >
            Schedule FREE Zoom session
          </a>
        </div>
        <div className="small">
          <span className="text-muted">
            <FontAwesomeIcon icon={faExternalLinkAlt} />{" "}
          </span>
          <a
            href="https://docs.pixiebrix.com/"
            target="_blank"
            rel="noreferrer"
          >
            Open Documentation
          </a>
        </div>
      </div>
      <div className="pr-2 text-muted">
        <span
          onClick={() => {
            onClose();
          }}
          role="button"
        >
          <FontAwesomeIcon icon={faTimes} />
        </span>
      </div>
    </div>
    <div className="flex-grow-1">
      <ChatWidget />
    </div>
  </div>
);

export default SupportWidget;
