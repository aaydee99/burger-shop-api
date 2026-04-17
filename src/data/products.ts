export type ProductCategory = "burger" | "sandwich" | "side" | "drink";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  category: ProductCategory;
  imagePath: string;
  tags: string[];
  spicyLevel?: 0 | 1 | 2 | 3;
}

export const products: Product[] = [
  {
    id: "prod_001",
    slug: "classic-double",
    name: "Classic Double",
    description:
      "Two smashed patties, American cheese, pickles, grilled onions, and house sauce on a toasted brioche bun.",
    priceCents: 1299,
    category: "burger",
    imagePath: "/images/classic-double.jpg",
    tags: ["bestseller", "beef"],
    spicyLevel: 0,
  },
  {
    id: "prod_002",
    slug: "smokehouse-bbq",
    name: "Smokehouse BBQ",
    description:
      "Single thick patty, cheddar, crispy shallots, smoky BBQ glaze, and applewood bacon.",
    priceCents: 1399,
    category: "burger",
    imagePath: "/images/smokehouse.jpg",
    tags: ["bbq", "bacon"],
    spicyLevel: 1,
  },
  {
    id: "prod_003",
    slug: "green-garden",
    name: "Green Garden",
    description:
      "Crispy chickpea patty, herb aioli, roasted peppers, arugula, and vegan brioche.",
    priceCents: 1199,
    category: "burger",
    imagePath: "/images/green-garden.jpg",
    tags: ["vegetarian", "plant-based"],
    spicyLevel: 0,
  },
  {
    id: "prod_004",
    slug: "hot-harissa",
    name: "Hot Harissa",
    description:
      "Lamb-blend patty, harissa mayo, pickled Fresno chiles, feta crumble, and mint.",
    priceCents: 1499,
    category: "burger",
    imagePath: "/images/hot-harissa.jpg",
    tags: ["spicy", "chef-pick"],
    spicyLevel: 3,
  },
  {
    id: "prod_005",
    slug: "club-stacked",
    name: "Club Stacked",
    description:
      "Roasted turkey, honey ham, bacon, lettuce, tomato, and triple-decker sourdough.",
    priceCents: 1349,
    category: "sandwich",
    imagePath: "/images/club.jpg",
    tags: ["turkey", "classic"],
    spicyLevel: 0,
  },
  {
    id: "prod_006",
    slug: "grilled-caprese",
    name: "Grilled Caprese",
    description:
      "Marinated grilled chicken, fresh mozzarella, basil pesto, balsamic glaze, ciabatta.",
    priceCents: 1249,
    category: "sandwich",
    imagePath: "/images/caprese.jpg",
    tags: ["chicken", "italian"],
    spicyLevel: 0,
  },
  {
    id: "prod_007",
    slug: "philly-melt",
    name: "Philly Melt",
    description:
      "Shaved ribeye, peppers, onions, provolone, and horseradish cream on a hoagie roll.",
    priceCents: 1449,
    category: "sandwich",
    imagePath: "/images/philly.jpg",
    tags: ["beef", "comfort"],
    spicyLevel: 1,
  },
  {
    id: "prod_008",
    slug: "crispy-fries",
    name: "Crispy Fries",
    description: "Twice-fried russets, sea salt, and rosemary. Served with garlic aioli.",
    priceCents: 549,
    category: "side",
    imagePath: "/images/fries.jpg",
    tags: ["shareable"],
    spicyLevel: 0,
  },
  {
    id: "prod_009",
    slug: "house-lemonade",
    name: "House Lemonade",
    description: "Fresh-squeezed lemons, cane sugar, and a hint of lavender.",
    priceCents: 399,
    category: "drink",
    imagePath: "/images/lemonade.jpg",
    tags: ["refreshing"],
    spicyLevel: 0,
  },
];
