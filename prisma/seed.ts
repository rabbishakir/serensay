import { OrderStatus, ShipmentStatus, Source } from "@prisma/client"

import { prisma } from "../src/lib/db"

async function main() {
  console.log("Seeding started...")

  console.log("Clearing existing data...")
  await prisma.order.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.buyer.deleteMany()
  await prisma.bdInventory.deleteMany()
  await prisma.usaInventory.deleteMany()

  console.log("Seeding buyers...")
  const buyerInputs = [
    {
      name: "Rakib Hassan",
      phone: "01712345678",
      address: "Mirpur 10, Dhaka",
      notes: "Prefers Fenty products. Pays promptly.",
    },
    {
      name: "Suma Akter",
      phone: "01812345679",
      address: "Dhanmondi 27, Dhaka",
      notes: "VIP customer. Orders every month.",
    },
    {
      name: "Rafi Islam",
      phone: "01912345680",
      address: "Uttara Sector 7, Dhaka",
      notes: "Interested in skincare only.",
    },
    {
      name: "Nadia Chowdhury",
      phone: "01712345681",
      address: "Banani, Dhaka",
      notes: "Wants shade swatches before ordering.",
    },
    {
      name: "Tanvir Ahmed",
      phone: "01612345682",
      address: "Gulshan 2, Dhaka",
      notes: "Buys for his wife. Needs gift wrapping.",
    },
    {
      name: "Mitu Begum",
      phone: "01512345683",
      address: "Narayanganj",
      notes: "",
    },
    {
      name: "Farhan Hossain",
      phone: "01412345684",
      address: "Chittagong, GEC Circle",
      notes: "Ships to Chittagong. Extra delivery time.",
    },
    {
      name: "Priya Das",
      phone: "01312345685",
      address: "Sylhet Zindabazar",
      notes: "Recurring buyer. Loves NYX.",
    },
    {
      name: "Karim Uddin",
      phone: "01712345686",
      address: "Mohammadpur, Dhaka",
      notes: "",
    },
    {
      name: "Sinthia Rahman",
      phone: "01812345687",
      address: "Bashundhara R/A, Dhaka",
      notes: "New customer. Referred by Suma.",
    },
    {
      name: "Arif Mahmud",
      phone: "01912345688",
      address: "Rajshahi Shaheb Bazar",
      notes: "Orders in bulk occasionally.",
    },
    {
      name: "Liza Khanam",
      phone: "01712345689",
      address: "Comilla Town",
      notes: "Prefers drugstore brands.",
    },
  ]

  const buyersByName: Record<string, { id: string; name: string }> = {}
  for (const input of buyerInputs) {
    const buyer = await prisma.buyer.create({ data: input })
    buyersByName[input.name] = { id: buyer.id, name: buyer.name }
  }

  const rakib = buyersByName["Rakib Hassan"]
  const suma = buyersByName["Suma Akter"]
  const rafi = buyersByName["Rafi Islam"]
  const nadia = buyersByName["Nadia Chowdhury"]
  const tanvir = buyersByName["Tanvir Ahmed"]
  const mitu = buyersByName["Mitu Begum"]
  const farhan = buyersByName["Farhan Hossain"]
  const priya = buyersByName["Priya Das"]
  const karim = buyersByName["Karim Uddin"]
  const sinthia = buyersByName["Sinthia Rahman"]
  const arif = buyersByName["Arif Mahmud"]
  const liza = buyersByName["Liza Khanam"]
  void rafi // kept for completeness in named buyers set

  console.log("Seeding BD inventory...")
  await prisma.bdInventory.createMany({
    data: [
      {
        productName: "Pro Filt'r Soft Matte Longwear Foundation",
        brand: "Fenty Beauty",
        shade: "210W",
        qty: 4,
        buyPriceBdt: 2200,
        sellPriceBdt: 3200,
        tags: ["Stocked"],
      },
      {
        productName: "Soft Pinch Liquid Blush",
        brand: "Rare Beauty",
        shade: "Hope",
        qty: 3,
        buyPriceBdt: 1800,
        sellPriceBdt: 2600,
        tags: ["Stocked"],
      },
      {
        productName: "Butter Lip Balm",
        brand: "NYX Professional",
        shade: "Vanilla Cream",
        qty: 6,
        buyPriceBdt: 800,
        sellPriceBdt: 1200,
        tags: ["Stocked"],
      },
      {
        productName: "Moisturizing Cream",
        brand: "CeraVe",
        shade: null,
        qty: 5,
        buyPriceBdt: 1400,
        sellPriceBdt: 2000,
        tags: ["Stocked"],
      },
      {
        productName: "Lip Liner",
        brand: "Charlotte Tilbury",
        shade: "Pillow Talk",
        qty: 2,
        buyPriceBdt: 2600,
        sellPriceBdt: 3800,
        tags: ["Stocked", "Order Arrived"],
      },
      {
        productName: "Fit Me Matte Foundation",
        brand: "Maybelline",
        shade: "120 Classic Ivory",
        qty: 4,
        buyPriceBdt: 900,
        sellPriceBdt: 1400,
        tags: ["Stocked"],
      },
      {
        productName: "Retinol Serum",
        brand: "The Ordinary",
        shade: null,
        qty: 3,
        buyPriceBdt: 1100,
        sellPriceBdt: 1700,
        tags: ["Stocked"],
      },
      {
        productName: "Airbrush Flawless Setting Spray",
        brand: "Charlotte Tilbury",
        shade: null,
        qty: 2,
        buyPriceBdt: 3200,
        sellPriceBdt: 4500,
        tags: ["Stocked", "Order Arrived"],
      },
      {
        productName: "Matte Lip Color",
        brand: "MAC Cosmetics",
        shade: "Ruby Woo",
        qty: 3,
        buyPriceBdt: 2000,
        sellPriceBdt: 2900,
        tags: ["Stocked"],
      },
      {
        productName: "Vitamin C Brightening Serum",
        brand: "TruSkin",
        shade: null,
        qty: 7,
        buyPriceBdt: 1300,
        sellPriceBdt: 1900,
        tags: ["Stocked"],
      },
    ],
  })

  console.log("Seeding USA inventory...")
  await prisma.usaInventory.createMany({
    data: [
      {
        productName: "Pro Filt'r Soft Matte Longwear Foundation",
        brand: "Fenty Beauty",
        shade: "320 Teak",
        qty: 5,
        buyPriceUsd: 26.0,
        weightG: 90,
        tags: ["Stocked"],
      },
      {
        productName: "Soft Pinch Liquid Blush",
        brand: "Rare Beauty",
        shade: "Joy",
        qty: 4,
        buyPriceUsd: 22.0,
        weightG: 55,
        tags: ["Stocked"],
      },
      {
        productName: "Hydro Boost Water Gel",
        brand: "Neutrogena",
        shade: null,
        qty: 6,
        buyPriceUsd: 18.0,
        weightG: 120,
        tags: ["Stocked"],
      },
      {
        productName: "Original Lip Balm",
        brand: "Burt's Bees",
        shade: null,
        qty: 10,
        buyPriceUsd: 5.0,
        weightG: 30,
        tags: ["Stocked"],
      },
      {
        productName: "Setting Powder",
        brand: "Laura Mercier",
        shade: "Translucent",
        qty: 3,
        buyPriceUsd: 38.0,
        weightG: 110,
        tags: ["Order Arrived"],
      },
      {
        productName: "Fit Me Matte Foundation",
        brand: "Maybelline",
        shade: "220 Natural Beige",
        qty: 4,
        buyPriceUsd: 8.5,
        weightG: 85,
        tags: ["Stocked"],
      },
      {
        productName: "Niacinamide 10% + Zinc 1%",
        brand: "The Ordinary",
        shade: null,
        qty: 8,
        buyPriceUsd: 7.0,
        weightG: 60,
        tags: ["Stocked"],
      },
      {
        productName: "Superstar Full Coverage Foundation",
        brand: "L'Oreal Paris",
        shade: "W2 Light Ivory",
        qty: 3,
        buyPriceUsd: 12.0,
        weightG: 95,
        tags: ["Stocked"],
      },
    ],
  })

  console.log("Seeding shipments...")
  const batch1 = await prisma.shipment.create({
    data: {
      name: "January Batch 1",
      departureDate: new Date("2026-01-05"),
      arrivalDate: new Date("2026-01-18"),
      status: ShipmentStatus.ARRIVED,
      notes: "All items arrived in good condition.",
    },
  })

  const batch2 = await prisma.shipment.create({
    data: {
      name: "January Batch 2",
      departureDate: new Date("2026-01-20"),
      arrivalDate: new Date("2026-02-02"),
      status: ShipmentStatus.ARRIVED,
      notes: "",
    },
  })

  const batch3 = await prisma.shipment.create({
    data: {
      name: "February Batch 1",
      departureDate: new Date("2026-02-08"),
      arrivalDate: null,
      status: ShipmentStatus.IN_TRANSIT,
      notes: "Expected arrival Feb 20.",
    },
  })

  console.log("Seeding orders...")
  await prisma.order.createMany({
    data: [
      {
        buyerId: suma.id,
        productName: "Pro Filt'r Soft Matte Longwear Foundation",
        brand: "Fenty Beauty",
        shade: "210W",
        qty: 1,
        sellPriceBdt: 3200,
        buyPriceUsd: 26.0,
        depositBdt: 3200,
        source: Source.BD_STOCK,
        status: OrderStatus.DELIVERED,
        batchId: batch1.id,
        notes: "Delivered on time. Happy customer.",
      },
      {
        buyerId: rakib.id,
        productName: "Moisturizing Cream",
        brand: "CeraVe",
        shade: null,
        qty: 2,
        sellPriceBdt: 4000,
        buyPriceUsd: null,
        depositBdt: 2000,
        source: Source.BD_STOCK,
        status: OrderStatus.IN_BANGLADESH,
        batchId: batch2.id,
        notes: "",
      },
      {
        buyerId: nadia.id,
        productName: "Soft Pinch Liquid Blush",
        brand: "Rare Beauty",
        shade: "Hope",
        qty: 1,
        sellPriceBdt: 2600,
        buyPriceUsd: 22.0,
        depositBdt: 1000,
        source: Source.BD_STOCK,
        status: OrderStatus.IN_BANGLADESH,
        batchId: batch2.id,
        notes: "Wants fast delivery.",
      },
      {
        buyerId: priya.id,
        productName: "Butter Lip Balm",
        brand: "NYX Professional",
        shade: "Vanilla Cream",
        qty: 3,
        sellPriceBdt: 3600,
        buyPriceUsd: null,
        depositBdt: 3600,
        source: Source.BD_STOCK,
        status: OrderStatus.DELIVERED,
        batchId: batch1.id,
        notes: "",
      },
      {
        buyerId: tanvir.id,
        productName: "Lip Liner",
        brand: "Charlotte Tilbury",
        shade: "Pillow Talk",
        qty: 1,
        sellPriceBdt: 3800,
        buyPriceUsd: 32.0,
        depositBdt: 2000,
        source: Source.USA_STOCK,
        status: OrderStatus.IN_TRANSIT,
        batchId: batch3.id,
        notes: "Gift for wife.",
      },
      {
        buyerId: mitu.id,
        productName: "Fit Me Matte Foundation",
        brand: "Maybelline",
        shade: "120 Classic Ivory",
        qty: 1,
        sellPriceBdt: 1400,
        buyPriceUsd: 9.0,
        depositBdt: 700,
        source: Source.USA_STOCK,
        status: OrderStatus.IN_TRANSIT,
        batchId: batch3.id,
        notes: "",
      },
      {
        buyerId: liza.id,
        productName: "Retinol Serum",
        brand: "The Ordinary",
        shade: null,
        qty: 2,
        sellPriceBdt: 3400,
        buyPriceUsd: null,
        depositBdt: 1700,
        source: Source.BD_STOCK,
        status: OrderStatus.IN_BANGLADESH,
        batchId: batch2.id,
        notes: "",
      },
      {
        buyerId: karim.id,
        productName: "Niacinamide 10% + Zinc 1%",
        brand: "The Ordinary",
        shade: null,
        qty: 1,
        sellPriceBdt: 1100,
        buyPriceUsd: 7.0,
        depositBdt: 0,
        source: Source.PRE_ORDER,
        status: OrderStatus.TO_BE_PURCHASED,
        batchId: null,
        notes: "First time ordering skincare.",
      },
      {
        buyerId: sinthia.id,
        productName: "Setting Powder",
        brand: "Laura Mercier",
        shade: "Translucent",
        qty: 1,
        sellPriceBdt: 5500,
        buyPriceUsd: null,
        depositBdt: 2000,
        source: Source.PRE_ORDER,
        status: OrderStatus.TO_BE_PURCHASED,
        batchId: null,
        notes: "Referred by Suma. Handle with care.",
      },
      {
        buyerId: farhan.id,
        productName: "Hydro Boost Water Gel",
        brand: "Neutrogena",
        shade: null,
        qty: 2,
        sellPriceBdt: 4400,
        buyPriceUsd: 18.0,
        depositBdt: 4400,
        source: Source.USA_STOCK,
        status: OrderStatus.DELIVERED,
        batchId: batch1.id,
        notes: "Delivered to Chittagong.",
      },
      {
        buyerId: arif.id,
        productName: "MAC Matte Lip Color",
        brand: "MAC Cosmetics",
        shade: "Ruby Woo",
        qty: 3,
        sellPriceBdt: 8700,
        buyPriceUsd: null,
        depositBdt: 4000,
        source: Source.BD_STOCK,
        status: OrderStatus.IN_BANGLADESH,
        batchId: batch2.id,
        notes: "Bulk order.",
      },
      {
        buyerId: suma.id,
        productName: "Vitamin C Brightening Serum",
        brand: "TruSkin",
        shade: null,
        qty: 1,
        sellPriceBdt: 1900,
        buyPriceUsd: null,
        depositBdt: 1900,
        source: Source.BD_STOCK,
        status: OrderStatus.DELIVERED,
        batchId: batch1.id,
        notes: "Second order from Suma.",
      },
      {
        buyerId: rakib.id,
        productName: "Pro Filt'r Soft Matte Longwear Foundation",
        brand: "Fenty Beauty",
        shade: "320 Teak",
        qty: 1,
        sellPriceBdt: 3500,
        buyPriceUsd: 26.0,
        depositBdt: 1500,
        source: Source.USA_STOCK,
        status: OrderStatus.PURCHASED,
        batchId: null,
        notes: "",
      },
      {
        buyerId: nadia.id,
        productName: "Airbrush Flawless Setting Spray",
        brand: "Charlotte Tilbury",
        shade: null,
        qty: 1,
        sellPriceBdt: 4500,
        buyPriceUsd: null,
        depositBdt: 2000,
        source: Source.PRE_ORDER,
        status: OrderStatus.TO_BE_PURCHASED,
        batchId: null,
        notes: "Seen it on Instagram.",
      },
      {
        buyerId: priya.id,
        productName: "Soft Pinch Liquid Blush",
        brand: "Rare Beauty",
        shade: "Joy",
        qty: 1,
        sellPriceBdt: 2800,
        buyPriceUsd: 22.0,
        depositBdt: 2800,
        source: Source.USA_STOCK,
        status: OrderStatus.IN_TRANSIT,
        batchId: batch3.id,
        notes: "",
      },
      {
        buyerId: mitu.id,
        productName: "Original Lip Balm",
        brand: "Burt's Bees",
        shade: null,
        qty: 4,
        sellPriceBdt: 2000,
        buyPriceUsd: 5.0,
        depositBdt: 1000,
        source: Source.USA_STOCK,
        status: OrderStatus.PURCHASED,
        batchId: null,
        notes: "",
      },
      {
        buyerId: liza.id,
        productName: "Superstar Full Coverage Foundation",
        brand: "L'Oreal Paris",
        shade: "W2 Light Ivory",
        qty: 1,
        sellPriceBdt: 1800,
        buyPriceUsd: 12.0,
        depositBdt: 900,
        source: Source.PRE_ORDER,
        status: OrderStatus.TO_BE_PURCHASED,
        batchId: null,
        notes: "",
      },
      {
        buyerId: tanvir.id,
        productName: "Hydro Boost Water Gel",
        brand: "Neutrogena",
        shade: null,
        qty: 1,
        sellPriceBdt: 2200,
        buyPriceUsd: 18.0,
        depositBdt: 2200,
        source: Source.USA_STOCK,
        status: OrderStatus.RETURNED,
        batchId: batch1.id,
        notes: "Wrong shade ordered. Returned by customer.",
      },
      {
        buyerId: karim.id,
        productName: "Fit Me Matte Foundation",
        brand: "Maybelline",
        shade: "220 Natural Beige",
        qty: 2,
        sellPriceBdt: 2800,
        buyPriceUsd: 8.5,
        depositBdt: 1400,
        source: Source.USA_STOCK,
        status: OrderStatus.PURCHASED,
        batchId: null,
        notes: "",
      },
      {
        buyerId: sinthia.id,
        productName: "Vitamin C Brightening Serum",
        brand: "TruSkin",
        shade: null,
        qty: 1,
        sellPriceBdt: 1900,
        buyPriceUsd: null,
        depositBdt: 500,
        source: Source.PRE_ORDER,
        status: OrderStatus.TO_BE_PURCHASED,
        batchId: null,
        notes: "New customer - needs follow up.",
      },
    ],
  })

  console.log("✅ Seed complete!")
}

main()
  .catch((error) => {
    console.error("Seed failed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
