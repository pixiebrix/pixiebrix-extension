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
import EmotionShadowRoot from "react-shadow/emotion";
import logoUrl from "@/icons/custom-icons/favicon.svg";

export function FloatingQuickBarButton({ onClick }: { onClick: () => void }) {
  return (
    <EmotionShadowRoot.div>
      <button
        style={{
          position: "fixed",
          bottom: 40,
          left: 40,
          background: "none",
          border: "none",
        }}
        onClick={onClick}
      >
        <img
          src={logoUrl}
          style={{
            height: 40,
            width: 40,
            cursor: "pointer",
          }}
          alt="quick menu button"
        />
      </button>
    </EmotionShadowRoot.div>
  );
}
