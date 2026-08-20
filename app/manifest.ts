import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "iNeedTools — I Need Tools",
    short_name: "iNeedTools",
    description: "Free online developer tools — SQL generators, JSON tools, image converters, PDF tools, QR codes, hash generators and more. Zero sign-up.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
