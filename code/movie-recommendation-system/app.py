
"""
app.py
------
Flask API layer over the movie recommender.
"""

import os
import re
import json
import ssl
import urllib.request
import urllib.parse

import pandas as pd
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

from recommender import MovieRecommender


# =====================================================
# SETUP
# =====================================================

load_dotenv()

app = Flask(__name__)

# Load recommender once at startup
engine = MovieRecommender("data/movies.csv")

# TMDB credentials
TMDB_API_TOKEN = os.getenv("TMDB_API_TOKEN")

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

# Relaxed SSL context to bypass local network/Windows handshake drops
SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

CACHE_FILE = "data/poster_cache.json"


# =====================================================
# LOCAL JSON CACHE HELPERS
# =====================================================

def load_cache():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print("Could not read cache file:", e)
            return {}
    return {}


def save_cache(cache_data):
    try:
        os.makedirs("data", exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache_data, f, indent=2)
    except Exception as e:
        print("Could not save cache file:", e)


# Load cache once on server startup
POSTER_CACHE = load_cache()


# =====================================================
# LOAD MOVIELENS → TMDB MAPPING
# =====================================================

def load_tmdb_mapping():
    try:
        links = pd.read_csv("data/links.csv")
        links = links[["movieId", "tmdbId"]]
        links["tmdbId"] = pd.to_numeric(links["tmdbId"], errors="coerce")
        links = links.dropna(subset=["tmdbId"])
        links["tmdbId"] = links["tmdbId"].astype(int)
        return dict(zip(links["movieId"], links["tmdbId"]))
    except Exception as e:
        print("Could not load links.csv:", e)
        return {}


tmdb_mapping = load_tmdb_mapping()


# =====================================================
# TITLE CLEANER FOR SEARCH FALLBACK
# =====================================================

def clean_title_for_tmdb(title):
    if not title:
        return ""
    # 1. Strip trailing year e.g. "(1993)" -> ""
    cleaned = re.sub(r'\s*\(\d{4}\)\s*$', '', title).strip()
    # 2. Fix inverted articles e.g. "Wedding Banquet, The" -> "The Wedding Banquet"
    if ',' in cleaned:
        parts = cleaned.rsplit(',', 1)
        if parts[1].strip().lower() in ['the', 'a', 'an']:
            cleaned = f"{parts[1].strip()} {parts[0].strip()}"
    # 3. Strip secondary/foreign titles in brackets e.g. "(Xi yan)" -> ""
    cleaned = re.sub(r'\s*\([^)]*\)', '', cleaned)
    return cleaned.strip()


# =====================================================
# SAFE HTTP REQUEST HELPER
# =====================================================

def safe_tmdb_get(url):
    if not TMDB_API_TOKEN:
        return None

    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {TMDB_API_TOKEN}",
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
    )

    try:
        with urllib.request.urlopen(req, context=SSL_CONTEXT, timeout=4) as response:
            raw_data = response.read().decode('utf-8')
            return json.loads(raw_data)
    except Exception as e:
        return None


# =====================================================
# GET TMDB METADATA BY ID
# =====================================================

def get_tmdb_metadata(tmdb_id):
    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}?append_to_response=watch/providers"
    data = safe_tmdb_get(url)

    if not data:
        return {}

    poster_path = data.get("poster_path")
    poster_url = f"{TMDB_IMAGE_BASE_URL}{poster_path}" if poster_path else None

    # =====================================================
    # STREAMING PROVIDERS - INDIA
    # =====================================================

    watch_providers = data.get("watch/providers", {})
    india = watch_providers.get("results", {}).get("IN", {})

    streaming_providers = []

    # flatrate = normal streaming/subscription services
    for provider in india.get("flatrate", []):
        streaming_providers.append({
            "name": provider.get("provider_name"),
            "logo": (
                f"https://image.tmdb.org/t/p/w92"
                f"{provider.get('logo_path')}"
            ) if provider.get("logo_path") else None
        })

    # Remove duplicates while preserving order
    seen = set()
    unique_streaming_providers = []

    for provider in streaming_providers:
        name = provider.get("name")

        if name and name not in seen:
            seen.add(name)
            unique_streaming_providers.append(provider)

    return {
        "tmdb_id": tmdb_id,
        "poster": poster_url,
        "overview": data.get(
            "overview",
            "Movie description unavailable."
        ),
        "tmdb_rating": (
            round(float(data.get("vote_average", 0)), 1)
            if data.get("vote_average")
            else "N/A"
        ),
        "release_date": data.get("release_date", ""),
        "runtime": data.get("runtime", None),
        "tmdb_url": f"https://www.themoviedb.org/movie/{tmdb_id}",

        # NEW
        "streaming_providers": unique_streaming_providers
    }

# =====================================================
# SEARCH TMDB METADATA BY TITLE
# =====================================================

def fetch_tmdb_by_title_search(title):
    cleaned_title = clean_title_for_tmdb(title)
    encoded_query = urllib.parse.quote(cleaned_title)
    url = f"{TMDB_BASE_URL}/search/movie?query={encoded_query}"

    data = safe_tmdb_get(url)
    if not data:
        return {}

    results = data.get("results", [])

    for movie in results:
     poster_path = movie.get("poster_path")

    if poster_path:
        return {
            "tmdb_id": movie.get("id"),
            "poster": f"{TMDB_IMAGE_BASE_URL}{poster_path}",
            "overview": movie.get(
                "overview",
                "Movie description unavailable."
            ),
            "tmdb_rating": (
                round(float(movie.get("vote_average", 0)), 1)
                if movie.get("vote_average")
                else "N/A"
            ),
            "release_date": movie.get("release_date", ""),
            "runtime": None,
            "tmdb_url": f"https://www.themoviedb.org/movie/{movie.get('id')}"
        }

    return {}


# =====================================================
# ADD TMDB DATA TO RECOMMENDATIONS (WITH CACHING)
# =====================================================

def enrich_recommendations(recommendations):
    enriched = []
    cache_updated = False

    for movie in recommendations:
        movie_copy = movie.copy()
        movie_id = str(movie["movieId"])
        movie_title = movie.get("title", "Movie")

        if (
            movie_id in POSTER_CACHE
            and POSTER_CACHE[movie_id].get("poster")
            and POSTER_CACHE[movie_id].get("tmdb_url")
        ):
            movie_copy.update(POSTER_CACHE[movie_id])
            enriched.append(movie_copy)
            continue

        tmdb_id = tmdb_mapping.get(int(movie_id))
        metadata = {}

        # 2. Try fetching via links.csv tmdb_id
        if tmdb_id:
            metadata = get_tmdb_metadata(tmdb_id)

        # 3. Fallback to Title Search if tmdb_id missing or poster not found
        if not metadata.get("poster"):
            title_metadata = fetch_tmdb_by_title_search(movie_title)
            if title_metadata:
                metadata = title_metadata

        # Fallback SVG poster url with encoded title text
        encoded_title = urllib.parse.quote(movie_title)
        fallback_poster = f"https://via.placeholder.com/500x750/1e293b/ffffff?text={encoded_title}"

        # Assign values safely
        result_payload = {
            "tmdb_id": metadata.get("tmdb_id", tmdb_id),
            "poster": metadata.get("poster") or fallback_poster,
            "overview": metadata.get("overview") or "Movie description unavailable.",
            "tmdb_rating": metadata.get("tmdb_rating") or "N/A",
            "release_date": metadata.get("release_date", ""),
            "runtime": metadata.get("runtime", None),
            "tmdb_url": metadata.get("tmdb_url", None)
        }

        # Store result in cache if poster was successfully resolved from TMDB
        if metadata.get("poster"):
            POSTER_CACHE[movie_id] = result_payload
            cache_updated = True

        movie_copy.update(result_payload)
        enriched.append(movie_copy)

    if cache_updated:
        save_cache(POSTER_CACHE)

    return enriched


# =====================================================
# ROUTES
# =====================================================

@app.route("/", methods=["GET"])
def home():
    return render_template("index.html")


@app.route("/genres", methods=["GET"])
def list_genres():
    return jsonify({"genres": engine.get_available_genres()})


@app.route("/recommend", methods=["GET", "POST"])
def recommend():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        selected_genres = data.get("genres", [])
        top_n = int(data.get("top_n", 16))
        mode = data.get("mode", "familiar")
        discover_genre = data.get("discover_genre")
    else:
        genres_param = request.args.get("genres", "")
        selected_genres = [g.strip() for g in genres_param.split(",") if g.strip()]
        top_n = int(request.args.get("top_n", 16))
        mode = request.args.get("mode", "familiar")
        discover_genre = request.args.get("discover_genre")

    if not selected_genres:
        return jsonify({"error": "Please provide at least one genre via 'genres'."}), 400

    try:
        recommendations = engine.recommend(
            selected_genres,
            top_n=top_n,
            mode=mode,
            discover_genre=discover_genre
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    recommendations = enrich_recommendations(recommendations)

    return jsonify({
        "selected_genres": selected_genres,
        "mode": mode,
        "count": len(recommendations),
        "recommendations": recommendations
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)