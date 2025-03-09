from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}) 

connection_string = "mongodb+srv://ktanardy:thisisapassword@Cluster0.arfhm.mongodb.net/?ssl=true&tlsAllowInvalidCertificates=true"
client = MongoClient(connection_string)
db = client['database']
collection = db['users']

# Debug: Get everything
@app.route("/api/users/getAll", methods=["GET"])
def get_all_locations():
    try:
        # Fetch all documents from the collection
        users = collection.find()

        # Convert documents to a list of dictionaries
        output = []
        for user in users:
            user['_id'] = str(user['_id'])  # Convert ObjectId to string
            output.append(user)

        return jsonify(output), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Insert Data
@app.route("/api/users/add", methods=["POST"])
def add_location():
    try:
        data = request.json  # Get JSON data from request

        total_spots = int(data.get("totalSpots", 0))
        taken_spots = 0  # Always start with 0
        free_spots = total_spots - taken_spots 

        document = {
            "username": data.get("username"),
            "password" : data.get("password"),
            "totalSpots": total_spots, # totalSpots: total accessible parking space available 
            "takenSpots": taken_spots, # takenSpots: always start with 0
            "freeAccess": free_spots, # freeAccess: total free accessible spots
            "name": data.get("name") # name: name of restaurant
        }

        result = collection.insert_one(document)

        document["_id"] = str(result.inserted_id)

        return jsonify({"message": "Location added.", "data": document}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Update total free available accessible parking. NOTE: need to have totalSpots json param. 
@app.route("/api/users/updateTotalParkingNum", methods=["PATCH"])
def update_location():
    try:
        # Retrieve 'name' from query parameters
        username = request.args.get('username')
        if not username:
            return jsonify({"error": "Username is required."}), 400

        # Retrieve update data from request body
        data = request.json
        if not data:
            return jsonify({"error": "No data updated"}), 400

        new_total_spots = data.get("totalSpots")
        if new_total_spots is None or not isinstance(new_total_spots, int):
            return jsonify({"error": "'totalSpots' is required and must be an integer."}), 400


        query_filter = {"username": username}
        current_document = collection.find_one(query_filter)
        if not current_document:
            return jsonify({"error": "No user business found."}), 404
        # Define the update operation
        current_total_spots = current_document.get("totalSpots", 0)
        current_free_spots = current_document.get("freeSpots", 0)
        spot_difference = new_total_spots - current_total_spots

        update_operation = {
            "$set": {
                "totalSpots": new_total_spots,
                "freeSpots": current_free_spots + spot_difference,
            }
        }

        # Update the document
        result = collection.update_one(query_filter, update_operation)

        if result.matched_count == 0:
            return jsonify({"error": "No user business found."}), 404

        return jsonify({"message": "Total Parking Spots and Free Spots Updated."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/users/updateTakenSpots", methods=["PATCH"])
def update_taken_spots():
    try:
        # Retrieve 'username' from query parameters
        username = request.args.get('username')
        if not username:
            return jsonify({"error": "Username is required."}), 400

        # Retrieve update data from request body
        data = request.json
        if not data:
            return jsonify({"error": "No data provided."}), 400

        new_taken_spots = data.get("takenSpots")
        if new_taken_spots is None or not isinstance(new_taken_spots, int):
            return jsonify({"error": "'takenSpots' is required and must be an integer."}), 400

        # Fetch the current document
        query_filter = {"username": username}
        current_document = collection.find_one(query_filter)
        if not current_document:
            return jsonify({"error": "No user business found."}), 404

        # Calculate the new freeSpots
        total_spots = current_document.get("totalSpots", 0)
        if new_taken_spots > total_spots:
            return jsonify({"error": "'takenSpots' cannot exceed 'totalSpots'."}), 400
        new_free_spots = total_spots - new_taken_spots

        # Update the document
        update_operation = {
            "$set": {
                "takenSpots": new_taken_spots,
                "freeSpots": new_free_spots
            }
        }
        result = collection.update_one(query_filter, update_operation)

        if result.matched_count == 0:
            return jsonify({"error": "No user business found."}), 404

        return jsonify({"message": "Taken Spots and Free Spots Updated."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)

