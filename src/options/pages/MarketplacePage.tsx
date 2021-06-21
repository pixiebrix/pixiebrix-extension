/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useCallback } from "react";
import { connect } from "react-redux";
import { OptionsState } from "../slices";
import GenericMarketplacePage from "@/pages/marketplace/MarketplacePage";
import { push } from "connected-react-router";
import { RecipeDefinition } from "@/types/definitions";
import { useTitle } from "@/hooks/title";

export interface MarketplaceProps {
  installedRecipes: Set<string>;
  navigate: (url: string) => void;
}

const MarketplacePage: React.FunctionComponent<MarketplaceProps> = ({
  installedRecipes,
  navigate,
}) => {
  useTitle("Marketplace");

  const install = useCallback(
    async (x: RecipeDefinition) => {
      navigate(`marketplace/activate/${encodeURIComponent(x.metadata.id)}`);
    },
    [navigate]
  );

  return (
    <GenericMarketplacePage
      installedRecipes={installedRecipes}
      installRecipe={install}
    />
  );
};

export default connect(
  ({ options }: { options: OptionsState }) => ({
    installedRecipes: new Set(
      Object.values(options.extensions).flatMap((extensionPoint) =>
        Object.values(extensionPoint)
          .map((x) => x._recipeId)
          .filter((x) => x)
      )
    ),
  }),
  { navigate: push }
)(MarketplacePage);
