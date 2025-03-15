import requests
import json

# Base URL
base_url = "https://opaskartta.turku.fi/trimbleogcapi/collections/GIS:Kaupunginosat/items"
params = {"f": "application/json"}
all_data = []

while base_url:
    response = requests.get(base_url, params=params)
    response.raise_for_status()  # Raise an error if the request fails
    data = response.json()

    # Add current results to the list
    all_data.extend(data.get("features", []))

    # Check for a "next" link in the response
    next_link = next((link["href"] for link in data.get("links", []) if link["rel"] == "next"), None)
    
    if next_link:
        base_url = next_link  # Update URL to the next page
        params = {}  # Remove initial parameters as they are likely already included in `next_link`
    else:
        base_url = None  # Stop when there's no next page

# Save the data to a JSON file
with open("turku_districts_all.json", "w", encoding="utf-8") as f:
    json.dump({"features": all_data}, f, indent=4, ensure_ascii=False)

print(f"Saved {len(all_data)} records to turku_districts_all.json")
