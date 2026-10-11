
import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://127.0.0.1:8000'

function App() {
  const [image, setImage] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [foodName, setFoodName] = useState('')
  const [confidence, setConfidence] = useState(null)
  const [topPredictions, setTopPredictions] = useState([])
  const [nutrition, setNutrition] = useState(null)
  const [analyzed, setAnalyzed] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [predictionStatus, setPredictionStatus] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bmi, setBmi] = useState(null)

  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image)
    }
  }, [image])

  function resetResults() {
    setFoodName('')
    setConfidence(null)
    setTopPredictions([])
    setNutrition(null)
    setAnalyzed(false)
    setPredictionStatus('')
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(file.type)) {
      setPredictionStatus('Please upload a JPG, PNG, or WEBP image.')
      event.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setPredictionStatus('Please choose an image under 10 MB.')
      event.target.value = ''
      return
    }

    setImage(URL.createObjectURL(file))
    setSelectedFile(file)
    resetResults()
  }

  async function analyzeFood() {
    if (!selectedFile) {
      setPredictionStatus('Please upload a food image first.')
      return
    }

    setIsAnalyzing(true)
    resetResults()

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || 'Food prediction failed.')
      }

      setFoodName(result.predicted_class)
      setConfidence(result.confidence)
      setTopPredictions(result.top_predictions || [])

      // Retrieve nutrition information for the predicted food.
      try {
        const nutritionResponse = await fetch(
          `${API_URL}/nutrition/${encodeURIComponent(result.predicted_class)}`
        )

        if (nutritionResponse.ok) {
          const nutritionResult = await nutritionResponse.json()
          setNutrition(nutritionResult)
        } else {
          setNutrition({ available: false })
        }
      } catch {
        setNutrition({ available: false })
      }

      setAnalyzed(true)
    } catch (error) {
      setPredictionStatus(
        error.message || 'Could not connect to the NutriSnap API.'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  function changePhoto() {
    setImage(null)
    setSelectedFile(null)
    resetResults()
  }

  function calculateBMI() {
    const heightInMeters = Number(height) / 100
    const weightInKg = Number(weight)

    if (
      !height ||
      !weight ||
      !Number.isFinite(heightInMeters) ||
      !Number.isFinite(weightInKg) ||
      heightInMeters <= 0 ||
      weightInKg <= 0
    ) {
      setBmi(null)
      alert('Please enter a valid height in centimetres and weight in kilograms.')
      return
    }

    setBmi((weightInKg / (heightInMeters * heightInMeters)).toFixed(1))
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#">
          <span className="brand-icon">N</span>
          NutriSnap
        </a>
        <span className="nav-label">AI FOOD NUTRITION ASSISTANT</span>
      </header>

      <main className="hero">
        <div className="hero-copy">
          <span className="eyebrow">✦ YOUR PERSONAL FOOD COMPANION</span>

          <h1>
            Every meal has a story. <span>Discover yours.</span>
          </h1>

          <p className="subtitle">
            Capture your meal. Discover its food category. Explore estimated
            nutrition information and make informed food choices.
          </p>

          <div className="benefits">
            <div><span>✓</span> Food image preview</div>
            <div><span>✓</span> AI food recognition</div>
            <div><span>✓</span> Nutrition estimates</div>
          </div>
        </div>

        <section className="upload-card">
          <div className="card-heading">
            <div>
              <h2>Let's explore your plate</h2>
              <p>Start by uploading a food photo.</p>
            </div>
            <span className="camera-icon">⌗</span>
          </div>

          <label className="upload-area">
            {image ? (
              <img
                className="food-preview"
                src={image}
                alt="Uploaded food"
              />
            ) : (
              <>
                <span className="upload-icon">↑</span>
                <strong>Drop your food photo here</strong>
                <span>or click to browse your device</span>
                <small>JPG, PNG or WEBP · Maximum 10 MB</small>
              </>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
            />
          </label>

          {image && (
            <div className="actions">
              <button
                type="button"
                className="analyze-button"
                onClick={analyzeFood}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Food'}
              </button>

              <button
                type="button"
                className="change-button"
                onClick={changePhoto}
                disabled={isAnalyzing}
              >
                Choose another photo
              </button>
            </div>
          )}

          {predictionStatus && (
            <p role="alert" className="status-message">
              {predictionStatus}
            </p>
          )}

          {analyzed && (
            <div className="prediction-result">
              <h3>Food Recognition Result</h3>

              <p>
                <strong>Predicted food:</strong> {foodName}
              </p>

              <p>
                <strong>Model confidence:</strong>{' '}
                {typeof confidence === 'number'
                  ? `${(confidence * 100).toFixed(2)}%`
                  : 'Unavailable'}
              </p>

              <p>
                This is an AI prediction, not a confirmed identification.
                Lower confidence means the prediction is more uncertain.
              </p>

              {topPredictions.length > 0 && (
                <>
                  <h3>Top Predictions</h3>
                  <div className="nutrition-grid">
                    {topPredictions.map((item) => (
                      <div className="nutrition-card" key={item.class_name}>
                        <span>{item.class_name}</span>
                        <h3>{(item.confidence * 100).toFixed(2)}%</h3>
                        <small>Model confidence</small>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <section className="nutrition-result">
                <h3>Estimated Nutrition</h3>

                {nutrition === null ? (
                  <p>Loading nutrition information...</p>
                ) : nutrition.available ? (
                  <>
                    <p>
                      <strong>Food:</strong> {nutrition.food_name}
                    </p>
                    <p>
                      <strong>Serving size:</strong> {nutrition.serving}
                    </p>

                    <div className="nutrition-grid">
                      <div className="nutrition-card">
                        <span>Calories</span>
                        <h3>{nutrition.calories} kcal</h3>
                      </div>

                      <div className="nutrition-card">
                        <span>Protein</span>
                        <h3>{nutrition.protein_g} g</h3>
                      </div>

                      <div className="nutrition-card">
                        <span>Carbohydrates</span>
                        <h3>{nutrition.carbs_g} g</h3>
                      </div>

                      <div className="nutrition-card">
                        <span>Fat</span>
                        <h3>{nutrition.fat_g} g</h3>
                      </div>
                    </div>

                    <p className="nutrition-note">{nutrition.note}</p>
                  </>
                ) : (
                  <p>
                    Nutrition information is not available for {foodName} yet.
                    You can still use the food recognition result.
                  </p>
                )}
              </section>
            </div>
          )}

          <p className="privacy-note">
            ♧ Your meal, your choice. Upload a photo to get started.
          </p>

          <div className="notice">
            <strong>Informational estimates only</strong>
            <span>
              Food recognition cannot measure calories or nutrients from an
              image. Nutrition values depend on ingredients, serving size,
              recipe, and preparation.
            </span>
          </div>

          <section className="bmi-section">
            <h3>Optional BMI Calculator</h3>
            <p>Enter height in centimetres and weight in kilograms.</p>

            <div className="bmi-inputs">
              <label>
                Height (cm)
                <input
                  type="number"
                  min="1"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  placeholder="e.g. 165"
                />
              </label>

              <label>
                Weight (kg)
                <input
                  type="number"
                  min="1"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  placeholder="e.g. 60"
                />
              </label>
            </div>

            <button
              type="button"
              className="analyze-button"
              onClick={calculateBMI}
            >
              Calculate BMI
            </button>

            {bmi !== null && (
              <p>
                <strong>BMI calculation:</strong> {bmi}
              </p>
            )}

            <p className="nutrition-note">
              BMI is a limited screening measure, not a diagnosis. For people
              under 18, interpretation requires age- and sex-specific growth
              charts; this calculator does not provide that interpretation.
            </p>
          </section>
        </section>
      </main>

      <footer>
        <span>NutriSnap · Eat curious.</span>
        <span>Informational use only · Not medical advice</span>
      </footer>
    </div>
  )
}

export default App
