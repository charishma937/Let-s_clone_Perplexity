import google.generativeai as genai

API_KEY = "AIzaSyD_narxTb0nk2vq1EUyQ9f1A95xTVSXKbQ"
genai.configure(api_key=API_KEY)

print("Listing supported models:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"Model: {m.name}")
