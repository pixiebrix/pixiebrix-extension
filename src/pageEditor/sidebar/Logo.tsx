import styles from "./Sidebar.module.scss";
import React from "react";
import logoUrl from "@/icons/custom-icons/favicon.svg";

const Logo: React.VoidFunctionComponent = () => (
  <img src={logoUrl} alt="PixiBrix logo" className={styles.logo} />
);

export default Logo;
