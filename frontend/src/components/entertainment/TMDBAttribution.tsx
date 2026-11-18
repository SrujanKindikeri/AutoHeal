import React from "react";

export const TMDBAttribution: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <p
    className={`text-body-sm text-content-muted ${className}`}
    aria-label="TMDB attribution notice"
  >
    This product uses the TMDB API but is not endorsed or certified by TMDB.
  </p>
);
