// Buy prices for unupgradeable gifts from Telegram's first-hand market
// 1 star = $0.016
// Prices from Telegram's official first-hand market (not second-hand like MRKT/Quant)
export const UNUPGRADEABLE_GIFT_BUY_PRICES: Record<string, number> = {
  // Gift ID -> Buy price in stars (mapped by gift name from clean_unique_gifts.json)
  '5807641025165919973': 100,  // 1 May
  '5886756255493523118': 500,  // Backpack
  '5832325860073407546': 150,  // Bird Mark
  '5886387158889005864': 1000, // Book
  '5884080014126745057': 5000, // Case
  '5832371318007268701': 150,  // Coconut Drink
  '5776227780391864916': 5000, // Coffin
  '5898012527257715797': 75,   // Cone IceCream
  '5897607679345427347': 150,  // Cream IceCream
  '5834651202612102354': 30000, // Durov Glasses
  '6003477390536213997': 41000, // Durov's Statuette
  '5999116401002939514': 5000, // Eagle
  '5773791997064119815': 75,   // Easter Cake
  '5933770397739647689': 200,  // Eight Roses
  '5830340739074097859': 300,  // Golden Medal
  '5775955135867913556': 15000, // Grave
  '5872744075014177223': 500,  // Heart Pendant
  '5913351908466098791': 100,  // Lamp Candle
  '5775966332847654507': 500,  // Mask
  '5882129648002794519': 2500, // Pencil
  '5832644211639321671': 300,  // Pink Flamingo
  '5832279504491381684': 5000, // REDO
  '5830323722413671504': 100,  // Red Star
  '5834918435477259676': 500,  // Sand Castle
  '6001229799790478558': 10000, // Sneakers
  '5999298447486747746': 250,  // Statue
  '5832497899283415733': 2500, // Surfboard
  '6001425315291727333': 10000, // T-shirt
  '5999277561060787166': 150,  // Torch
};

// Helper function to get buy price in stars for a gift ID
export function getBuyPriceInStars(giftId: string): number | null {
  return UNUPGRADEABLE_GIFT_BUY_PRICES[giftId] || null;
}

// Convert stars to USD (1 star = $0.016)
export function starsToUsd(stars: number): number {
  return stars * 0.016;
}

// Convert USD to stars
export function usdToStars(usd: number): number {
  return usd / 0.016;
}
