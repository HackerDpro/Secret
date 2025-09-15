from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import base64
import re
import json

app = Flask(__name__)
CORS(app)

# Replace with your actual OCR.space API key
OCR_API_KEY = 'K85519812988957'

def get_parsed_text_from_api(image_bytes):
    """Sends image to OCR.space API and returns the parsed text."""
    try:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        api_url = "https://api.ocr.space/parse/image"
        payload = {
            'apikey': OCR_API_KEY,
            'language': 'dut',
            'base64Image': 'data:image/png;base64,' + base64_image
        }

        response = requests.post(api_url, data=payload)
        response.raise_for_status()
        api_result = response.json()

        print(f"API Response: {json.dumps(api_result, indent=2)}")

        if api_result['IsErroredOnProcessing'] or not api_result['ParsedResults']:
            print("API returned an error or no results.")
            return ""

        return api_result['ParsedResults'][0]['ParsedText']

    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def parse_day_schedule(text):
    courses = []
    
    # Split the text by time slots to get individual course blocks
    course_blocks = re.split(r'([0-9]{2}:[0-9]{2}\s*-\s*[0-9]{2}:[0-9]{2})', text)
    
    # The first element will be an empty string or header, so we skip it
    if len(course_blocks) > 1:
        # Iterate over the time slots and their corresponding text blocks
        for i in range(1, len(course_blocks), 2):
            time_slot = course_blocks[i].strip()
            course_text = course_blocks[i+1].strip()
            
            # Remove unwanted characters like bullet points
            cleaned_text = re.sub(r'•', '', course_text).strip()
            
            course_data = {
                "time": time_slot,
                "course": "N/A",
                "professor": "N/A",
                "location": "N/A",
                "theme": "N/A"
            }

            # Pattern to capture Course, Professor, Location, and Theme
            full_pattern = re.compile(
                r'([\s\S]+?)\s+\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b' # Course and Professor
                r'(?:[\s\S]*?\b([A-Z][0-9\.]+)\b)?' # Optional Location
                r'(?:[\s\S]*?(THEMA|TRAJET|WERKEN MET|EVALUATIE|ZIN IN LEZEN|INLEIDING|HERHALING|OPDRACHT|TEST|PRESENT)\b.*)?', # Optional Theme
                re.IGNORECASE
            )
            
            match = full_pattern.search(cleaned_text)

            if match:
                # This block handles the most detailed case with professor, location, and theme
                course_data["course"] = match.group(1).strip() if match.group(1) else "N/A"
                course_data["professor"] = match.group(2).strip() if match.group(2) else "N/A"
                course_data["location"] = match.group(3).strip() if match.group(3) else "N/A"
                
                # Check for theme explicitly
                theme_match = re.search(r'(THEMA|TRAJET|WERKEN MET|EVALUATIE|ZIN IN LEZEN|INLEIDING|HERHALING|OPDRACHT|TEST|PRESENT)\b.*', cleaned_text, re.IGNORECASE)
                if theme_match:
                    course_data["theme"] = theme_match.group(0).strip()
                    
            else:
                # Fallback pattern for courses without a professor's full name
                simplified_pattern = re.compile(
                    r'([\s\S]+?)' # Everything up to the location or theme
                    r'(?:[\s\S]*?\b([A-Z][0-9\.]+)\b)?' # Optional Location
                    r'(?:[\s\S]*?(THEMA|TRAJET|WERKEN MET|EVALUATIE|ZIN IN LEZEN|INLEIDING|HERHALING|OPDRACHT|TEST|PRESENT)\b.*)?', # Optional Theme
                    re.IGNORECASE
                )
                
                simplified_match = simplified_pattern.search(cleaned_text)
                if simplified_match:
                    course_data["course"] = simplified_match.group(1).strip() if simplified_match.group(1) else "N/A"
                    course_data["location"] = simplified_match.group(2).strip() if simplified_match.group(2) else "N/A"
                    
                    theme_match = re.search(r'(THEMA|TRAJET|WERKEN MET|EVALUATIE|ZIN IN LEZEN|INLEIDING|HERHALING|OPDRACHT|TEST|PRESENT)\b.*', cleaned_text, re.IGNORECASE)
                    if theme_match:
                        course_data["theme"] = theme_match.group(0).strip()
            
            # Final cleanup of the course name
            course_data["course"] = re.sub(r'(?:3BE4|3BE5|3CNW|RPH|CAF1|SPORT2)', '', course_data["course"], flags=re.IGNORECASE).strip()
            
            courses.append(course_data)
            
    return {"courses": courses, "tasks": []}


@app.route('/process-schedule', methods=['POST'])
def process_schedule():
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    schedule_data = {}

    for day in days:
        if day in request.files and request.files[day].filename:
            file = request.files[day]
            text = get_parsed_text_from_api(file.read())
            if text is None:
                schedule_data[day.capitalize()] = {"error": "Failed to process image."}
                continue
            
            schedule_data[day.capitalize()] = parse_day_schedule(text)
    
    return jsonify(schedule_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)