import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import json
import numpy as np

def load_training_data():
    df = pd.read_csv("student_performance_updated_1000.csv")
    return df

def preprocess_training_data(df):
    df_clean = df.copy()
    numeric_cols = ['AttendanceRate', 'StudyHoursPerWeek', 'PreviousGrade']
    for col in numeric_cols:
        if col in df_clean.columns:
            df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce')
            missing_pct = df_clean[col].isnull().sum() / len(df_clean) * 100
            if missing_pct < 5:
                df_clean[col] = df_clean[col].fillna(df_clean[col].median())
            else:
                df_clean[col] = df_clean[col].fillna(df_clean[col].mean())

    categorical_cols = ['Gender', 'ExtracurricularActivities', 'ParentalSupport']
    for col in categorical_cols:
        if col in df_clean.columns:
            df_clean[col] = df_clean[col].fillna('Unknown')
            df_clean[col] = df_clean[col].astype(str)

    if 'Online Classes Taken' in df_clean.columns:
        df_clean['Online Classes Taken'] = df_clean['Online Classes Taken'].map({
            'True': 1, 'False': 0, True: 1, False: 0, 'Yes': 1, 'No': 0
        }).fillna(0)

    if 'PreviousGrade' in df_clean.columns:
        threshold = 70
        df_clean['Pass'] = (df_clean['PreviousGrade'] >= threshold).astype(int)
    else:
        raise ValueError("Cannot create target variable - PreviousGrade column not found")

    columns_to_drop = ['StudentID', 'Name', 'FinalGrade', 'Study Hours', 'Attendance (%)']
    df_clean = df_clean.drop(columns=[col for col in columns_to_drop if col in df_clean.columns])

    encoders = {}
    for col in categorical_cols:
        if col in df_clean.columns:
            le = LabelEncoder()
            df_clean[col] = le.fit_transform(df_clean[col])
            encoders[col] = le

    required_features = ['Gender', 'AttendanceRate', 'StudyHoursPerWeek',
                        'PreviousGrade', 'ExtracurricularActivities', 'ParentalSupport',
                        'Online Classes Taken', 'Pass']
    available_features = [col for col in required_features if col in df_clean.columns]
    df_final = df_clean[available_features].copy()
    df_final = df_final.dropna()
    return df_final, encoders

def train_logistic_regression(df):
    if 'Pass' not in df.columns:
        return None, None, None
    X = df.drop(columns=['Pass'])
    y = df['Pass']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    model = LogisticRegression(random_state=42, max_iter=1000)
    model.fit(X_train_scaled, y_train)
    return model, scaler, list(X.columns)

if __name__ == "__main__":
    print("Starting model training...")
    training_df = load_training_data()
    df_processed, encoders = preprocess_training_data(training_df)
    model, scaler, feature_names = train_logistic_regression(df_processed)

    joblib.dump(model, 'model.pkl')
    print("Model saved to model.pkl")

    joblib.dump(scaler, 'scaler.pkl')
    print("Scaler saved to scaler.pkl")

    with open('feature_names.json', 'w') as f:
        json.dump(feature_names, f)
    print("Feature names saved to feature_names.json")

    print("Training complete.")