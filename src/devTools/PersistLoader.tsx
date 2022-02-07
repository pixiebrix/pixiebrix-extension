import React from "react";
import GridLoader from "react-spinners/GridLoader";
import Centered from "@/devTools/editor/components/Centered";

const PersistLoader: React.VoidFunctionComponent = () => (
  <Centered>
    <div className="d-flex justify-content-center">
      <GridLoader />
    </div>
  </Centered>
);

export default PersistLoader;
