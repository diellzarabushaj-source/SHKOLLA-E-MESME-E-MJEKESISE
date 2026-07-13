import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Portali Mësimor Mjekësi Pejë",
    short_name: "Mjekësi Pejë",
    description: "Mësime dhe flashcards për nxënësit e Shkollës së Mesme të Mjekësisë në Pejë.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#07111f",
    theme_color: "#07111f",
    lang: "sq",
    categories: ["education", "medical"],
    shortcuts: [
      {
        name: "Klasat",
        short_name: "Klasat",
        description: "Hape zgjedhjen e klasave",
        url: "/#klasat",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "Progresi im",
        short_name: "Progresi",
        description: "Shiko progresin privat të mësimit",
        url: "/progress",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
