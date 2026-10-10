
import { useState } from 'react'
import './App.css'

function App() {
  const [image, setImage] = useState(null)
  const [foodName, setFoodName] = useState('')
  const [analyzed, setAnalyzed] = useState(false)

  function handleImageUpload(event) {
    const file = event.target.files?.[0]

    if (file && file.type.startsWith('image/')) {
      setImage(URL.createObjectURL(file))
      setFoodName('')
      setAnalyzed(false)
    }
  }

  function analyzeFood() {
    setFoodName('Demo analysis complete')
    setAnalyzed(true)
  }

  function changePhoto() {
    setImage(null)
    setFoodName('')
    setAnalyzed(false)
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
            Capture your meal. Discover its nutrition. Make more informed
            food choices, one plate at a time.
          </p>

          <div className="benefits">
            <div><span>✓</span> Food image preview</div>
            <div><span>✓</span> Nutrition insights</div>
            <div><span>✓</span> Simple, clear information</div>
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
                alt="Your uploaded meal"
              />
            ) : (
              <>
                <span className="upload-icon">↑</span>
                <strong>Drop your food photo here</strong>
                <span>or click to browse your device</span>
                <small>JPG, PNG or WEBP</small>
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
              >
                Analyze Food
              </button>

              <button
                type="button"
                className="change-button"
                onClick={changePhoto}
              >
                Choose another photo
              </button>
            </div>
          )}

          {analyzed && (
            <div className="prediction-result">
              <h3>Food Prediction</h3>
              <p>{foodName}</p>
              <small>
                Demo only — real AI food recognition is not connected yet.
              </small>
            </div>
          )}

          <p className="privacy-note">
            ♧ Your meal, your choice. Upload a photo to get started.
          </p>

          <div className="notice">
            <strong>Nutrition estimates are approximate.</strong>
            <span>
              Actual nutrition depends on ingredients and serving size.
            </span>
          </div>
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
