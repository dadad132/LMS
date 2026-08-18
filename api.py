#!/usr/bin/env python3
import http.server
import json
import os
import hashlib
import uuid
import time

PORT = 8001
DATA_DIR = "/var/lib/lms"
UPLOADS_DIR = os.path.join(DATA_DIR, "uploads")
TEAM_FILE = os.path.join(DATA_DIR, "team.json")
PASSWORD_FILE = os.path.join(DATA_DIR, "admin_password.txt")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
MATERIALS_FILE = os.path.join(DATA_DIR, "materials.json")
SUBJECTS_FILE = os.path.join(DATA_DIR, "subjects.json")
MODULES_FILE = os.path.join(DATA_DIR, "modules.json")
TESTIMONIALS_FILE = os.path.join(DATA_DIR, "testimonials.json")

# Create directories if they don't exist
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Default team data
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

# Default testimonial data
DEFAULT_TESTIMONIALS = [
    { "id": "t1", "name": "Lerato M.", "company": "Native Camp ESL Teacher", "text": "Honeypot Global transformed my online teaching! Hannelie guided me through the entire ClassIn setup and native English teaching methodology. Hired in just two weeks!", "rating": 5, "image": "" },
    { "id": "t2", "name": "Johan v.d. Merwe", "company": "120-hour TEFL Student", "text": "Passing my 120-hour TEFL certificate was so much easier with Honeypot. The feedback on my lesson plans was incredibly detailed and helpful.", "rating": 5, "image": "" },
    { "id": "t3", "name": "Chantal K.", "company": "ESL Online Coach", "text": "I highly recommend Honeypot Global. The mentorship program is top-notch and Hannelie gives constant encouragement.", "rating": 5, "image": "" }
]

# In-memory sessions dictionary: token -> {"email": email, "role": role}
SESSIONS = {}

def create_session(email, role):
    token = str(uuid.uuid4())
    SESSIONS[token] = {"email": email, "role": role}
    return token

def hash_password(password):
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def parse_multipart(body_bytes, boundary):
    boundary_bytes = b"--" + boundary.encode("utf-8")
    parts = body_bytes.split(boundary_bytes)
    result = {}
    
    for part in parts:
        if not part or part == b"--\r\n" or part == b"--\r\n\r\n" or part == b"--":
            continue
        
        # Strip leading/trailing whitespaces/newlines safely
        if part.startswith(b"\r\n"):
            part = part[2:]
        if part.endswith(b"\r\n"):
            part = part[:-2]
            
        header_end = part.find(b"\r\n\r\n")
        if header_end == -1:
            continue
            
        header_part = part[:header_end].decode("utf-8", errors="ignore")
        content_part = part[header_end+4:]
        
        # Parse headers
        headers = {}
        for line in header_part.split("\r\n"):
            if ":" in line:
                k, v = line.split(":", 1)
                headers[k.strip().lower()] = v.strip()
                
        disp = headers.get("content-disposition", "")
        if not disp.startswith("form-data;"):
            continue
            
        params = {}
        for item in disp.split(";")[1:]:
            if "=" in item:
                k, v = item.split("=", 1)
                params[k.strip().lower()] = v.strip().strip('"')
                
        name = params.get("name")
        if not name:
            continue
            
        if "filename" in params:
            # File Upload
            result[name] = {
                "filename": params["filename"],
                "content_type": headers.get("content-type", "application/octet-stream"),
                "data": content_part
            }
        else:
            # Text Field
            result[name] = content_part.decode("utf-8", errors="ignore").strip()
            
    return result

class APIHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Prevent spamming systemd logs
        pass

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password, Authorization")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_OPTIONS(self):
        # CORS preflight handler
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password, Authorization")
        self.end_headers()

    def get_admin_password(self):
        if os.path.exists(PASSWORD_FILE):
            with open(PASSWORD_FILE, "r") as f:
                return f.read().strip()
        return None

    def get_users(self):
        users = {}
        if os.path.exists(USERS_FILE):
            try:
                with open(USERS_FILE, "r") as f:
                    users = json.load(f)
            except Exception:
                pass
        
        # Cleanup & migration loop
        now = time.time()
        one_year_seconds = 365 * 24 * 60 * 60
        six_months_seconds = 6 * 30 * 24 * 60 * 60
        modified = False
        
        cleaned_users = {}
        for email, u in list(users.items()):
            role = u.get("role", "user")
            if role == "admin":
                cleaned_users[email] = u
            else:
                created_at = u.get("created_at")
                if created_at is None:
                    created_at = now
                    u["created_at"] = created_at
                    modified = True
                
                # Permanently delete user after 1 year from creation
                if now - created_at > one_year_seconds:
                    modified = True
                    continue
                
                expires_at = u.get("expires_at")
                if expires_at is None:
                    expires_at = created_at + six_months_seconds
                    u["expires_at"] = expires_at
                    modified = True
                
                cleaned_users[email] = u
        
        if modified:
            try:
                with open(USERS_FILE, "w") as f:
                    json.dump(cleaned_users, f, indent=2)
            except Exception:
                pass
        return cleaned_users

    def has_admin_user(self):
        # 1. If master admin password exists, we have an admin
        if os.path.exists(PASSWORD_FILE):
            return True
        # 2. Check general users database
        users = self.get_users()
        for email, u in users.items():
            if u.get("role") == "admin":
                return True
        return False


    def save_users(self, users):
        with open(USERS_FILE, "w") as f:
            json.dump(users, f, indent=2)

    def get_subjects(self):
        subjects = []
        if os.path.exists(SUBJECTS_FILE):
            try:
                with open(SUBJECTS_FILE, "r") as f:
                    subjects = json.load(f)
            except Exception:
                pass
        
        # Ensure default subject exists
        has_default = any(s.get("id") == "subj-default" for s in subjects)
        if not has_default:
            default_subj = {
                "id": "subj-default",
                "title": "General Resources",
                "description": "General course materials",
                "icon": "fa-folder",
                "color": "#F59E0B"
            }
            subjects.insert(0, default_subj)
            self.save_subjects(subjects)
        return subjects

    def save_subjects(self, subjects):
        try:
            with open(SUBJECTS_FILE, "w") as f:
                json.dump(subjects, f, indent=2)
        except Exception:
            pass

    def get_modules(self):
        modules = []
        if os.path.exists(MODULES_FILE):
            try:
                with open(MODULES_FILE, "r") as f:
                    modules = json.load(f)
            except Exception:
                pass
        
        # Ensure default module exists
        has_default = any(m.get("id") == "mod-default" for m in modules)
        if not has_default:
            default_mod = {
                "id": "mod-default",
                "subject_id": "subj-default",
                "title": "General Materials",
                "description": "General reading resources"
            }
            modules.insert(0, default_mod)
            self.save_modules(modules)
        return modules

    def save_modules(self, modules):
        try:
            with open(MODULES_FILE, "w") as f:
                json.dump(modules, f, indent=2)
        except Exception:
            pass

    def get_materials(self):
        materials = []
        if os.path.exists(MATERIALS_FILE):
            try:
                with open(MATERIALS_FILE, "r") as f:
                    materials = json.load(f)
            except Exception:
                pass
        
        # Backward compatibility migration loop
        modified = False
        for m in materials:
            if "subject_id" not in m:
                m["subject_id"] = "subj-default"
                modified = True
            if "module_id" not in m:
                m["module_id"] = "mod-default"
                modified = True
            if "item_type" not in m:
                m["item_type"] = "resource"
                modified = True
        
        if modified:
            self.save_materials(materials)
            
        return materials

    def save_materials(self, materials):
        with open(MATERIALS_FILE, "w") as f:
            json.dump(materials, f, indent=2)

    def get_session_user(self):
        auth_header = self.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            return SESSIONS.get(token)
        return None

    def do_GET(self):
        if self.path == "/api/auth-status":
            setup_done = os.path.exists(PASSWORD_FILE)
            portal_admin_exists = self.has_admin_user()
            self.send_json({
                "setup": setup_done,
                "portal_admin_exists": portal_admin_exists
            })
            return

        elif self.path == "/api/users":
            user_session = self.get_session_user()
            if not user_session or user_session["role"] != "admin":
                self.send_json({"error": "Unauthorized. Admin role required."}, 401)
                return
            
            users = self.get_users()
            user_list = []
            for email, u in users.items():
                user_list.append({
                    "email": email,
                    "role": u.get("role", "user"),
                    "created_at": u.get("created_at"),
                    "expires_at": u.get("expires_at")
                })
            self.send_json(user_list)
            return

        elif self.path == "/api/team":
            if os.path.exists(TEAM_FILE):
                try:
                    with open(TEAM_FILE, "r") as f:
                        data = json.load(f)
                    self.send_json(data)
                    return
                except Exception:
                    pass
            self.send_json(DEFAULT_TEAM)
            return

        elif self.path == "/api/materials":
            # Direct access requires user authentication
            user_session = self.get_session_user()
            if not user_session:
                self.send_json({"error": "Unauthorized"}, 401)
                return
            
            self.send_json(self.get_materials())
            return

        elif self.path == "/api/curriculum-meta":
            user_session = self.get_session_user()
            if not user_session:
                self.send_json({"error": "Unauthorized"}, 401)
                return
            
            self.send_json({
                "subjects": self.get_subjects(),
                "modules": self.get_modules()
            })
            return

        elif self.path == "/api/testimonials":
            if os.path.exists(TESTIMONIALS_FILE):
                try:
                    with open(TESTIMONIALS_FILE, "r") as f:
                        data = json.load(f)
                    self.send_json(data)
                    return
                except Exception:
                    pass
            self.send_json(DEFAULT_TESTIMONIALS)
            return

        else:
            self.send_json({"error": "Not Found"}, 404)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        content_type = self.headers.get("Content-Type", "")
        
        # Check if it's a multipart form upload
        is_multipart = "multipart/form-data" in content_type
        
        if is_multipart:
            boundary = ""
            for item in content_type.split(";"):
                if "boundary=" in item:
                    boundary = item.split("=")[1].strip()
            
            post_data = self.rfile.read(content_length)
            try:
                body = parse_multipart(post_data, boundary)
            except Exception as e:
                self.send_json({"error": f"Failed to parse multipart data: {str(e)}"}, 400)
                return
        else:
            post_data = self.rfile.read(content_length)
            try:
                body = json.loads(post_data.decode("utf-8")) if post_data else {}
            except Exception:
                self.send_json({"error": "Invalid JSON"}, 400)
                return

        # --- Curriculum Management ---
        if self.path == "/api/add-subject":
            user_session = self.get_session_user()
            if not user_session or user_session["role"] != "admin":
                self.send_json({"error": "Unauthorized. Admin role required."}, 401)
                return
            
            title = body.get("title", "").strip()
            description = body.get("description", "").strip()
            icon = body.get("icon", "fa-book").strip()
            color = body.get("color", "#F59E0B").strip()
            
            if not title:
                self.send_json({"error": "Subject title is required"}, 400)
                return
                
            subjects = self.get_subjects()
            new_subject = {
                "id": "subj-" + str(uuid.uuid4()),
                "title": title,
                "description": description,
                "icon": icon,
                "color": color
            }
            subjects.append(new_subject)
            self.save_subjects(subjects)
            self.send_json({"success": True, "subject": new_subject})
            return

        elif self.path == "/api/delete-subject":
            user_session = self.get_session_user()
            if not user_session or user_session["role"] != "admin":
                self.send_json({"error": "Unauthorized. Admin role required."}, 401)
                return
            
            target_id = body.get("id", "").strip()
            if not target_id:
                self.send_json({"error": "Subject ID is required"}, 400)
                return
                
            if target_id == "subj-default":
                self.send_json({"error": "Cannot delete default subject"}, 400)
                return
                
            subjects = self.get_subjects()
            subjects = [s for s in subjects if s.get("id") != target_id]
            self.save_subjects(subjects)
            
            # Cascade delete modules
            modules = self.get_modules()
            modules_to_keep = []
            deleted_module_ids = set()
            for m in modules:
                if m.get("subject_id") == target_id:
                    deleted_module_ids.add(m.get("id"))
                else:
                    modules_to_keep.append(m)
            self.save_modules(modules_to_keep)
            
            # Cascade delete materials
            materials = self.get_materials()
            materials_to_keep = []
            for item in materials:
                if item.get("subject_id") == target_id or item.get("module_id") in deleted_module_ids:
                    if item.get("url", "").startswith("/uploads/"):
                        filename = os.path.basename(item["url"])
                        file_to_remove = os.path.join(UPLOADS_DIR, filename)
                        if os.path.exists(file_to_remove):
                            try:
                                os.remove(file_to_remove)
                            except Exception:
                                pass
                else:
                    materials_to_keep.append(item)
            self.save_materials(materials_to_keep)
            
            self.send_json({"success": True, "message": "Subject and its curriculum hierarchy deleted successfully."})
            return

        elif self.path == "/api/add-module":
            user_session = self.get_session_user()
            if not user_session or user_session["role"] != "admin":
                self.send_json({"error": "Unauthorized. Admin role required."}, 401)
                return
            
            subject_id = body.get("subject_id", "").strip()
            title = body.get("title", "").strip()
            description = body.get("description", "").strip()
            
            if not subject_id or not title:
                self.send_json({"error": "Subject ID and Module title are required"}, 400)
                return
                
            modules = self.get_modules()
            new_module = {
                "id": "mod-" + str(uuid.uuid4()),
                "subject_id": subject_id,
                "title": title,
                "description": description
            }
            modules.append(new_module)
            self.save_modules(modules)
            self.send_json({"success": True, "module": new_module})
            return

        elif self.path == "/api/delete-module":
            user_session = self.get_session_user()
            if not user_session or user_session["role"] != "admin":
                self.send_json({"error": "Unauthorized. Admin role required."}, 401)
                return
            
            target_id = body.get("id", "").strip()
            if not target_id:
                self.send_json({"error": "Module ID is required"}, 400)
                return
                
            if target_id == "mod-default":
                self.send_json({"error": "Cannot delete default module"}, 400)
                return
                
            modules = self.get_modules()
            modules = [m for m in modules if m.get("id") != target_id]
            self.save_modules(modules)
            
            # Cascade delete materials
            materials = self.get_materials()
            materials_to_keep = []
            for item in materials:
                if item.get("module_id") == target_id:
                    if item.get("url", "").startswith("/uploads/"):
                        filename = os.path.basename(item["url"])
                        file_to_remove = os.path.join(UPLOADS_DIR, filename)
                        if os.path.exists(file_to_remove):
                            try:
                                os.remove(file_to_remove)
                            except Exception:
                                pass
                else:
                    materials_to_keep.append(item)
            self.save_materials(materials_to_keep)
            
            self.send_json({"success": True, "message": "Module and its materials deleted successfully."})
            return

        # --- Password & Initial Setup ---
        if self.path == "/api/setup-password":
            if os.path.exists(PASSWORD_FILE):
                self.send_json({"error": "Admin password already set"}, 400)
                return
            
            password = body.get("password")
            if not password or len(password.strip()) < 4:
                self.send_json({"error": "Password must be at least 4 characters"}, 400)
                return
            
            # Save admin password file
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(PASSWORD_FILE, "w") as f:
                f.write(password.strip())
                
            self.send_json({"success": True, "message": "Password initialized successfully"})
            return

        elif self.path == "/api/verify-password":
            password = body.get("password")
            saved_password = self.get_admin_password()
            
            if not saved_password:
                self.send_json({"error": "Admin password not set"}, 400)
                return
            
            if password == saved_password:
                self.send_json({"success": True})
            else:
                self.send_json({"error": "Incorrect password"}, 401)
            return

        # --- Team Modification (Master Legacy) ---
        elif self.path == "/api/team":
            auth_header = self.headers.get("X-Admin-Password")
            saved_password = self.get_admin_password()
            
            if not saved_password or auth_header != saved_password:
                self.send_json({"error": "Unauthorized"}, 401)
                return

            try:
                with open(TEAM_FILE, "w") as f:
                    json.dump(body, f, indent=2)
                self.send_json({"success": True, "message": "Team settings saved successfully"})
            except Exception as e:
                self.send_json({"error": f"Failed to save: {str(e)}"}, 500)
            return

        elif self.path == "/api/testimonials":
            user_session = self.get_session_user()
            auth_header = self.headers.get("X-Admin-Password")
            saved_password = self.get_admin_password()
            
            is_admin = False
            if user_session and user_session.get("role") == "admin":
                is_admin = True
            elif saved_password and auth_header == saved_password:
                is_admin = True
                
            if not is_admin:
                self.send_json({"error": "Unauthorized. Admin role required."}, 401)
                return

            try:
                with open(TESTIMONIALS_FILE, "w") as f:
                    json.dump(body, f, indent=2)
                self.send_json({"success": True, "message": "Testimonials saved successfully"})
            except Exception as e:
                self.send_json({"error": f"Failed to save: {str(e)}"}, 500)
            return

        elif self.path == "/api/change-password":
            old_password = body.get("old_password")
            new_password = body.get("new_password")
            saved_password = self.get_admin_password()
            
            if not saved_password or old_password != saved_password:
                self.send_json({"error": "Incorrect old password"}, 401)
                return
                
            if not new_password or len(new_password.strip()) < 4:
                self.send_json({"error": "New password must be at least 4 characters"}, 400)
                return
                
            with open(PASSWORD_FILE, "w") as f:
                f.write(new_password.strip())
            self.send_json({"success": True, "message": "Password changed successfully"})
            return

        # --- User Login & Registration System ---
        elif self.path == "/api/register":
            email = body.get("email", "").strip().lower()
            password = body.get("password", "")
            
            if not email or not password or len(password) < 4:
                self.send_json({"error": "Valid email and password (min 4 chars) required"}, 400)
                return
                
            users = self.get_users()
            has_admin = self.has_admin_user()
            
            if has_admin:
                # Require admin session to create accounts
                creator_session = self.get_session_user()
                if not creator_session or creator_session["role"] != "admin":
                    self.send_json({"error": "Unauthorized. Only admins can register users."}, 401)
                    return
                
                # Admin can specify role
                role = body.get("role", "user").strip().lower()
                if role not in ["user", "admin"]:
                    role = "user"
            else:
                # Setup mode: allow creating the first admin
                role = "admin"
                
            if email in users:
                self.send_json({"error": "User with this email already exists"}, 400)
                return
            
            now = time.time()
            user_entry = {
                "password_hash": hash_password(password),
                "role": role,
                "created_at": now
            }
            
            if role != "admin":
                expiry_months = int(body.get("expiry_months", 6))
                user_entry["expires_at"] = now + (expiry_months * 30 * 24 * 60 * 60)
            
            users[email] = user_entry
            self.save_users(users)
            self.send_json({"success": True, "message": f"Account for {email} registered successfully!"})
            return

        elif self.path == "/api/login":
            email = body.get("email", "").strip().lower()
            password = body.get("password", "")
            
            if not email or not password:
                self.send_json({"error": "Email and password required"}, 400)
                return
            
            # 1. Check if master admin logging in
            admin_pass = self.get_admin_password()
            if email == "admin@honeypotglobal.co.za" and admin_pass and password == admin_pass:
                token = create_session(email, "admin")
                self.send_json({"success": True, "email": email, "role": "admin", "token": token})
                return
                
            # 2. Check general users database
            users = self.get_users()
            user = users.get(email)
            if user and user["password_hash"] == hash_password(password):
                if user.get("role") != "admin":
                    expires_at = user.get("expires_at")
                    if expires_at and time.time() > expires_at:
                        self.send_json({"error": "Access period has expired. Please contact an admin."}, 401)
                        return
                
                token = create_session(email, user["role"])
                self.send_json({"success": True, "email": email, "role": user["role"], "token": token})
                return
                
            self.send_json({"error": "Invalid email or password"}, 401)
            return

        elif self.path == "/api/delete-user":
            # Verify Admin
            user_session = self.get_session_user()
            if not user_session or user_session["role"] != "admin":
                self.send_json({"error": "Unauthorized. Admin role required."}, 401)
                return
            
            target_email = body.get("email", "").strip().lower()
            if not target_email:
                self.send_json({"error": "Email is required"}, 400)
                return
            
            if target_email == user_session["email"]:
                self.send_json({"error": "You cannot delete your own logged-in admin account."}, 400)
                return
                
            users = self.get_users()
            if target_email not in users:
                self.send_json({"error": "User not found"}, 404)
                return
                
            del users[target_email]
            self.save_users(users)
            self.send_json({"success": True, "message": f"User {target_email} deleted successfully."})
            return

        # --- Study Materials System ---
        elif self.path == "/api/upload-material":
            # Verify Admin
            user_session = self.get_session_user()
            if not user_session or user_session["role"] != "admin":
                self.send_json({"error": "Unauthorized. Admin role required."}, 401)
                return
            
            title = body.get("title", "").strip()
            description = body.get("description", "").strip()
            material_type = body.get("type", "link") # link, pdf, doc
            url = body.get("url", "").strip()
            file_obj = body.get("file")
            
            subject_id = body.get("subject_id", "subj-default").strip()
            module_id = body.get("module_id", "mod-default").strip()
            item_type = body.get("item_type", "resource").strip().lower()
            if item_type not in ["resource", "task"]:
                item_type = "resource"
            
            if not title:
                self.send_json({"error": "Title is required"}, 400)
                return
                
            filepath = ""
            filename = ""
            
            if material_type in ["pdf", "doc"]:
                if not file_obj or not isinstance(file_obj, dict) or not file_obj.get("data"):
                    self.send_json({"error": "File data is required for document types"}, 400)
                    return
                
                # Sanitize filename and create unique save path
                orig_filename = os.path.basename(file_obj["filename"])
                ext = os.path.splitext(orig_filename)[1]
                unique_name = f"{uuid.uuid4()}{ext}"
                filepath = os.path.join(UPLOADS_DIR, unique_name)
                
                try:
                    with open(filepath, "wb") as f:
                        f.write(file_obj["data"])
                    os.chmod(filepath, 0o644)
                    url = f"/uploads/{unique_name}"
                    filename = orig_filename
                except Exception as e:
                    self.send_json({"error": f"Failed to save file: {str(e)}"}, 500)
                    return
            else:
                if not url:
                    self.send_json({"error": "URL link is required for link type"}, 400)
                    return
            
            # Append to materials database
            materials = self.get_materials()
            new_item = {
                "id": str(uuid.uuid4()),
                "subject_id": subject_id,
                "module_id": module_id,
                "item_type": item_type,
                "title": title,
                "description": description,
                "type": material_type,
                "url": url,
                "filename": filename,
                "date": str(uuid.uuid4())[:8] # Short unique tag for verification/dates
            }
            materials.append(new_item)
            self.save_materials(materials)
            
            self.send_json({"success": True, "material": new_item})
            return

        elif self.path == "/api/delete-material":
            # Verify Admin
            user_session = self.get_session_user()
            if not user_session or user_session["role"] != "admin":
                self.send_json({"error": "Unauthorized. Admin role required."}, 401)
                return
            
            item_id = body.get("id")
            if not item_id:
                self.send_json({"error": "Material ID is required"}, 400)
                return
                
            materials = self.get_materials()
            item_to_delete = None
            
            for m in materials:
                if m["id"] == item_id:
                    item_to_delete = m
                    break
                    
            if not item_to_delete:
                self.send_json({"error": "Material not found"}, 404)
                return
                
            # Remove file if it resides in our uploads directory
            if item_to_delete["url"].startswith("/uploads/"):
                filename = os.path.basename(item_to_delete["url"])
                file_to_remove = os.path.join(UPLOADS_DIR, filename)
                if os.path.exists(file_to_remove):
                    try:
                        os.remove(file_to_remove)
                    except Exception:
                        pass
                        
            # Save updated list
            materials = [m for m in materials if m["id"] != item_id]
            self.save_materials(materials)
            
            self.send_json({"success": True, "message": "Material removed successfully"})
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
