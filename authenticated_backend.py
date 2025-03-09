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

@app.route("/api/users/getAll", methods=["GET"])
def get_all_locations():
    try:
        users = collection.find()
        output = []
        for user in users:
            user['_id'] = str(user['_id'])
            output.append(user)
        return jsonify(output), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/users/add", methods=["POST"])
def add_location():
    try:
        data = request.json
        total_spots = int(data.get("totalSpots", 0))
        taken_spots = 0
        free_spots = total_spots - taken_spots

        document = {
            "username": data.get("username"),
            "password" : data.get("password"),
            "totalSpots": total_spots,
            "takenSpots": taken_spots,
            "freeAccess": free_spots,
            "name": data.get("name")
        }

        result = collection.insert_one(document)
        document["_id"] = str(result.inserted_id)
        return jsonify({"message": "Location added.", "data": document}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/users/updateTotalParkingNum", methods=["PATCH"])
def update_location():
    try:
        username = request.args.get('username')
        if not username:
            return jsonify({"error": "Username is required."}), 400

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

        current_total_spots = current_document.get("totalSpots", 0)
        current_free_spots = current_document.get("freeSpots", 0)
        spot_difference = new_total_spots - current_total_spots

        update_operation = {
            "$set": {
                "totalSpots": new_total_spots,
                "freeSpots": current_free_spots + spot_difference,
            }
        }

        result = collection.update_one(query_filter, update_operation)
        if result.matched_count == 0:
            return jsonify({"error": "No user business found."}), 404

        return jsonify({"message": "Total Parking Spots and Free Spots Updated."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/update_spots', methods=['PATCH'])
def update_spots():
    try:
        data = request.get_json()
        username = data.get('username')
        takenSpots = data.get('takenSpots')

        if not username or not isinstance(takenSpots, int):
            return jsonify({"error": "Invalid data"}), 400
        
        query_filter = {"username": username}
        user = collection.find_one(query_filter)
        
        if not user:
            return jsonify({"error": "No user business found."}), 404
        
        update_data = {"$set": {"takenSpots": takenSpots}}
        result = collection.update_one(query_filter, update_data)

        if result.matched_count == 0:
            return jsonify({"error": "No documents matched the query."}), 404
        
        return jsonify({"message": "Database updated successfully!"}), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
