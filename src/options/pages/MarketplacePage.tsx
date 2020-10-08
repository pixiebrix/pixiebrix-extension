import React, { useCallback } from "react";
import { ensureRecipePermissions } from "@/permissions";
import { RecipeDefinition } from "@/types/definitions";
import { useToasts } from "react-toast-notifications";
import { connect } from "react-redux";
import { optionsSlice, OptionsState } from "../slices";
import GenericMarketplacePage, {
  InstallRecipe,
} from "@/pages/marketplace/MarketplacePage";
import Rollbar from "rollbar";

const { installRecipe } = optionsSlice.actions;

export type InstallAction = ({ recipe }: { recipe: RecipeDefinition }) => void;

function useInstall(installRecipe: InstallAction): InstallRecipe {
  const { addToast } = useToasts();
  return useCallback(
    async (recipe) => {
      try {
        if (!(await ensureRecipePermissions(recipe))) {
          addToast(
            `You must accept permissions for ${recipe.metadata.name} to install it`,
            {
              appearance: "error",
              autoDismiss: true,
            }
          );
          return;
        }
        installRecipe({ recipe });
        addToast(`Installed ${recipe.metadata.name}`, {
          appearance: "success",
          autoDismiss: true,
        });
      } catch (ex) {
        // @ts-ignore: rollbar typings are incorrect?
        Rollbar.error(ex);
        console.error(`Error installing ${recipe.metadata.name}`, ex);
        addToast(`Error installing ${recipe.metadata.name}`, {
          appearance: "error",
          autoDismiss: true,
        });
      }
    },
    [installRecipe, addToast]
  );
}

export interface MarketplaceProps {
  installedRecipes: Set<string>;
  installRecipe: InstallAction;
}

const MarketplacePage: React.FunctionComponent<MarketplaceProps> = ({
  installedRecipes,
  installRecipe,
}) => {
  const install = useInstall(installRecipe);
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
  { installRecipe }
)(MarketplacePage);
