
import os
import re
import json
import ssl
import sqlite3
import urllib.request
import urllib.parse

import pandas as pd
from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    session,
    redirect,
)
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

from recommender import MovieRecommender


load_dotenv()

app = Flask(__name__)

app.secret_key = os.getenv(
    "FLASK_SECRET_KEY",
    "movie-recommender-secret-key-change-this"
)

TMDB_API_TOKEN = os.getenv("TMDB_API_TOKEN")
WATCHMODE_API_KEY = os.getenv("WATCHMODE_API_KEY")

DATABASE_FILE = "data/movie_users.db"

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
WATCHMODE_BASE_URL = "https://api.watchmode.com/v1"

SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

CACHE_FILE = "data/poster_cache.json"


def get_db():
    os.makedirs("data", exist_ok=True)

    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row

    return conn


def init_database():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS movie_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            movie_id TEXT NOT NULL,
            movie_title TEXT,
            feedback TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, movie_id),
            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)
        # Add extra movie details to old movie_feedback table
    try:
        conn.execute("ALTER TABLE movie_feedback ADD COLUMN poster TEXT")
    except:
        pass

    try:
        conn.execute("ALTER TABLE movie_feedback ADD COLUMN tmdb_rating REAL")
    except:
        pass

    try:
        conn.execute("ALTER TABLE movie_feedback ADD COLUMN overview TEXT")
    except:
        pass

    conn.execute("""
        CREATE TABLE IF NOT EXISTS pending_watch (
            user_id INTEGER PRIMARY KEY,
            movie_id TEXT NOT NULL,
            movie_title TEXT,
            tmdb_id TEXT,
            poster TEXT,
            tmdb_rating TEXT,
            overview TEXT,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            movie_id TEXT NOT NULL,
            movie_title TEXT,
            tmdb_id TEXT,
            poster TEXT,
            tmdb_rating TEXT,
            overview TEXT,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, movie_id),
            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()


init_database()


engine = MovieRecommender(
    "data/movies.csv",
    "data/ratings.csv",
    "data/links.csv",
    TMDB_API_TOKEN
)


def load_cache():

    if not os.path.exists(CACHE_FILE):
        return {}

    try:

        with open(
            CACHE_FILE,
            "r",
            encoding="utf-8"
        ) as f:

            return json.load(f)

    except Exception as e:

        print(
            "Could not read cache file:",
            e
        )

        return {}


def save_cache(cache_data):

    try:

        os.makedirs(
            "data",
            exist_ok=True
        )

        with open(
            CACHE_FILE,
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                cache_data,
                f,
                indent=2
            )

    except Exception as e:

        print(
            "Could not save cache file:",
            e
        )


POSTER_CACHE = load_cache()


def load_tmdb_mapping():

    try:

        links = pd.read_csv(
            "data/links.csv"
        )

        links = links[
            ["movieId", "tmdbId"]
        ]

        links["tmdbId"] = pd.to_numeric(
            links["tmdbId"],
            errors="coerce"
        )

        links = links.dropna(
            subset=["tmdbId"]
        )

        links["tmdbId"] = links[
            "tmdbId"
        ].astype(int)

        return dict(
            zip(
                links["movieId"],
                links["tmdbId"]
            )
        )

    except Exception as e:

        print(
            "Could not load links.csv:",
            e
        )

        return {}


tmdb_mapping = load_tmdb_mapping()


def clean_title_for_tmdb(title):

    if not title:
        return ""

    cleaned = re.sub(
        r"\s*\(\d{4}\)\s*$",
        "",
        title
    ).strip()

    if "," in cleaned:

        parts = cleaned.rsplit(",", 1)

        if parts[1].strip().lower() in [
            "the",
            "a",
            "an"
        ]:

            cleaned = (
                f"{parts[1].strip()} "
                f"{parts[0].strip()}"
            )

    cleaned = re.sub(
        r"\s*\([^)]*\)",
        "",
        cleaned
    )

    return cleaned.strip()


def safe_tmdb_get(url):

    if not TMDB_API_TOKEN:

        print(
            "TMDB ERROR: TMDB_API_TOKEN is missing"
        )

        return None

    req = urllib.request.Request(
        url,
        headers={
            "Authorization":
                f"Bearer {TMDB_API_TOKEN}",
            "Accept":
                "application/json",
            "User-Agent":
                "Mozilla/5.0"
        }
    )

    try:

        with urllib.request.urlopen(
            req,
            context=SSL_CONTEXT,
            timeout=10
        ) as response:

            raw_data = response.read().decode(
                "utf-8"
            )

            return json.loads(
                raw_data
            )

    except Exception as e:

        print(
            "TMDB ERROR:",
            e
        )

        return None


def safe_watchmode_get(url):

    if not WATCHMODE_API_KEY:

        print(
            "WATCHMODE ERROR: "
            "WATCHMODE_API_KEY is missing"
        )

        return None

    req = urllib.request.Request(
        url,
        headers={
            "X-API-Key":
                WATCHMODE_API_KEY,
            "Accept":
                "application/json",
            "User-Agent":
                "Preference-Driven-Movie-Recommendation-System"
        }
    )

    try:

        with urllib.request.urlopen(
            req,
            context=SSL_CONTEXT,
            timeout=10
        ) as response:

            raw_data = response.read().decode(
                "utf-8"
            )

            return json.loads(
                raw_data
            )

    except Exception as e:

        print(
            "WATCHMODE ERROR:",
            e
        )

        return None


def get_watchmode_sources(tmdb_id):

    if not WATCHMODE_API_KEY:
        return []

    if not tmdb_id:
        return []

    try:

        tmdb_id = int(tmdb_id)

    except (
        ValueError,
        TypeError
    ):

        return []

    watchmode_id = f"movie-{tmdb_id}"

    encoded_id = urllib.parse.quote(
        watchmode_id
    )

    url = (
        f"{WATCHMODE_BASE_URL}/title/"
        f"{encoded_id}/sources"
        f"?regions=IN"
    )

    data = safe_watchmode_get(
        url
    )

    if not isinstance(data, list):
        return []

    providers = []
    seen = set()

    for source in data:

        web_url = source.get(
            "web_url"
        )

        name = source.get(
            "name"
        )

        if not web_url or not name:
            continue

        key = (
            name,
            source.get("type"),
            web_url
        )

        if key in seen:
            continue

        seen.add(key)

        providers.append({

            "name":
                name,

            "type":
                source.get("type"),

            "region":
                source.get(
                    "region",
                    "IN"
                ),

            "web_url":
                web_url,

            "price":
                source.get("price")
        })

    return providers


def enrich_watchmode_sources(metadata):

    if not metadata:
        return metadata

    tmdb_id = metadata.get(
        "tmdb_id"
    )

    metadata[
        "watchmode_sources"
    ] = get_watchmode_sources(
        tmdb_id
    )

    return metadata


def get_tmdb_metadata(tmdb_id):

    url = (
        f"{TMDB_BASE_URL}/movie/"
        f"{tmdb_id}"
        f"?append_to_response=watch/providers"
    )

    data = safe_tmdb_get(
        url
    )

    if not data:
        return {}

    poster_path = data.get(
        "poster_path"
    )

    poster_url = (
        f"{TMDB_IMAGE_BASE_URL}{poster_path}"
        if poster_path
        else None
    )

    watch_providers = data.get(
        "watch/providers",
        {}
    )

    india = (
        watch_providers
        .get("results", {})
        .get("IN", {})
    )

    streaming_providers = []

    for provider in india.get(
        "flatrate",
        []
    ):

        logo_path = provider.get(
            "logo_path"
        )

        streaming_providers.append({

            "name":
                provider.get(
                    "provider_name"
                ),

            "logo":
                (
                    f"https://image.tmdb.org/t/p/w92"
                    f"{logo_path}"
                    if logo_path
                    else None
                )
        })

    seen = set()
    unique_streaming_providers = []

    for provider in streaming_providers:

        name = provider.get(
            "name"
        )

        if name and name not in seen:

            seen.add(name)

            unique_streaming_providers.append(
                provider
            )

    metadata = {

        "tmdb_id":
            tmdb_id,

        "poster":
            poster_url,

        "overview":
            data.get(
                "overview",
                "Movie description unavailable."
            ),

        "tmdb_rating":
            (
                round(
                    float(
                        data.get(
                            "vote_average",
                            0
                        )
                    ),
                    1
                )
                if data.get(
                    "vote_average"
                )
                else "N/A"
            ),

        "release_date":
            data.get(
                "release_date",
                ""
            ),

        "runtime":
            data.get(
                "runtime",
                None
            ),

        "tmdb_url":
            (
                f"https://www.themoviedb.org/movie/"
                f"{tmdb_id}"
            ),

        "streaming_providers":
            unique_streaming_providers,

        "watchmode_sources":
            []
    }

    return metadata


def fetch_tmdb_by_title_search(title):

    cleaned_title = clean_title_for_tmdb(
        title
    )

    if not cleaned_title:
        return {}

    encoded_query = urllib.parse.quote(
        cleaned_title
    )

    url = (
        f"{TMDB_BASE_URL}/search/movie"
        f"?query={encoded_query}"
        f"&include_adult=false"
        f"&language=en-US"
    )

    data = safe_tmdb_get(
        url
    )

    if not data:
        return {}

    results = data.get(
        "results",
        []
    )

    if not results:
        return {}

    cleaned_lower = (
        cleaned_title.lower().strip()
    )

    selected_movie = None

    for movie in results:

        movie_title = (
            movie.get(
                "title",
                ""
            )
            .strip()
            .lower()
        )

        if (
            movie_title == cleaned_lower
            and movie.get("poster_path")
        ):

            selected_movie = movie
            break

    if selected_movie is None:

        for movie in results:

            if movie.get(
                "poster_path"
            ):

                selected_movie = movie
                break

    if selected_movie is None:
        return {}

    tmdb_id = selected_movie.get(
        "id"
    )

    poster_path = selected_movie.get(
        "poster_path"
    )

    if not tmdb_id or not poster_path:
        return {}

    poster_url = (
        f"{TMDB_IMAGE_BASE_URL}"
        f"{poster_path}"
    )

    complete_metadata = get_tmdb_metadata(
        tmdb_id
    )

    if complete_metadata:

        complete_metadata[
            "poster"
        ] = poster_url

        return complete_metadata

    return {

        "tmdb_id":
            tmdb_id,

        "poster":
            poster_url,

        "overview":
            selected_movie.get(
                "overview",
                "Movie description unavailable."
            ),

        "tmdb_rating":
            (
                round(
                    float(
                        selected_movie.get(
                            "vote_average",
                            0
                        )
                    ),
                    1
                )
                if selected_movie.get(
                    "vote_average"
                )
                else "N/A"
            ),

        "release_date":
            selected_movie.get(
                "release_date",
                ""
            ),

        "runtime":
            None,

        "tmdb_url":
            (
                f"https://www.themoviedb.org/movie/"
                f"{tmdb_id}"
            ),

        "streaming_providers":
            [],

        "watchmode_sources":
            []
    }


def enrich_recommendations(
    recommendations
):

    enriched = []
    cache_updated = False

    for movie in recommendations:

        movie_copy = movie.copy()

        movie_id = str(
            movie["movieId"]
        )

        movie_title = movie.get(
            "title",
            "Movie"
        )

        if (
            movie_id in POSTER_CACHE
            and POSTER_CACHE[movie_id].get(
                "poster"
            )
            and POSTER_CACHE[movie_id].get(
                "tmdb_url"
            )
            and "streaming_providers"
            in POSTER_CACHE[movie_id]
        ):

            movie_copy.update(
                POSTER_CACHE[movie_id]
            )

            enriched.append(
                movie_copy
            )

            continue

        try:

            tmdb_id = tmdb_mapping.get(
                int(movie_id)
            )

        except (
            ValueError,
            TypeError
        ):

            tmdb_id = None

        metadata = {}

        if tmdb_id:

            metadata = get_tmdb_metadata(
                tmdb_id
            )

        if not metadata.get(
            "poster"
        ):

            title_metadata = (
                fetch_tmdb_by_title_search(
                    movie_title
                )
            )

            if title_metadata:
                metadata = title_metadata

        encoded_title = urllib.parse.quote(
            movie_title
        )

        fallback_poster = (
            "https://via.placeholder.com/"
            "500x750/1e293b/ffffff?text="
            f"{encoded_title}"
        )

        result_payload = {

            "tmdb_id":
                metadata.get(
                    "tmdb_id",
                    tmdb_id
                ),

            "poster":
                metadata.get(
                    "poster"
                ) or fallback_poster,

            "overview":
                metadata.get(
                    "overview"
                ) or "Movie description unavailable.",

            "tmdb_rating":
                metadata.get(
                    "tmdb_rating"
                ) or "N/A",

            "release_date":
                metadata.get(
                    "release_date",
                    ""
                ),

            "runtime":
                metadata.get(
                    "runtime",
                    None
                ),

            "tmdb_url":
                metadata.get(
                    "tmdb_url",
                    None
                ),

            "streaming_providers":
                metadata.get(
                    "streaming_providers",
                    []
                ),

            "watchmode_sources":
                []
        }

        if metadata.get(
            "poster"
        ):

            POSTER_CACHE[
                movie_id
            ] = result_payload

            cache_updated = True

        movie_copy.update(
            result_payload
        )

        enriched.append(
            movie_copy
        )

    if cache_updated:

        save_cache(
            POSTER_CACHE
        )

    return enriched


def get_current_user():

    user_id = session.get(
        "user_id"
    )

    if not user_id:
        return None

    conn = get_db()

    user = conn.execute(
        """
        SELECT id, name, email
        FROM users
        WHERE id = ?
        """,
        (user_id,)
    ).fetchone()

    conn.close()

    return user
def personalize_familiar_recommendations(recommendations, user_id):
    """
    Personalize ONLY Familiar recommendations using
    the user's likes, dislikes and watchlist.

    Discover / Group / Individual are not affected.
    """

    if not user_id or not recommendations:
        return recommendations

    conn = get_db()

    # User's liked/disliked movies
    feedback_rows = conn.execute(
        """
        SELECT movie_id, feedback
        FROM movie_feedback
        WHERE user_id = ?
        """,
        (user_id,)
    ).fetchall()

    # User's watchlist movies
    watchlist_rows = conn.execute(
        """
        SELECT movie_id
        FROM watchlist
        WHERE user_id = ?
        """,
        (user_id,)
    ).fetchall()

    conn.close()

    liked_ids = {
        str(row["movie_id"])
        for row in feedback_rows
        if row["feedback"] == "like"
    }

    disliked_ids = {
        str(row["movie_id"])
        for row in feedback_rows
        if row["feedback"] == "dislike"
    }

    watchlist_ids = {
        str(row["movie_id"])
        for row in watchlist_rows
    }

    personalized = []

    for movie in recommendations:

        movie_copy = movie.copy()
        movie_id = str(movie.get("movieId"))

        # Never recommend something the user disliked
        if movie_id in disliked_ids:
            continue

        original_score = float(
            movie_copy.get("match_score", 0)
        )

        bonus = 0.0

        # Like = strongest positive signal
        if movie_id in liked_ids:
            bonus += 0.10

        # Watchlist = positive interest signal
        if movie_id in watchlist_ids:
            bonus += 0.05

        movie_copy["match_score"] = round(
            min(1.0, original_score + bonus),
            4
        )

        movie_copy["personalization_bonus"] = bonus

        personalized.append(movie_copy)

    # Highest personalized score first
    personalized.sort(
        key=lambda movie: (
            movie.get("match_score", 0),
            movie.get("rating", 0)
        ),
        reverse=True
    )

    return personalized

@app.route(
    "/signup",
    methods=["GET", "POST"]
)
def signup():

    if request.method == "POST":

        data = request.get_json(
            silent=True
        )

        if data:

            name = str(
                data.get(
                    "name",
                    ""
                )
            ).strip()

            email = str(
                data.get(
                    "email",
                    ""
                )
            ).strip().lower()

            password = str(
                data.get(
                    "password",
                    ""
                )
            )

        else:

            name = request.form.get(
                "name",
                ""
            ).strip()

            email = request.form.get(
                "email",
                ""
            ).strip().lower()

            password = request.form.get(
                "password",
                ""
            )

        if not name or not email or not password:

            return jsonify({
                "success": False,
                "error":
                    "Name, email and password are required."
            }), 400

        if len(password) < 6:

            return jsonify({
                "success": False,
                "error":
                    "Password must be at least 6 characters."
            }), 400

        conn = get_db()

        try:

            cursor = conn.execute(
                """
                INSERT INTO users
                (name, email, password_hash)
                VALUES (?, ?, ?)
                """,
                (
                    name,
                    email,
                    generate_password_hash(
                        password
                    )
                )
            )

            conn.commit()

            user_id = cursor.lastrowid

            session["user_id"] = user_id
            session["user_name"] = name

            return jsonify({

                "success":
                    True,

                "message":
                    "Account created successfully.",

                "user": {

                    "id":
                        user_id,

                    "name":
                        name,

                    "email":
                        email
                }
            })

        except sqlite3.IntegrityError:

            return jsonify({
                "success": False,
                "error":
                    "An account with this email already exists."
            }), 409

        finally:

            conn.close()

    return render_template(
        "signup.html"
    )


@app.route(
    "/login",
    methods=["GET", "POST"]
)
def login():

    if request.method == "POST":

        data = request.get_json(
            silent=True
        )

        if data:

            email = str(
                data.get(
                    "email",
                    ""
                )
            ).strip().lower()

            password = str(
                data.get(
                    "password",
                    ""
                )
            )

        else:

            email = request.form.get(
                "email",
                ""
            ).strip().lower()

            password = request.form.get(
                "password",
                ""
            )

        conn = get_db()

        user = conn.execute(
            """
            SELECT *
            FROM users
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

        conn.close()

        if (
            user
            and check_password_hash(
                user["password_hash"],
                password
            )
        ):

            session["user_id"] = user["id"]
            session["user_name"] = user["name"]

            return jsonify({

                "success":
                    True,

                "message":
                    "Login successful.",

                "user": {

                    "id":
                        user["id"],

                    "name":
                        user["name"],

                    "email":
                        user["email"]
                }
            })

        return jsonify({
            "success": False,
            "error":
                "Invalid email or password."
        }), 401

    return render_template(
        "login.html"
    )


@app.route(
    "/logout",
    methods=["GET", "POST"]
)
def logout():

    session.clear()

    if request.method == "POST":

        return jsonify({
            "success": True,
            "message":
                "Logged out successfully."
        })

    return redirect(
        "/login"
    )


@app.route(
    "/me",
    methods=["GET"]
)
def me():

    user = get_current_user()

    if not user:

        return jsonify({
            "logged_in":
                False
        })

    return jsonify({

        "logged_in":
            True,

        "user": {

            "id":
                user["id"],

            "name":
                user["name"],

            "email":
                user["email"]
        }
    })
@app.route(
    "/feedback",
    methods=["POST"]
)
def feedback():

    user = get_current_user()

    if not user:

        return jsonify({
            "success": False,
            "error":
                "Please login first."
        }), 401

    data = request.get_json(
        silent=True
    ) or {}

    movie_id = str(
        data.get(
            "movie_id",
            ""
        )
    ).strip()

    movie_title = str(
        data.get(
            "movie_title",
            ""
        )
    ).strip()
    
    poster = str(
        data.get(
            "poster",
            ""
        )
    ).strip()

    tmdb_rating = data.get(
        "tmdb_rating",
        None
    )

    overview = str(
        data.get(
            "overview",
            ""
        )
    ).strip()
    
    feedback_value = str(
        data.get(
            "feedback",
            ""
        )
    ).strip().lower()

    if not movie_id:

        return jsonify({
            "success": False,
            "error":
                "Movie ID is required."
        }), 400

    if feedback_value not in [
        "like",
        "dislike"
    ]:

        return jsonify({
            "success": False,
            "error":
                "Feedback must be like or dislike."
        }), 400

    conn = get_db()

    conn.execute(
        """
        INSERT INTO movie_feedback
        (user_id, movie_id, movie_title, poster, tmdb_rating, overview, feedback)
VALUES (?, ?, ?, ?, ?, ?, ?)

        ON CONFLICT(user_id, movie_id)
        DO UPDATE SET
            movie_title = excluded.movie_title,
            feedback = excluded.feedback,
            created_at = CURRENT_TIMESTAMP
        """,
        
            (
    (
    user["id"],
    movie_id,
    movie_title,
    str(data.get("poster", "")),
    str(data.get("tmdb_rating", "")),
    str(data.get("overview", "")),
    feedback_value
)
)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "movie_id": movie_id,
        "feedback": feedback_value
    })


@app.route(
    "/feedback",
    methods=["GET"]
)
def get_feedback():

    user = get_current_user()

    if not user:

        return jsonify({
            "logged_in": False,
            "feedback": []
        })

    conn = get_db()

    rows = conn.execute(
        """
        SELECT
    movie_id,
    movie_title,
    poster,
    tmdb_rating,
    overview,
    feedback,
    created_at
FROM movie_feedback
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (user["id"],)
    ).fetchall()

    conn.close()

    return jsonify({
        "logged_in": True,
        "feedback": [
            dict(row)
            for row in rows
        ]
    })


@app.route(
    "/",
    methods=["GET"]
)
def home():

    return render_template(
        "index.html"
    )


@app.route(
    "/genres",
    methods=["GET"]
)
def list_genres():

    return jsonify({
        "genres":
            engine.get_available_genres()
    })


@app.route(
    "/recommend",
    methods=["GET", "POST"]
)
def recommend():

    if request.method == "POST":

        data = request.get_json(
            silent=True
        ) or {}

        selected_genres = data.get(
            "genres",
            []
        )

        try:

            top_n = int(
                data.get(
                    "top_n",
                    16
                )
            )

        except (
            TypeError,
            ValueError
        ):

            top_n = 16

        mode = data.get(
            "mode",
            "familiar"
        )

        discover_genre = data.get(
            "discover_genre"
        )

    else:

        genres_param = request.args.get(
            "genres",
            ""
        )

        selected_genres = [
            g.strip()
            for g in genres_param.split(",")
            if g.strip()
        ]

        try:

            top_n = int(
                request.args.get(
                    "top_n",
                    16
                )
            )

        except (
            TypeError,
            ValueError
        ):

            top_n = 16

        mode = request.args.get(
            "mode",
            "familiar"
        )

        discover_genre = request.args.get(
            "discover_genre"
        )

    if not selected_genres:

        return jsonify({
            "error":
                "Please provide at least one genre via 'genres'."
        }), 400

    top_n = max(
        1,
        min(top_n, 50)
    )

    allowed_modes = [
        "individual",
        "familiar",
        "discover",
        "group"
    ]

    if mode not in allowed_modes:
        mode = "familiar"

    try:

        recommendations = engine.recommend(
            selected_genres,
            top_n=top_n,
            mode=mode,
            discover_genre=discover_genre
        )
                # Personalize ONLY Familiar recommendations
        if mode == "familiar":
            user = get_current_user()

            if user:
                recommendations = personalize_familiar_recommendations(
                    recommendations,
                    user["id"]
                )

    except ValueError as e:

        return jsonify({
            "error":
                str(e)
        }), 400

    except Exception as e:

        print(
            "RECOMMENDATION ERROR:",
            e
        )

        return jsonify({
            "error":
                "Unable to generate recommendations."
        }), 500

    try:

        recommendations = enrich_recommendations(
            recommendations
        )

    except Exception as e:

        print(
            "TMDB ENRICHMENT ERROR:",
            e
        )

        recommendations = [
            dict(movie)
            for movie in recommendations
        ]

    return jsonify({

        "selected_genres":
            selected_genres,

        "mode":
            mode,

        "count":
            len(recommendations),

        "recommendations":
            recommendations
    })


@app.route(
    "/streaming/<tmdb_id>",
    methods=["GET"]
)
def streaming_sources(tmdb_id):

    try:

        tmdb_id_int = int(
            tmdb_id
        )

    except (
        ValueError,
        TypeError
    ):

        return jsonify({
            "success": False,
            "error":
                "Invalid TMDB movie ID.",
            "providers": []
        }), 400

    providers = get_watchmode_sources(
        tmdb_id_int
    )

    return jsonify({

        "success":
            True,

        "tmdb_id":
            tmdb_id_int,

        "country":
            "IN",

        "providers":
            providers,

        "attribution":
            "Streaming availability data provided by Watchmode."
    })


@app.route(
    "/watch-started",
    methods=["POST"]
)
def watch_started():

    user = get_current_user()

    if not user:

        return jsonify({
            "success": False,
            "error":
                "Please login first."
        }), 401

    data = request.get_json(
        silent=True
    ) or {}

    movie_id = str(
        data.get(
            "movie_id",
            ""
        )
    ).strip()

    movie_title = str(
        data.get(
            "movie_title",
            ""
        )
    ).strip()

    if not movie_id:

        return jsonify({
            "success": False,
            "error":
                "Movie ID is required."
        }), 400

    conn = get_db()

    conn.execute(
        """
        INSERT INTO pending_watch
        (
            user_id,
            movie_id,
            movie_title,
            tmdb_id,
            poster,
            tmdb_rating,
            overview
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)

        ON CONFLICT(user_id)
        DO UPDATE SET
            movie_id =
                excluded.movie_id,

            movie_title =
                excluded.movie_title,

            tmdb_id =
                excluded.tmdb_id,

            poster =
                excluded.poster,

            tmdb_rating =
                excluded.tmdb_rating,

            overview =
                excluded.overview,

            started_at =
                CURRENT_TIMESTAMP
        """,
        (
            user["id"],

            movie_id,

            movie_title,

            str(
                data.get(
                    "tmdb_id",
                    ""
                )
            ),

            str(
                data.get(
                    "poster",
                    ""
                )
            ),

            str(
                data.get(
                    "tmdb_rating",
                    ""
                )
            ),

            str(
                data.get(
                    "overview",
                    ""
                )
            )
        )
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success":
            True
    })


@app.route(
    "/pending-watch",
    methods=["GET"]
)
def get_pending_watch():

    user = get_current_user()

    if not user:

        return jsonify({
            "logged_in":
                False,

            "pending":
                None
        })

    conn = get_db()

    row = conn.execute(
        """
        SELECT
            movie_id,
            movie_title,
            tmdb_id,
            poster,
            tmdb_rating,
            overview,
            started_at
        FROM pending_watch
        WHERE user_id = ?
        """,
        (user["id"],)
    ).fetchone()

    conn.close()

    return jsonify({

        "logged_in":
            True,

        "pending":
            dict(row)
            if row
            else None
    })

@app.route("/movie-details/<movie_id>", methods=["GET"])
def movie_details(movie_id):
    try:
        movie_id = str(movie_id)

        # Search the movie in the loaded dataset
        movie = next(
            (
                m for m in engine.recommend(
                    [],
                    top_n=1000,
                    mode="discover"
                )
                if str(m.get("movieId")) == movie_id
            ),
            None
        )

        if not movie:
            return jsonify({
                "success": False,
                "error": "Movie not found."
            }), 404

        enriched = enrich_recommendations([movie])

        return jsonify(
            enriched[0] if enriched else movie
        )

    except Exception as e:
        print("MOVIE DETAILS ERROR:", e)
        return jsonify({
            "success": False,
            "error": "Could not load movie details."
        }), 500
@app.route(
    "/pending-watch/dismiss",
    methods=["POST"]
)
def dismiss_pending_watch():

    user = get_current_user()

    if not user:

        return jsonify({
            "success":
                False,

            "error":
                "Please login first."
        }), 401

    conn = get_db()

    conn.execute(
        """
        DELETE FROM pending_watch
        WHERE user_id = ?
        """,
        (user["id"],)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success":
            True
    })


@app.route(
    "/watchlist",
    methods=["GET", "POST", "DELETE"]
)
def watchlist():

    user = get_current_user()

    if not user:

        return jsonify({
            "success":
                False,

            "error":
                "Please login first."
        }), 401

    conn = get_db()

    if request.method == "GET":

        rows = conn.execute(
            """
            SELECT
                movie_id,
                movie_title,
                tmdb_id,
                poster,
                tmdb_rating,
                overview,
                added_at
            FROM watchlist
            WHERE user_id = ?
            ORDER BY added_at DESC
            """,
            (user["id"],)
        ).fetchall()

        conn.close()

        return jsonify({

            "success":
                True,

            "watchlist":
                [
                    dict(row)
                    for row in rows
                ]
        })

    data = request.get_json(
        silent=True
    ) or {}

    movie_id = str(
        data.get(
            "movie_id",
            ""
        )
    ).strip()

    if not movie_id:

        conn.close()

        return jsonify({
            "success": False,
            "error":
                "Movie ID is required."
        }), 400

    if request.method == "DELETE":

        conn.execute(
            """
            DELETE FROM watchlist
            WHERE user_id = ?
            AND movie_id = ?
            """,
            (
                user["id"],
                movie_id
            )
        )

        conn.commit()
        conn.close()

        return jsonify({
            "success":
                True
        })

    conn.execute(
        """
        INSERT INTO watchlist
        (
            user_id,
            movie_id,
            movie_title,
            tmdb_id,
            poster,
            tmdb_rating,
            overview
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)

        ON CONFLICT(user_id, movie_id)
        DO UPDATE SET
            movie_title =
                excluded.movie_title,

            tmdb_id =
                excluded.tmdb_id,

            poster =
                excluded.poster,

            tmdb_rating =
                excluded.tmdb_rating,

            overview =
                excluded.overview
        """,
        (
            user["id"],

            movie_id,

            str(
                data.get(
                    "movie_title",
                    ""
                )
            ),

            str(
                data.get(
                    "tmdb_id",
                    ""
                )
            ),

            str(
                data.get(
                    "poster",
                    ""
                )
            ),

            str(
                data.get(
                    "tmdb_rating",
                    ""
                )
            ),

            str(
                data.get(
                    "overview",
                    ""
                )
            )
        )
    )

    conn.execute(
        """
        DELETE FROM pending_watch
        WHERE user_id = ?
        AND movie_id = ?
        """,
        (
            user["id"],
            movie_id
        )
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success":
            True
    })


if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )