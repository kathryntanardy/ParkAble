import cv2 as cv
import numpy as np
import time
import requests
from collections import Counter

# Video Source
video_source = 'assets/videos/video.mp4'
cap = cv.VideoCapture(video_source)

# Check if video is loaded
if not cap.isOpened():
    print("Error: Unable to open video source.")
    exit()

# Load YOLO Model
classes = open('coco.names').read().strip().split('\n')
np.random.seed(42)
colors = np.random.randint(0, 255, size=(len(classes), 3), dtype='uint8')

net = cv.dnn.readNetFromDarknet('yolov3.cfg', 'yolov3.weights')
net.setPreferableBackend(cv.dnn.DNN_BACKEND_OPENCV)

layer_names = net.getLayerNames()
output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

vehicle_classes = {"car", "truck", "bus", "motorcycle"}

vehicle_tracks = {}
vehicle_counts = []

start_time = time.time()
mode_count = "N/A"

update_spots_url = "http://127.0.0.1:5000/api/public/update_spots"

# Start Video Processing
while cap.isOpened():
    ret, img = cap.read()
    if not ret:
        break

    h, w = img.shape[:2]
    blob = cv.dnn.blobFromImage(img, 1/255.0, (416, 416), swapRB=True, crop=False)
    net.setInput(blob)
    outputs = net.forward(output_layers)

    boxes, confidences, classIDs = [], [], []

    for output in outputs:
        for detection in output:
            scores = detection[5:]
            classID = np.argmax(scores)
            confidence = scores[classID]
            if confidence > 0.5 and classes[classID] in vehicle_classes:
                box = detection[:4] * np.array([w, h, w, h])
                (centerX, centerY, width, height) = box.astype("int")
                x = max(0, int(centerX - width / 2))
                y = max(0, int(centerY - height / 2))
                boxes.append([x, y, int(width), int(height)])
                confidences.append(float(confidence))
                classIDs.append(classID)

    indices = cv.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)

    current_tracks = {}
    unmoving_vehicles = 0

    if len(indices) > 0:
        for i in indices.flatten():
            x, y, w, h = boxes[i]
            color = [int(c) for c in colors[classIDs[i]]]
            cv.rectangle(img, (x, y), (x + w, y + h), color, 2)
            text = "{}: {:.4f}".format(classes[classIDs[i]], confidences[i])
            cv.putText(img, text, (x, y - 5), cv.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

            vehicle_id = f"{x//20}-{y//20}-{w//10}-{h//10}"
            current_tracks[vehicle_id] = (x, y, w, h)

            if vehicle_id in vehicle_tracks:
                unmoving_vehicles += 1

    vehicle_tracks = current_tracks.copy()
    vehicle_counts.append(unmoving_vehicles)

    elapsed_time = time.time() - start_time
    if elapsed_time >= 10:
        if vehicle_counts:
            mode_count = Counter(vehicle_counts).most_common(1)[0][0]
            print(f"Mode of unmoving vehicles in the last 10 seconds: {mode_count}")

            data = {
                "name": "Kumon",
                "takenSpot": mode_count
            }
            try:
                response = requests.patch(update_spots_url, json=data)
                if response.status_code == 200:
                    print("Database updated successfully!")
                else:
                    print(f"Failed to update database. Status code: {response.status_code}")
            except Exception as e:
                print(f"Error updating database: {e}")

        vehicle_counts.clear()
        start_time = time.time()

    cv.putText(img, f"Unmoving Vehicles: {unmoving_vehicles}", (10, 30),
               cv.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    mode_display = f"Mode: {mode_count}"
    cv.putText(img, mode_display, (img.shape[1] - 200, 30),
               cv.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    cv.imshow('Vehicle Detection', img)

    if cv.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv.destroyAllWindows()
