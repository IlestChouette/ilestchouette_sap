import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/commercant"],
        disallow: [
          "/admin",
          "/operateur",
          "/commercant/dashboard",
          "/coursier",
          "/presentation",
          "/mentions-legales",
          "/politique-de-confidentialite",
          "/privacy",
          "/conditions-partenaires",
          "/delete-account",
          "/api/",
        ],
      },
    ],
    sitemap: "https://www.ilestchouette.fr/sitemap.xml",
  };
}
