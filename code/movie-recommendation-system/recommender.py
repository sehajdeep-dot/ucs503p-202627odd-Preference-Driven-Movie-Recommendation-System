import re
import requests
import pandas as pd
import numpy as np
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics.pairwise import cosine_similarity


class MovieRecommender:

    def __init__(
        self,
        movies_path: str,
        ratings_path: str = "data/ratings.csv",
        links_path: str = "data/links.csv",
        tmdb_api_key: str = None
    ):
        self.movies_path = movies_path
        self.ratings_path = ratings_path
        self.links_path = links_path
        self.tmdb_api_key = tmdb_api_key

        self.movies_df = None
        self.genre_matrix = None
        self.mlb = None

        self._load_data()
        self._load_ratings()
        self._load_links()
        self._build_genre_vectors()

    # -----------------------------------------
    # LOAD MOVIES
    # -----------------------------------------

    def _load_data(self):
        df = pd.read_csv(self.movies_path)
        df = df.dropna(subset=["title", "genres"])
        df = df[df["genres"] != "(no genres listed)"]
        df["genres"] = df["genres"].str.strip()
        df["genre_list"] = df["genres"].apply(lambda g: g.split("|"))
        df = df.reset_index(drop=True)
        self.movies_df = df

    # -----------------------------------------
    # LOAD RATINGS
    # -----------------------------------------

    def _load_ratings(self):
        try:
            ratings = pd.read_csv(self.ratings_path)
            average_ratings = (
                ratings.groupby("movieId")["rating"].mean().reset_index()
            )
            average_ratings.rename(columns={"rating": "avg_rating"}, inplace=True)

            self.movies_df = self.movies_df.merge(
                average_ratings, on="movieId", how="left"
            )
            self.movies_df["avg_rating"] = self.movies_df["avg_rating"].fillna(3.0)

        except FileNotFoundError:
            self.movies_df["avg_rating"] = 3.0

    # -----------------------------------------
    # LOAD LINKS (MovieLens -> TMDB Mapping)
    # -----------------------------------------

    def _load_links(self):
        try:
            links = pd.read_csv(self.links_path)
            self.movies_df = self.movies_df.merge(
                links[["movieId", "tmdbId"]], on="movieId", how="left"
            )
        except FileNotFoundError:
            self.movies_df["tmdbId"] = None

    # -----------------------------------------
    # GENRE VECTORS
    # -----------------------------------------

    def _build_genre_vectors(self):
        self.mlb = MultiLabelBinarizer()
        self.genre_matrix = self.mlb.fit_transform(
            self.movies_df["genre_list"]
        )

    # -----------------------------------------
    # AVAILABLE GENRES
    # -----------------------------------------

    def get_available_genres(self):
        return list(self.mlb.classes_)

    # -----------------------------------------
    # USER VECTOR
    # -----------------------------------------

    def _build_user_vector(self, selected_genres):
        return self.mlb.transform([selected_genres])

    # -----------------------------------------
    # DEPTH-WISE SIMILARITY
    # How focused is the movie on the user's genres?
    # = matched_genres / total_movie_genres
    # High depth = movie is mostly about genres user likes
    # -----------------------------------------

    def _compute_depth_scores(self, selected_genres):
        user_genre_set = set(selected_genres)
        depth_scores = []

        for genre_list in self.movies_df["genre_list"]:
            movie_genre_set = set(genre_list)
            total_movie_genres = len(movie_genre_set)

            if total_movie_genres == 0:
                depth_scores.append(0.0)
                continue

            matched = len(user_genre_set & movie_genre_set)
            depth_scores.append(matched / total_movie_genres)

        return np.array(depth_scores)

    # -----------------------------------------
    # BREADTH-WISE SIMILARITY
    # How many of the user's genres does the movie cover?
    # = matched_genres / total_user_genres
    # High breadth = movie covers most of what user asked for
    # -----------------------------------------

    def _compute_breadth_scores(self, selected_genres):
        user_genre_set = set(selected_genres)
        total_user_genres = len(user_genre_set)

        if total_user_genres == 0:
            return np.zeros(len(self.movies_df))

        breadth_scores = []

        for genre_list in self.movies_df["genre_list"]:
            movie_genre_set = set(genre_list)
            matched = len(user_genre_set & movie_genre_set)
            breadth_scores.append(matched / total_user_genres)

        return np.array(breadth_scores)

    # -----------------------------------------
    # HELPER: CLEAN MOVIELENS TITLE FOR TMDB SEARCH
    # -----------------------------------------

    def _clean_title_for_tmdb(self, title: str) -> str:
        if not title:
            return ""
        # 1. Remove year in parentheses e.g. "(1993)"
        cleaned = re.sub(r'\s*\(\d{4}\)', '', title)
        # 2. Fix inverted articles e.g. "Wedding Banquet, The" -> "The Wedding Banquet"
        if ',' in cleaned:
            parts = cleaned.rsplit(',', 1)
            if parts[1].strip().lower() in ['the', 'a', 'an']:
                cleaned = f"{parts[1].strip()} {parts[0].strip()}"
        # 3. Remove secondary title brackets e.g. "(Xi yan)"
        cleaned = re.sub(r'\s*\([^)]*\)', '', cleaned)
        return cleaned.strip()

    # -----------------------------------------
    # HELPER: FETCH TMDB METADATA
    # -----------------------------------------

    def fetch_tmdb_metadata(self, title: str, tmdb_id=None) -> dict:
        fallback = {
            "poster_path": "https://via.placeholder.com/500x750?text=No+Poster",
            "overview": "Movie description unavailable.",
            "tmdb_rating": "N/A"
        }

        if not self.tmdb_api_key:
            return fallback

        try:
            # Method 1: Try TMDB ID lookup if available
            if pd.notna(tmdb_id) and str(tmdb_id).strip() != "":
                url = f"https://api.themoviedb.org/3/movie/{int(tmdb_id)}?api_key={self.tmdb_api_key}"
                res = requests.get(url, timeout=3)
                if res.status_code == 200:
                    movie = res.json()
                    poster = movie.get("poster_path")
                    return {
                        "poster_path": f"https://image.tmdb.org/t/p/w500{poster}" if poster else fallback["poster_path"],
                        "overview": movie.get("overview") or fallback["overview"],
                        "tmdb_rating": f"TMDB {round(movie['vote_average'], 1)}/10" if movie.get("vote_average") else fallback["tmdb_rating"]
                    }

            # Method 2: Fallback to Title Search with Cleaned Title
            cleaned_title = self._clean_title_for_tmdb(title)
            search_url = f"https://api.themoviedb.org/3/search/movie?api_key={self.tmdb_api_key}&query={cleaned_title}"
            res = requests.get(search_url, timeout=3)

            if res.status_code == 200:
                results = res.json().get("results")
                if results:
                    movie = results[0]
                    poster = movie.get("poster_path")
                    return {
                        "poster_path": f"https://image.tmdb.org/t/p/w500{poster}" if poster else fallback["poster_path"],
                        "overview": movie.get("overview") or fallback["overview"],
                        "tmdb_rating": f"TMDB {round(movie['vote_average'], 1)}/10" if movie.get("vote_average") else fallback["tmdb_rating"]
                    }

        except Exception as e:
            print(f"Safe catch during TMDB fetch for '{title}': {e}")

        return fallback

    # -----------------------------------------
    # RECOMMEND
    # -----------------------------------------

    def recommend(
        self,
        selected_genres,
        top_n=10,
        mode="familiar",
        discover_genre=None
    ):
        if not selected_genres:
            raise ValueError("Please select at least one genre.")

        # --- Core similarity scores ---
        user_vector = self._build_user_vector(selected_genres)
        cosine_scores  = cosine_similarity(user_vector, self.genre_matrix)[0]
        depth_scores   = self._compute_depth_scores(selected_genres)
        breadth_scores = self._compute_breadth_scores(selected_genres)

        results = self.movies_df.copy()
        results["similarity"]    = cosine_scores
        results["depth"]         = depth_scores
        results["breadth"]       = breadth_scores
        results["rating_score"]  = results["avg_rating"] / 5.0

        # ------------------------------------------------------------------
        # Mode: familiar
        #   Priority: cosine match + breadth (cover user genres) + depth
        #   (how focused the movie is) + rating
        #   Weights: cosine=0.50, breadth=0.20, depth=0.15, rating=0.15
        # ------------------------------------------------------------------
        if mode == "familiar":
            results["final_score"] = (
                0.50 * results["similarity"]
                + 0.20 * results["breadth"]
                + 0.15 * results["depth"]
                + 0.15 * results["rating_score"]
            )

        # ------------------------------------------------------------------
        # Mode: discover
        #   Priority: breadth (explore widely) + cosine + rating, depth lower
        #   Filter by discover_genre if provided
        #   Weights: cosine=0.35, breadth=0.25, depth=0.10, rating=0.30
        # ------------------------------------------------------------------
        elif mode == "discover":
            if discover_genre:
                results = results[
                    results["genre_list"].apply(
                        lambda genres: discover_genre in genres
                    )
                ]
            results["final_score"] = (
                0.35 * results["similarity"]
                + 0.25 * results["breadth"]
                + 0.10 * results["depth"]
                + 0.30 * results["rating_score"]
            )

        else:
            results["final_score"] = (
                0.50 * results["similarity"]
                + 0.20 * results["breadth"]
                + 0.15 * results["depth"]
                + 0.15 * results["rating_score"]
            )

        results = results[results["final_score"] > 0]
        results = results.sort_values(
            by=["final_score", "avg_rating", "title"],
            ascending=[False, False, True]
        )

        top_results = results.head(top_n)

        # Build output payload with TMDB integration
        recommendations = []
        for _, row in top_results.iterrows():
            tmdb_data = self.fetch_tmdb_metadata(
                title=row["title"],
                tmdb_id=row.get("tmdbId")
            )

            recommendations.append({
                "movieId":      int(row["movieId"]),
                "title":        row["title"],
                "genres":       row["genres"],
                "match_score":  round(float(row["final_score"]), 4),
                "breadth_score": round(float(row["breadth"]), 4),
                "depth_score":  round(float(row["depth"]), 4),
                "rating":       round(float(row["avg_rating"]), 1),
                "poster_url":   tmdb_data["poster_path"],
                "overview":     tmdb_data["overview"],
                "tmdb_rating":  tmdb_data["tmdb_rating"]
            })

        return recommendations