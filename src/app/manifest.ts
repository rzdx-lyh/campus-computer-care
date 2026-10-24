import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "校园电脑管家",
    short_name: "电脑管家",
    description: "学生电脑 AI 诊断与报修",
    theme_color: "#2273eb",
    background_color: "#ffffff",
    display: "standalone",
    start_url: "/",
    scope: "/",
    lang: "zh-CN",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

