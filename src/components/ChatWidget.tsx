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
import { browser } from "webextension-polyfill-ts";

import "./ChatWidget.scss";

const ChatWidget: React.FunctionComponent = () => {
  const src = browser.runtime.getURL("/support.html");

  // Iframe dom definition doesn't support csp even though Chrome supports it as an attribute
  const props: any = {
    csp:
      "default-src 'self' https://w.chatlio.com; style-src 'self' 'unsafe-inline' https://w.chatlio.com; script-src 'self' https://w.chatlio.com; connect-src 'self' https://api.chatlio.com https://api-cdn.chatlio.com wss://push.chatlio.com wss://ws.pusherapp.com; img-src 'self' data: https://w.chatlio.com https://avatars.slack-edge.com https://files.slack.com https://files-origin.slack.com https://secure.gravatar.com https://uploads-cdn.chatlio.com; object-src 'none';",
  };

  return (
    <iframe
      className="ChatWidget"
      src={src}
      title="Support Chat"
      sandbox="allow-scripts allow-same-origin"
      {...props}
    />
  );
};

export default ChatWidget;
