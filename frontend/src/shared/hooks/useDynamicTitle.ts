import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Global dynamic title management based on URL path.
 * SEO & UX optimized.
 */
export const useDynamicTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const baseTitle = "Nexora Portal";

    // 1. Convert path to human readable title (e.g., /superadmin/dashboard -> Superadmin Dashboard)
    // Removing leading/trailing slashes and replacing hyphens with spaces
    let pageName = path
      .split("/")
      .filter(Boolean)
      .map((seg) => {
        // Handle specific cases or just capitalize
        const humanized = seg.replace(/-/g, " ");
        return humanized.charAt(0).toUpperCase() + humanized.slice(1);
      })
      .join(" - ");

    // 2. Handle specific route overrides for better UX
    if (path === "/" || path === "") {
      pageName = "Home";
    } else if (path.includes("infrastructure-status")) {
      pageName = "System Security Status";
    } else if (path.includes("secure-gateway")) {
      pageName = "Secure Access Authorization";
    }

    // 3. Set the final title
    document.title = pageName ? `${pageName} | ${baseTitle}` : baseTitle;

  }, [location]);
};

