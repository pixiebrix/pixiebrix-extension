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

import React from "react";

export const theme = {
  background: "rgb(252, 252, 252)",
  foreground: "rgb(28, 28, 29)",
  shadow: "0px 6px 20px rgba(0, 0, 0, 20%)",
  a1: "rgba(0, 0, 0, 0.05)",
  a2: "rgba(0, 0, 0, 0.1)",
};

export const searchStyle = {
  padding: "12px 16px",
  fontSize: "16px",
  width: "100%",
  boxSizing: "border-box" as React.CSSProperties["boxSizing"],
  outline: "none",
  border: "none",
  background: theme.background,
  color: theme.foreground,
};

export const animatorStyle: React.CSSProperties = {
  all: "initial",
  fontFamily: "sans-serif",
  maxWidth: "600px",
  width: "100%",
  background: theme.background,
  color: theme.foreground,
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: theme.shadow,
};

export const groupNameStyle = {
  padding: "8px 16px",
  fontSize: "10px",
  textTransform: "uppercase" as const,
  opacity: 0.5,
};
