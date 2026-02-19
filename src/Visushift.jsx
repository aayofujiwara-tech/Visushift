import { useState, useEffect, useRef, useCallback } from "react";

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || "";

const THEMES = {
  nature: {
    primary: "#2d6a4f",
    secondary: "#40916c",
    accent: "#95d5b2",
    bg: "linear-gradient(135deg, #0b1a0f 0%, #1b4332 50%, #0b1a0f 100%)",
    cardBg: "rgba(45, 106, 79, 0.15)",
    border: "rgba(149, 213, 178, 0.25)",
    glow: "rgba(149, 213, 178, 0.4)",
    text: "#d8f3dc",
    subtext: "#95d5b2",
    font: "'Playfair Display', serif",
    bodyFont: "'Source Sans 3', sans-serif",
    emoji: "🌿",
    mood: "Nature",
  },
  space: {
    primary: "#7b2cbf",
    secondary: "#9d4edd",
    accent: "#e0aaff",
    bg: "linear-gradient(135deg, #10002b 0%, #240046 50%, #10002b 100%)",
    cardBg: "rgba(123, 44, 191, 0.15)",
    border: "rgba(224, 170, 255, 0.25)",
    glow: "rgba(224, 170, 255, 0.4)",
    text: "#e0aaff",
    subtext: "#c77dff",
    font: "'Orbitron', sans-serif",
    bodyFont: "'Exo 2', sans-serif",
    emoji: "🚀",
    mood: "Space",
  },
  ocean: {
    primary: "#0077b6",
    secondary: "#00b4d8",
    accent: "#90e0ef",
    bg: "linear-gradient(135deg, #03071e 0%, #023e8a 50%, #03071e 100%)",
    cardBg: "rgba(0, 119, 182, 0.15)",
    border: "rgba(144, 224, 239, 0.25)",
    glow: "rgba(144, 224, 239, 0.4)",
    text: "#caf0f8",
    subtext: "#90e0ef",
    font: "'Cormorant Garamond', serif",
    bodyFont: "'Nunito', sans-serif",
    emoji: "🌊",
    mood: "Ocean",
  },
  food: {
    primary: "#e85d04",
    secondary: "#f48c06",
    accent: "#ffba08",
    bg: "linear-gradient(135deg, #1a0a00 0%, #6a2c0a 50%, #1a0a00 100%)",
    cardBg: "rgba(232, 93, 4, 0.15)",
    border: "rgba(255, 186, 8, 0.25)",
    glow: "rgba(255, 186, 8, 0.4)",
    text: "#ffe8cc",
    subtext: "#ffba08",
    font: "'Abril Fatface', serif",
    bodyFont: "'Lato', sans-serif",
    emoji: "🍽️",
    mood: "Food",
  },
  architecture: {
    primary: "#6c757d",
    secondary: "#adb5bd",
    accent: "#e9ecef",
    bg: "linear-gradient(135deg, #0a0a0a 0%, #2b2b2b 50%, #0a0a0a 100%)",
    cardBg: "rgba(108, 117, 125, 0.15)",
    border: "rgba(233, 236, 239, 0.25)",
    glow: "rgba(233, 236, 239, 0.3)",
    text: "#f8f9fa",
    subtext: "#adb5bd",
    font: "'DM Serif Display', serif",
    bodyFont: "'Libre Franklin', sans-serif",
    emoji: "🏛️",
    mood: "Architecture",
  },
  art: {
    primary: "#c9184a",
    secondary: "#ff4d6d",
    accent: "#ff8fa3",
    bg: "linear-gradient(135deg, #1a0011 0%, #590d22 50%, #1a0011 100%)",
    cardBg: "rgba(201, 24, 74, 0.15)",
    border: "rgba(255, 143, 163, 0.25)",
    glow: "rgba(255, 143, 163, 0.4)",
    text: "#ffccd5",
    subtext: "#ff8fa3",
    font: "'Bodoni Moda', serif",
    bodyFont: "'Karla', sans-serif",
    emoji: "🎨",
    mood: "Art",
  },
  default: {
    primary: "#d00000",
    secondary: "#e85d04",
    accent: "#ffd60a",
    bg: "linear-gradient(135deg, #1a0000 0%, #370617 50%, #1a0000 100%)",
    cardBg: "rgba(208, 0, 0, 0.15)",
    border: "rgba(255, 214, 10, 0.25)",
    glow: "rgba(255, 214, 10, 0.4)",
    text: "#fff1d0",
    subtext: "#ffd60a",
    font: "'Sora', sans-serif",
    bodyFont: "'Outfit', sans-serif",
    emoji: "🔍",
    mood: "Explore",
  },
};

const THEME_PATTERNS = [
  { key: "nature", regex: /nature|forest|flower|garden|tree|leaf|plant|green/i },
  { key: "space", regex: /space|galaxy|star|planet|cosmos|universe|nebula|astronaut/i },
  { key: "ocean", regex: /ocean|sea|beach|underwater|wave|marine|coral|fish/i },
  { key: "food", regex: /food|cook|recipe|sushi|cake|pizza|restaurant|meal|cuisine|dish/i },
  { key: "architecture", regex: /building|house|city|tower|architecture|bridge|skyscraper|urban/i },
  { key: "art", regex: /art|paint|museum|abstract|drawing|sculpture|gallery|canvas/i },
];

const SUGGEST_CHIPS = [
  "Nature", "Space", "Ocean", "Food", "Architecture",
  "Art", "Mountains", "Flowers", "Cities", "Animals",
];

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+3:wght@400;600&family=Orbitron:wght@400;700&family=Exo+2:wght@400;600&family=Cormorant+Garamond:wght@400;700&family=Nunito:wght@400;600&family=Abril+Fatface&family=Lato:wght@400;700&family=DM+Serif+Display&family=Libre+Franklin:wght@400;600&family=Bodoni+Moda:wght@400;700&family=Karla:wght@400;600&family=Sora:wght@400;700&family=Outfit:wght@400;600&display=swap";

function detectTheme(query) {
  if (!query) return "default";
  for (const { key, regex } of THEME_PATTERNS) {
    if (regex.test(query)) return key;
  }
  return "default";
}

async function fetchImages(query) {
  if (UNSPLASH_ACCESS_KEY) {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=${UNSPLASH_ACCESS_KEY}`
      );
      if (!res.ok) throw new Error("Unsplash API error");
      const data = await res.json();
      return data.results.map((photo) => ({
        id: photo.id,
        url: photo.urls.regular,
        title: photo.description || photo.alt_description || query,
        source: photo.user.name,
      }));
    } catch {
      // fall through to Picsum
    }
  }
  return Array.from({ length: 20 }, (_, i) => {
    const w = 400 + (i % 3) * 100;
    const h = 300 + ((i * 7) % 5) * 100;
    return {
      id: `picsum-${query}-${i}`,
      url: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/${w}/${h}`,
      title: `${query} #${i + 1}`,
      source: "Picsum Photos",
    };
  });
}

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
        @keyframes floatParticle {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          33% { transform: translate(30px, -40px) scale(1.1); opacity: 0.5; }
          66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.2; }
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
      `}</style>
    </>
  );
}

function Particles({ theme }) {
  const particles = Array.from({ length: 6 }, (_, i) => i);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {particles.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 120 + i * 40,
            height: 120 + i * 40,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
            filter: "blur(40px)",
            opacity: 0.25,
            top: `${10 + ((i * 37) % 70)}%`,
            left: `${5 + ((i * 53) % 80)}%`,
            animation: `floatParticle ${8 + i * 2}s ease-in-out ${i * 1.5}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Header({ theme, query, onSearch, onReset }) {
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
        background: "rgba(0,0,0,0.4)",
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
        onClick={onReset}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <span style={{ fontSize: 28 }}>{theme.emoji}</span>
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
            placeholder="Search for inspiration..."
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
          Search
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
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
        <span
          style={{
            fontSize: 13,
            color: theme.subtext,
            fontFamily: theme.bodyFont,
            fontWeight: 600,
            transition: "color 0.8s ease",
          }}
        >
          {theme.mood}
        </span>
      </div>
    </header>
  );
}

function Landing({ theme, onSearch, history }) {
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
          fontSize: 80,
          animation: "float 3s ease-in-out infinite",
          marginBottom: 24,
        }}
      >
        {theme.emoji}
      </div>
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
        What inspires you?
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
        Search for anything and watch the entire interface transform to match your inspiration.
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
        {SUGGEST_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => onSearch(chip)}
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
              e.currentTarget.style.background = `${theme.primary}44`;
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
            Recent searches
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

function ImageCard({ image, index, theme, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${theme.border}`,
          background: theme.cardBg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
          minHeight: 200,
          animation: `fadeSlideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 60}ms both`,
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
          Image not available
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${theme.border}`,
        background: theme.cardBg,
        cursor: "pointer",
        position: "relative",
        transition: "all 0.4s cubic-bezier(0.23, 1, 0.32, 1)",
        transform: hovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: hovered ? `0 8px 30px ${theme.glow}` : "none",
        animation: loaded ? `fadeSlideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1) ${index * 60}ms both` : "none",
        opacity: loaded ? undefined : 0,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(image)}
    >
      <img
        src={image.url}
        alt={image.title}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          width: "100%",
          display: "block",
          filter: hovered ? "brightness(1.1)" : "brightness(1)",
          transition: "filter 0.4s ease",
        }}
      />

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
        {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}

function useColumnCount() {
  const [columns, setColumns] = useState(() => {
    if (typeof window === "undefined") return 4;
    const w = window.innerWidth;
    if (w >= 1200) return 4;
    if (w >= 768) return 3;
    if (w >= 480) return 2;
    return 1;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 1200) setColumns(4);
      else if (w >= 768) setColumns(3);
      else if (w >= 480) setColumns(2);
      else setColumns(1);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return columns;
}

function SearchResultsHeader({ query, count, theme }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "24px 24px 8px",
        maxWidth: 1400,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{theme.emoji}</span>
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
      </div>
      <span
        style={{
          fontFamily: theme.bodyFont,
          fontSize: 13,
          color: theme.subtext,
          flexShrink: 0,
          transition: "color 0.8s ease",
        }}
      >
        {count} images found
      </span>
    </div>
  );
}

function MasonryGrid({ images, theme, onImageClick }) {
  const columnCount = useColumnCount();
  const columns = Array.from({ length: columnCount }, () => []);
  images.forEach((img, i) => {
    columns[i % columnCount].push({ ...img, _index: i });
  });

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: "0 24px 60px",
        maxWidth: 1400,
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
      }}
    >
      {columns.map((col, ci) => (
        <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
          {col.map((img) => (
            <ImageCard
              key={img.id}
              image={img}
              index={img._index}
              theme={theme}
              onClick={onImageClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

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

function Loading({ theme }) {
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
        Discovering images...
      </p>
    </div>
  );
}

export default function Visushift() {
  const [query, setQuery] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [themeKey, setThemeKey] = useState("default");

  const theme = THEMES[themeKey];

  const handleSearch = useCallback(async (searchQuery) => {
    setQuery(searchQuery);
    setSearched(true);
    setLoading(true);
    setThemeKey(detectTheme(searchQuery));
    setImages([]);

    setHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== searchQuery.toLowerCase());
      return [searchQuery, ...filtered].slice(0, 8);
    });

    const results = await fetchImages(searchQuery);
    setImages(results);
    setLoading(false);
  }, []);

  const handleReset = useCallback(() => {
    setQuery("");
    setImages([]);
    setSearched(false);
    setThemeKey("default");
  }, []);

  const closeLightbox = useCallback(() => setLightboxImage(null), []);

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
      <Particles theme={theme} />
      <Header theme={theme} query={query} onSearch={handleSearch} onReset={handleReset} />

      {!searched ? (
        <Landing theme={theme} onSearch={handleSearch} history={history} />
      ) : loading ? (
        <Loading theme={theme} />
      ) : (
        <>
          <SearchResultsHeader query={query} count={images.length} theme={theme} />
          <MasonryGrid images={images} theme={theme} onImageClick={setLightboxImage} />
        </>
      )}

      <Lightbox image={lightboxImage} theme={theme} onClose={closeLightbox} />
    </>
  );
}
