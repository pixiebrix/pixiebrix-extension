import { sidebarId } from "./Sidebar";

const smallScreenMediaQuery = "(max-width: 991px)";

export const toggleNavbar = () => {
  if (window.matchMedia(smallScreenMediaQuery).matches) {
    document.querySelector(`#${sidebarId}`).classList.toggle("active");
  } else {
    document.body.classList.toggle("sidebar-icon-only");
  }
};
