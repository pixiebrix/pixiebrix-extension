import { appApi } from "@/services/api";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { refreshRecipes } from "./recipesSlice";

const apiEndpoints = appApi.endpoints;

const recipesListenerMiddleware = createListenerMiddleware();
recipesListenerMiddleware.startListening({
  matcher: isAnyOf(
    apiEndpoints.createRecipe.matchFulfilled,
    apiEndpoints.updateRecipe.matchFulfilled,
    apiEndpoints.createPackage.matchFulfilled,
    apiEndpoints.updatePackage.matchFulfilled,
    apiEndpoints.deletePackage.matchFulfilled
  ),
  effect(action, { dispatch }) {
    void dispatch(refreshRecipes({ backgroundRefresh: false }));
  },
});

export const recipesMiddleware = recipesListenerMiddleware.middleware;
