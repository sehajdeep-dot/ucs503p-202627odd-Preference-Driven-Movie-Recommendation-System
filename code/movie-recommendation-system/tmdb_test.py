
import os
import subprocess
import json
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("TMDB_API_TOKEN")

if not token:
    print("TMDB_API_TOKEN not found")
    exit()

url = "https://api.themoviedb.org/3/movie/862"

result = subprocess.run(
    [
        "curl.exe",
        "--tlsv1.2",
        "-s",
        url,
        "-H",
        f"Authorization: Bearer {token}",
        "-H",
        "accept: application/json"
    ],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print("Curl error:")
    print(result.stderr)
    exit()

data = json.loads(result.stdout)

print("Title:", data.get("title"))
print("Overview:", data.get("overview"))
print("Rating:", data.get("vote_average"))
print("Poster:", data.get("poster_path"))