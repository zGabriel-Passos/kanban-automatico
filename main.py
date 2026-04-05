from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import os
from datetime import datetime
from groq import Groq
import pyautogui
import time
import subprocess

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', os.urandom(24))

allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5000').split(',')
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Firebase
db = None
try:
    firebase_project_id = os.getenv('FIREBASE_PROJECT_ID')
    if not firebase_project_id or firebase_project_id == 'your_project_id':
        raise Exception("Firebase credentials not configured in .env file")

    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": firebase_project_id,
        "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
        "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
        "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
        "client_id": os.getenv('FIREBASE_CLIENT_ID'),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": os.getenv('FIREBASE_CERT_URL')
    })
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("\n" + "="*50)
    print("✅ Firebase connected successfully!")
    print(f"📦 Project: {firebase_project_id}")
    print("="*50 + "\n")
except Exception as e:
    print(f"\n❌ FIREBASE CONNECTION FAILED: {e}\n")

# Groq
groq_client = Groq(api_key=os.getenv('GROQ_API_KEY'))

# Collection name — separada do projeto original
AI_COLLECTION = 'ai_tasks'

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route("/")
def landing():
    return render_template("landing.html")

@app.route("/app")
def index():
    return render_template("index.html")

# ─── CRUD Tasks (ai_tasks collection) ─────────────────────────────────────────

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    if not db:
        return jsonify({"error": "Firebase not configured"}), 500
    try:
        tasks = []
        for doc in db.collection(AI_COLLECTION).stream():
            t = doc.to_dict()
            t['id'] = doc.id
            tasks.append(t)
        return jsonify(tasks), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/tasks", methods=["POST"])
def create_task():
    if not db:
        return jsonify({"error": "Firebase not configured"}), 500

    data = request.get_json()
    if not data or not data.get('title', '').strip():
        return jsonify({"error": "Title is required"}), 400

    title = data['title'].strip()
    if len(title) > 200:
        return jsonify({"error": "Title max 200 chars"}), 400

    task_data = {
        'title': title,
        'description': data.get('description', '').strip(),
        'column': 'idle',
        'folder': data.get('folder', '').strip(),
        'fileType': data.get('fileType', 'md'),
        'prompt': data.get('prompt', '').strip(),
        'plan': '',
        'generatedFile': '',
        'createdAt': datetime.utcnow().isoformat(),
        'order': 0
    }

    try:
        doc_ref = db.collection(AI_COLLECTION).add(task_data)
        task_data['id'] = doc_ref[1].id
        return jsonify(task_data), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    if not db:
        return jsonify({"error": "Firebase not configured"}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        task_ref = db.collection(AI_COLLECTION).document(task_id)
        if not task_ref.get().exists:
            return jsonify({"error": "Task not found"}), 404

        allowed = ['column', 'title', 'description', 'folder', 'fileType', 'prompt', 'plan', 'generatedFile']
        update_data = {k: v for k, v in data.items() if k in allowed}

        valid_columns = ['idle', 'plan', 'build', 'review']
        if 'column' in update_data and update_data['column'] not in valid_columns:
            return jsonify({"error": "Invalid column"}), 400

        task_ref.update(update_data)
        updated = task_ref.get().to_dict()
        updated['id'] = task_id
        return jsonify(updated), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    if not db:
        return jsonify({"error": "Firebase not configured"}), 500
    try:
        task_ref = db.collection(AI_COLLECTION).document(task_id)
        if not task_ref.get().exists:
            return jsonify({"error": "Task not found"}), 404
        task_ref.delete()
        return jsonify({"message": "Task deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── AI Endpoints ──────────────────────────────────────────────────────────────

@app.route("/api/ai/plan", methods=["POST"])
def ai_plan():
    """Groq reads the prompt and returns a structured plan."""
    data = request.get_json()
    task_id = data.get('task_id')
    prompt = data.get('prompt', '')
    file_type = data.get('fileType', 'md')
    title = data.get('title', '')

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert developer and planner. "
                        "Given a task title, file type, and user instructions, "
                        "create a clear, structured plan describing exactly what will be built. "
                        "Be concise and technical. Respond in the same language as the user's prompt."
                    )
                },
                {
                    "role": "user",
                    "content": f"Task: {title}\nFile type: .{file_type}\nInstructions: {prompt}"
                }
            ]
        )
        plan = response.choices[0].message.content

        # Save plan and advance to build
        if task_id and db:
            db.collection(AI_COLLECTION).document(task_id).update({
                'plan': plan,
                'column': 'build'
            })

        return jsonify({"plan": plan}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/build", methods=["POST"])
def ai_build():
    """Groq generates the file content and saves it to the local folder."""
    data = request.get_json()
    task_id = data.get('task_id')
    prompt = data.get('prompt', '')
    plan = data.get('plan', '')
    file_type = data.get('fileType', 'md')
    folder = data.get('folder', '').strip()
    title = data.get('title', '')

    if not prompt or not folder:
        return jsonify({"error": "Prompt and folder are required"}), 400

    # Resolve folder relative to where main.py is running
    base_dir = os.path.dirname(os.path.abspath(__file__))
    target_dir = os.path.join(base_dir, folder) if not os.path.isabs(folder) else folder

    if not os.path.exists(target_dir):
        try:
            os.makedirs(target_dir)
        except Exception as e:
            return jsonify({"error": f"Could not create folder: {e}"}), 500

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are an expert developer. Generate ONLY the raw file content for a .{file_type} file. "
                        "Do NOT include explanations, markdown code blocks, or any text outside the file content itself. "
                        "Just output the pure file content ready to be saved."
                    )
                },
                {
                    "role": "user",
                    "content": f"Task: {title}\nPlan:\n{plan}\n\nInstructions: {prompt}"
                }
            ]
        )
        content = response.choices[0].message.content

        # Clean up markdown code fences if model adds them anyway
        if content.startswith("```"):
            lines = content.split('\n')
            content = '\n'.join(lines[1:-1]) if lines[-1].strip() == '```' else '\n'.join(lines[1:])

        # Build filename from task title
        safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '' for c in title).strip().replace(' ', '_')
        filename = f"{safe_name}.{file_type}"
        file_path = os.path.join(target_dir, filename)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        # Save generated file path and advance to review
        if task_id and db:
            db.collection(AI_COLLECTION).document(task_id).update({
                'generatedFile': file_path,
                'column': 'review'
            })

        return jsonify({"file_path": file_path, "content": content}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ai/review", methods=["POST"])
def ai_review():
    """Opens the generated file in Edge using PyAutoGUI."""
    data = request.get_json()
    file_path = data.get('file_path', '')
    file_type = data.get('fileType', 'md')

    if not file_path or not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404

    try:
        if file_type == 'html':
            # Open Edge with the file
            subprocess.Popen(['cmd', '/c', 'start', 'msedge', f'file:///{file_path.replace(os.sep, "/")}'])
        else:
            # For .md and .js, open the folder in Explorer so user can see the file
            subprocess.Popen(['explorer', os.path.dirname(file_path)])

        return jsonify({"message": "Opened successfully"}), 200
    except Exception as e:
        # Fallback: PyAutoGUI to open Edge manually
        try:
            pyautogui.hotkey('win', 'r')
            time.sleep(0.5)
            pyautogui.write(f'msedge file:///{file_path.replace(os.sep, "/")}', interval=0.05)
            pyautogui.press('enter')
            return jsonify({"message": "Opened via PyAutoGUI"}), 200
        except Exception as e2:
            return jsonify({"error": str(e2)}), 500


# ─── Error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500

app = app

if __name__ == "__main__":
    app.run(debug=False, host='0.0.0.0', port=5000)
