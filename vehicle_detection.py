import cv2 as cv
import numpy as np
import time
from collections import Counter

# Open the video file or capture video from the camera
video_source = 'assets/videos/video.mp4'  # Replace with your video file or use 0 for webcam
cap = cv.VideoCapture(video_source)

# Load class names and get random colors
classes = open('coco.names').read().strip().split('\n')
np.random.seed(42)
colors = np.random.randint(0, 255, size=(len(classes), 3), dtype='uint8')

# Load YOLO model
net = cv.dnn.readNetFromDarknet('yolov3.cfg', 'yolov3.weights')
net.setPreferableBackend(cv.dnn.DNN_BACKEND_OPENCV)

# Get output layer names
layer_names = net.getLayerNames()
output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]

# Define vehicle classes to track
vehicle_classes = {"car", "truck", "bus", "motorcycle"}

# Store previous bounding boxes with unique IDs
vehicle_tracks = {}
vehicle_counts = []  # Store vehicle counts for mode calculation

# Track time instead of relying on frame count
start_time = time.time()
mode_count = "N/A"  # Initialize mode display

while True:
    ret, img = cap.read()
    if not ret:
        break 

    blob = cv.dnn.blobFromImage(img, 1/255.0, (416, 416), swapRB=True, crop=False)
    net.setInput(blob)
    outputs = net.forward(output_layers)

    h, w = img.shape[:2]
    boxes, confidences, classIDs = [], [], []

    for output in outputs:
        for detection in output:
            scores = detection[5:]
            classID = np.argmax(scores)
            confidence = scores[classID]
            if confidence > 0.5 and classes[classID] in vehicle_classes:
                box = detection[:4] * np.array([w, h, w, h])
                (centerX, centerY, width, height) = box.astype("int")
                x = int(centerX - (width / 2))
                y = int(centerY - (height / 2))
                boxes.append([x, y, int(width), int(height)])
                confidences.append(float(confidence))
                classIDs.append(classID)

    # Apply Non-Maximum Suppression
    indices = cv.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)

    current_tracks = {}  # Store current frame vehicles
    unmoving_vehicles = 0  # Reset count per frame

    if len(indices) > 0:
        for i in indices.flatten():
            x, y, w, h = boxes[i]
            color = [int(c) for c in colors[classIDs[i]]]
            cv.rectangle(img, (x, y), (x + w, y + h), color, 2)
            text = "{}: {:.4f}".format(classes[classIDs[i]], confidences[i])
            cv.putText(img, text, (x, y - 5), cv.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

            # Generate a unique ID based on position
            vehicle_id = f"{x//20}-{y//20}-{w//10}-{h//10}"
            current_tracks[vehicle_id] = (x, y, w, h)

            # Compare with previous frame
            if vehicle_id in vehicle_tracks:
                unmoving_vehicles += 1  # Count if seen before

    # Update tracked vehicles
    vehicle_tracks = current_tracks.copy()

    # Store the vehicle count for mode calculation
    vehicle_counts.append(unmoving_vehicles)

    # Check time elapsed for mode calculation
    elapsed_time = time.time() - start_time
    if elapsed_time >= 10:
        if vehicle_counts:
            mode_count = Counter(vehicle_counts).most_common(1)[0][0]  # Calculate mode
            print(f"Mode of unmoving vehicles in the last 10 seconds: {mode_count}")
        vehicle_counts.clear()  # Reset the list for the next interval
        start_time = time.time()  # Reset timer

    # Display the unmoving vehicle count on screen
    cv.putText(img, f"Unmoving Vehicles: {unmoving_vehicles}", (10, 30),
               cv.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    # Display mode count in top right corner
    mode_display = f"Mode: {mode_count}"
    cv.putText(img, mode_display, (img.shape[1] - 200, 30),
               cv.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    # Show the frame with vehicle detection
    cv.imshow('Vehicle Detection', img)

    # Stop if 'q' is pressed
    if cv.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv.destroyAllWindows()
