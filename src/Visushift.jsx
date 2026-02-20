import { useState, useEffect, useRef, useCallback } from "react";

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || "";
const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY || "";

const I18N = {
  en: {
    searchPlaceholder: "Search for inspiration...",
    searchButton: "Search",
    heroTitle: "What inspires you?",
    heroSubtitle: "Search for anything and watch the entire interface transform to match your inspiration.",
    recentSearches: "Recent searches",
    imagesFound: (count) => `${count} images found`,
    discovering: "Discovering images...",
    imageNotAvailable: "Image not available",
    save: "Save",
    saved: "Saved",
  },
  ja: {
    searchPlaceholder: "インスピレーションを検索...",
    searchButton: "検索",
    heroTitle: "何にインスパイアされますか？",
    heroSubtitle: "何でも検索してみてください。インターフェース全体がテーマに合わせて変化します。",
    recentSearches: "最近の検索",
    imagesFound: (count) => `${count}枚の画像が見つかりました`,
    discovering: "画像を探しています...",
    imageNotAvailable: "画像を読み込めません",
    save: "保存",
    saved: "保存済み",
  },
};

// --- Japanese detection ---
function containsJapanese(text) {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}

// --- Japanese to English dictionary ---
const JA_EN_DICT = {
  "自然": "nature", "宇宙": "space", "海": "ocean", "料理": "food",
  "建築": "architecture", "アート": "art", "山": "mountains", "花": "flowers",
  "都市": "cities", "動物": "animals",
  "森": "forest", "森林": "forest", "花畑": "flower field", "桜": "cherry blossom",
  "紅葉": "autumn leaves", "雪": "snow", "夕日": "sunset", "朝日": "sunrise",
  "星": "stars", "月": "moon", "空": "sky", "雲": "clouds",
  "川": "river", "湖": "lake", "滝": "waterfall", "ビーチ": "beach",
  "サーフィン": "surfing", "ダイビング": "diving",
  "猫": "cat", "犬": "dog", "鳥": "bird", "魚": "fish",
  "馬": "horse", "蝶": "butterfly", "パンダ": "panda",
  "寿司": "sushi", "ラーメン": "ramen", "ケーキ": "cake",
  "パン": "bread", "コーヒー": "coffee", "ワイン": "wine",
  "カフェ": "cafe", "レストラン": "restaurant",
  "東京": "Tokyo", "京都": "Kyoto", "大阪": "Osaka", "富士山": "Mount Fuji",
  "神社": "shrine", "寺": "temple", "城": "castle",
  "車": "car", "電車": "train", "飛行機": "airplane",
  "音楽": "music", "ギター": "guitar", "ピアノ": "piano",
  "ダンス": "dance", "映画": "movie", "本": "books",
  "スポーツ": "sports", "サッカー": "soccer", "野球": "baseball",
  "旅行": "travel", "キャンプ": "camping", "登山": "hiking",
  "クリスマス": "Christmas", "ハロウィン": "Halloween", "祭り": "festival",
  "赤ちゃん": "baby", "家族": "family", "結婚式": "wedding",
  "オフィス": "office", "仕事": "work", "勉強": "study",
  "プログラミング": "programming", "テクノロジー": "technology",
  "ロボット": "robot", "人工知能": "artificial intelligence",
  "ファッション": "fashion", "ヘアスタイル": "hairstyle",
  "インテリア": "interior", "庭": "garden", "植物": "plants",
  "水彩画": "watercolor", "油絵": "oil painting", "写真": "photography",
  "夜景": "night view", "イルミネーション": "illumination",
  "雨": "rain", "虹": "rainbow", "霧": "fog", "嵐": "storm",
};

// --- Translate Japanese to English (dict → partial match → MyMemory API → fallback) ---
async function translateToEnglish(jaText) {
  // 1. Exact dictionary match
  const dictResult = JA_EN_DICT[jaText];
  if (dictResult) return dictResult;

  // 2. Partial match (longest key first for better compound word handling)
  const sortedKeys = Object.keys(JA_EN_DICT).sort((a, b) => b.length - a.length);
  for (const ja of sortedKeys) {
    if (jaText.includes(ja)) {
      return JA_EN_DICT[ja];
    }
  }

  // 2.5. EN_JA_TITLE_DICT reverse lookup (partial match)
  for (const [en, ja] of Object.entries(EN_JA_TITLE_DICT)) {
    if (jaText.includes(ja) && ja.length > 1) {
      return en;
    }
  }

  // 3. MyMemory Translation API (free, no API key required)
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(jaText)}&langpair=ja|en`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch {
    // API failure: fall through to original text
  }

  // 4. Return original text as-is
  return jaText;
}

// --- Reverse dictionary (EN → JA) auto-generated from JA_EN_DICT ---
const EN_JA_DICT = {};
for (const [ja, en] of Object.entries(JA_EN_DICT)) {
  EN_JA_DICT[en.toLowerCase()] = ja;
}

// --- Large EN→JA dictionary for photo title translation (300+ words) ---
const EN_JA_TITLE_DICT = {
  // --- 自然・風景 ---
  "sunset": "夕日", "sunrise": "朝日", "dawn": "夜明け", "dusk": "黄昏",
  "twilight": "薄明", "golden hour": "ゴールデンアワー",
  "landscape": "風景", "scenery": "景色", "horizon": "地平線",
  "mountain": "山", "mountains": "山々", "hill": "丘", "hills": "丘陵",
  "valley": "谷", "canyon": "峡谷", "cliff": "崖", "peak": "山頂",
  "volcano": "火山", "ridge": "尾根",
  "forest": "森", "woods": "森林", "jungle": "ジャングル", "grove": "木立",
  "tree": "木", "trees": "木々", "branch": "枝", "leaf": "葉",
  "leaves": "葉", "autumn leaves": "紅葉", "foliage": "紅葉",
  "meadow": "草原", "field": "野原", "prairie": "草原", "grassland": "草地",
  "desert": "砂漠", "dune": "砂丘", "oasis": "オアシス",
  "ocean": "海", "sea": "海", "wave": "波", "waves": "波",
  "beach": "ビーチ", "shore": "海岸", "coast": "海岸", "coastal": "沿岸の",
  "island": "島", "bay": "湾", "lagoon": "ラグーン", "reef": "礁",
  "coral": "珊瑚", "tide": "潮", "surf": "波乗り",
  "river": "川", "stream": "小川", "creek": "小川", "waterfall": "滝",
  "lake": "湖", "pond": "池", "marsh": "湿地", "swamp": "沼",
  "rain": "雨", "rainbow": "虹", "storm": "嵐", "thunder": "雷",
  "lightning": "稲妻", "fog": "霧", "mist": "霧", "haze": "霞",
  "cloud": "雲", "clouds": "雲", "sky": "空", "blue sky": "青空",
  "snow": "雪", "ice": "氷", "frost": "霜", "glacier": "氷河",
  "winter": "冬", "spring": "春", "summer": "夏", "autumn": "秋", "fall": "秋",

  // --- 花・植物 ---
  "flower": "花", "flowers": "花々", "bloom": "花", "blossom": "花",
  "cherry blossom": "桜", "sakura": "桜", "rose": "薔薇", "roses": "薔薇",
  "tulip": "チューリップ", "sunflower": "ひまわり", "lavender": "ラベンダー",
  "daisy": "デイジー", "lily": "百合", "lotus": "蓮", "orchid": "蘭",
  "garden": "庭園", "botanical": "植物園の", "petal": "花びら",
  "bouquet": "花束", "wildflower": "野花", "vine": "蔦",
  "plant": "植物", "plants": "植物", "green": "緑", "moss": "苔",

  // --- 動物 ---
  "animal": "動物", "animals": "動物たち", "wildlife": "野生動物",
  "cat": "猫", "kitten": "子猫", "dog": "犬", "puppy": "子犬",
  "bird": "鳥", "birds": "鳥たち", "eagle": "鷲", "owl": "フクロウ",
  "swan": "白鳥", "heron": "鷺", "flamingo": "フラミンゴ",
  "fish": "魚", "dolphin": "イルカ", "whale": "クジラ", "shark": "鮫",
  "horse": "馬", "deer": "鹿", "fox": "狐", "wolf": "狼",
  "bear": "熊", "rabbit": "兎", "squirrel": "リス",
  "butterfly": "蝶", "dragonfly": "トンボ", "bee": "蜂",
  "lion": "ライオン", "tiger": "虎", "elephant": "象",
  "panda": "パンダ", "monkey": "猿", "penguin": "ペンギン",

  // --- 建築・都市 ---
  "building": "建物", "architecture": "建築", "structure": "構造物",
  "tower": "塔", "bridge": "橋", "castle": "城", "palace": "宮殿",
  "church": "教会", "cathedral": "大聖堂", "mosque": "モスク",
  "temple": "寺院", "shrine": "神社", "pagoda": "塔",
  "house": "家", "home": "家", "cottage": "コテージ", "cabin": "小屋",
  "city": "都市", "town": "町", "village": "村", "urban": "都会の",
  "street": "通り", "road": "道", "path": "小道", "alley": "路地",
  "skyscraper": "高層ビル", "skyline": "スカイライン",
  "window": "窓", "door": "扉", "gate": "門", "stairs": "階段",
  "roof": "屋根", "wall": "壁", "fence": "柵",
  "ruin": "廃墟", "ruins": "遺跡", "ancient": "古代の", "historic": "歴史的な",
  "modern": "モダンな", "traditional": "伝統的な",

  // --- 食べ物・飲み物 ---
  "food": "料理", "meal": "食事", "dish": "料理", "cuisine": "料理",
  "breakfast": "朝食", "lunch": "昼食", "dinner": "夕食",
  "fruit": "果物", "apple": "りんご", "orange": "オレンジ", "berry": "ベリー",
  "vegetable": "野菜", "salad": "サラダ", "soup": "スープ",
  "bread": "パン", "cake": "ケーキ", "pastry": "ペストリー",
  "chocolate": "チョコレート", "dessert": "デザート", "sweet": "甘い",
  "coffee": "コーヒー", "tea": "お茶", "wine": "ワイン", "beer": "ビール",
  "sushi": "寿司", "ramen": "ラーメン", "rice": "米",
  "cheese": "チーズ", "pizza": "ピザ", "pasta": "パスタ",
  "fresh": "新鮮な", "organic": "オーガニック", "delicious": "美味しい",
  "restaurant": "レストラン", "cafe": "カフェ", "kitchen": "キッチン",
  "cooking": "料理", "baking": "焼き菓子",

  // --- 人・生活 ---
  "people": "人々", "person": "人", "woman": "女性", "man": "男性",
  "child": "子供", "children": "子供たち", "baby": "赤ちゃん",
  "family": "家族", "couple": "カップル", "friend": "友人",
  "portrait": "肖像", "face": "顔", "smile": "笑顔", "eyes": "瞳",
  "hand": "手", "hands": "手",
  "wedding": "結婚式", "celebration": "祝祭", "party": "パーティー",
  "dance": "ダンス", "dancing": "踊り", "music": "音楽",

  // --- 色・質感 ---
  "red": "赤", "blue": "青", "green": "緑", "yellow": "黄色",
  "purple": "紫", "pink": "ピンク", "white": "白",
  "black": "黒", "golden": "金色の", "silver": "銀色の",
  "colorful": "色とりどりの", "pastel": "パステル",
  "bright": "明るい", "dark": "暗い", "light": "光",
  "shadow": "影", "shadows": "影",
  "texture": "質感", "pattern": "模様", "abstract": "抽象",
  "reflection": "反射", "mirror": "鏡", "glass": "ガラス",
  "bokeh": "ぼけ", "blur": "ぼかし", "silhouette": "シルエット",

  // --- 時間・雰囲気 ---
  "morning": "朝", "afternoon": "午後", "evening": "夕方", "night": "夜",
  "midnight": "真夜中", "daylight": "日光",
  "peaceful": "穏やかな", "calm": "静かな", "serene": "静穏な",
  "dramatic": "劇的な", "moody": "ムーディーな", "dreamy": "夢のような",
  "romantic": "ロマンチックな", "mysterious": "神秘的な",
  "beautiful": "美しい", "stunning": "見事な", "gorgeous": "華麗な",
  "elegant": "優雅な", "majestic": "壮大な", "magnificent": "壮麗な",
  "lonely": "孤独な", "solitary": "一人の", "quiet": "静かな",
  "wild": "野性の", "free": "自由な", "adventure": "冒険",
  "journey": "旅路", "travel": "旅", "explore": "探検",
  "vintage": "ヴィンテージ", "retro": "レトロ", "rustic": "素朴な",
  "minimal": "ミニマル", "simple": "シンプルな",
  "luxury": "贅沢な", "classic": "クラシック",

  // --- その他 ---
  "art": "アート", "painting": "絵画", "photo": "写真",
  "photography": "写真", "camera": "カメラ", "lens": "レンズ",
  "long exposure": "長時間露光", "aerial": "空撮", "drone": "ドローン",
  "macro": "マクロ", "close up": "クローズアップ",
  "panorama": "パノラマ", "wide angle": "広角",
  "boat": "船", "ship": "船", "sailboat": "帆船",
  "car": "車", "train": "電車", "bicycle": "自転車",
  "airplane": "飛行機", "airport": "空港",
  "fireworks": "花火", "lantern": "灯篭", "candle": "蝋燭",
  "lamp": "灯り", "neon": "ネオン",
  "book": "本", "library": "図書館",
  "sport": "スポーツ", "yoga": "ヨガ", "fitness": "フィットネス",
  "christmas": "クリスマス", "halloween": "ハロウィン", "festival": "祭り",
  "market": "市場", "shop": "店",
  "workspace": "ワークスペース", "office": "オフィス", "desk": "机",
  "technology": "テクノロジー", "computer": "コンピュータ",
  "space": "宇宙", "galaxy": "銀河", "star": "星", "stars": "星々",
  "moon": "月", "planet": "惑星", "cosmos": "宇宙", "nebula": "星雲",
  "underwater": "水中", "diving": "ダイビング",
};

// --- Translate a single English phrase to Japanese ---
async function translateSinglePhrase(phrase) {
  if (!phrase) return "";
  if (containsJapanese(phrase)) return phrase;

  const lower = phrase.toLowerCase().trim();

  // 1. Large dictionary exact match
  if (EN_JA_TITLE_DICT[lower]) return EN_JA_TITLE_DICT[lower];

  // 2. Large dictionary partial match (longest key first)
  //    e.g. "cherry blossom" in "beautiful cherry blossom" → "美しい桜"
  const sortedKeys = Object.keys(EN_JA_TITLE_DICT).sort((a, b) => b.length - a.length);
  let translated = lower;
  let matched = false;
  for (const en of sortedKeys) {
    if (translated.includes(en)) {
      translated = translated.replace(en, EN_JA_TITLE_DICT[en]);
      matched = true;
    }
  }
  // If fully translated (no remaining English words of 2+ chars)
  if (matched && !/[a-zA-Z]{2,}/.test(translated)) {
    return translated.trim().replace(/\s+/g, "");
  }

  // 3. EN_JA_DICT reverse lookup (from JA_EN_DICT)
  if (EN_JA_DICT[lower]) {
    return EN_JA_DICT[lower];
  }

  // 4. MyMemory API with context for better accuracy
  //    Send "a photo of [phrase]" and strip the prefix from result
  try {
    const contextual = `a photo of ${phrase}`;
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(contextual)}&langpair=en|ja`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.responseData && data.responseData.translatedText) {
        let result = data.responseData.translatedText;
        // Strip context prefix patterns
        result = result
          .replace(/^の写真\s*/i, "")
          .replace(/^写真の?\s*/i, "")
          .replace(/^.*の写真[:：]?\s*/i, "")
          .replace(/^a photo of\s*/i, "")
          .trim();
        if (result && result !== phrase && result !== contextual) {
          return result;
        }
      }
    }
  } catch {
    // API failure
  }

  // 5. Return partial dictionary match if any (even with mixed English)
  if (matched) {
    return translated.trim();
  }

  // 6. Fallback: return capitalized English
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

// --- Translate English to Japanese (handles "·" separated titles) ---
async function translateToJapanese(enText) {
  if (!enText || containsJapanese(enText)) return enText;

  // Split "·" separated formatted titles and translate each part
  if (enText.includes("·")) {
    const parts = enText.split("·").map((p) => p.trim()).filter(Boolean);
    const translatedParts = await Promise.all(
      parts.map((part) => translateSinglePhrase(part))
    );
    return translatedParts.join(" · ");
  }

  // Single phrase
  return translateSinglePhrase(enText);
}

// --- Capitalize first letter ---
function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Format image tags into a natural title ---
function formatImageTitle(rawTitle, query) {
  if (!rawTitle) return query || "";

  // 1) If no commas → Unsplash description or single word → return as-is with capitalization
  const commaCount = (rawTitle.match(/,/g) || []).length;
  if (commaCount === 0) {
    return capitalizeFirst(rawTitle.trim());
  }

  // 2) Pixabay etc: "sunset, beach, ocean, waves, sky" tag list
  const tags = rawTitle.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length === 0) return query || "";
  if (tags.length === 1) return capitalizeFirst(tags[0]);

  const queryLower = (query || "").toLowerCase();
  const isJapanese = containsJapanese(rawTitle);

  // 3) Deduplicate & remove tags matching the search query
  const filtered = tags.filter((tag, i, arr) => {
    if (arr.indexOf(tag) !== i) return false;
    if (tag.toLowerCase() === queryLower) return false;
    return true;
  });

  if (filtered.length === 0) return capitalizeFirst(tags[0]);

  // 4) Select meaningful tags (max 3)
  let selected;
  if (isJapanese) {
    // Japanese tags: skip single-char tags only
    selected = filtered.filter((t) => t.length > 1).slice(0, 3);
    if (selected.length === 0) selected = filtered.slice(0, 3);
  } else {
    const STOP_WORDS = new Set([
      "the", "a", "an", "and", "or", "of", "in", "on", "at", "to", "for",
      "is", "it", "this", "that", "with", "from", "by", "as", "be",
      "photo", "image", "picture", "wallpaper", "background", "free",
      "stock", "photography", "hd", "4k", "8k", "uhd",
    ]);
    const meaningful = filtered.filter((tag) => {
      if (tag.length <= 2) return false;
      if (STOP_WORDS.has(tag.toLowerCase())) return false;
      return true;
    });
    selected = (meaningful.length > 0 ? meaningful : filtered).slice(0, 3);
  }

  // 5) Assemble into museum-caption style phrase with " · " separator
  if (selected.length === 1) return capitalizeFirst(selected[0]);
  if (selected.length === 2) return `${capitalizeFirst(selected[0])} · ${capitalizeFirst(selected[1])}`;
  return selected.map(capitalizeFirst).join(" · ");
}

// --- Font selection by search keyword ---
const FONT_PATTERNS = [
  { regex: /nature|forest|flower|garden|tree|leaf|plant|green/i, font: "'Playfair Display', serif", bodyFont: "'Source Sans 3', sans-serif" },
  { regex: /space|galaxy|star|planet|cosmos|universe|nebula|astronaut/i, font: "'Orbitron', sans-serif", bodyFont: "'Exo 2', sans-serif" },
  { regex: /ocean|sea|beach|underwater|wave|marine|coral|fish/i, font: "'Cormorant Garamond', serif", bodyFont: "'Nunito', sans-serif" },
  { regex: /food|cook|recipe|sushi|cake|pizza|restaurant|meal|cuisine|dish/i, font: "'Abril Fatface', serif", bodyFont: "'Lato', sans-serif" },
  { regex: /building|house|city|tower|architecture|bridge|skyscraper|urban/i, font: "'DM Serif Display', serif", bodyFont: "'Libre Franklin', sans-serif" },
  { regex: /art|paint|museum|abstract|drawing|sculpture|gallery|canvas/i, font: "'Bodoni Moda', serif", bodyFont: "'Karla', sans-serif" },
];
const DEFAULT_FONTS = { font: "'Sora', sans-serif", bodyFont: "'Outfit', sans-serif" };

function detectFonts(query) {
  if (!query) return DEFAULT_FONTS;
  for (const { regex, font, bodyFont } of FONT_PATTERNS) {
    if (regex.test(query)) return { font, bodyFont };
  }
  return DEFAULT_FONTS;
}

// --- Color temperature based font selection ---
const TEMPERATURE_FONTS = {
  warm: [
    { font: "'Abril Fatface', serif", bodyFont: "'Lato', sans-serif" },
    { font: "'Playfair Display', serif", bodyFont: "'Source Sans 3', sans-serif" },
    { font: "'DM Serif Display', serif", bodyFont: "'Nunito', sans-serif" },
  ],
  cool: [
    { font: "'Orbitron', sans-serif", bodyFont: "'Exo 2', sans-serif" },
    { font: "'Cormorant Garamond', serif", bodyFont: "'Libre Franklin', sans-serif" },
    { font: "'Bodoni Moda', serif", bodyFont: "'Karla', sans-serif" },
  ],
  neutral: [
    { font: "'DM Serif Display', serif", bodyFont: "'Libre Franklin', sans-serif" },
    { font: "'Sora', sans-serif", bodyFont: "'Outfit', sans-serif" },
    { font: "'Bodoni Moda', serif", bodyFont: "'Karla', sans-serif" },
  ],
};

function getColorTemperature(palette) {
  const { accent } = palette;
  const warmth = accent.r - accent.b;
  if (warmth > 40) return "warm";
  if (warmth < -40) return "cool";
  return "neutral";
}

// --- Layout modes ---
const LAYOUT_MODES = [
  { name: "masonry", gap: 32 },
  { name: "asymmetric", gap: 28 },
  { name: "compact", gap: 16 },
];

// --- Asymmetric flex ratio patterns ---
const ASYMMETRIC_RATIOS = {
  5: [[1.6, 1.1, 1, 0.8, 0.5], [0.5, 0.8, 1, 1.1, 1.6], [1.3, 0.7, 1.2, 0.8, 1]],
  4: [[1.6, 1, 0.9, 0.5], [0.5, 0.9, 1, 1.6], [1.3, 0.7, 1.3, 0.7]],
  3: [[1.5, 1, 0.5], [0.5, 1, 1.5], [1.2, 0.6, 1.2]],
  2: [[1.4, 0.6], [0.6, 1.4]],
  1: [[1]],
};

// --- Random value in range with improved pseudo-random seed ---
let _globalSeed = Date.now();
function resetRandomSeed() {
  _globalSeed = Date.now();
}

function randomInRange(min, max, index) {
  const seed = _globalSeed * (index + 1) + index * 7919;
  const pseudo = Math.abs(Math.sin(seed * 0.0001) * Math.cos(seed * 0.00013)) * 10000;
  return min + (pseudo % 1000) / 1000 * (max - min);
}

// --- Deterministic hash from string (for stable random from query) ---
function queryHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// --- Seeded pseudo-random number generator (0-1) ---
function seededRandom(seed) {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// --- Seeded Fisher-Yates shuffle ---
function seededShuffle(arr, seed) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const r = seededRandom(seed + i * 7919);
    const j = Math.floor(r * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const SUGGEST_CHIPS = {
  en: ["Nature", "Space", "Ocean", "Food", "Architecture", "Art", "Mountains", "Flowers", "Cities", "Animals"],
  ja: ["自然", "宇宙", "海", "料理", "建築", "アート", "山", "花", "都市", "動物"],
};

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+3:wght@400;600&family=Orbitron:wght@400;700&family=Exo+2:wght@400;600&family=Cormorant+Garamond:wght@400;700&family=Nunito:wght@400;600&family=Abril+Fatface&family=Lato:wght@400;700&family=DM+Serif+Display&family=Libre+Franklin:wght@400;600&family=Bodoni+Moda:wght@400;700&family=Karla:wght@400;600&family=Sora:wght@400;700&family=Outfit:wght@400;600&display=swap";

// --- Default theme (pre-search) ---
function makeDefaultTheme() {
  return {
    primary: "rgb(30, 30, 60)",
    secondary: "rgb(60, 60, 120)",
    accent: "rgb(200, 180, 255)",
    bg: "linear-gradient(135deg, rgb(6, 6, 18) 0%, rgb(18, 18, 48) 50%, rgb(6, 6, 18) 100%)",
    cardBg: "rgba(30, 30, 60, 0.15)",
    border: "rgba(200, 180, 255, 0.25)",
    glow: "rgba(200, 180, 255, 0.4)",
    text: "rgb(230, 220, 255)",
    subtext: "rgb(200, 180, 255)",
    font: DEFAULT_FONTS.font,
    bodyFont: DEFAULT_FONTS.bodyFont,
  };
}

// --- Color extraction from image via Canvas ---
function extractColor(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);
        const data = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
          if (data[i] + data[i + 1] + data[i + 2] > 30 &&
              data[i] + data[i + 1] + data[i + 2] < 700) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
        }
        if (count === 0) { resolve({ r: 30, g: 30, b: 60 }); return; }
        resolve({ r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) });
      } catch {
        resolve({ r: 30, g: 30, b: 60 });
      }
    };
    img.onerror = () => resolve({ r: 30, g: 30, b: 60 });
    img.src = imageUrl;
  });
}

// --- HSL to RGB conversion ---
function hslToRgb(h, s, l) {
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// --- Generate heuristic color from query (fallback for Picsum CORS) ---
function generateColorFromQuery(query, index) {
  let hash = 0;
  const str = query + index;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return hslToRgb(hue, 0.65, 0.45);
}

// Parse HEX color string to {r, g, b}
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) };
}

// Compute saturation for an {r, g, b}
function saturation(c) {
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  if (max === 0) return 0;
  return (max - min) / max;
}

// --- Palette generation from extracted colors ---
function generatePalette(colors) {
  if (!colors.length) {
    return { primary: { r: 30, g: 30, b: 60 }, secondary: { r: 60, g: 60, b: 120 }, accent: { r: 200, g: 180, b: 255 } };
  }
  const avg = { r: 0, g: 0, b: 0 };
  for (const c of colors) {
    avg.r += c.r; avg.g += c.g; avg.b += c.b;
  }
  avg.r = Math.round(avg.r / colors.length);
  avg.g = Math.round(avg.g / colors.length);
  avg.b = Math.round(avg.b / colors.length);

  const primary = {
    r: Math.round(avg.r * 0.7),
    g: Math.round(avg.g * 0.7),
    b: Math.round(avg.b * 0.7),
  };
  const secondary = {
    r: Math.min(255, Math.round(avg.r * 1.2)),
    g: Math.min(255, Math.round(avg.g * 1.2)),
    b: Math.min(255, Math.round(avg.b * 1.2)),
  };

  // accent: pick the most saturated color and boost it
  let accentBase = colors[0];
  let maxSat = 0;
  for (const c of colors) {
    const s = saturation(c);
    if (s > maxSat) { maxSat = s; accentBase = c; }
  }
  const accent = {
    r: Math.min(255, Math.round(accentBase.r * 1.3 + 40)),
    g: Math.min(255, Math.round(accentBase.g * 1.3 + 40)),
    b: Math.min(255, Math.round(accentBase.b * 1.3 + 40)),
  };

  return { primary, secondary, accent };
}

// --- Dynamic theme creation from palette ---
function createDynamicTheme(palette, fonts) {
  const { primary, secondary, accent } = palette;

  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));

  return {
    primary: `rgb(${primary.r}, ${primary.g}, ${primary.b})`,
    secondary: `rgb(${secondary.r}, ${secondary.g}, ${secondary.b})`,
    accent: `rgb(${accent.r}, ${accent.g}, ${accent.b})`,
    bg: `linear-gradient(135deg, rgb(${clamp(primary.r * 0.1)}, ${clamp(primary.g * 0.1)}, ${clamp(primary.b * 0.1)}) 0%, rgb(${clamp(primary.r * 0.3)}, ${clamp(primary.g * 0.3)}, ${clamp(primary.b * 0.3)}) 50%, rgb(${clamp(primary.r * 0.1)}, ${clamp(primary.g * 0.1)}, ${clamp(primary.b * 0.1)}) 100%)`,
    cardBg: `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.15)`,
    border: `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.25)`,
    glow: `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.4)`,
    text: `rgb(${clamp(accent.r * 0.3 + 200)}, ${clamp(accent.g * 0.3 + 195)}, ${clamp(accent.b * 0.3 + 200)})`,
    subtext: `rgb(${clamp(accent.r * 0.5 + 140)}, ${clamp(accent.g * 0.5 + 135)}, ${clamp(accent.b * 0.5 + 140)})`,
    font: fonts.font,
    bodyFont: fonts.bodyFont,
  };
}

// --- Pixabay image fetching ---
async function fetchPixabayImages(query, seed) {
  if (!PIXABAY_API_KEY) return null;

  try {
    const page = (seed % 3) + 1;
    const langParam = containsJapanese(query) ? "&lang=ja" : "";
    const res = await fetch(
      `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=20&page=${page}&image_type=photo&safesearch=true${langParam}`
    );
    if (!res.ok) throw new Error("Pixabay API error");
    const data = await res.json();

    if (!data.hits || data.hits.length === 0) return null;

    // Seeded Fisher-Yates shuffle (deterministic for same query)
    const shuffled = seededShuffle(data.hits, seed);

    return shuffled.map((hit) => ({
      id: `pixabay-${hit.id}`,
      url: hit.largeImageURL || hit.webformatURL,
      title: hit.tags || query,
      formattedTitle: formatImageTitle(hit.tags || query, query),
      source: `${hit.user} (Pixabay)`,
      color: null,
    }));
  } catch {
    return null;
  }
}

// --- Image fetching (source-aware, seeded for deterministic results) ---
async function fetchImages(query, source, seed) {
  // Pixabay mode
  if (source === "pixabay") {
    const pixabayResults = await fetchPixabayImages(query, seed);
    if (pixabayResults) return pixabayResults;
    // Pixabay failure: fall through to Picsum
  }

  // Unsplash mode
  if (source === "unsplash" && UNSPLASH_ACCESS_KEY) {
    try {
      const page = (seed % 5) + 1;
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&page=${page}&order_by=relevant&client_id=${UNSPLASH_ACCESS_KEY}`
      );
      if (!res.ok) throw new Error("Unsplash API error");
      const data = await res.json();
      // Seeded Fisher-Yates shuffle (deterministic for same query)
      const shuffled = seededShuffle(data.results, seed);
      return shuffled.map((photo) => ({
        id: photo.id,
        url: photo.urls.regular,
        title: photo.description || photo.alt_description || query,
        formattedTitle: formatImageTitle(
          photo.description || photo.alt_description || query, query
        ),
        source: photo.user.name,
        color: photo.color,
      }));
    } catch {
      // fall through to Picsum
    }
  }

  // Picsum fallback (uses query hash for stable results per query)
  const picsumSeed = seed || queryHash(query);
  return Array.from({ length: 20 }, (_, i) => {
    const w = 400 + (i % 3) * 100;
    const h = 300 + ((i * 7) % 5) * 100;
    const imgSeed = `${query}-${picsumSeed}-${i}`;
    return {
      id: `picsum-${imgSeed}`,
      url: `https://picsum.photos/seed/${encodeURIComponent(imgSeed)}/${w}/${h}`,
      title: `${query} #${i + 1}`,
      formattedTitle: capitalizeFirst(query),
      source: "Picsum Photos",
      color: null,
    };
  });
}

// --- Extract colors from images (use Unsplash color if available, else Canvas, else query hash) ---
async function extractColorsFromImages(images, count, query) {
  const targets = images.slice(0, count);
  const colorPromises = targets.map((img, i) => {
    if (img.color) {
      const parsed = hexToRgb(img.color);
      if (parsed) return Promise.resolve(parsed);
    }
    return extractColor(img.url).then((color) => {
      // Fallback value (30,30,60) means CORS failure — use query-based heuristic
      if (color.r === 30 && color.g === 30 && color.b === 60) {
        return generateColorFromQuery(query, i);
      }
      return color;
    });
  });
  return Promise.all(colorPromises);
}

// --- Advanced per-card color analysis via Canvas ---
function analyzeImageColors(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        // Color quantization: 4x4x4 = 64 buckets
        const buckets = {};
        let totalPixels = 0;
        let brightnessSum = 0;
        let brightPixels = 0;
        let darkPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;

          const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          brightnessSum += lum;
          totalPixels++;

          if (lum > 0.65) brightPixels++;
          else if (lum < 0.25) darkPixels++;

          const br = Math.floor(r / 64);
          const bg = Math.floor(g / 64);
          const bb = Math.floor(b / 64);
          const key = `${br}-${bg}-${bb}`;

          if (!buckets[key]) {
            buckets[key] = { r: 0, g: 0, b: 0, count: 0 };
          }
          buckets[key].r += r;
          buckets[key].g += g;
          buckets[key].b += b;
          buckets[key].count++;
        }

        if (totalPixels === 0) {
          resolve(null);
          return;
        }

        const sorted = Object.values(buckets)
          .map((bk) => ({
            r: Math.round(bk.r / bk.count),
            g: Math.round(bk.g / bk.count),
            b: Math.round(bk.b / bk.count),
            count: bk.count,
          }))
          .sort((a, b) => b.count - a.count);

        const dominant = sorted[0] || { r: 128, g: 128, b: 128 };

        // Accent: pick bucket with largest color distance from dominant
        let accent = sorted[1] || dominant;
        for (let i = 1; i < sorted.length && i < 10; i++) {
          const d = Math.sqrt(
            Math.pow(sorted[i].r - dominant.r, 2) +
            Math.pow(sorted[i].g - dominant.g, 2) +
            Math.pow(sorted[i].b - dominant.b, 2)
          );
          if (d > 60) {
            accent = sorted[i];
            break;
          }
        }

        const avgBrightness = brightnessSum / totalPixels;
        const brightRatio = brightPixels / totalPixels;
        const darkRatio = darkPixels / totalPixels;

        const contrast = brightRatio + darkRatio > 0.6 ? "high" :
                         brightRatio + darkRatio < 0.3 ? "low" : "medium";

        const mood = avgBrightness > 0.6 ? "bright" :
                     avgBrightness < 0.35 ? "dark" : "balanced";

        resolve({
          dominant: { r: dominant.r, g: dominant.g, b: dominant.b },
          accent: { r: accent.r, g: accent.g, b: accent.b },
          avgBrightness,
          brightRatio,
          darkRatio,
          contrast,
          mood,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

// --- GlobalStyles ---
function GlobalStyles({ theme }) {
  return (
    <>
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      <style>{`
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #root {
          width: 100%; min-height: 100vh;
          font-family: ${theme.bodyFont};
          color: ${theme.text};
          background: ${theme.bg};
          transition: background 0.8s ease, color 0.5s ease;
          overflow-x: hidden;
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        ::-webkit-scrollbar-thumb {
          background: ${theme.primary};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.secondary}; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes floatBlurImage {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -25px) scale(1.03); }
          66% { transform: translate(-20px, 15px) scale(0.97); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 5px ${theme.glow}; }
          50% { box-shadow: 0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}; }
        }
        @keyframes bgImageFadeIn {
          from { opacity: 0; }
          to { opacity: 0.75; }
        }
        /* Coarse grain (warm woods: walnut, mahogany, cherry) */
        .wood-grain-coarse { position: relative; }
        .wood-grain-coarse::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0.15;
          background: repeating-linear-gradient(
            var(--grain-angle, 85deg),
            transparent 0px, transparent 3px,
            rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 5px,
            transparent 5px, transparent 11px,
            rgba(0,0,0,0.06) 11px, rgba(0,0,0,0.06) 13px,
            transparent 13px, transparent 22px,
            rgba(0,0,0,0.04) 22px, rgba(0,0,0,0.04) 23px
          );
          pointer-events: none;
          z-index: 1;
        }
        .wood-grain-coarse::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0.08;
          background: repeating-linear-gradient(
            calc(var(--grain-angle, 85deg) + 5deg),
            transparent 0px, transparent 8px,
            rgba(70,35,10,0.1) 8px, rgba(70,35,10,0.1) 10px,
            transparent 10px, transparent 28px
          );
          pointer-events: none;
          z-index: 1;
        }

        /* Medium grain (neutral woods: maple, pine) */
        .wood-grain-medium { position: relative; }
        .wood-grain-medium::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0.12;
          background: repeating-linear-gradient(
            var(--grain-angle, 87deg),
            transparent 0px, transparent 2px,
            rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 3px,
            transparent 3px, transparent 7px,
            rgba(0,0,0,0.05) 7px, rgba(0,0,0,0.05) 8px,
            transparent 8px, transparent 14px,
            rgba(0,0,0,0.03) 14px, rgba(0,0,0,0.03) 15px
          );
          pointer-events: none;
          z-index: 1;
        }
        .wood-grain-medium::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0.06;
          background: repeating-linear-gradient(
            calc(var(--grain-angle, 87deg) + 3deg),
            transparent 0px, transparent 5px,
            rgba(60,30,10,0.08) 5px, rgba(60,30,10,0.08) 6px,
            transparent 6px, transparent 18px
          );
          pointer-events: none;
          z-index: 1;
        }

        /* Fine grain (cool woods: oak, ash, ebony) */
        .wood-grain-fine { position: relative; }
        .wood-grain-fine::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0.1;
          background: repeating-linear-gradient(
            var(--grain-angle, 90deg),
            transparent 0px, transparent 1px,
            rgba(0,0,0,0.06) 1px, rgba(0,0,0,0.06) 2px,
            transparent 2px, transparent 4px,
            rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 5px,
            transparent 5px, transparent 8px,
            rgba(0,0,0,0.02) 8px, rgba(0,0,0,0.02) 9px
          );
          pointer-events: none;
          z-index: 1;
        }
        .wood-grain-fine::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0.05;
          background: repeating-linear-gradient(
            calc(var(--grain-angle, 90deg) + 2deg),
            transparent 0px, transparent 3px,
            rgba(40,40,50,0.06) 3px, rgba(40,40,50,0.06) 4px,
            transparent 4px, transparent 10px
          );
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </>
  );
}

// --- Background layers (immersive image-based background) ---
function ImmersiveBackground({ bgImages, theme }) {
  if (!bgImages || bgImages.length === 0) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  // Limit background images on mobile for performance
  const displayBgImages = isMobile ? bgImages.slice(0, 3) : bgImages;

  // Deterministic but varied positions for each image
  const positions = [
    { top: "-10%", left: "-5%" },
    { top: "-5%", left: "40%" },
    { top: "30%", left: "-10%" },
    { top: "35%", left: "50%" },
    { top: "60%", left: "10%" },
    { top: "55%", left: "55%" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {displayBgImages.map((url, i) => (
        <img
          key={`bg-${i}`}
          src={url}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            width: `${60 + (i % 3) * 10}vw`,
            height: "auto",
            top: positions[i % positions.length].top,
            left: positions[i % positions.length].left,
            filter: "blur(30px) saturate(3) brightness(0.7) contrast(1.3)",
            opacity: 0,
            animation: `bgImageFadeIn 1.2s ease ${i * 0.15}s forwards, floatBlurImage ${17 + i * 2}s ease-in-out ${i * 1.2}s infinite`,
            objectFit: "cover",
            zIndex: 0,
          }}
        />
      ))}

      {/* Layer 2: Gradient overlay from extracted colors */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: theme.bg,
          opacity: 0.3,
          mixBlendMode: "soft-light",
          zIndex: 1,
          transition: "background 0.8s ease",
        }}
      />

      {/* Layer 3: Dark veil for readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.08)",
          zIndex: 2,
        }}
      />
    </div>
  );
}

// --- Header ---
function Header({ theme, query, onSearch, onReset, lang, onToggleLang, t, layoutMode, imageSource, onToggleSource }) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const triggerSearch = () => {
    if (input.trim()) onSearch(input.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") triggerSearch();
  };

  const logoElement = (
    <div
      onClick={() => onReset()}
      style={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      <span
        style={{
          fontFamily: theme.font,
          fontSize: isMobile ? 18 : 22,
          fontWeight: 700,
          color: "#fff",
          background: "linear-gradient(135deg, #ffffff, rgba(255,255,255,0.7))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: `drop-shadow(0 0 8px ${theme.glow})`,
          transition: "font-family 0.8s ease, filter 0.8s ease",
          letterSpacing: 0.5,
        }}
      >
        Visushift
      </span>
    </div>
  );

  const controlsElement = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <button
        type="button"
        onClick={onToggleSource}
        style={{
          padding: isMobile ? "5px 8px" : "6px 12px",
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          background: "rgba(255,255,255,0.07)",
          color: theme.subtext,
          fontSize: isMobile ? 10 : 11,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
          display: "flex",
          alignItems: "center",
          gap: 3,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = theme.accent;
          e.currentTarget.style.color = theme.text;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.border;
          e.currentTarget.style.color = theme.subtext;
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        {imageSource === "unsplash" ? "Unsplash" : "Pixabay"}
      </button>

      <button
        type="button"
        onClick={onToggleLang}
        style={{
          padding: isMobile ? "5px 8px" : "6px 12px",
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          background: "rgba(255,255,255,0.07)",
          color: theme.subtext,
          fontSize: isMobile ? 10 : 12,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = theme.accent;
          e.currentTarget.style.color = theme.text;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = theme.border;
          e.currentTarget.style.color = theme.subtext;
        }}
      >
        {lang === "en" ? "日本語" : "EN"}
      </button>

      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: theme.accent,
          boxShadow: `0 0 6px ${theme.glow}`,
          transition: "all 0.8s ease",
          flexShrink: 0,
        }}
      />
    </div>
  );

  const searchBarElement = (
    <div style={{
      display: "flex",
      gap: 8,
      ...(isMobile ? { width: "100%" } : { flex: 1, maxWidth: 560 }),
    }}>
      <div style={{ flex: 1, position: "relative" }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t.searchPlaceholder}
          style={{
            width: "100%",
            padding: isMobile ? "10px 12px" : "10px 16px",
            borderRadius: 12,
            border: `1px solid ${focused ? theme.accent : theme.border}`,
            background: "rgba(255,255,255,0.07)",
            color: theme.text,
            fontSize: isMobile ? 14 : 15,
            fontFamily: theme.bodyFont,
            outline: "none",
            transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
            boxShadow: focused ? `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow}` : "none",
          }}
        />
      </div>
      <button
        type="button"
        onClick={triggerSearch}
        style={{
          padding: isMobile ? "10px 16px" : "10px 20px",
          borderRadius: 12,
          border: "none",
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
          color: "#fff",
          fontFamily: theme.bodyFont,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
          flexShrink: 0,
        }}
      >
        {t.searchButton}
      </button>
    </div>
  );

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        background: "rgba(0,0,0,0.55)",
        borderBottom: `1px solid ${theme.border}`,
        padding: isMobile ? "10px 12px" : "12px 24px",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: isMobile ? 8 : 16,
        transition: "border-color 0.8s ease",
      }}
    >
      {isMobile ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {logoElement}
            {controlsElement}
          </div>
          {searchBarElement}
        </>
      ) : (
        <>
          {logoElement}
          {searchBarElement}
          {controlsElement}
        </>
      )}
    </header>
  );
}

// --- Landing page ---
function Landing({ theme, onSearch, history, lang, t }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 64px)",
        padding: isMobile ? "40px 16px" : "60px 24px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: isMobile ? 56 : 80,
          height: isMobile ? 56 : 80,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.secondary})`,
          opacity: 0.7,
          animation: "float 3s ease-in-out infinite",
          marginBottom: isMobile ? 16 : 24,
          filter: "blur(1px)",
        }}
      />
      <h1
        style={{
          fontFamily: theme.font,
          fontSize: isMobile ? "clamp(24px, 7vw, 36px)" : "clamp(32px, 5vw, 56px)",
          fontWeight: 700,
          marginBottom: isMobile ? 8 : 12,
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.secondary}, ${theme.primary})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textAlign: "center",
          transition: "all 0.8s ease",
          padding: "0 8px",
        }}
      >
        {t.heroTitle}
      </h1>
      <p
        style={{
          fontFamily: theme.bodyFont,
          fontSize: isMobile ? 14 : 17,
          color: theme.subtext,
          marginBottom: isMobile ? 28 : 40,
          textAlign: "center",
          maxWidth: isMobile ? 320 : 480,
          lineHeight: 1.6,
          transition: "color 0.8s ease",
          padding: "0 8px",
        }}
      >
        {t.heroSubtitle}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: isMobile ? 8 : 10,
          justifyContent: "center",
          maxWidth: isMobile ? 340 : 600,
          marginBottom: isMobile ? 28 : 40,
        }}
      >
        {SUGGEST_CHIPS[lang].map((chip, i) => (
          <button
            key={SUGGEST_CHIPS.en[i]}
            onClick={() => onSearch(SUGGEST_CHIPS.en[i])}
            style={{
              padding: isMobile ? "7px 14px" : "8px 20px",
              borderRadius: 20,
              border: `1px solid ${theme.border}`,
              background: "rgba(255,255,255,0.06)",
              color: theme.text,
              fontFamily: theme.bodyFont,
              fontSize: isMobile ? 13 : 14,
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `rgba(${100}, ${100}, ${200}, 0.25)`;
              e.currentTarget.style.borderColor = theme.accent;
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 4px 15px ${theme.glow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.borderColor = theme.border;
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <div style={{ textAlign: "center", padding: "0 8px" }}>
          <p
            style={{
              fontSize: isMobile ? 11 : 13,
              color: theme.subtext,
              marginBottom: isMobile ? 8 : 12,
              fontFamily: theme.bodyFont,
              opacity: 0.7,
            }}
          >
            {t.recentSearches}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {history.map((item, i) => (
              <button
                key={`${item}-${i}`}
                onClick={() => onSearch(item)}
                style={{
                  padding: isMobile ? "5px 10px" : "6px 14px",
                  borderRadius: 16,
                  border: `1px solid ${theme.border}`,
                  background: "rgba(255,255,255,0.03)",
                  color: theme.subtext,
                  fontFamily: theme.bodyFont,
                  fontSize: isMobile ? 11 : 12,
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.accent;
                  e.currentTarget.style.color = theme.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.color = theme.subtext;
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Generate realistic frame style from image color ---
function generateFrameStyle(imageColor, theme, index, colorAnalysis) {
  const clamp = (v) => Math.min(255, Math.max(0, Math.round(v)));

  // --- Base color determination ---
  let baseColor = { r: 80, g: 60, b: 40 };
  let dominantColor = null;
  let accentColor = null;
  let imgContrast = "medium";
  let imgMood = "balanced";

  if (colorAnalysis) {
    baseColor = colorAnalysis.dominant;
    dominantColor = colorAnalysis.dominant;
    accentColor = colorAnalysis.accent;
    imgContrast = colorAnalysis.contrast;
    imgMood = colorAnalysis.mood;
  } else if (imageColor) {
    const c = hexToRgb(imageColor);
    if (c) baseColor = c;
  }

  const bc = baseColor;
  const luminance = colorAnalysis
    ? colorAnalysis.avgBrightness
    : (bc.r * 0.299 + bc.g * 0.587 + bc.b * 0.114) / 255;
  const sat = saturation(bc);
  const warmth = bc.r - bc.b;

  // Determine frame type based on image color characteristics (10 types)
  function determineFrameType(baseCol, lum, s, w, idx) {
    if (lum < 0.25) return "ebony";
    if (baseCol.r > baseCol.g + 30 && lum >= 0.3 && lum < 0.6) return "cherry";
    if (s > 0.5 && w > 20) return "gold";
    if (s > 0.4 && w < -20) return "silver";
    if (w > 40 && lum < 0.4) return "walnut";
    if (w > 30 && lum < 0.55) return "mahogany";
    if (w > 20 && lum >= 0.55) return "maple";
    if (w < -10 && lum < 0.45) return "oak";
    if (w < -10 && lum >= 0.45) return "ash";
    if (s < 0.3 && lum > 0.5) return "pine";
    const fallbacks = ["walnut", "oak", "maple", "mahogany"];
    return fallbacks[idx % fallbacks.length];
  }

  const frameType = determineFrameType(bc, luminance, sat, warmth, index);

  // Dynamic mat color based on image color characteristics
  function calculateMatColor(baseCol, w, fType) {
    if (fType === "ebony") {
      return `rgb(${clamp(240 + baseCol.r * 0.03)}, ${clamp(238 + baseCol.g * 0.03)}, ${clamp(235 + baseCol.b * 0.03)})`;
    }
    if (w > 15) {
      return `rgb(${clamp(242 + baseCol.r * 0.04)}, ${clamp(237 + baseCol.g * 0.03)}, ${clamp(228 + baseCol.b * 0.02)})`;
    }
    if (w < -10) {
      return `rgb(${clamp(235 + baseCol.r * 0.02)}, ${clamp(237 + baseCol.g * 0.03)}, ${clamp(240 + baseCol.b * 0.04)})`;
    }
    return `rgb(${clamp(240 + baseCol.r * 0.03)}, ${clamp(238 + baseCol.g * 0.03)}, ${clamp(236 + baseCol.b * 0.03)})`;
  }

  const FRAME_STYLES = {
    walnut: {
      outerLight: `rgb(${clamp(bc.r*0.25+85)}, ${clamp(bc.g*0.15+48)}, ${clamp(bc.b*0.08+28)})`,
      outerDark:  `rgb(${clamp(bc.r*0.12+35)}, ${clamp(bc.g*0.08+18)}, ${clamp(bc.b*0.04+8)})`,
      outerMid:   `rgb(${clamp(bc.r*0.2+62)}, ${clamp(bc.g*0.12+35)}, ${clamp(bc.b*0.06+18)})`,
      grooveColor: "rgba(15, 5, 0, 0.55)",
      innerEdge: `rgba(${clamp(bc.r*0.3+140)}, ${clamp(bc.g*0.2+100)}, ${clamp(bc.b*0.1+50)}, 0.5)`,
      shadowColor: "rgba(25, 12, 5, 0.6)",
      hasWoodGrain: true,
    },
    mahogany: {
      outerLight: `rgb(${clamp(bc.r*0.2+120)}, ${clamp(bc.g*0.1+55)}, ${clamp(bc.b*0.08+35)})`,
      outerDark:  `rgb(${clamp(bc.r*0.12+55)}, ${clamp(bc.g*0.06+20)}, ${clamp(bc.b*0.04+12)})`,
      outerMid:   `rgb(${clamp(bc.r*0.16+90)}, ${clamp(bc.g*0.08+38)}, ${clamp(bc.b*0.06+24)})`,
      grooveColor: "rgba(30, 8, 5, 0.5)",
      innerEdge: `rgba(${clamp(bc.r*0.25+160)}, ${clamp(bc.g*0.15+100)}, ${clamp(bc.b*0.08+55)}, 0.55)`,
      shadowColor: "rgba(35, 15, 8, 0.55)",
      hasWoodGrain: true,
    },
    cherry: {
      outerLight: `rgb(${clamp(bc.r*0.2+145)}, ${clamp(bc.g*0.12+72)}, ${clamp(bc.b*0.08+48)})`,
      outerDark:  `rgb(${clamp(bc.r*0.12+75)}, ${clamp(bc.g*0.06+30)}, ${clamp(bc.b*0.04+18)})`,
      outerMid:   `rgb(${clamp(bc.r*0.16+115)}, ${clamp(bc.g*0.1+52)}, ${clamp(bc.b*0.06+32)})`,
      grooveColor: "rgba(40, 12, 8, 0.45)",
      innerEdge: `rgba(${clamp(bc.r*0.2+170)}, ${clamp(bc.g*0.12+110)}, ${clamp(bc.b*0.08+65)}, 0.5)`,
      shadowColor: "rgba(40, 18, 10, 0.5)",
      hasWoodGrain: true,
    },
    oak: {
      outerLight: `rgb(${clamp(bc.r*0.1+135)}, ${clamp(bc.g*0.12+128)}, ${clamp(bc.b*0.15+118)})`,
      outerDark:  `rgb(${clamp(bc.r*0.06+72)}, ${clamp(bc.g*0.08+68)}, ${clamp(bc.b*0.1+62)})`,
      outerMid:   `rgb(${clamp(bc.r*0.08+105)}, ${clamp(bc.g*0.1+100)}, ${clamp(bc.b*0.12+92)})`,
      grooveColor: "rgba(30, 30, 35, 0.5)",
      innerEdge: `rgba(${clamp(bc.r*0.1+155)}, ${clamp(bc.g*0.1+152)}, ${clamp(bc.b*0.12+148)}, 0.45)`,
      shadowColor: "rgba(30, 30, 35, 0.5)",
      hasWoodGrain: true,
    },
    ash: {
      outerLight: `rgb(${clamp(bc.r*0.08+210)}, ${clamp(bc.g*0.08+208)}, ${clamp(bc.b*0.1+205)})`,
      outerDark:  `rgb(${clamp(bc.r*0.06+165)}, ${clamp(bc.g*0.06+162)}, ${clamp(bc.b*0.08+158)})`,
      outerMid:   `rgb(${clamp(bc.r*0.07+190)}, ${clamp(bc.g*0.07+188)}, ${clamp(bc.b*0.09+184)})`,
      grooveColor: "rgba(80, 80, 85, 0.3)",
      innerEdge: "rgba(200, 200, 205, 0.4)",
      shadowColor: "rgba(50, 50, 55, 0.35)",
      hasWoodGrain: true,
    },
    maple: {
      outerLight: `rgb(${clamp(bc.r*0.15+200)}, ${clamp(bc.g*0.15+175)}, ${clamp(bc.b*0.08+125)})`,
      outerDark:  `rgb(${clamp(bc.r*0.12+150)}, ${clamp(bc.g*0.1+120)}, ${clamp(bc.b*0.05+75)})`,
      outerMid:   `rgb(${clamp(bc.r*0.13+178)}, ${clamp(bc.g*0.12+150)}, ${clamp(bc.b*0.06+100)})`,
      grooveColor: "rgba(90, 60, 25, 0.35)",
      innerEdge: "rgba(210, 185, 130, 0.5)",
      shadowColor: "rgba(65, 45, 20, 0.4)",
      hasWoodGrain: true,
    },
    pine: {
      outerLight: `rgb(${clamp(bc.r*0.1+215)}, ${clamp(bc.g*0.12+200)}, ${clamp(bc.b*0.06+165)})`,
      outerDark:  `rgb(${clamp(bc.r*0.08+170)}, ${clamp(bc.g*0.1+155)}, ${clamp(bc.b*0.05+115)})`,
      outerMid:   `rgb(${clamp(bc.r*0.09+195)}, ${clamp(bc.g*0.11+180)}, ${clamp(bc.b*0.055+140)})`,
      grooveColor: "rgba(100, 70, 30, 0.3)",
      innerEdge: "rgba(215, 195, 145, 0.45)",
      shadowColor: "rgba(70, 50, 20, 0.35)",
      hasWoodGrain: true,
    },
    ebony: {
      outerLight: `rgb(${clamp(bc.r*0.08+55)}, ${clamp(bc.g*0.08+50)}, ${clamp(bc.b*0.1+48)})`,
      outerDark:  `rgb(${clamp(bc.r*0.04+15)}, ${clamp(bc.g*0.04+12)}, ${clamp(bc.b*0.05+10)})`,
      outerMid:   `rgb(${clamp(bc.r*0.06+35)}, ${clamp(bc.g*0.06+32)}, ${clamp(bc.b*0.08+30)})`,
      grooveColor: "rgba(0, 0, 0, 0.7)",
      innerEdge: "rgba(80, 75, 72, 0.5)",
      shadowColor: "rgba(0, 0, 0, 0.65)",
      hasWoodGrain: true,
    },
    gold: {
      outerLight: `rgb(${clamp(bc.r * 0.2 + 210)}, ${clamp(bc.g * 0.2 + 185)}, ${clamp(bc.b * 0.05 + 90)})`,
      outerDark: `rgb(${clamp(bc.r * 0.15 + 140)}, ${clamp(bc.g * 0.12 + 110)}, ${clamp(bc.b * 0.03 + 30)})`,
      outerMid: `rgb(${clamp(bc.r * 0.18 + 180)}, ${clamp(bc.g * 0.16 + 155)}, ${clamp(bc.b * 0.04 + 60)})`,
      grooveColor: "rgba(100, 70, 10, 0.5)",
      innerEdge: "rgba(220, 195, 100, 0.7)",
      shadowColor: "rgba(80, 55, 10, 0.5)",
      hasWoodGrain: false,
    },
    silver: {
      outerLight: `rgb(${clamp(bc.r * 0.1 + 200)}, ${clamp(bc.g * 0.1 + 205)}, ${clamp(bc.b * 0.15 + 215)})`,
      outerDark: `rgb(${clamp(bc.r * 0.08 + 130)}, ${clamp(bc.g * 0.08 + 135)}, ${clamp(bc.b * 0.12 + 145)})`,
      outerMid: `rgb(${clamp(bc.r * 0.09 + 170)}, ${clamp(bc.g * 0.09 + 175)}, ${clamp(bc.b * 0.13 + 185)})`,
      grooveColor: "rgba(60, 65, 75, 0.4)",
      innerEdge: "rgba(180, 185, 200, 0.5)",
      shadowColor: "rgba(40, 45, 55, 0.4)",
      hasWoodGrain: false,
    },
    white: {
      outerLight: "rgb(252, 250, 248)",
      outerDark: "rgb(215, 210, 205)",
      outerMid: "rgb(238, 235, 230)",
      grooveColor: "rgba(0, 0, 0, 0.15)",
      matColor: "rgb(255, 255, 253)",
      innerEdge: "rgba(200, 200, 200, 0.3)",
      shadowColor: "rgba(0, 0, 0, 0.25)",
      hasWoodGrain: false,
    },
  };

  const style = { ...FRAME_STYLES[frameType], frameType };

  // --- Blend dominant color into wood frame colors ---
  if (style.hasWoodGrain && dominantColor) {
    const blendRatio = 0.15;
    const blendColor = (frameRgbStr, dc) => {
      const match = frameRgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!match) return frameRgbStr;
      const fr = parseInt(match[1]);
      const fg = parseInt(match[2]);
      const fb = parseInt(match[3]);
      const nr = clamp(fr * (1 - blendRatio) + dc.r * blendRatio);
      const ng = clamp(fg * (1 - blendRatio) + dc.g * blendRatio);
      const nb = clamp(fb * (1 - blendRatio) + dc.b * blendRatio);
      return `rgb(${nr}, ${ng}, ${nb})`;
    };
    style.outerLight = blendColor(style.outerLight, dominantColor);
    style.outerDark = blendColor(style.outerDark, dominantColor);
    style.outerMid = blendColor(style.outerMid, dominantColor);
  }

  // --- Contrast/mood → shadow & groove adjustments ---
  if (imgContrast === "high") {
    style.shadowColor = style.shadowColor.replace(/[\d.]+\)$/, (m) => {
      const opacity = parseFloat(m);
      return `${Math.min(0.85, opacity + 0.2)})`;
    });
  } else if (imgContrast === "low") {
    style.shadowColor = style.shadowColor.replace(/[\d.]+\)$/, (m) => {
      const opacity = parseFloat(m);
      return `${Math.max(0.2, opacity - 0.15)})`;
    });
  }

  if (imgMood === "dark") {
    style.grooveColor = style.grooveColor.replace(/[\d.]+\)$/, (m) => {
      const opacity = parseFloat(m);
      return `${Math.min(0.8, opacity + 0.15)})`;
    });
  }

  // --- Dynamic mat color from image accent ---
  if (frameType !== "white") {
    style.matColor = calculateMatColor(bc, warmth, frameType);
  }

  // --- Accent color → inner edge adjustment ---
  if (accentColor && style.hasWoodGrain) {
    const ar = accentColor.r, ag = accentColor.g, ab = accentColor.b;
    style.innerEdge = `rgba(${clamp(ar * 0.3 + 140)}, ${clamp(ag * 0.3 + 130)}, ${clamp(ab * 0.3 + 110)}, 0.5)`;
  }

  // --- Frame/mat width multipliers ---
  let frameWidthMultiplier = 1.3 - luminance * 0.6;
  const matWidthMultiplier = 1.4 - luminance * 0.8;
  if (imgContrast === "high") {
    frameWidthMultiplier *= 1.1;
  } else if (imgContrast === "low") {
    frameWidthMultiplier *= 0.9;
  }
  style.frameWidthMultiplier = frameWidthMultiplier;
  style.matWidthMultiplier = matWidthMultiplier;

  // --- Grain angle & density ---
  if (style.hasWoodGrain) {
    style.grainAngle = warmth > 0
      ? 80 + (index % 9)
      : 88 + (index % 9);

    style.grainDensity = warmth > 30 ? "coarse" : warmth < -10 ? "fine" : "medium";

    // Mood-based density refinement
    if (imgMood === "dark" && style.grainDensity === "medium") {
      style.grainDensity = "coarse";
    }
    if (imgMood === "bright" && style.grainDensity === "medium") {
      style.grainDensity = "fine";
    }
  }

  // --- outerGradient (density-aware) ---
  if (style.hasWoodGrain) {
    const { outerLight, outerDark, outerMid } = style;
    const angle = style.grainAngle + 90;

    if (style.grainDensity === "coarse") {
      style.outerGradient = `linear-gradient(${angle}deg, ${outerDark} 0%, ${outerLight} 12%, ${outerMid} 24%, ${outerDark} 36%, ${outerLight} 48%, ${outerMid} 58%, ${outerDark} 68%, ${outerLight} 80%, ${outerMid} 90%, ${outerDark} 100%)`;
    } else if (style.grainDensity === "fine") {
      style.outerGradient = `linear-gradient(${angle}deg, ${outerDark} 0%, ${outerMid} 6%, ${outerLight} 12%, ${outerMid} 18%, ${outerDark} 24%, ${outerLight} 30%, ${outerMid} 36%, ${outerDark} 42%, ${outerLight} 48%, ${outerMid} 54%, ${outerDark} 60%, ${outerLight} 66%, ${outerMid} 72%, ${outerDark} 78%, ${outerLight} 84%, ${outerDark} 100%)`;
    } else {
      style.outerGradient = `linear-gradient(${angle}deg, ${outerDark} 0%, ${outerLight} 8%, ${outerMid} 16%, ${outerLight} 22%, ${outerDark} 30%, ${outerLight} 38%, ${outerMid} 46%, ${outerDark} 52%, ${outerLight} 60%, ${outerMid} 68%, ${outerLight} 76%, ${outerDark} 84%, ${outerLight} 92%, ${outerDark} 100%)`;
    }
  }

  return style;
}

// --- ImageCard with per-card color glow and realistic multi-layer frame ---
function ImageCard({ image, index, theme, onClick, t, cardStyle, colorAnalysis, displayTitle, lang }) {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  // Card style defaults
  const cs = cardStyle || { borderRadius: 16, rotation: 0, scale: 1, paddingBottom: 0, marginTop: 0, marginLeft: 0, frameWidth: 12, frameInnerWidth: 4, frameBevel: true, frameGradientAngle: 145 };
  const isMobile = typeof window !== "undefined" && window.innerWidth < 480;
  const effectiveRotation = isMobile ? (cs.rotation || 0) * 0.5 : (cs.rotation || 0);

  // Determine per-card glow color from image.color (Unsplash HEX) or fallback
  const cardGlow = (() => {
    if (image.color) {
      const parsed = hexToRgb(image.color);
      if (parsed) return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.37)`;
    }
    return theme.glow;
  })();

  // Frame parameters (mobile: slimmer frames for compact 2-col layout)
  const frameStyle = generateFrameStyle(image.color, theme, index, colorAnalysis);
  const fwMultiplier = frameStyle.frameWidthMultiplier || 1;
  const fiwMultiplier = frameStyle.matWidthMultiplier || 1;
  const fw = isMobile
    ? Math.max(3, Math.round((cs.frameWidth || 12) * 0.4 * fwMultiplier))
    : Math.round((cs.frameWidth || 12) * fwMultiplier);
  const fiw = isMobile
    ? Math.max(1, Math.round((cs.frameInnerWidth || 4) * 0.4 * fiwMultiplier))
    : Math.round((cs.frameInnerWidth || 4) * fiwMultiplier);
  const gradAngle = cs.frameGradientAngle || 145;

  if (error) {
    // Error card uses darkWood-style fallback frame
    const errStyle = generateFrameStyle(null, theme, index);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          className={errStyle.hasWoodGrain ? `wood-grain-${errStyle.grainDensity || "medium"}` : ""}
          style={{
            padding: fw,
            background: errStyle.outerGradient || `linear-gradient(${gradAngle}deg, ${errStyle.outerDark} 0%, ${errStyle.outerLight} 15%, ${errStyle.outerMid} 30%, ${errStyle.outerLight} 45%, ${errStyle.outerDark} 55%, ${errStyle.outerMid} 70%, ${errStyle.outerLight} 85%, ${errStyle.outerDark} 100%)`,
            borderRadius: (cs.borderRadius || 16) + 4,
            position: "relative",
            overflow: "hidden",
            "--grain-angle": `${errStyle.grainAngle || 87}deg`,
            boxShadow: errStyle.hasWoodGrain
              ? `inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.35), inset 4px 4px 8px rgba(255,255,255,0.1), inset -4px -4px 8px rgba(0,0,0,0.2), 4px 5px 15px ${errStyle.shadowColor}, 8px 10px 30px ${errStyle.shadowColor}`
              : `inset 1px 1px 2px rgba(255,255,255,0.25), inset -1px -1px 2px rgba(0,0,0,0.25), inset 3px 3px 6px rgba(255,255,255,0.1), inset -3px -3px 6px rgba(0,0,0,0.15), 3px 4px 12px ${errStyle.shadowColor}, 6px 8px 24px ${errStyle.shadowColor}`,
            animation: `fadeSlideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 60}ms both`,
          }}
        >
          {/* Inner Groove */}
          <div style={{
            padding: 2,
            background: errStyle.grooveColor,
            borderRadius: (cs.borderRadius || 16) + 1,
            position: "relative",
            zIndex: 2,
            boxShadow: errStyle.hasWoodGrain ? "inset 1px 1px 2px rgba(0,0,0,0.3), inset -1px -1px 1px rgba(255,255,255,0.1)" : "none",
          }}>
            {/* Mat */}
            <div style={{
              padding: fiw,
              background: errStyle.matColor,
              borderRadius: cs.borderRadius || 16,
              boxShadow: errStyle.hasWoodGrain
                ? "inset 2px 2px 6px rgba(0,0,0,0.12), inset -1px -1px 4px rgba(255,255,255,0.6), inset 0 0 12px rgba(0,0,0,0.04)"
                : "inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 3px rgba(255,255,255,0.5)",
            }}>
              {/* Inner Edge */}
              <div style={{ padding: 1, background: errStyle.innerEdge, borderRadius: Math.max(0, (cs.borderRadius || 16) - 2) }}>
                <div
                  style={{
                    borderRadius: Math.max(0, (cs.borderRadius || 16) - 3),
                    overflow: "hidden",
                    background: "rgba(0, 0, 0, 0.25)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "40px 16px",
                    paddingBottom: `${40 + (cs.paddingBottom || 0)}px`,
                    minHeight: 200,
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>🖼️</div>
                  <p
                    style={{
                      fontFamily: theme.bodyFont,
                      fontSize: 13,
                      color: theme.subtext,
                      opacity: 0.6,
                      textAlign: "center",
                    }}
                  >
                    {t.imageNotAvailable}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {displayTitle && (
          <div style={{ marginTop: isMobile ? 4 : 6, maxWidth: "100%", textAlign: "center", padding: "2px 8px" }}>
            <p style={{
              fontFamily: theme.bodyFont,
              fontSize: isMobile ? 9 : 12,
              color: theme.subtext,
              opacity: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {displayTitle}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Outer Frame — wood/metal texture via multi-stop gradient */}
      <div
        className={frameStyle.hasWoodGrain ? `wood-grain-${frameStyle.grainDensity || "medium"}` : ""}
        style={{
          padding: fw,
          background: frameStyle.outerGradient || `linear-gradient(${gradAngle}deg, ${frameStyle.outerDark} 0%, ${frameStyle.outerLight} 15%, ${frameStyle.outerMid} 30%, ${frameStyle.outerLight} 45%, ${frameStyle.outerDark} 55%, ${frameStyle.outerMid} 70%, ${frameStyle.outerLight} 85%, ${frameStyle.outerDark} 100%)`,
          borderRadius: (cs.borderRadius || 16) + 4,
          position: "relative",
          overflow: "hidden",
          "--grain-angle": `${frameStyle.grainAngle || 87}deg`,
          boxShadow: frameStyle.hasWoodGrain
            ? `inset 2px 2px 4px rgba(255,255,255,0.3), inset -2px -2px 4px rgba(0,0,0,0.35), inset 4px 4px 8px rgba(255,255,255,0.1), inset -4px -4px 8px rgba(0,0,0,0.2), 4px 5px 15px ${frameStyle.shadowColor}, 8px 10px 30px ${frameStyle.shadowColor}${hovered ? `, 0 12px 50px ${cardGlow}` : ""}`
            : `inset 1px 1px 2px rgba(255,255,255,0.25), inset -1px -1px 2px rgba(0,0,0,0.25), inset 3px 3px 6px rgba(255,255,255,0.1), inset -3px -3px 6px rgba(0,0,0,0.15), 3px 4px 12px ${frameStyle.shadowColor}, 6px 8px 24px ${frameStyle.shadowColor}${hovered ? `, 0 10px 50px ${cardGlow}` : ""}`,
          transform: hovered
            ? `translateY(-6px) scale(${(cs.scale || 1) * 1.02}) rotate(0deg)`
            : `translateY(0) rotate(${effectiveRotation}deg) scale(${cs.scale || 1})`,
          transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
          cursor: "pointer",
          animation: loaded ? `fadeSlideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 60}ms both` : "none",
          opacity: loaded ? undefined : 0,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onClick(image)}
      >
        {/* Inner Groove — recessed channel inside the frame */}
        <div style={{
          padding: 2,
          background: frameStyle.grooveColor,
          borderRadius: (cs.borderRadius || 16) + 1,
          position: "relative",
          zIndex: 2,
          boxShadow: frameStyle.hasWoodGrain
            ? "inset 1px 1px 2px rgba(0,0,0,0.3), inset -1px -1px 1px rgba(255,255,255,0.1)"
            : "none",
        }}>
          {/* Mat — white/cream breathing space */}
          <div style={{
            padding: fiw,
            background: frameStyle.matColor,
            borderRadius: cs.borderRadius || 16,
            boxShadow: frameStyle.hasWoodGrain
              ? "inset 2px 2px 6px rgba(0,0,0,0.12), inset -1px -1px 4px rgba(255,255,255,0.6), inset 0 0 12px rgba(0,0,0,0.04)"
              : "inset 1px 1px 3px rgba(0,0,0,0.08), inset -1px -1px 3px rgba(255,255,255,0.5)",
          }}>
            {/* Inner Edge — thin gold/silver accent line */}
            <div style={{
              padding: 1,
              background: frameStyle.innerEdge,
              borderRadius: Math.max(0, (cs.borderRadius || 16) - 2),
            }}>
              {/* Image container */}
              <div
                style={{
                  borderRadius: Math.max(0, (cs.borderRadius || 16) - 3),
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <img
                  src={image.url}
                  alt={image.title}
                  onLoad={() => setLoaded(true)}
                  onError={() => setError(true)}
                  style={{
                    width: "100%",
                    display: "block",
                    maxHeight: isMobile ? 180 : 320,
                    objectFit: "cover",
                    filter: hovered ? "brightness(1.1)" : "brightness(1)",
                    transition: "filter 0.4s ease",
                  }}
                />

                {/* Hover overlay (title, source) — always visible on mobile */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: isMobile ? "20px 8px 8px" : "40px 12px 12px",
                    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                    opacity: isMobile ? 0.7 : (hovered ? 1 : 0),
                    transition: "opacity 0.3s ease",
                  }}
                >
                  <p
                    style={{
                      fontSize: isMobile ? 10 : 13,
                      fontWeight: 600,
                      fontFamily: theme.bodyFont,
                      color: "#fff",
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {image.title}
                  </p>
                  <p style={{ fontSize: isMobile ? 9 : 11, color: "rgba(255,255,255,0.7)", fontFamily: theme.bodyFont }}>
                    {image.source}
                  </p>
                </div>

                {/* Save button — always visible on mobile */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSaved(!saved);
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    padding: isMobile ? "3px 7px" : "4px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: saved ? theme.primary : "rgba(0,0,0,0.5)",
                    color: "#fff",
                    fontSize: isMobile ? 9 : 11,
                    fontFamily: theme.bodyFont,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    opacity: isMobile ? 0.8 : (hovered ? 1 : 0),
                    transition: "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)",
                    backdropFilter: "blur(10px)",
                    letterSpacing: 0.3,
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill={saved ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  {saved ? t.saved : t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caption — museum-style label below the frame */}
      {displayTitle && (
        <div
          style={{
            marginTop: isMobile ? 4 : 6,
            maxWidth: "100%",
            textAlign: "center",
            padding: "2px 8px",
          }}
        >
          <p
            style={{
              fontFamily: theme.bodyFont,
              fontSize: isMobile ? 9 : 12,
              color: theme.subtext,
              opacity: 0.75,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
              letterSpacing: 0.3,
              transition: "color 0.5s ease",
            }}
          >
            {displayTitle}
          </p>
        </div>
      )}
    </div>
  );
}

// --- Search results header ---
function SearchResultsHeader({ query, count, theme, t }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "baseline",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 4 : 0,
        padding: isMobile ? "12px 16px" : "16px 24px",
        maxWidth: "100%",
        margin: isMobile ? "16px 12px 0" : "24px 64px 0",
        position: "relative",
        zIndex: 1,
        background: "rgba(0, 0, 0, 0.15)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderRadius: 12,
      }}
    >
      <h2
        style={{
          fontFamily: theme.font,
          fontSize: isMobile ? 18 : 24,
          fontWeight: 700,
          color: theme.text,
          transition: "color 0.8s ease",
          wordBreak: "break-word",
        }}
      >
        {query}
      </h2>
      <span
        style={{
          fontFamily: theme.bodyFont,
          fontSize: isMobile ? 11 : 13,
          color: theme.subtext,
          flexShrink: 0,
          transition: "color 0.8s ease",
        }}
      >
        {t.imagesFound(count)}
      </span>
    </div>
  );
}

// --- Scatter layout: cards positioned freely like photos on a gallery wall ---
function ScatterLayout({ images, theme, onImageClick, t, cardStyles, cardColorAnalysis, translatedTitles, lang }) {
  const containerRef = useRef(null);
  const [positions, setPositions] = useState([]);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 480;
  const isTablet = typeof window !== "undefined" && window.innerWidth >= 480 && window.innerWidth < 768;

  // Limit displayed images
  const displayCount = isMobile ? 8 : isTablet ? 12 : 16;
  const displayImages = images.slice(0, displayCount);

  useEffect(() => {
    const calculatePositions = () => {
      const containerWidth = window.innerWidth;
      const mobile = containerWidth < 480;
      const tablet = containerWidth >= 480 && containerWidth < 768;

      // Mobile: 2 columns (gallery wall feel)
      const cols = mobile ? 2 : tablet ? 2 : 4;

      // Card size: compact on mobile for 2-col scatter
      const mobileCardWidth = Math.floor((containerWidth - 48) / 2);
      const currentCardWidth = mobile ? Math.min(mobileCardWidth, 170) : tablet ? 260 : 300;

      const minPadding = mobile ? 12 : 40;
      const cellWidth = containerWidth / cols;
      const cardHeight = mobile ? 200 : 340;
      const cellHeight = cardHeight + minPadding + (mobile ? 30 : 60);

      const maxOffsetX = Math.max(0, (cellWidth - currentCardWidth - minPadding) / 2);
      const maxOffsetY = mobile ? 15 : 30;

      const newPositions = displayImages.map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const cellX = col * cellWidth;
        const cellY = row * cellHeight;

        const centerX = cellX + (cellWidth - currentCardWidth) / 2;
        const centerY = cellY + minPadding / 2;

        // Random offset for scatter feel (even on mobile)
        const offsetX = Math.sin((_globalSeed + i * 3571) * 0.0001) * maxOffsetX;
        const offsetY = Math.cos((_globalSeed + i * 7919) * 0.0001) * maxOffsetY;

        return {
          x: Math.max(4, Math.min(containerWidth - currentCardWidth - 4, centerX + offsetX)),
          y: Math.max(0, centerY + offsetY),
          width: currentCardWidth,
        };
      });

      setPositions(newPositions);
    };

    calculatePositions();
    window.addEventListener("resize", calculatePositions);
    return () => window.removeEventListener("resize", calculatePositions);
  }, [displayImages.length]);

  // Calculate container height from card positions
  const containerHeight = positions.length > 0
    ? Math.max(...positions.map(p => p.y)) + (isMobile ? 300 : 470)
    : 800;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        minHeight: containerHeight,
        zIndex: 1,
        padding: isMobile ? "12px 0" : "20px 0",
      }}
    >
      {displayImages.map((img, i) => {
        const pos = positions[i];
        if (!pos) return null;
        return (
          <div
            key={img.id}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: pos.width || 300,
              transition: "left 0.6s cubic-bezier(0.23, 1, 0.32, 1), top 0.6s cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            <ImageCard
              image={img}
              index={i}
              theme={theme}
              onClick={onImageClick}
              t={t}
              cardStyle={cardStyles[i] || null}
              colorAnalysis={cardColorAnalysis ? cardColorAnalysis[i] : null}
              displayTitle={
                lang === "ja" && translatedTitles && translatedTitles[img.id]
                  ? translatedTitles[img.id]
                  : (img.formattedTitle || img.title || "")
              }
              lang={lang}
            />
          </div>
        );
      })}
    </div>
  );
}

// --- Lightbox ---
function Lightbox({ image, theme, onClose, translatedTitles, lang }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  useEffect(() => {
    if (!image) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 16 : 40,
        animation: "fadeSlideUp 0.3s ease",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: isMobile ? 12 : 20,
          right: isMobile ? 12 : 24,
          width: isMobile ? 36 : 40,
          height: isMobile ? 36 : 40,
          borderRadius: 10,
          border: `1px solid ${theme.border}`,
          background: "rgba(255,255,255,0.1)",
          color: theme.text,
          fontSize: 20,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(10px)",
          transition: "all 0.3s ease",
        }}
      >
        ✕
      </button>
      <img
        src={image.url}
        alt={image.title}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? "95vw" : "90vw",
          maxHeight: isMobile ? "75vh" : "85vh",
          borderRadius: isMobile ? 8 : 16,
          boxShadow: `0 0 60px ${theme.glow}, 0 0 120px ${theme.glow}`,
          objectFit: "contain",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: isMobile ? 16 : 30,
          textAlign: "center",
          fontFamily: theme.bodyFont,
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
          {lang === "ja" && translatedTitles && translatedTitles[image.id]
            ? translatedTitles[image.id]
            : (image.formattedTitle || image.title)}
        </p>
        <p style={{ fontSize: 13, color: theme.subtext }}>{image.source}</p>
      </div>
    </div>
  );
}

// --- Loading spinner ---
function Loading({ theme, t }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: `3px solid ${theme.border}`,
          borderTopColor: theme.accent,
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite, pulseGlow 2s ease-in-out infinite",
          marginBottom: 16,
        }}
      />
      <p style={{ fontFamily: theme.bodyFont, fontSize: 15, color: theme.subtext }}>
        {t.discovering}
      </p>
    </div>
  );
}

// ======================
// Main App Component
// ======================
export default function Visushift() {
  const [query, setQuery] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [theme, setTheme] = useState(makeDefaultTheme);
  const [bgImages, setBgImages] = useState([]);
  const [lang, setLang] = useState("ja");
  const [cardStyles, setCardStyles] = useState([]);
  const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES[0]);
  const [cardColorAnalysis, setCardColorAnalysis] = useState([]);
  const [translatedTitles, setTranslatedTitles] = useState({});
  const [imageSource, setImageSource] = useState(() => {
    if (PIXABAY_API_KEY) return "pixabay";
    if (UNSPLASH_ACCESS_KEY) return "unsplash";
    return "unsplash";
  });

  // Race condition protection: track current search to ignore stale results
  const searchIdRef = useRef(0);

  const t = I18N[lang];

  const handleToggleLang = useCallback(() => {
    setLang((prev) => (prev === "en" ? "ja" : "en"));
  }, []);

  const handleToggleSource = useCallback(() => {
    setImageSource((prev) => prev === "unsplash" ? "pixabay" : "unsplash");
  }, []);

  const handleSearch = useCallback(async (searchQuery, skipPushState = false) => {
    // Increment search ID to invalidate any in-flight previous search
    const currentSearchId = ++searchIdRef.current;

    setQuery(searchQuery);
    setSearched(true);
    setLoading(true);
    setImages([]);
    setBgImages([]);

    // Add browser history entry (back/forward support)
    if (!skipPushState) {
      window.history.pushState({ query: searchQuery }, "", `?q=${encodeURIComponent(searchQuery)}`);
    }

    // Reset random seed for this search (time-based)
    resetRandomSeed();

    // Seed combines query hash + time-based seed for variety per search
    // Same search within one session gets different results each time,
    // but everything within a single search is internally consistent
    const seed = queryHash(searchQuery) + _globalSeed;

    // Detect fonts immediately from query
    const fonts = detectFonts(searchQuery);
    // Apply fonts to current (default) theme immediately
    setTheme((prev) => ({ ...prev, font: fonts.font, bodyFont: fonts.bodyFont }));

    // Select layout mode (seeded per search for variety, but stable within one search)
    const layoutIndex = Math.floor(seededRandom(seed) * LAYOUT_MODES.length);
    const selectedLayout = { ...LAYOUT_MODES[layoutIndex] };
    if (selectedLayout.name === "asymmetric") {
      selectedLayout.flexPatternIndex = Math.floor(seededRandom(seed + 77) * 3);
    }
    setLayoutMode(selectedLayout);

    setHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== searchQuery.toLowerCase());
      return [searchQuery, ...filtered].slice(0, 8);
    });

    // Translate Japanese to English only for Unsplash mode
    // Pixabay supports Japanese queries natively
    let searchTerm = searchQuery;
    if (imageSource === "unsplash" && containsJapanese(searchQuery)) {
      searchTerm = await translateToEnglish(searchQuery);
    }

    // Stale check after async translation
    if (searchIdRef.current !== currentSearchId) return;

    // Re-detect fonts using translated query (English patterns may match)
    if (searchTerm !== searchQuery) {
      const fontsFromTranslated = detectFonts(searchTerm);
      if (fontsFromTranslated !== DEFAULT_FONTS) {
        setTheme((prev) => ({ ...prev, font: fontsFromTranslated.font, bodyFont: fontsFromTranslated.bodyFont }));
      }
    }

    const results = await fetchImages(searchTerm, imageSource, seed);

    // Stale check after async fetch
    if (searchIdRef.current !== currentSearchId) return;

    setImages(results);
    setCardColorAnalysis([]);

    // Per-card color analysis (async, non-blocking, with stale guard)
    const analysisDisplayCount = window.innerWidth < 480 ? 8 : window.innerWidth < 768 ? 12 : 16;
    const analysisTargets = results.slice(0, analysisDisplayCount);
    Promise.allSettled(
      analysisTargets.map((img) => analyzeImageColors(img.url))
    ).then((settled) => {
      // Only apply if this search is still current
      if (searchIdRef.current !== currentSearchId) return;
      const analyses = settled.map((s) => s.status === "fulfilled" ? s.value : null);
      setCardColorAnalysis(analyses);
    });

    // Generate random card styles
    const styles = results.map((_, i) => ({
      borderRadius: randomInRange(8, 32, i),
      rotation: randomInRange(-4, 4, i),
      scale: randomInRange(0.85, 1.1, i),
      paddingBottom: randomInRange(0, 8, i),
      marginTop: 0,
      marginLeft: 0,
      // Frame parameters
      frameWidth: randomInRange(8, 20, i + 100),
      frameInnerWidth: randomInRange(3, 8, i + 200),
      frameBevel: randomInRange(0, 1, i + 300) > 0.5,
      frameGradientAngle: Math.round(randomInRange(120, 200, i + 400)),
    }));
    setCardStyles(styles);

    // Set background images (first 6)
    const bgUrls = results.slice(0, 6).map((img) => img.url);
    setBgImages(bgUrls);

    // Extract colors → apply theme BEFORE hiding loader
    try {
      const colors = await extractColorsFromImages(results, 5, searchQuery);

      // Stale check after async color extraction
      if (searchIdRef.current !== currentSearchId) return;

      const palette = generatePalette(colors);

      // Temperature-based font selection (seeded for determinism)
      let finalFonts = fonts;
      const temp = getColorTemperature(palette);
      const tempFontOptions = TEMPERATURE_FONTS[temp];
      if (fonts === DEFAULT_FONTS || seededRandom(seed + 999) < 0.3) {
        finalFonts = tempFontOptions[Math.floor(seededRandom(seed + 888) * tempFontOptions.length)];
      }

      const dynamicTheme = createDynamicTheme(palette, finalFonts);
      setTheme(dynamicTheme);
    } catch {
      // If color extraction fails, keep default theme with fonts applied
    }

    // Hide loader last so theme+background are already applied
    if (searchIdRef.current === currentSearchId) {
      setLoading(false);
    }
  }, [imageSource]);

  const handleReset = useCallback((skipPushState = false) => {
    setQuery("");
    setImages([]);
    setSearched(false);
    setBgImages([]);
    setTheme(makeDefaultTheme());
    setCardStyles([]);
    setCardColorAnalysis([]);
    setTranslatedTitles({});
    setLayoutMode(LAYOUT_MODES[0]);

    if (!skipPushState) {
      window.history.pushState({ query: "" }, "", "/");
    }
  }, []);

  const closeLightbox = useCallback(() => setLightboxImage(null), []);

  // Browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event) => {
      const state = event.state;
      if (state && state.query) {
        handleSearch(state.query, true);
      } else {
        handleReset(true);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [handleSearch, handleReset]);

  // Load search from URL query parameter on initial page load
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) {
        handleSearch(q, true);
      }
    }
  }, [handleSearch]);

  useEffect(() => {
    if (lightboxImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxImage]);

  // Translate image titles to Japanese when in ja mode
  useEffect(() => {
    if (lang !== "ja" || images.length === 0) {
      setTranslatedTitles({});
      return;
    }

    let cancelled = false;
    const translateAll = async () => {
      const displayCount = window.innerWidth < 480 ? 8 : window.innerWidth < 768 ? 12 : 16;
      const targets = images.slice(0, displayCount);
      const results = {};

      await Promise.allSettled(
        targets.map(async (img) => {
          // Use formatted title for translation (cleaner than raw tags)
          const title = img.formattedTitle || img.title || "";
          if (!title || containsJapanese(title)) {
            results[img.id] = title;
            return;
          }
          const translated = await translateToJapanese(title);
          if (!cancelled) {
            results[img.id] = translated;
          }
        })
      );

      if (!cancelled) {
        setTranslatedTitles(results);
      }
    };

    translateAll();
    return () => { cancelled = true; };
  }, [images, lang]);

  return (
    <>
      <GlobalStyles theme={theme} />
      <ImmersiveBackground bgImages={bgImages} theme={theme} />
      <Header theme={theme} query={query} onSearch={handleSearch} onReset={handleReset} lang={lang} onToggleLang={handleToggleLang} t={t} layoutMode={layoutMode} imageSource={imageSource} onToggleSource={handleToggleSource} />

      {!searched ? (
        <Landing theme={theme} onSearch={handleSearch} history={history} lang={lang} t={t} />
      ) : loading ? (
        <Loading theme={theme} t={t} />
      ) : (
        <>
          <SearchResultsHeader query={query} count={images.length} theme={theme} t={t} />
          <ScatterLayout images={images} theme={theme} onImageClick={setLightboxImage} t={t} cardStyles={cardStyles} cardColorAnalysis={cardColorAnalysis} translatedTitles={translatedTitles} lang={lang} />
        </>
      )}

      <Lightbox image={lightboxImage} theme={theme} onClose={closeLightbox} translatedTitles={translatedTitles} lang={lang} />
    </>
  );
}
