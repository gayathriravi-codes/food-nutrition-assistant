import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const HISTORY_KEY = "nutrisnap_scan_history";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const FOOD_TIPS = [
  {
    title: "Build a balanced plate",
    description:
      "Combine vegetables, protein, whole grains, and healthy fats for a varied meal.",
    icon: "🥗",
  },
  {
    title: "Add protein",
    description:
      "Dal, beans, eggs, dairy, tofu, and other protein sources can help make meals more satisfying.",
    icon: "🥚",
  },
  {
    title: "Eat more variety",
    description:
      "Different fruits and vegetables provide different nutrients. Variety matters.",
    icon: "🌈",
  },
];

function readHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function formatNumber(value, decimals = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return Number(number.toFixed(decimals)).toString();
}

function normalizeConfidence(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  // Accommodate confidence returned as either 0–1 or 0–100.
  return Math.max(0, Math.min(100, number <= 1 ? number * 100 : number));
}

function prettyFoodName(value) {
  return String(value || "Unknown food")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getNutritionValue(nutrition, key) {
  const value = Number(nutrition?.[key]);
  return Number.isFinite(value) ? value : null;
}

function App() {
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [nutrition, setNutrition] = useState(null);

  const [loading, setLoading] = useState(false);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [dragging, setDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");
  const [history, setHistory] = useState(readHistory);
  const [expandedHistory, setExpandedHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // Release old preview URLs when the selected image changes or the
  // component unmounts. This prevents unnecessary memory usage.
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  // Persist a small summary of recent scans, not the uploaded images.
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 8)));
    } catch {
      // The app remains usable if browser storage is unavailable.
    }
  }, [history]);

  function clearMessages() {
    setError("");
    setNotice("");
    setCopied(false);
  }

  function handleFile(file) {
    clearMessages();

    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please select a JPEG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Your image exceeds the 10 MB limit. Choose a smaller image.");
      return;
    }

    setSelectedFile(file);
    setAnalysis(null);
    setNutrition(null);
    setActiveTab("analysis");
  }

  function handleInputChange(event) {
    const file = event.target.files?.[0];

    if (file) {
      handleFile(file);
    }

    // Allows the same file to be selected again after resetting.
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  }

  function resetAnalysis() {
    setSelectedFile(null);
    setAnalysis(null);
    setNutrition(null);
    setError("");
    setNotice("");
    setCopied(false);
    setActiveTab("analysis");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function analyzeFood() {
    if (!selectedFile || loading) {
      return;
    }

    setLoading(true);
    setNutritionLoading(false);
    setError("");
    setNotice("");
    setAnalysis(null);
    setNutrition(null);
    setActiveTab("analysis");

    try {
      const formData = new FormData();

      // This field name must match the FastAPI endpoint.
      formData.append("file", selectedFile);

      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let detail = "";

        try {
          const body = await response.json();
          detail = body.detail || body.message || "";
        } catch {
          // The server did not return JSON.
        }

        if (response.status === 413) {
          throw new Error("The image is too large for the server.");
        }

        if (response.status === 415) {
          throw new Error("This image format is not supported.");
        }

        if (response.status === 400) {
          throw new Error(detail || "The uploaded image could not be validated.");
        }

        throw new Error(
          detail || `Food recognition failed (HTTP ${response.status}).`
        );
      }

      const prediction = await response.json();

      if (!prediction.predicted_class) {
        throw new Error(
          "The server did not return a recognized food. Please try another image."
        );
      }

      setAnalysis(prediction);

      // Nutrition is fetched separately using the predicted food class.
      setNutritionLoading(true);

      try {
        const foodName = encodeURIComponent(prediction.predicted_class);

        const nutritionResponse = await fetch(
          `${API_URL}/nutrition/${foodName}`
        );

        if (!nutritionResponse.ok) {
          throw new Error("Nutrition information could not be retrieved.");
        }

        const nutritionData = await nutritionResponse.json();

        if (nutritionData.available === false) {
          setNutrition(null);
          setNotice(
            "Food recognition succeeded, but nutrition information is not available for this food yet."
          );
        } else {
          setNutrition(nutritionData);
        }

        const savedScan = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          foodName: prediction.predicted_class,
          confidence: prediction.confidence,
          calories: nutritionData.available === false
            ? null
            : nutritionData.calories ?? null,
          scannedAt: new Date().toISOString(),
        };

        setHistory((previous) => [
          savedScan,
          ...previous.filter(
            (item) => item.foodName !== savedScan.foodName
          ),
        ].slice(0, 8));
      } catch (nutritionError) {
        console.error("Nutrition request failed:", nutritionError);

        setNutrition(null);
        setNotice(
          "Food recognition succeeded, but nutrition information could not be loaded. You can try again later."
        );

        setHistory((previous) => [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            foodName: prediction.predicted_class,
            confidence: prediction.confidence,
            calories: null,
            scannedAt: new Date().toISOString(),
          },
          ...previous.filter(
            (item) => item.foodName !== prediction.predicted_class
          ),
        ].slice(0, 8));
      } finally {
        setNutritionLoading(false);
      }
    } catch (requestError) {
      console.error("Food analysis failed:", requestError);

      setError(
        requestError.message ||
          "Something went wrong while analyzing your image."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyResults() {
    if (!analysis) {
      return;
    }

    const lines = [
      "NutriSnap — Food Analysis",
      `Food: ${prettyFoodName(analysis.predicted_class)}`,
      `Model confidence: ${formatNumber(normalizeConfidence(analysis.confidence))}%`,
      "",
      "Nutrition per serving:",
      `Calories: ${nutrition?.calories ?? "Unavailable"}`,
      `Protein: ${nutrition?.protein_g ?? "Unavailable"} g`,
      `Carbohydrates: ${nutrition?.carbs_g ?? "Unavailable"} g`,
      `Fat: ${nutrition?.fat_g ?? "Unavailable"} g`,
      "",
      "Nutrition values are estimates when supplied by the data source.",
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setNotice("Analysis copied to your clipboard.");

      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Clipboard access was blocked by your browser. Try copying the results manually."
      );
    }
  }

  function restoreHistoryItem(item) {
    clearMessages();

    // History entries are summaries only. They cannot restore the original
    // image or claim that a new prediction has been performed.
    setAnalysis({
      predicted_class: item.foodName,
      confidence: item.confidence,
      top_predictions: [],
    });

    setNutrition(
      item.calories == null
        ? null
        : {
            available: true,
            food_name: item.foodName,
            calories: item.calories,
          }
    );

    setSelectedFile(null);
    setActiveTab("analysis");

    setNotice(
      "Viewing a saved scan summary. Upload an image to perform a fresh analysis."
    );
  }

  const topPredictions = Array.isArray(analysis?.top_predictions)
    ? analysis.top_predictions.slice(0, 3)
    : [];

  const macroItems = [
    {
      label: "Protein",
      value: getNutritionValue(nutrition, "protein_g"),
      unit: "g",
      icon: "💪",
      maximum: 50,
    },
    {
      label: "Carbohydrates",
      value: getNutritionValue(nutrition, "carbs_g"),
      unit: "g",
      icon: "⚡",
      maximum: 100,
    },
    {
      label: "Fat",
      value: getNutritionValue(nutrition, "fat_g"),
      unit: "g",
      icon: "🥑",
      maximum: 40,
    },
  ];

  return (
    <div className="ns-app">
      <header className="ns-header">
        <a
          href="#home"
          className="ns-brand"
          aria-label="NutriSnap home"
          onClick={() => {
            resetAnalysis();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="ns-brand-icon">🥑</span>
          <span>
            <strong>NutriSnap</strong>
            <small>Food intelligence, simplified.</small>
          </span>
        </a>

        <nav className="ns-nav" aria-label="Main navigation">
          <a href="#scanner">Food scanner</a>
          <a href="#how-it-works">How it works</a>
          <a href="#food-tips">Nutrition tips</a>
        </nav>

        <a className="ns-header-cta" href="#scanner">
          Try the scanner <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="home">
        <section className="ns-hero">
          <div className="ns-hero-copy">
            <div className="ns-eyebrow">
              <span className="ns-live-dot" />
              AI-POWERED FOOD RECOGNITION
            </div>

            <h1>
              Know your food.
              <br />
              <span>Fuel your day.</span>
            </h1>

            <p>
              Snap a meal, discover what is on your plate, and explore its
              nutritional breakdown — all in one place.
            </p>

            <div className="ns-hero-actions">
              <a href="#scanner" className="ns-button ns-button-primary">
                Analyze a meal <span aria-hidden="true">→</span>
              </a>

              <a href="#how-it-works" className="ns-text-link">
                See how it works
              </a>
            </div>

            <div className="ns-trust-row">
              <span>📸 Image-based analysis</span>
              <span>🥗 Nutrition insights</span>
              <span>⚡ Fast results</span>
            </div>
          </div>

          <div className="ns-hero-visual" aria-label="Healthy meal illustration">
            <div className="ns-orbit ns-orbit-one" />
            <div className="ns-orbit ns-orbit-two" />

            <div className="ns-hero-food">
              <span role="img" aria-label="Bowl of healthy food">
                🥗
              </span>
            </div>

            <div className="ns-float-card ns-float-card-top">
              <span className="ns-float-icon">✨</span>
              <div>
                <strong>Smart recognition</strong>
                <small>AI-powered analysis</small>
              </div>
            </div>

            <div className="ns-float-card ns-float-card-bottom">
              <span className="ns-float-icon">📊</span>
              <div>
                <strong>Nutrition insights</strong>
                <small>Understand your meal</small>
              </div>
            </div>

            <div className="ns-hero-sparkle ns-sparkle-one">✦</div>
            <div className="ns-hero-sparkle ns-sparkle-two">✧</div>
          </div>
        </section>

        <section className="ns-scanner-section" id="scanner">
          <div className="ns-section-heading">
            <div>
              <span className="ns-eyebrow">YOUR PERSONAL FOOD EXPLORER</span>
              <h2>What's on your plate?</h2>
              <p>
                Upload a clear food image to start your analysis.
              </p>
            </div>

            <div className="ns-private-badge">
              <span>🔒</span> Images aren't saved in scan history
            </div>
          </div>

          <div className="ns-workspace">
            <section className="ns-panel ns-upload-panel">
              <div className="ns-panel-heading">
                <div>
                  <span className="ns-step-label">STEP 01</span>
                  <h3>Upload your meal</h3>
                </div>

                {selectedFile && (
                  <button
                    className="ns-subtle-button"
                    type="button"
                    onClick={resetAnalysis}
                  >
                    Reset
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleInputChange}
                hidden
                aria-label="Choose a food image"
              />

              <div
                ref={dropZoneRef}
                className={`ns-dropzone ${dragging ? "ns-dropzone-active" : ""} ${
                  previewUrl ? "ns-dropzone-has-image" : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setDragging(false);
                  }
                }}
                onDrop={handleDrop}
                onClick={() => {
                  if (!previewUrl) {
                    fileInputRef.current?.click();
                  }
                }}
                role={previewUrl ? undefined : "button"}
                tabIndex={previewUrl ? undefined : 0}
                onKeyDown={(event) => {
                  if (
                    !previewUrl &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                aria-label={
                  previewUrl
                    ? "Selected food image preview"
                    : "Upload or drop a food image"
                }
              >
                {previewUrl ? (
                  <>
                    <img
                      className="ns-image-preview"
                      src={previewUrl}
                      alt="Selected meal preview"
                    />

                    <div className="ns-image-overlay">
                      <span>✓ Image ready for analysis</span>
                    </div>

                    <button
                      type="button"
                      className="ns-remove-image"
                      aria-label="Remove selected image"
                      onClick={(event) => {
                        event.stopPropagation();
                        resetAnalysis();
                      }}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <div className="ns-upload-prompt">
                    <div className="ns-upload-icon">
                      <span>↑</span>
                    </div>

                    <h4>Drop your food image here</h4>

                    <p>
                      or{" "}
                      <button
                        type="button"
                        className="ns-inline-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        browse files
                      </button>
                    </p>

                    <div className="ns-upload-formats">
                      JPG <span>·</span> PNG <span>·</span> WEBP
                    </div>
                    <small>Maximum file size: 10 MB</small>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="ns-file-details">
                  <span className="ns-file-icon">🖼️</span>
                  <div>
                    <strong>{selectedFile.name}</strong>
                    <small>
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </small>
                  </div>

                  <span className="ns-file-check">✓</span>
                </div>
              )}

              {error && (
                <div className="ns-message ns-error" role="alert">
                  <span>⚠️</span>
                  <p>{error}</p>
                  <button
                    type="button"
                    aria-label="Dismiss error"
                    onClick={() => setError("")}
                  >
                    ×
                  </button>
                </div>
              )}

              <button
                type="button"
                className="ns-button ns-button-primary ns-analyze-button"
                onClick={analyzeFood}
                disabled={!selectedFile || loading}
              >
                {loading ? (
                  <>
                    <span className="ns-spinner" />
                    Analyzing your meal...
                  </>
                ) : (
                  <>
                    Analyze my food <span aria-hidden="true">→</span>
                  </>
                )}
              </button>

              <p className="ns-helper-text">
                <span>💡</span> For best results, use a clear image with the
                food visible and in focus.
              </p>
            </section>

            <section className="ns-panel ns-results-panel">
              <div className="ns-panel-heading">
                <div>
                  <span className="ns-step-label">STEP 02</span>
                  <h3>Your food insights</h3>
                </div>

                {analysis && (
                  <span className="ns-result-badge">
                    <span className="ns-live-dot" />
                    Analysis ready
                  </span>
                )}
              </div>

              {!analysis && !loading && (
                <div className="ns-empty-results">
                  <div className="ns-empty-illustration">
                    <div className="ns-empty-ring" />
                    <span>🍽️</span>
                  </div>

                  <h4>Your results will appear here</h4>

                  <p>
                    Upload a food image and let NutriSnap identify the meal
                    and retrieve its available nutritional information.
                  </p>

                  <div className="ns-empty-checklist">
                    <span>✓ Food identification</span>
                    <span>✓ Confidence scores</span>
                    <span>✓ Nutrition breakdown</span>
                  </div>
                </div>
              )}

              {loading && (
                <div className="ns-loading-state" role="status">
                  <div className="ns-loading-visual">
                    <span className="ns-spinner ns-spinner-large" />
                    <span className="ns-loading-food">🥗</span>
                  </div>

                  <h4>Examining your meal...</h4>

                  <p>
                    Your image is being processed by the food recognition
                    model. Results will appear when the request completes.
                  </p>

                  <div className="ns-loading-track">
                    <div className="ns-loading-track-inner" />
                  </div>
                </div>
              )}

              {analysis && (
                <div className="ns-analysis-content">
                  <div className="ns-recognized-food">
                    <div className="ns-recognized-icon">🍽️</div>

                    <div className="ns-recognized-copy">
                      <span className="ns-muted-label">
                        RECOGNIZED FOOD
                      </span>

                      <h4>{prettyFoodName(analysis.predicted_class)}</h4>

                      <p>
                        Model confidence:{" "}
                        <strong>
                          {formatNumber(
                            normalizeConfidence(analysis.confidence)
                          )}
                          %
                        </strong>
                      </p>
                    </div>

                    <div className="ns-confidence-ring">
                      <span>
                        {Math.round(
                          normalizeConfidence(analysis.confidence)
                        )}
                        %
                      </span>
                    </div>
                  </div>

                  {topPredictions.length > 0 && (
                    <div className="ns-predictions">
                      <h4>Other possible matches</h4>

                      {topPredictions.map((item, index) => {
                        const confidence = normalizeConfidence(
                          item.confidence
                        );

                        return (
                          <div
                            className="ns-prediction-row"
                            key={`${item.class_name}-${index}`}
                          >
                            <div className="ns-prediction-label">
                              <span>
                                {prettyFoodName(item.class_name)}
                              </span>
                              <strong>{Math.round(confidence)}%</strong>
                            </div>

                            <div className="ns-progress-track">
                              <div
                                className="ns-progress-fill"
                                style={{ width: `${confidence}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="ns-nutrition-heading">
                    <div>
                      <span className="ns-muted-label">
                        NUTRITION OVERVIEW
                      </span>
                      <h4>What's in this meal?</h4>
                    </div>

                    <span className="ns-serving-badge">
                      {nutrition?.serving || "Per serving"}
                    </span>
                  </div>

                  {nutritionLoading && (
                    <div className="ns-inline-loading" role="status">
                      <span className="ns-spinner" />
                      Retrieving nutrition information...
                    </div>
                  )}

                  {!nutritionLoading && nutrition && (
                    <>
                      <div className="ns-calorie-card">
                        <div>
                          <span className="ns-muted-label">
                            ESTIMATED ENERGY
                          </span>

                          <div className="ns-calorie-value">
                            {formatNumber(nutrition.calories, 0)}
                            <span>kcal</span>
                          </div>

                          <small>
                            {nutrition.serving
                              ? `For ${nutrition.serving}`
                              : "Serving size as defined by the nutrition data"}
                          </small>
                        </div>

                        <div className="ns-calorie-icon">🔥</div>
                      </div>

                      <div className="ns-macros-grid">
                        {macroItems.map((macro) => (
                          <div className="ns-macro-card" key={macro.label}>
                            <div className="ns-macro-top">
                              <span>{macro.icon}</span>
                              <span className="ns-macro-unit">
                                {macro.unit}
                              </span>
                            </div>

                            <strong>
                              {macro.value === null
                                ? "—"
                                : formatNumber(macro.value)}
                              <small>{macro.unit}</small>
                            </strong>

                            <span className="ns-macro-label">
                              {macro.label}
                            </span>

                            {macro.value !== null && (
                              <div className="ns-progress-track ns-macro-track">
                                <div
                                  className="ns-progress-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (Math.max(0, macro.value) /
                                        macro.maximum) *
                                        100
                                    )}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {nutrition.note && (
                        <div className="ns-nutrition-note">
                          <span>ℹ️</span>
                          <p>{nutrition.note}</p>
                        </div>
                      )}

                      <p className="ns-disclaimer">
                        Nutrition values are estimates and can vary with
                        ingredients, portion size, and preparation method.
                      </p>
                    </>
                  )}

                  {!nutritionLoading && !nutrition && (
                    <div className="ns-nutrition-unavailable">
                      <span>🔎</span>
                      <div>
                        <strong>Nutrition details unavailable</strong>
                        <p>
                          Food recognition completed, but nutrition data
                          could not be retrieved for this result.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="ns-result-actions">
                    <button
                      type="button"
                      className="ns-button ns-button-secondary"
                      onClick={copyResults}
                    >
                      {copied ? "✓ Copied!" : "▣ Copy results"}
                    </button>

                    <button
                      type="button"
                      className="ns-button ns-button-primary"
                      onClick={resetAnalysis}
                    >
                      Analyze another <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </div>
              )}

              {notice && (
                <div className="ns-message ns-notice" role="status">
                  <span>ℹ️</span>
                  <p>{notice}</p>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => setNotice("")}
                  >
                    ×
                  </button>
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="ns-history-section">
          <div className="ns-history-heading">
            <div>
              <span className="ns-eyebrow">YOUR RECENT ACTIVITY</span>
              <h2>Recently explored</h2>
              <p>
                Revisit a saved scan summary from this browser.
              </p>
            </div>

            {history.length > 0 && (
              <button
                type="button"
                className="ns-subtle-button"
                onClick={() => setExpandedHistory((previous) => !previous)}
              >
                {expandedHistory ? "Show less ↑" : "View all →"}
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="ns-history-empty">
              <span>🕘</span>
              <div>
                <strong>Your scan history starts here</strong>
                <p>
                  Your recent food analysis summaries will appear here after
                  you scan a meal.
                </p>
              </div>
            </div>
          ) : (
            <div className="ns-history-grid">
              {(expandedHistory ? history : history.slice(0, 3)).map(
                (item) => (
                  <button
                    type="button"
                    className="ns-history-card"
                    key={item.id}
                    onClick={() => restoreHistoryItem(item)}
                  >
                    <span className="ns-history-icon">🍽️</span>

                    <span className="ns-history-details">
                      <strong>{prettyFoodName(item.foodName)}</strong>

                      <small>
                        {new Date(item.scannedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </small>

                      <span>
                        {item.calories == null
                          ? "Nutrition unavailable"
                          : `${formatNumber(item.calories, 0)} kcal · saved estimate`}
                      </span>
                    </span>

                    <span className="ns-history-arrow">↗</span>
                  </button>
                )
              )}
            </div>
          )}

          {history.length > 0 && (
            <button
              type="button"
              className="ns-clear-history"
              onClick={() => {
                setHistory([]);
                setNotice("Recent scan history cleared.");
              }}
            >
              Clear scan history
            </button>
          )}
        </section>

        <section className="ns-how-section" id="how-it-works">
          <div className="ns-section-heading ns-centered-heading">
            <div>
              <span className="ns-eyebrow">SIMPLE BY DESIGN</span>
              <h2>From image to insight</h2>
              <p>
                Three steps connect your food image to useful information.
              </p>
            </div>
          </div>

          <div className="ns-steps-grid">
            <article className="ns-step-card">
              <div className="ns-step-icon">📸</div>
              <span className="ns-step-number">01</span>
              <h3>Capture or upload</h3>
              <p>
                Select a clear image of the meal you want to explore.
              </p>
            </article>

            <article className="ns-step-card">
              <div className="ns-step-icon">🤖</div>
              <span className="ns-step-number">02</span>
              <h3>Recognize the food</h3>
              <p>
                The connected AI model analyzes the image and returns its
                predicted food category.
              </p>
            </article>

            <article className="ns-step-card">
              <div className="ns-step-icon">📊</div>
              <span className="ns-step-number">03</span>
              <h3>Explore nutrition</h3>
              <p>
                Review the nutritional information available for the
                recognized food.
              </p>
            </article>
          </div>
        </section>

        <section className="ns-tips-section" id="food-tips">
          <div className="ns-section-heading">
            <div>
              <span className="ns-eyebrow">SMALL CHOICES, BIG PICTURE</span>
              <h2>Everyday nutrition wisdom</h2>
              <p>
                A few general principles for making informed food choices.
              </p>
            </div>
          </div>

          <div className="ns-tips-grid">
            {FOOD_TIPS.map((tip, index) => (
              <article className="ns-tip-card" key={tip.title}>
                <div className="ns-tip-icon">{tip.icon}</div>
                <span className="ns-tip-number">
                  TIP {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{tip.title}</h3>
                <p>{tip.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ns-cta-section">
          <div className="ns-cta-content">
            <span className="ns-cta-emoji">🥑</span>
            <h2>A little more insight with every meal.</h2>
            <p>
              Start with a photo. Discover your food. Make more informed
              choices.
            </p>

            <a href="#scanner" className="ns-button ns-button-light">
              Scan your next meal <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="ns-footer">
        <a
          href="#home"
          className="ns-brand ns-footer-brand"
          aria-label="Return to NutriSnap home"
        >
          <span className="ns-brand-icon">🥑</span>
          <span>
            <strong>NutriSnap</strong>
            <small>Food intelligence, simplified.</small>
          </span>
        </a>

        <p>
          Built to make food insights more accessible. Nutrition estimates
          are informational and are not medical advice.
        </p>

        <a href="#home" className="ns-back-top">
          Back to top ↑
        </a>
      </footer>
    </div>
  );
}

export default App;