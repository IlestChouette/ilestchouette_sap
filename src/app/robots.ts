import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/coursier", "/mentions-legales"],
        disallow: ["/admin", "/operateur", "/api/"],
      },
    ],
    sitemap: "https://www.ilestchouette.fr/sitemap.xml",
  };
}
