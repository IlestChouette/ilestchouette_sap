import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/coursier", "/commercant", "/mentions-legales"],
        disallow: ["/admin", "/operateur", "/commercant/dashboard", "/api/"],
      },
    ],
    sitemap: "https://ilestchouette.fr/sitemap.xml",
  };
}
