import { MetadataRoute } from "next";

const BASE = "https://ineedtools.in";

const routes = [
  { path: "/",                priority: 1.0,  changeFrequency: "weekly"  },
  { path: "/sql-generator",   priority: 0.9,  changeFrequency: "monthly" },
  { path: "/json-tools",      priority: 0.9,  changeFrequency: "monthly" },
  { path: "/image-converter", priority: 0.9,  changeFrequency: "monthly" },
  { path: "/image-tools",     priority: 0.85, changeFrequency: "monthly" },
  { path: "/pdf-tools",       priority: 0.85, changeFrequency: "monthly" },
  { path: "/qr-tools",        priority: 0.85, changeFrequency: "monthly" },
  { path: "/age-calculator",  priority: 0.85, changeFrequency: "monthly" },
  { path: "/base64",          priority: 0.8,  changeFrequency: "monthly" },
  { path: "/hash-generator",  priority: 0.8,  changeFrequency: "monthly" },
  { path: "/uuid-generator",  priority: 0.8,  changeFrequency: "monthly" },
  { path: "/regex-tester",    priority: 0.8,  changeFrequency: "monthly" },
  { path: "/color-tools",     priority: 0.8,  changeFrequency: "monthly" },
  { path: "/text-tools",      priority: 0.8,  changeFrequency: "monthly" },
  { path: "/csv-tools",       priority: 0.8,  changeFrequency: "monthly" },
  { path: "/markdown",        priority: 0.75, changeFrequency: "monthly" },
  { path: "/jwt-decoder",     priority: 0.75, changeFrequency: "monthly" },
  { path: "/timestamp",       priority: 0.75, changeFrequency: "monthly" },
  { path: "/word-to-pdf",     priority: 0.75, changeFrequency: "monthly" },
  { path: "/pdf-to-word",     priority: 0.75, changeFrequency: "monthly" },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map(r => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
