
import { useState } from 'react'
import './App.css'

function App() {
  const [image, setImage] = useState(null)
  const [foodName, setFoodName] = useState('')
  const [analyzed, setAnalyzed] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [predictionStatus, setPredictionStatus] = useState('')
  const [nutrition, setNutrition] = useState(null)
  
const [height, setHeight] = useState('')
const [weight, setWeight] = useState('')
const [bmi, setBmi] = useState(null)


  
function handleImageUpload(event) {
  const file = event.target.files?.[0]

  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10 MB

  if (!allowedTypes.includes(file.type)) {
    alert('Please upload a JPG, PNG, or WEBP image.')
    event.target.value = ''
    return
  }

  if (file.size > maxSize) {
    alert('Your image is too large. Please choose an image under 10 MB.')
    event.target.value = ''
    return
  }

  setImage(URL.createObjectURL(file))
  setFoodName('')
  setAnalyzed(false)
}


function analyzeFood() {
  setIsAnalyzing(true)
  setAnalyzed(false)
  setNutrition(null)

  setTimeout(() => {
    setFoodName('Demo Food — AI recognition not connected')
    setNutrition({
      calories: 250,
      protein: 8,
      carbohydrates: 35,
      fat: 9,
      fiber: 4,
      servingSize: '100 g'
    })
    setAnalyzed(true)
    setIsAnalyzing(false)
  }, 1500)
}

function calculateBMI() {
  const heightInMeters = Number(height) / 100
  const weightInKg = Number(weight)

  if (
    !height ||
    !weight ||
    heightInMeters <= 0 ||
    weightInKg <= 0
  ) {
    alert('Please enter a valid height and weight.')
    return
  }

  setBmi(
    (weightInKg / (heightInMeters * heightInMeters)).toFixed(1)
  )
}




  function changePhoto() {
    setImage(null)
    setFoodName('Demo mode — AI food recognition is not connected yet.')
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
  disabled={isAnalyzing}
>
  {isAnalyzing ? 'Analyzing...' : 'Analyze Food'}
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
    <h3>Nutrition Report</h3>
    <p>{foodName}</p>

    <p>
      <strong>Demo data only:</strong> These values are examples,
      not nutrition measurements of your uploaded photo.
    </p>

    {nutrition && (
      <div className="nutrition-grid">
        <div className="nutrition-card">
          <span>Calories</span>
          <h3>{nutrition.calories} kcal</h3>
        </div>

        <div className="nutrition-card">
          <span>Protein</span>
          <h3>{nutrition.protein} g</h3>
        </div>

        <div className="nutrition-card">
          <span>Carbohydrates</span>
          <h3>{nutrition.carbohydrates} g</h3>
        </div>

        <div className="nutrition-card">
          <span>Fat</span>
          <h3>{nutrition.fat} g</h3>
        </div>

        <div className="nutrition-card">
          <span>Fiber</span>
          <h3>{nutrition.fiber} g</h3>
        </div>

        <div className="nutrition-card">
          <span>Serving Size</span>
          <h3>{nutrition.servingSize}</h3>
        </div>
      </div>
    )}
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
