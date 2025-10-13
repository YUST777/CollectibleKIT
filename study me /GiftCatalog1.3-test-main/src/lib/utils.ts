import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Maps database collection names to CDN collection names
 * Database uses "astralshard" (no space), CDN uses "Astral Shard" (with space)
 */
const collectionNameMap: Record<string, string> = {
  // Add mappings for known collections
  "astralshard": "Astral Shard",
  "bdaycandle": "B-day Candle",
  "berrybox": "Berry Box",
  "bunnymuffin": "Bunny Muffin",
  "crystalball": "Crystal Ball",
  "diamondring": "Diamond Ring",
  "durovscap": "Durov's Cap",
  "eternalcandle": "Eternal Candle",
  "eternalrose": "Eternal Rose",
  "evileye": "Evil Eye",
  "flyingbroom": "Flying Broom", 
  "genielamp": "Genie Lamp",
  "gingercookie": "Ginger Cookie",
  "hangingstar": "Hanging Star",
  "hexpot": "Hex Pot",
  "hypnolollipop": "Hypno Lollipop",
  "iongem": "Ion Gem",
  "jellybunny": "Jelly Bunny",
  "jinglebell": "Jingle Bells",
  "kissedfrog": "Kissed Frog",
  "lootbag": "Loot Bag",
  "lovecandle": "Love Candle",
  "lovepotion": "Love Potion",
  "madpumpkin": "Mad Pumpkin",
  "magicpotion": "Magic Potion",
  "minioscar": "Mini Oscar",
  "perfumebottle": "Perfume Bottle",
  "plushpepe": "Plush Pepe",
  "preciouspeach": "Precious Peach",
  "santahat": "Santa Hat",
  "scaredcat": "Scared Cat",
  "sharptongue": "Sharp Tongue",
  "signetring": "Signet Ring",
  "skullflower": "Skull Flower",
  "snowmitten": "Snow Mitten",
  "spicedwine": "Spiced Wine",
  "spyagaric": "Spy Agaric",
  "starnotepad": "Star Notepad",
  "swisswatch": "Swiss Watch",
  "toybear": "Toy Bear",
  "trappedheart": "Trapped Heart",
  "vintagecigar": "Vintage Cigar",
  "voodoodoll": "Voodoo Doll",
  "witchhat": "Witch Hat"
};

/**
 * Formats a collection name for CDN URL usage
 * Capitalizes first letter of each word
 */
export function formatCollectionNameForCdn(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Formats a collection name for Fragment URL usage
 * Removes spaces and makes lowercase
 */
export function formatCollectionNameForFragment(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Extracts the item number from a gift name that includes "#"
 */
export function extractItemNumber(name: string, fallbackId?: number): string {
  const parts = name.split('#');
  if (parts.length > 1) {
    return parts[1].trim();
  }
  return fallbackId?.toString() || '1';
}

/**
 * Extracts the base name from a gift name (removes ID portion)
 */
export function getBaseName(name: string): string {
  return name.split('#')[0].trim();
}

/**
 * Gets the model name from item attributes
 * Looks for Type, Model, or Color attributes
 */
export function getModelNameFromAttributes(attributes: any[]): string {
  if (!Array.isArray(attributes)) return "Default";
  
  const modelAttr = attributes.find(attr => 
    attr.trait_type === "Type" || 
    attr.trait_type === "Model" || 
    attr.trait_type === "Color"
  );
  
  return modelAttr?.value || "Default";
}

/**
 * Maps a collection name from the database format to the CDN format
 */
export function mapCollectionNameToCdn(name: string): string {
  // Convert to lowercase and remove spaces for matching
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '');
  
  // Look for exact match in our mapping
  if (normalizedName in collectionNameMap) {
    return collectionNameMap[normalizedName];
  }
  
  // If no exact match, try to find a partial match
  for (const [dbName, cdnName] of Object.entries(collectionNameMap)) {
    if (normalizedName.includes(dbName) || dbName.includes(normalizedName)) {
      return cdnName;
    }
  }
  
  // Default: format the name with proper spaces and capitalization
  return formatCollectionNameForCdn(name);
}

/**
 * Constructs a CDN image URL for a gift
 */
export function getCdnImageUrl(collectionName: string, modelName: string): string {
  // Map collection name to CDN format
  const mappedCollection = mapCollectionNameToCdn(collectionName);
  
  // Must use absolute URL with https:// to ensure it loads from CDN and not locally
  return `https://cdn.changes.tg/gifts/models/${encodeURIComponent(mappedCollection)}/png/${encodeURIComponent(modelName)}.png`;
}

/**
 * Constructs a Fragment image URL for a gift (with specified extension)
 */
export function getFragmentImageUrl(collectionName: string, itemNumber: string, extension: 'webp' | 'jpg' | 'png' = 'webp'): string {
  const formatted = formatCollectionNameForFragment(collectionName);
  return `https://nft.fragment.com/gift/${formatted}-${itemNumber}.${extension}`;
}

/**
 * Constructs a Fragment Lottie URL for a gift
 */
export function getFragmentLottieUrl(collectionName: string, itemNumber: string): string {
  const formatted = formatCollectionNameForFragment(collectionName);
  return `https://nft.fragment.com/gift/${formatted}-${itemNumber}.lottie.json`;
}

/**
 * Constructs the Telegram link for a gift
 */
export function getTelegramGiftLink(collectionName: string, itemNumber: string): string {
  const formatted = formatCollectionNameForFragment(collectionName);
  return `https://t.me/nft/${formatted}-${itemNumber}`;
}
