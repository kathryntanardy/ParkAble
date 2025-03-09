from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone


app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}) 

connection_string = "mongodb+srv://ktanardy:thisisapassword@Cluster0.arfhm.mongodb.net/?ssl=true&tlsAllowInvalidCertificates=true"
client = MongoClient(connection_string)
db = client['database']
collection = db['location']

# Debug: Get everything
@app.route("/api/locations/getAll", methods=["GET"])
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
@app.route("/api/locations/add", methods=["POST"])
def add_location():
    try:
        data = request.json  # Get JSON data from request
        document = {
            "name": data.get("name"),
            "username": data.get("username"),
            "password": data.get("password"),
            "freeSpots": int(data.get("freeSpots", 0)), # freeSpots: total free parking spots
            "freeAccess": int(data.get("freeAccess", 0)), # freeAccess: total free accessible spots
            "lastUpdate": data.get("timestamp", None) # lastUpdate: last updated time user give feedback
        }
        result = collection.insert_one(document)

        document["_id"] = str(result.inserted_id)

        return jsonify({"message": "Location added.", "data": document}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Search for location 
@app.route("/api/locations/getALocation", methods=["GET"])
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
@app.route("/api/locations/recent", methods=["GET"])
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
@app.route("/api/locations/remove", methods=["DELETE"])
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
@app.route("/api/locations/update", methods=["PATCH"])
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

if __name__ == "__main__":
    app.run(debug=True, port=5000)
