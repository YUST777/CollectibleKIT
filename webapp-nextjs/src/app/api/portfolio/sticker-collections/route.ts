import { NextResponse } from 'next/server';

const STICKER_COLLECTIONS: Record<string, Record<string, string>> = {
  "azuki": { "raizan": "1_png", "shao": "9_png" },
  "babydoge": { "mememania": "13_png" },
  "baby_shark": { "doo_doo_moods": "2_png" },
  "blum": { "bunny": "18_png", "cap": "3_png", "cat": "7_png", "cook": "7_png", "curly": "20_png", "general": "4_png", "no": "2_png", "worker": "15_png" },
  "bored_ape_yacht_club": { "bored_ape_originals": "1_png" },
  "bored_stickers": { "2092": "1_png", "3151": "5_png", "3278": "5_png", "4017": "5_png", "5824": "5_png", "6527": "5_png", "9287": "5_png", "9765": "5_png", "9780": "5_png", "cny_2092": "8_png" },
  "cattea_life": { "cattea_chaos": "7_png" },
  "chimpers": { "genesis_energy": "1_png" },
  "city_holder": { "holder_s_guide": "1_png" },
  "claynosaurz": { "red_rex_pack": "1_png" },
  "cyberkongz": { "wilson": "1_png" },
  "dogs_og": { "alien": "1_png", "alumni": "1_png", "anime_ears": "1_png", "asterix": "1_png", "baseball_bat": "1_png", "baseball_cap": "1_png", "blue_eyes_hat": "1_png", "bodyguard": "1_png", "bow_tie": "1_png", "cherry_glasses": "1_png", "cook": "1_png", "cyclist": "1_png", "diver": "1_png", "dogtor": "1_png", "dog_tyson": "1_png", "duck": "1_png", "emo_boy": "1_png", "extra_eyes": "1_png", "frog_glasses": "1_png", "frog_hat": "1_png", "gentleman": "1_png", "gnome": "1_png", "google_intern_hat": "1_png", "green_hair": "1_png", "hello_kitty": "1_png", "hypnotist": "1_png", "ice_cream": "1_png", "jester": "1_png", "kamikaze": "1_png", "kfc": "1_png", "king": "1_png", "knitted_hat": "1_png", "nerd": "1_png", "newsboy_cap": "1_png", "noodles": "1_png", "nose_glasses": "1_png", "not_cap": "1_png", "not_coin": "1_png", "one_piece_sanji": "1_png", "one_piece_zoro": "1_png", "orange_hat": "1_png", "panama_hat": "1_png", "pilot": "1_png", "pink_bob": "1_png", "princess": "1_png", "robber": "1_png", "santa_dogs": "1_png", "scarf": "1_png", "scary_eyes": "1_png", "shaggy": "1_png", "sharky_dog": "1_png", "sheikh": "1_png", "sherlock_holmes": "1_png", "smile": "1_png", "sock_head": "1_png", "strawberry_hat": "1_png", "tank_driver": "1_png", "tattoo_artist": "1_png", "teletubby": "1_png", "termidogtor": "1_png", "tin_foil_hat": "1_png", "toast_bread": "1_png", "toddler": "1_png", "tubeteyka": "1_png", "unicorn": "1_png", "ushanka": "1_png", "van_dogh": "1_png", "viking": "1_png", "witch": "1_png" },
  "dogs_rewards": { "full_dig": "1_png", "gold_bone": "1_png", "silver_bone": "1_png" },
  "dogs_unleashed": { "bones": "1_png" },
  "doodles": { "doodles_dark_mode": "7_png", "og_icons": "1_png" },
  "flappy_bird": { "blue_wings": "15_png", "blush_flight": "15_png", "frost_flap": "6_png", "light_glide": "15_png", "ruby_wings": "6_png" },
  "imaginary_ones": { "panda_warrior": "1_png" },
  "kudai": { "gmi": "7_png", "ngmi": "4_png" },
  "lazy_rich": { "chill_or_thrill": "1_png", "sloth_capital": "1_png" },
  "lil_pudgys": { "lil_pudgys_x_baby_shark": "1_png" },
  "lost_dogs": { "lost_memeries": "4_png", "magic_of_the_way": "1_png" },
  "moonbirds": { "moonbirds_originals": "1_png" },
  "mr_freeman": { "eat_shit_laugh": "1_png" },
  "no_signal": { "error_1": "1_png" },
  "notcoin": { "flags": "2_png", "not_memes": "picsart_25_06_20_05_55_41_906_png" },
  "not_pixel": { "cute_pack": "11_png", "diamond_pixel": "15_png", "dogs_pixel": "15_png", "error_pixel": "15_png", "films_memes": "1_png", "grass_pixel": "15_png", "macpixel": "15_png", "pixanos": "15_png", "pixel_phrases": "1_png", "pixioznik": "15_png", "random_memes": "9_png", "retro_pixel": "15_png", "smileface_pack": "4_png", "superpixel": "15_png", "tournament_s1": "1750388827892_png", "vice_pixel": "15_png", "zompixel": "15_png" },
  "ponke": { "ponke_day_ones": "1_png" },
  "project_soap": { "tyler_gold_edition": "1_png", "tyler_mode_on": "1_png" },
  "pucca": { "pucca_moods": "6_png" },
  "pudgy_friends": { "pengu_x_baby_shark": "1_png", "pengu_x_nascar": "1_png" },
  "pudgy_penguins": { "blue_pengu": "3_png", "classic_pengu": "1_png", "cool_blue_pengu": "3_png", "ice_pengu": "1_png", "midas_pengu": "1_png", "pengu_cny": "10_png", "pengu_valentines": "3_png" },
  "ric_flair": { "ric_flair": "2_png" },
  "sappy": { "sappy_originals": "1_png" },
  "smeshariki": { "chamomile_valley": "13_png", "the_memes": "6_png" },
  "sticker_pack": { "freedom": "1_png" },
  "sundog": { "to_the_sun": "4_png" },
  "void": { "void_dudes": "1_png" },
  "wagmi_hub": { "egg_hammer": "1_png", "wagmi_ai_agent": "3_png" }
};

export async function GET() {
  try {
    // Get all collection names and convert to Title Case with random photo
    const collections = Object.entries(STICKER_COLLECTIONS)
      .map(([key, packs]) => {
        const words = key.split('_');
        const displayName = words.map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        // Get a random pack from this collection
        const packEntries = Object.entries(packs);
        const randomPack = packEntries[Math.floor(Math.random() * packEntries.length)];
        const randomPackName = randomPack[0];
        const randomFilename = randomPack[1];
        
        return {
          name: displayName,
          samplePack: randomPackName,
          sampleFilename: randomFilename
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ 
      success: true, 
      collections 
    });

  } catch (error) {
    console.error('Error fetching sticker collections:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch sticker collections' 
    }, { status: 500 });
  }
}

