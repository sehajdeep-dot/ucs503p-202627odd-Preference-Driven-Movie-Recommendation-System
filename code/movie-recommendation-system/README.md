# 🎬 Preference-Driven Movie Recommendation System

A preference-driven movie recommendation system built using **Python, Flask, JavaScript, HTML, CSS, and the TMDB API**.

The system recommends movies based on the user's preferences and provides movie-related information through an interactive web interface.

## 🚀 Features

* 🎯 Preference-driven movie recommendations
* 🎬 Movie discovery and browsing
* 🔎 Genre-based movie exploration
* ⭐ Movie ratings and related information
* 🖼️ Movie poster integration
* 🌐 Interactive web interface
* 🔗 TMDB API integration
* ⚡ Flask-based backend
* 📊 Movie and ratings datasets for recommendation processing

## 🛠️ Tech Stack

### Backend

* Python
* Flask

### Frontend

* HTML
* CSS
* JavaScript

### API

* TMDB API

### Data

* CSV datasets
* JSON data

## 📁 Project Structure

```text
Preference-Driven-Movie-Recommendation-System/
│
├── data/
│   ├── links.csv
│   ├── movies.csv
│   ├── ratings.csv
│   └── poster_cache.json
│
├── static/
│   ├── script.js
│   └── style.css
│
├── templates/
│   └── index.html
│
├── app.py
├── recommender.py
├── tmdb_test.py
├── env.txt
├── .gitignore
└── README.md
```

## ⚙️ How It Works

The application follows a simple recommendation workflow:

```text
User Preferences
       ↓
Preference Processing
       ↓
Movie Dataset
       ↓
Recommendation Logic
       ↓
Recommended Movies
       ↓
TMDB Movie Information & Posters
       ↓
Interactive Web Interface
```

The backend handles the recommendation process and API communication, while the frontend provides an interactive interface for users to explore movies.

## 🔑 TMDB API Configuration

This project uses the **TMDB API** for movie-related information and poster data.

Create a `.env` file in the project root and add your TMDB API credentials according to the environment variable used by the application.

> ⚠️ Never upload your `.env` file or expose your API key publicly.

The `.env` file is excluded from Git using `.gitignore`.

## 💻 Installation

### 1. Clone the repository

```bash
git clone https://github.com/sehajdeep-dot/Preference-Driven-Movie-Recommendation-System.git
```

### 2. Open the project

```bash
cd Preference-Driven-Movie-Recommendation-System
```

### 3. Create a virtual environment

```bash
python -m venv venv
```

### 4. Activate the virtual environment

**Windows:**

```bash
venv\Scripts\activate
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

### 5. Install dependencies

Install the required Python packages used by the project.

```bash
pip install -r requirements.txt
```

### 6. Configure the TMDB API

Create your `.env` file and add the required TMDB API credential.

### 7. Run the application

```bash
python app.py
```

Open the application in your browser:

```text
http://127.0.0.1:5000
```

## 📊 Dataset

The project uses movie and rating data stored in the `data/` directory.

Main datasets include:

* `movies.csv` — movie information
* `ratings.csv` — user/movie rating information
* `links.csv` — movie-related identifier mappings
* `poster_cache.json` — cached poster information

## 🔮 Future Improvements

* Personalized recommendations based on user history
* Improved recommendation algorithms
* User accounts and saved preferences
* Advanced filtering and sorting
* Better recommendation accuracy
* Movie watchlist functionality
* Deployment as a production web application

## 👨‍💻 Author

**Sehajdeep Soni**

GitHub: [@sehajdeep-dot](https://github.com/sehajdeep-dot)

## 📄 License

This project is intended for educational and portfolio purposes.
