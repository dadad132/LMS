#!/usr/bin/env python3
import http.server
import json
import os

PORT = 8001
DATA_DIR = "/var/lib/lms"
TEAM_FILE = os.path.join(DATA_DIR, "team.json")
PASSWORD_FILE = os.path.join(DATA_DIR, "admin_password.txt")

# Default team data to return if team.json doesn't exist
DEFAULT_TEAM = [
    { "id": "1", "name": "Hannelie Marais", "role": "Founder & Mentorship Director", "avatar": "HM", "image": "" },
    { "id": "2", "name": "Jinesse Fouché", "role": "Lead Training Advisor", "avatar": "JF", "image": "" },
    { "id": "3", "name": "Nadia Joubert", "role": "Senior Career Consultant", "avatar": "NJ", "image": "" },
    { "id": "4", "name": "Fredericka Vosloo", "role": "Onboarding Coordinator", "avatar": "FV", "image": "" },
    { "id": "5", "name": "Teniel Bezuidenhout", "role": "Platform Success Coach", "avatar": "TB", "image": "" },
    { "id": "6", "name": "Leandi Visser", "role": "Curriculum Mentor", "avatar": "LV", "image": "" },
    { "id": "7", "name": "Melanie Van Der Watt", "role": "Classroom Coach", "avatar": "MW", "image": "" },
    { "id": "8", "name": "Brian Van Der Watt", "role": "Placement Coordinator", "avatar": "BW", "image": "" }
]

class APIHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Override to prevent logging clutter in journalctl
        pass

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        # Handle CORS preflight requests
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password")
        self.end_headers()

    def get_password(self):
        if os.path.exists(PASSWORD_FILE):
            with open(PASSWORD_FILE, "r") as f:
                return f.read().strip()
        return None

    def save_password(self, password):
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(PASSWORD_FILE, "w") as f:
            f.write(password.strip())

    def do_GET(self):
        if self.path == "/api/auth-status":
            setup_done = os.path.exists(PASSWORD_FILE)
            self.send_json({"setup": setup_done})
            return

        elif self.path == "/api/team":
            if os.path.exists(TEAM_FILE):
                try:
                    with open(TEAM_FILE, "r") as f:
                        data = json.load(f)
                    self.send_json(data)
                    return
                except Exception as e:
                    pass
            self.send_json(DEFAULT_TEAM)
            return

        else:
            self.send_json({"error": "Not Found"}, 404)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)
        
        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except Exception:
            self.send_json({"error": "Invalid JSON"}, 400)
            return

        if self.path == "/api/setup-password":
            if os.path.exists(PASSWORD_FILE):
                self.send_json({"error": "Admin password already set"}, 400)
                return
            
            password = body.get("password")
            if not password or len(password.strip()) < 4:
                self.send_json({"error": "Password must be at least 4 characters"}, 400)
                return
            
            self.save_password(password)
            self.send_json({"success": True, "message": "Password initialized successfully"})
            return

        elif self.path == "/api/verify-password":
            password = body.get("password")
            saved_password = self.get_password()
            
            if not saved_password:
                self.send_json({"error": "Admin password not set"}, 400)
                return
            
            if password == saved_password:
                self.send_json({"success": True})
            else:
                self.send_json({"error": "Incorrect password"}, 401)
            return

        elif self.path == "/api/team":
            # Authenticate via custom header
            auth_header = self.headers.get("X-Admin-Password")
            saved_password = self.get_password()
            
            if not saved_password:
                self.send_json({"error": "Admin password not set"}, 400)
                return
                
            if auth_header != saved_password:
                self.send_json({"error": "Unauthorized"}, 401)
                return

            # Save the new team list
            os.makedirs(DATA_DIR, exist_ok=True)
            try:
                with open(TEAM_FILE, "w") as f:
                    json.dump(body, f, indent=2)
                self.send_json({"success": True, "message": "Team settings saved successfully to server disk"})
            except Exception as e:
                self.send_json({"error": f"Failed to save: {str(e)}"}, 500)
            return

        elif self.path == "/api/change-password":
            old_password = body.get("old_password")
            new_password = body.get("new_password")
            saved_password = self.get_password()
            
            if not saved_password:
                self.send_json({"error": "Admin password not set"}, 400)
                return
                
            if old_password != saved_password:
                self.send_json({"error": "Incorrect old password"}, 401)
                return
                
            if not new_password or len(new_password.strip()) < 4:
                self.send_json({"error": "New password must be at least 4 characters"}, 400)
                return
                
            self.save_password(new_password)
            self.send_json({"success": True, "message": "Password changed successfully"})
            return

        else:
            self.send_json({"error": "Not Found"}, 404)

if __name__ == "__main__":
    server = http.server.HTTPServer(("127.0.0.1", PORT), APIHandler)
    print(f"Honeypot API server running on port {PORT}...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
