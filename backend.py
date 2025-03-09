from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}) 

connection_string = "mongodb+srv://ktanardy:thisisapassword@Cluster0.arfhm.mongodb.net/?ssl=true&tlsAllowInvalidCertificates=true"
client = MongoClient(connection_string)
db = client['database']
collection = db['public']

# Debug: Get everything
@app.route("/api/public/getAll", methods=["GET"])
def get_all_locations():
    try:
        # Fetch all documents from the collection
        locations = collection.find()

        # Convert documents to a list of dictionaries
        output = []
        for location in locations:
            location['_id'] = str(location['_id'])  # Convert ObjectId to string
            output.append(location)

        return jsonify(output), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Insert Data
@app.route("/api/public/add", methods=["POST"])
def add_location():
    try:
        data = request.json  # Get JSON data from request

        total_spots = int(data.get("totalSpot", 0))
        taken_spots = 0  # Always start with 0
        free_spots = total_spots - taken_spots 

        document = {
            "name": data.get("name"),
            "lastUpdate": data.get("timestamp", None), # lastUpdate: last updated time user give feedback
            "coordinates": data.get("coordinates",[0,0]), # coordinates: coordinates of the location 
            "address":data.get("address",""),
            "totalSpot": total_spots, # totalSpots: total accessible parking space available 
            "takenSpot": taken_spots, # takenSpots: always start with 0
            "freeAccess": free_spots, # freeAccess: total free accessible spots
        }
        result = collection.insert_one(document)

        document["_id"] = str(result.inserted_id)

        return jsonify({"message": "Location added.", "data": document}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# Search for location 
@app.route("/api/public/getALocation", methods=["GET"])
def get_locations():
    try:
        filter_query = {}

        # Apply filters based on query parameters
        if "name" in request.args:
            filter_query["name"] = {"$regex": request.args["name"], "$options": "i"}
        
        # Fetch filtered data
        documents = list(collection.find(filter_query, {"_id": 0}))  # Exclude MongoDB `_id` field
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# Get last user feedback update time on a specific location
@app.route("/api/public/recent", methods=["GET"])
def get_lastUpdates():
    try:
        filter_query = {}

        # Apply filters based on query parameters
        if "name" in request.args:
            filter_query["name"] = {"$regex": request.args["name"], "$options": "i"}
        
        twoMinutesBefore = datetime.now(timezone.utc) - timedelta(minutes=2)
        filter_query["lastUpdate"] = {"$exists": True, "$ne": None, "$ne": "", "$gte": twoMinutesBefore}


        # Fetch filtered data
        documents = list(collection.find(filter_query, {"_id": 0}))  # Exclude MongoDB `_id` field
        return jsonify(documents), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# Delete location based on the business' username
@app.route("/api/public/remove", methods=["DELETE"])
def delete_location():
    try:
        # Retrieve 'name' from query parameters
        name = request.args.get('name')
        if not name:
            return jsonify({"error": "Name parameter is required"}), 400

        # Define the query filter
        query_filter = {"name": name}

        # Delete the document(s)
        result = collection.delete_one(query_filter)

        if result.deleted_count == 0:
            return jsonify({"error": "No location found."}), 404

        return jsonify({"message": "Location deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

# Update last updated time 
@app.route("/api/public/update", methods=["PATCH"])
def update_location():
    try:
        # Retrieve 'name' from query parameters
        name = request.args.get('name')
        if not name:
            return jsonify({"error": "Name parameter is required"}), 400

        # Retrieve update data from request body
        update_data = request.json
        if not update_data:
            return jsonify({"error": "No data updated"}), 400

        # Define the query filter
        query_filter = {"name": name}

        # Add the 'last_updated' field with the current timestamp
        update_data['last_updated'] = datetime.now(timezone.utc)

        # Define the update operation
        update_operation = {"$set": update_data}

        # Update the document
        result = collection.update_one(query_filter, update_operation)

        if result.matched_count == 0:
            return jsonify({"error": "No location found."}), 404

        return jsonify({"message": "Last Updated Time updated."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    

# Update total free available accessible parking. NOTE: need to have totalSpots json param. 
@app.route("/api/public/update_spots", methods=["PATCH"])
def update_totalParkingNum():
    try:
        # Retrieve 'name' from query parameters
        data = request.get_json()
        name = data.get('name')
        takenSpot = data.get('takenSpot')

    
        if takenSpot is None or not isinstance(takenSpot, int):
            return jsonify({"error": "'totalSpot' is required and must be an integer."}), 400


        query_filter = {"name": name}
        current_document = collection.find_one(query_filter)
        if not current_document:
            return jsonify({"error": "No user business found."}), 404
        # Define the update operation
        current_total_spots = current_document.get("totalSpot", 0)
        difference = current_total_spots - takenSpot
    

        update_operation = {
            "$set": {
                "takenSpot": takenSpot,
                "freeAccess": difference,
            }
        }

        # Update the document
        result = collection.update_one(query_filter, update_operation)

        if result.matched_count == 0:
            return jsonify({"error": "No user business found."}), 404

        return jsonify({"message": "Total Parking Spots and Free Spots Updated."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)