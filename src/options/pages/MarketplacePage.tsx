import React, { useCallback } from "react";
import { connect } from "react-redux";
import { OptionsState } from "../slices";
import GenericMarketplacePage from "@/pages/marketplace/MarketplacePage";
import { push } from "connected-react-router";
import { RecipeDefinition } from "@/types/definitions";

export interface MarketplaceProps {
  installedRecipes: Set<string>;
  navigate: (url: string) => void;
}

const MarketplacePage: React.FunctionComponent<MarketplaceProps> = ({
  installedRecipes,
  navigate,
}) => {
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
