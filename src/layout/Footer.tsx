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

const Footer: React.FunctionComponent = () => (
  <footer className="footer">
    <div className="d-sm-flex justify-content-center justify-content-sm-between">
      <span className="text-muted text-center text-sm-left d-block d-sm-inline-block">
        Copyright © 2021 <a href="https://www.pixiebrix.com">Pixie Brix, LLC</a>
        . All rights reserved.
      </span>
    </div>
  </footer>
);

export default Footer;
