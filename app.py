from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

# Load tasks from file or create default
def load_tasks():
    tasks_file = os.path.join(os.path.dirname(__file__), 'tasks.json')
    try:
        print(f"Loading tasks from: {tasks_file}")
        with open(tasks_file, 'r', encoding='utf-8') as f:
            tasks = json.load(f)
            print(f"Successfully loaded {sum(len(tasks[k]) for k in tasks)} tasks")
            return tasks
    except Exception as e:
        print(f"Error loading tasks: {e}")
        # Return the tasks directly from the JSON string to ensure proper format
        return {
            "elementary": [
                {
                    "id": "elem1",
                    "title": "Number Breaking",
                    "description": "Take the number 25 and break it into as many pieces as you like! What is the biggest product you can make when combining the pieces?",
                    "extension": "Try with different numbers. Can you find a pattern?",
                    "difficulty": "elementary"
                }
            ],
            "middle": [
                {
                    "id": "mid1",
                    "title": "The Strawberry Pudding Problem",
                    "description": "A census-taker comes to a family's house one night to collect data. The father, says, \"I have three daughters. The product of their three ages is 72. The sum of their ages is our house number.\" When the census-taker goes outside to look at the house number, he comes back and says, \"I need you to give me another clue.\" And the father says, \"Oh, okay, my oldest likes strawberry pudding.\" What are the ages of each of the daughters?",
                    "extension": "Try creating your own age puzzle with different numbers. What makes a good puzzle that has only one solution?",
                    "difficulty": "middle"
                }
            ],
            "high": [
                {
                    "id": "high1",
                    "title": "Number Breaking",
                    "description": "Take the number 25 and break it into as many pieces as you like! What is the biggest product you can make when combining the pieces?",
                    "extension": "This is a great introduction to e! Try larger numbers and see if you notice how the maximum product relates to e. What happens as you approach infinity?",
                    "difficulty": "high"
                }
            ]
        }

def save_tasks(tasks):
    tasks_file = os.path.join(os.path.dirname(__file__), 'tasks.json')
    try:
        with open(tasks_file, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, indent=2, ensure_ascii=False)
            print(f"Successfully saved {sum(len(tasks[k]) for k in tasks)} tasks")
    except Exception as e:
        print(f"Error saving tasks: {e}")

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = load_tasks()
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def add_task():
    tasks = load_tasks()
    new_task = request.json
    
    # Validate required fields
    if not all(key in new_task for key in ['title', 'description', 'category']):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Generate task ID
    category = new_task['category']
    if category not in tasks:
        return jsonify({"error": "Invalid category"}), 400
    
    task_id = f"{category[:3]}{len(tasks[category]) + 1}"
    
    # Create task object
    task = {
        "id": task_id,
        "title": new_task['title'],
        "description": new_task['description'],
        "extension": new_task.get('extension', ''),
        "difficulty": category,
        "teacher_submitted": True
    }
    
    # Add to tasks and save
    tasks[category].append(task)
    save_tasks(tasks)
    
    return jsonify(task), 201

@app.route('/api/tasks/<category>/<task_id>', methods=['DELETE'])
def delete_task(category, task_id):
    tasks = load_tasks()
    
    # Validate category
    if category not in tasks:
        return jsonify({"error": "Category not found"}), 404
    
    # Find and remove task
    category_tasks = tasks[category]
    task_index = next((i for i, task in enumerate(category_tasks) 
                      if task['id'] == task_id and task.get('teacher_submitted')), -1)
    
    if task_index == -1:
        return jsonify({"error": "Task not found or not teacher-submitted"}), 404
    
    # Remove task and save
    removed_task = category_tasks.pop(task_index)
    save_tasks(tasks)
    
    return jsonify(removed_task), 200

# Serve the frontend index.html
@app.route('/')
def home():
    return send_from_directory(os.path.join(app.root_path, '..', 'static'), 'index.html')

# Serve JS and CSS from static folder
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(os.path.join(app.root_path, '..', 'static'), filename)

if __name__ == '__main__':
    app.run(debug=True)
