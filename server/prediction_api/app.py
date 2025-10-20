from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import json
import numpy as np

app = Flask(__name__)
CORS(app)

# Load trained model, scaler, and feature names
try:
    model = joblib.load('model.pkl')
    scaler = joblib.load('scaler.pkl')
    with open('feature_names.json', 'r') as f:
        feature_names = json.load(f)
except FileNotFoundError:
    print("ERROR: Model files not found. Please run train.py first.")
    model, scaler, feature_names = None, None, None

def clean_input_data(data):
    """Cleans a single JSON object (dict) of data"""
    cleaned_data = {}

    # Map Gender
    gender = str(data.get('Gender', 'other')).strip().lower()
    cleaned_data['Gender'] = {'male': 1, 'female': 0, 'other': 2}.get(gender, 2)

    # Map ExtracurricularActivities
    extra_curr = str(data.get('ExtracurricularActivities', 'no')).strip().lower()
    cleaned_data['ExtracurricularActivities'] = 1 if extra_curr == 'yes' else 0

    # Map ParentalSupport
    support = str(data.get('ParentalSupport', 'medium')).strip().lower()
    cleaned_data['ParentalSupport'] = {'high': 2, 'medium': 1, 'low': 0}.get(support, 1)

    # Map Online Classes Taken
    online_classes = pd.to_numeric(data.get('Online Classes Taken'), errors='coerce')
    cleaned_data['Online Classes Taken'] = 1 if (online_classes and online_classes > 0) else 0

    # Clean Numeric
    cleaned_data['AttendanceRate'] = pd.to_numeric(data.get('AttendanceRate'), errors='coerce')
    cleaned_data['StudyHoursPerWeek'] = pd.to_numeric(data.get('StudyHoursPerWeek'), errors='coerce')
    cleaned_data['PreviousGrade'] = pd.to_numeric(data.get('PreviousGrade'), errors='coerce')

    # Fill NaNs and clip
    cleaned_data['AttendanceRate'] = np.nan_to_num(cleaned_data['AttendanceRate'], nan=80)
    cleaned_data['StudyHoursPerWeek'] = np.nan_to_num(cleaned_data['StudyHoursPerWeek'], nan=15)
    cleaned_data['PreviousGrade'] = np.nan_to_num(cleaned_data['PreviousGrade'], nan=70)

    cleaned_data['AttendanceRate'] = np.clip(cleaned_data['AttendanceRate'], 0, 100)
    cleaned_data['StudyHoursPerWeek'] = np.clip(cleaned_data['StudyHoursPerWeek'], 0, 80)
    cleaned_data['PreviousGrade'] = np.clip(cleaned_data['PreviousGrade'], 0, 100)

    # Convert to DataFrame for scaler
    df = pd.DataFrame([cleaned_data])
    return df[feature_names] # Ensure column order


@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model not loaded. Run train.py.'}), 500

    try:
        data = request.get_json()

        # Clean the incoming data
        cleaned_df = clean_input_data(data)

        # Scale the data
        scaled_data = scaler.transform(cleaned_df)

        # Make prediction
        prediction = model.predict(scaled_data)[0]
        probability = model.predict_proba(scaled_data)[0]

        result = 'Pass' if prediction == 1 else 'Fail'
        confidence = f"{max(probability):.2%}"

        return jsonify({'prediction': result, 'confidence': confidence})

    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5001)