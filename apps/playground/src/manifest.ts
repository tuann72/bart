import type { BartPublicManifest } from "@bart-ui/registry";

/** In a real project `bart sync` generates this from content/bart/*.md. */
export const publicManifest: BartPublicManifest = {
  routes: [
    {
      route: "/",
      title: "Home",
      description:
        "Stackhouse Burger Co. location, hours, and signature burgers.",
      targets: [
        { id: "home-hero", description: "The Stackhouse welcome and tagline." },
        {
          id: "signature-burgers",
          description: "The three featured signature burgers.",
        },
        {
          id: "visit-us",
          description: "The restaurant address, hours, and pickup timing.",
        },
      ],
    },
    {
      route: "/pricing",
      title: "Pricing",
      description: "Burger menu, sides, shakes, and combo pricing.",
      targets: [
        { id: "burger-menu", description: "Burger descriptions and prices." },
        {
          id: "combo-deals",
          description: "Combo upgrade, sides, shakes, and kids pricing.",
        },
      ],
    },
    {
      route: "/faq",
      title: "FAQ",
      description: "Ordering, location, reservations, and dietary answers.",
      targets: [
        {
          id: "ordering-faq",
          description: "Pickup, delivery, reservation, and location answers.",
        },
        {
          id: "dietary-faq",
          description: "Vegetarian, vegan, gluten, allergy, and fryer notes.",
        },
      ],
    },
  ],
};
