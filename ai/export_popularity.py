import joblib
import numpy as np
import json

data = joblib.load("modelo.pkl")
V = data["V"]
idx2movie = data["idx2movie"]

# norma L2 de cada coluna de V como proxy de popularidade
norms = np.linalg.norm(V, axis=0)

# threshold: 80th percentile -> top 20% sao "popular"
threshold = np.percentile(norms, 80)
print(f"Threshold (80th percentile): {threshold:.6f}")
print(f"Total filmes: {len(idx2movie)}")
popular_count = sum(1 for n in norms if n >= threshold)
print(f"Popular (>= threshold): {popular_count}")
print(f"Hidden-gem (< threshold): {len(idx2movie) - popular_count}")

output = []
for idx in range(len(idx2movie)):
    source_id = idx2movie[idx]
    bucket = "popular" if norms[idx] >= threshold else "hidden-gem"
    output.append({"sourceMovieId": int(source_id), "popularityBucket": bucket})

with open("popularity_data.json", "w") as f:
    json.dump(output, f)

print(f"Exportados {len(output)} filmes para popularity_data.json")
