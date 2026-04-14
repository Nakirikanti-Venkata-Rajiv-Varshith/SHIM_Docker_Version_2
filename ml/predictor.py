"""
S.H.I.M. ML Service — Predictor
Provides two endpoints:
  POST /predict  — Polynomial Regression to forecast CPU/RAM/Disk 5 min ahead
  POST /anomaly  — Z-Score anomaly detection for a single metric
"""

import os
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
# from sklearn.linear_model import LinearRegression
# from scipy import stats
# from sklearn.preprocessing import PolynomialFeatures

app = Flask(__name__)
CORS(app)

PORT = int(os.environ.get("PORT", 5000))
FORECAST_STEPS = 60        # 5 minutes at 5s intervals
# ANOMALY_WINDOW = 120        seconds = 24 data points at 5s



        # For now sklearn is not so useful if u want it please uncommnet and use
        # i am going with pure math one to reduce load due to my predictor

# def fit_predict(values: list[float], n_future: int) -> np.ndarray:
#     """Fit polynomial regression and forecast n_future steps ahead."""
#     y = np.array(values, dtype=float)
#     X = np.arange(len(y)).reshape(-1, 1)

#     # Use degree-2 polynomial; fallback to linear if data is too short
#     degree = 2 if len(y) >= 6 else 1
#     poly = PolynomialFeatures(degree=degree)
#     X_poly = poly.fit_transform(X)

#     model = LinearRegression()
#     model.fit(X_poly, y)

#     future_X = np.arange(len(y), len(y) + n_future).reshape(-1, 1)
#     future_X_poly = poly.transform(future_X)
#     predictions = model.predict(future_X_poly)

#     # Clamp percentage values to [0, 100]
#     predictions = np.clip(predictions, 0, 100)
#     return predictions

#  Polynomial Regression (lightweight, custom)

def fit_linear_regression(X, y):
    return np.linalg.pinv(X) @ y


def create_polynomial_features(X, degree):
    X = X.flatten()
    features = [np.ones(len(X))]

    for d in range(1, degree + 1):
        features.append(X ** d)

    return np.vstack(features).T


def predict_values(X, theta):
    return X @ theta


def smooth_predictions(preds, max_step_change=10):
    """
    Prevent unrealistic spikes by limiting step-to-step change
    """
    smoothed = [preds[0]]
    for i in range(1, len(preds)):
        prev = smoothed[-1]
        curr = preds[i]

        if abs(curr - prev) > max_step_change:
            curr = prev + np.sign(curr - prev) * max_step_change

        smoothed.append(curr)

    return np.array(smoothed)


def fit_predict(values, n_future):
    y = np.array(values, dtype=float)
    X = np.arange(len(y)).reshape(-1, 1)

    degree = 2 if len(y) >= 6 else 1

    # Train
    X_poly = create_polynomial_features(X, degree)
    theta = fit_linear_regression(X_poly, y)

    # Predict future
    future_X = np.arange(len(y), len(y) + n_future).reshape(-1, 1)
    future_X_poly = create_polynomial_features(future_X, degree)
    predictions = predict_values(future_X_poly, theta)

    # Clamp + smooth
    predictions = np.clip(predictions, 0, 100)
    predictions = smooth_predictions(predictions)

    return predictions

#  Trend && Confidence helpers

def compute_trend(values, future):
    """
    More stable trend detection using average of last predictions
    """
    current = values[-1]
    future_avg = np.mean(future[-5:])

    if future_avg > current + 2:
        return "increasing"
    elif future_avg < current - 2:
        return "decreasing"
    else:
        return "stable"


def compute_confidence(future):
    """
    Lower variance = higher confidence
    """
    std = np.std(future)

    if std < 5:
        return "high"
    elif std < 10:
        return "medium"
    else:
        return "low"



@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    metrics = data.get("metrics", [])

    if len(metrics) < 5:
        return jsonify({"error": "Need at least 5 data points"}), 400

    result = {}
    for key in ("cpu", "ram", "disk"):
        values = [float(m.get(key, 0)) for m in metrics]
        try:
            future = fit_predict(values, FORECAST_STEPS)
        except Exception as e:
            app.logger.warning(f"Prediction failed for {key}: {e}")
            future = np.array([values[-1]] * FORECAST_STEPS)

        # at_120s = value at step 24 (24 × 5s = 120s)
        at_120s = float(future[23]) if len(future) > 23 else float(future[-1])

        result[key] = {
            "values": [round(float(v), 2) for v in future],
            "max": round(float(np.max(future)), 2),
            "at_120s": round(at_120s, 2),
            "trend": "increasing" if float(future[-1]) > values[-1] else "decreasing",
            "confidence": compute_confidence(future),
        }

    return jsonify(result)


# @app.route("/anomaly", methods=["POST"])
# def anomaly():
#     data = request.get_json(force=True)
#     metric = data.get("metric", "unknown")
#     values = [float(v) for v in data.get("values", [])]

#     if len(values) < 3:
#         return jsonify({"metric": metric, "anomaly": False, "score": 0.0, "threshold": 2.5, "severity": "normal"})

#     z_scores = np.abs(stats.zscore(values))
#     latest_z = float(z_scores[-1]) if len(z_scores) > 0 else 0.0

#     severity = "normal"
#     if latest_z > 3.5:
#         severity = "critical"
#     elif latest_z > 2.5:
#         severity = "warning"

#     return jsonify({
#         "metric": metric,
#         "anomaly": latest_z > 2.5,
#         "score": round(latest_z, 3),
#         "threshold": 2.5,
#         "severity": severity,
#     })


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    print(f"[S.H.I.M. ML Service] Starting on port {PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
