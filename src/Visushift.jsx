import { useState, useEffect, useRef, useCallback } from "react";

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || "";

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

// --- Image fetching ---
async function fetchImages(query) {
  if (UNSPLASH_ACCESS_KEY) {
    try {
      const randomPage = Math.floor(Math.random() * 5) + 1;
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&page=${randomPage}&order_by=relevant&client_id=${UNSPLASH_ACCESS_KEY}`
      );
      if (!res.ok) throw new Error("Unsplash API error");
      const data = await res.json();
      // Fisher-Yates shuffle
      const shuffled = [...data.results];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.map((photo) => ({
        id: photo.id,
        url: photo.urls.regular,
        title: photo.description || photo.alt_description || query,
        source: photo.user.name,
        color: photo.color,
      }));
    } catch {
      // fall through to Picsum
    }
  }
  const timestamp = Date.now();
  return Array.from({ length: 20 }, (_, i) => {
    const w = 400 + (i % 3) * 100;
    const h = 300 + ((i * 7) % 5) * 100;
    const seed = `${query}${timestamp}${i}`;
    return {
      id: `picsum-${seed}`,
      url: `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`,
      title: `${query} #${i + 1}`,
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
      `}</style>
    </>
  );
}

// --- Background layers (immersive image-based background) ---
function ImmersiveBackground({ bgImages, theme }) {
  // bgImages: array of image URLs for the blurred collage
  // Only render when there are images (search results displayed)
  if (!bgImages || bgImages.length === 0) return null;

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
      {/* Layer 1: Blurred image collage */}
      {bgImages.map((url, i) => (
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
function Header({ theme, query, onSearch, onReset, lang, onToggleLang, t, layoutMode }) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

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
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        transition: "border-color 0.8s ease",
      }}
    >
      <div
        onClick={() => onReset()}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontFamily: theme.font,
            fontSize: 22,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.accent}, ${theme.secondary})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            transition: "all 0.8s ease",
          }}
        >
          Visushift
        </span>
      </div>

      <div style={{ flex: 1, maxWidth: 560, display: "flex", gap: 8 }}>
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
              padding: "10px 16px",
              borderRadius: 12,
              border: `1px solid ${focused ? theme.accent : theme.border}`,
              background: "rgba(255,255,255,0.07)",
              color: theme.text,
              fontSize: 15,
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
            padding: "10px 20px",
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onToggleLang}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: "rgba(255,255,255,0.07)",
            color: theme.subtext,
            fontSize: 12,
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
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: theme.accent,
            boxShadow: `0 0 8px ${theme.glow}`,
            transition: "all 0.8s ease",
          }}
        />
        {/* Layout mode indicator (uncomment for debugging)
        <span style={{ fontSize: 10, color: theme.subtext, opacity: 0.5 }}>
          {layoutMode.name}
        </span>
        */}
      </div>
    </header>
  );
}

// --- Landing page ---
function Landing({ theme, onSearch, history, lang, t }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 64px)",
        padding: "60px 24px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.secondary})`,
          opacity: 0.7,
          animation: "float 3s ease-in-out infinite",
          marginBottom: 24,
          filter: "blur(1px)",
        }}
      />
      <h1
        style={{
          fontFamily: theme.font,
          fontSize: "clamp(32px, 5vw, 56px)",
          fontWeight: 700,
          marginBottom: 12,
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.secondary}, ${theme.primary})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textAlign: "center",
          transition: "all 0.8s ease",
        }}
      >
        {t.heroTitle}
      </h1>
      <p
        style={{
          fontFamily: theme.bodyFont,
          fontSize: 17,
          color: theme.subtext,
          marginBottom: 40,
          textAlign: "center",
          maxWidth: 480,
          lineHeight: 1.6,
          transition: "color 0.8s ease",
        }}
      >
        {t.heroSubtitle}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "center",
          maxWidth: 600,
          marginBottom: 40,
        }}
      >
        {SUGGEST_CHIPS[lang].map((chip, i) => (
          <button
            key={SUGGEST_CHIPS.en[i]}
            onClick={() => onSearch(SUGGEST_CHIPS.en[i])}
            style={{
              padding: "8px 20px",
              borderRadius: 20,
              border: `1px solid ${theme.border}`,
              background: "rgba(255,255,255,0.06)",
              color: theme.text,
              fontFamily: theme.bodyFont,
              fontSize: 14,
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
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: 13,
              color: theme.subtext,
              marginBottom: 12,
              fontFamily: theme.bodyFont,
              opacity: 0.7,
            }}
          >
            {t.recentSearches}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {history.map((item, i) => (
              <button
                key={`${item}-${i}`}
                onClick={() => onSearch(item)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 16,
                  border: `1px solid ${theme.border}`,
                  background: "rgba(255,255,255,0.03)",
                  color: theme.subtext,
                  fontFamily: theme.bodyFont,
                  fontSize: 12,
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

// --- Generate frame colors from image color or theme ---
function generateFrameColors(imageColor, theme) {
  if (imageColor) {
    const c = hexToRgb(imageColor);
    if (c) {
      // Frame body: darken image color
      const frame = {
        r: Math.max(0, Math.round(c.r * 0.35)),
        g: Math.max(0, Math.round(c.g * 0.35)),
        b: Math.max(0, Math.round(c.b * 0.35)),
      };
      // Mat: very light version (off-white tint)
      const mat = {
        r: Math.min(255, Math.round(c.r * 0.3 + 200)),
        g: Math.min(255, Math.round(c.g * 0.3 + 195)),
        b: Math.min(255, Math.round(c.b * 0.3 + 190)),
      };
      // Accent line: gold-ish tint
      const accent = {
        r: Math.min(255, Math.round(c.r * 0.5 + 140)),
        g: Math.min(255, Math.round(c.g * 0.4 + 120)),
        b: Math.min(255, Math.round(c.b * 0.2 + 60)),
      };
      return {
        frame: `rgb(${frame.r}, ${frame.g}, ${frame.b})`,
        mat: `rgb(${mat.r}, ${mat.g}, ${mat.b})`,
        accent: `rgb(${accent.r}, ${accent.g}, ${accent.b})`,
        shadow: `rgba(${frame.r}, ${frame.g}, ${frame.b}, 0.5)`,
      };
    }
  }
  // Fallback: theme-based
  return {
    frame: "rgb(40, 30, 25)",
    mat: "rgb(240, 235, 228)",
    accent: "rgb(180, 155, 100)",
    shadow: "rgba(0, 0, 0, 0.4)",
  };
}

// --- ImageCard with per-card color glow and dynamic frame ---
function ImageCard({ image, index, theme, onClick, t, cardStyle }) {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  // Card style defaults
  const cs = cardStyle || { borderRadius: 16, rotation: 0, scale: 1, paddingBottom: 0, marginTop: 0, marginLeft: 0, frameWidth: 12, frameInnerWidth: 3, frameBevel: true, frameGradientAngle: 145 };
  const isMobile = typeof window !== "undefined" && window.innerWidth < 480;
  const effectiveRotation = isMobile ? 0 : cs.rotation;

  // Determine per-card glow color from image.color (Unsplash HEX) or fallback
  const cardGlow = (() => {
    if (image.color) {
      const parsed = hexToRgb(image.color);
      if (parsed) return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, 0.37)`;
    }
    return theme.glow;
  })();

  // Frame parameters (mobile: halve frame width)
  const frameColors = generateFrameColors(image.color, theme);
  const fw = isMobile ? Math.round((cs.frameWidth || 12) / 2) : (cs.frameWidth || 12);
  const fiw = isMobile ? Math.max(1, Math.round((cs.frameInnerWidth || 3) / 2)) : (cs.frameInnerWidth || 3);
  const hasBevel = cs.frameBevel !== false;
  const gradAngle = cs.frameGradientAngle || 145;

  // Shared frame wrapper style
  const frameWrapperStyle = {
    padding: fw,
    background: `linear-gradient(${gradAngle}deg, ${frameColors.frame}, ${frameColors.accent} 20%, ${frameColors.frame} 40%, ${frameColors.accent} 60%, ${frameColors.frame} 80%, ${frameColors.accent})`,
    borderRadius: (cs.borderRadius || 16) + 4,
    boxShadow: hasBevel
      ? `inset 2px 2px 4px rgba(255,255,255,0.15), inset -2px -2px 4px rgba(0,0,0,0.3), 4px 6px 20px ${frameColors.shadow}, ${hovered ? `0 8px 40px ${cardGlow}` : "0 2px 8px rgba(0,0,0,0.3)"}`
      : `4px 6px 20px ${frameColors.shadow}, ${hovered ? `0 8px 40px ${cardGlow}` : "0 2px 8px rgba(0,0,0,0.3)"}`,
    transform: hovered
      ? `translateY(-4px) scale(${(cs.scale || 1) * 1.02}) rotate(0deg)`
      : `translateY(0) rotate(${effectiveRotation}deg) scale(${cs.scale || 1})`,
    transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
    cursor: "pointer",
  };

  // Mat (inner white border) style
  const matStyle = {
    padding: fiw,
    background: frameColors.mat,
    borderRadius: cs.borderRadius || 16,
  };

  if (error) {
    const errorFrameColors = {
      frame: "rgb(40, 30, 25)",
      mat: "rgb(240, 235, 228)",
      accent: "rgb(180, 155, 100)",
      shadow: "rgba(0, 0, 0, 0.4)",
    };
    return (
      <div
        style={{
          padding: fw,
          background: `linear-gradient(${gradAngle}deg, ${errorFrameColors.frame}, ${errorFrameColors.accent} 20%, ${errorFrameColors.frame} 40%, ${errorFrameColors.accent} 60%, ${errorFrameColors.frame} 80%, ${errorFrameColors.accent})`,
          borderRadius: (cs.borderRadius || 16) + 4,
          boxShadow: hasBevel
            ? `inset 2px 2px 4px rgba(255,255,255,0.15), inset -2px -2px 4px rgba(0,0,0,0.3), 4px 6px 20px ${errorFrameColors.shadow}, 0 2px 8px rgba(0,0,0,0.3)`
            : `4px 6px 20px ${errorFrameColors.shadow}, 0 2px 8px rgba(0,0,0,0.3)`,
          animation: `fadeSlideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 60}ms both`,
        }}
      >
        <div style={{ padding: fiw, background: errorFrameColors.mat, borderRadius: cs.borderRadius || 16 }}>
          <div
            style={{
              borderRadius: Math.max(0, (cs.borderRadius || 16) - 2),
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
    );
  }

  return (
    <div
      style={{
        ...frameWrapperStyle,
        animation: loaded ? `fadeSlideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 60}ms both` : "none",
        opacity: loaded ? undefined : 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(image)}
    >
      {/* Mat (inner white border) */}
      <div style={matStyle}>
        {/* Image container */}
        <div
          style={{
            borderRadius: Math.max(0, (cs.borderRadius || 16) - 2),
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
              maxHeight: isMobile ? "none" : 320,
              objectFit: "cover",
              filter: hovered ? "brightness(1.1)" : "brightness(1)",
              transition: "filter 0.4s ease",
            }}
          />

          {/* Hover overlay (title, source) */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "40px 12px 12px",
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.3s ease",
            }}
          >
            <p
              style={{
                fontSize: 13,
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
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: theme.bodyFont }}>
              {image.source}
            </p>
          </div>

          {/* Save button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSaved(!saved);
            }}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              padding: "4px 10px",
              borderRadius: 8,
              border: "none",
              background: saved ? theme.primary : "rgba(0,0,0,0.5)",
              color: "#fff",
              fontSize: 11,
              fontFamily: theme.bodyFont,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: hovered ? 1 : 0,
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
  );
}

// --- Search results header ---
function SearchResultsHeader({ query, count, theme, t }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "16px 24px",
        maxWidth: "100%",
        margin: "24px 64px 0",
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
          fontSize: 24,
          fontWeight: 700,
          color: theme.text,
          transition: "color 0.8s ease",
        }}
      >
        {query}
      </h2>
      <span
        style={{
          fontFamily: theme.bodyFont,
          fontSize: 13,
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

// --- Scatter layout: cards positioned freely like photos on a wall ---
function ScatterLayout({ images, theme, onImageClick, t, cardStyles }) {
  const containerRef = useRef(null);
  const [positions, setPositions] = useState([]);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 480;
  const isTablet = typeof window !== "undefined" && window.innerWidth >= 480 && window.innerWidth < 768;

  // Card size (smaller on PC for more background visibility)
  const cardWidth = isMobile ? 300 : isTablet ? 260 : 300;

  // Limit displayed images (scatter doesn't need all 20)
  const displayCount = isMobile ? 8 : isTablet ? 12 : 16;
  const displayImages = images.slice(0, displayCount);

  useEffect(() => {
    const calculatePositions = () => {
      const containerWidth = window.innerWidth;
      const mobile = containerWidth < 480;
      const tablet = containerWidth >= 480 && containerWidth < 768;
      const cols = mobile ? 1 : tablet ? 2 : 4;

      // Cell size = card width + minimum padding to guarantee no overlap
      const minPadding = 40;
      const cellWidth = containerWidth / cols;
      const cardHeight = 340;
      const cellHeight = cardHeight + minPadding + 60;

      // Max offset within cell (stays inside cell boundaries)
      const maxOffsetX = Math.max(0, (cellWidth - cardWidth - minPadding) / 2);
      const maxOffsetY = Math.max(0, 30);

      const newPositions = displayImages.map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);

        // Cell top-left
        const cellX = col * cellWidth;
        const cellY = row * cellHeight;

        // Center card within cell
        const centerX = cellX + (cellWidth - cardWidth) / 2;
        const centerY = cellY + minPadding / 2;

        // Random offset within cell (never exceeds cell bounds)
        const offsetX = mobile ? 0 : Math.sin((_globalSeed + i * 3571) * 0.0001) * maxOffsetX;
        const offsetY = mobile ? 0 : Math.cos((_globalSeed + i * 7919) * 0.0001) * maxOffsetY;

        return {
          x: Math.max(8, Math.min(containerWidth - cardWidth - 8, centerX + offsetX)),
          y: Math.max(0, centerY + offsetY),
        };
      });

      setPositions(newPositions);
    };

    calculatePositions();
    window.addEventListener("resize", calculatePositions);
    return () => window.removeEventListener("resize", calculatePositions);
  }, [displayImages.length, cardWidth]);

  // Calculate container height from card positions
  const containerHeight = positions.length > 0
    ? Math.max(...positions.map(p => p.y)) + 450
    : 800;

  // Mobile: simple vertical flow with generous gap
  if (isMobile) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 32,
        padding: "24px 16px 80px",
        position: "relative",
        zIndex: 1,
      }}>
        {displayImages.map((img, i) => (
          <div key={img.id} style={{ width: "100%", maxWidth: 340 }}>
            <ImageCard
              image={img}
              index={i}
              theme={theme}
              onClick={onImageClick}
              t={t}
              cardStyle={cardStyles[i] || null}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        minHeight: containerHeight,
        zIndex: 1,
        padding: "20px 0",
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
              width: cardWidth,
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
            />
          </div>
        );
      })}
    </div>
  );
}

// --- Lightbox ---
function Lightbox({ image, theme, onClose }) {
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
        padding: 40,
        animation: "fadeSlideUp 0.3s ease",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 24,
          width: 40,
          height: 40,
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
          maxWidth: "90vw",
          maxHeight: "85vh",
          borderRadius: 16,
          boxShadow: `0 0 60px ${theme.glow}, 0 0 120px ${theme.glow}`,
          objectFit: "contain",
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 30,
          textAlign: "center",
          fontFamily: theme.bodyFont,
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
          {image.title}
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
  const [lang, setLang] = useState("en");
  const [cardStyles, setCardStyles] = useState([]);
  const [layoutMode, setLayoutMode] = useState(LAYOUT_MODES[0]);

  const t = I18N[lang];

  const handleToggleLang = useCallback(() => {
    setLang((prev) => (prev === "en" ? "ja" : "en"));
  }, []);

  const handleSearch = useCallback(async (searchQuery, skipPushState = false) => {
    setQuery(searchQuery);
    setSearched(true);
    setLoading(true);
    setImages([]);
    setBgImages([]);

    // Add browser history entry (back/forward support)
    if (!skipPushState) {
      window.history.pushState({ query: searchQuery }, "", `?q=${encodeURIComponent(searchQuery)}`);
    }

    // Reset random seed for this search
    resetRandomSeed();

    // Detect fonts immediately from query
    const fonts = detectFonts(searchQuery);
    // Apply fonts to current (default) theme immediately
    setTheme((prev) => ({ ...prev, font: fonts.font, bodyFont: fonts.bodyFont }));

    // Select random layout mode
    const randomLayout = { ...LAYOUT_MODES[Math.floor(Math.random() * LAYOUT_MODES.length)] };
    if (randomLayout.name === "asymmetric") {
      randomLayout.flexPatternIndex = Math.floor(Math.random() * 3);
    }
    setLayoutMode(randomLayout);

    setHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== searchQuery.toLowerCase());
      return [searchQuery, ...filtered].slice(0, 8);
    });

    // Translate Japanese to English for image search
    let searchTerm = searchQuery;
    if (containsJapanese(searchQuery)) {
      searchTerm = await translateToEnglish(searchQuery);
    }

    // Re-detect fonts using translated query (English patterns may match)
    const fontsFromTranslated = detectFonts(searchTerm);
    if (fontsFromTranslated !== DEFAULT_FONTS) {
      setTheme((prev) => ({ ...prev, font: fontsFromTranslated.font, bodyFont: fontsFromTranslated.bodyFont }));
    }

    const results = await fetchImages(searchTerm);
    setImages(results);

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
      frameInnerWidth: randomInRange(2, 6, i + 200),
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
      const palette = generatePalette(colors);

      // Temperature-based font selection
      let finalFonts = fonts;
      const temp = getColorTemperature(palette);
      const tempFontOptions = TEMPERATURE_FONTS[temp];
      if (fonts === DEFAULT_FONTS || Math.random() < 0.3) {
        finalFonts = tempFontOptions[Math.floor(Math.random() * tempFontOptions.length)];
      }

      const dynamicTheme = createDynamicTheme(palette, finalFonts);
      setTheme(dynamicTheme);
    } catch {
      // If color extraction fails, keep default theme with fonts applied
    }

    // Hide loader last so theme+background are already applied
    setLoading(false);
  }, []);

  const handleReset = useCallback((skipPushState = false) => {
    setQuery("");
    setImages([]);
    setSearched(false);
    setBgImages([]);
    setTheme(makeDefaultTheme());
    setCardStyles([]);
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

  return (
    <>
      <GlobalStyles theme={theme} />
      <ImmersiveBackground bgImages={bgImages} theme={theme} />
      <Header theme={theme} query={query} onSearch={handleSearch} onReset={handleReset} lang={lang} onToggleLang={handleToggleLang} t={t} layoutMode={layoutMode} />

      {!searched ? (
        <Landing theme={theme} onSearch={handleSearch} history={history} lang={lang} t={t} />
      ) : loading ? (
        <Loading theme={theme} t={t} />
      ) : (
        <>
          <SearchResultsHeader query={query} count={images.length} theme={theme} t={t} />
          <ScatterLayout images={images} theme={theme} onImageClick={setLightboxImage} t={t} cardStyles={cardStyles} />
        </>
      )}

      <Lightbox image={lightboxImage} theme={theme} onClose={closeLightbox} />
    </>
  );
}
