import React from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const PageTitle: React.FunctionComponent<{
  title: React.ReactNode;
  icon?: any;
}> = ({ title, icon }) => (
  <div className="page-header">
    <h3 className="page-title">
      {icon && (
        <span className="page-title-icon bg-gradient-primary text-white mr-2">
          <FontAwesomeIcon icon={icon} />
        </span>
      )}
      {title}
    </h3>
    {/*<nav aria-label="breadcrumb">*/}
    {/*    <ol className="breadcrumb">*/}
    {/*        <li className="breadcrumb-item"><a href="!#" onClick={event => event.preventDefault()}>Forms</a></li>*/}
    {/*        <li className="breadcrumb-item active" aria-current="page">Form elements</li>*/}
    {/*    </ol>*/}
    {/*</nav>*/}
  </div>
);

PageTitle.propTypes = {
  title: PropTypes.node.isRequired,
};
