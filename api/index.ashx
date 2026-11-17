<%@ WebHandler Language="C#" Class="CvApiHandler" %>

using System;
using System.IO;
using System.Text;
using System.Web;
using System.Collections;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Web.Script.Serialization;

public class CvApiHandler : IHttpHandler
{
    private static readonly object FileLock = new object();
    private static Dictionary<string, object> MemoryCache = null;
    private const string SecretKey = "personal-cv-secret-key-2026-safe-token";
    private const string DefaultBcryptHash = "$2a$10$JOuT.Gu/0q9TdYYWQ1QWJeCqJsGghPXKGjxua/UWs7e6Nurbt1h1O";

    public bool IsReusable { get { return false; } }

    public void ProcessRequest(HttpContext context)
    {
        HttpRequest req = context.Request;
        HttpResponse res = context.Response;

        res.ContentType = "application/json; charset=utf-8";
        res.ContentEncoding = Encoding.UTF8;
        res.AddHeader("Access-Control-Allow-Origin", "*");
        res.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
        res.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-HTTP-Method-Override");

        string method = (req.HttpMethod ?? "GET").ToUpperInvariant();
        if (method == "OPTIONS")
        {
            res.StatusCode = 200;
            return;
        }

        if (method == "POST")
        {
            string overrideHeader = req.Headers["X-HTTP-Method-Override"];
            string overrideQuery = req.QueryString["_method"];
            if (!string.IsNullOrEmpty(overrideHeader))
                method = overrideHeader.Trim().ToUpperInvariant();
            else if (!string.IsNullOrEmpty(overrideQuery))
                method = overrideQuery.Trim().ToUpperInvariant();
        }

        string baseDir = context.Server.MapPath("~/");
        string dataFile = Path.Combine(baseDir, "data", "cv-data.json");
        string appDataDir = Path.Combine(baseDir, "App_Data");
        string appDataFile = Path.Combine(appDataDir, "cv-data.json");
        string uploadsDir = Path.Combine(baseDir, "public", "uploads");

        if (!Directory.Exists(uploadsDir))
        {
            try { Directory.CreateDirectory(uploadsDir); } catch { }
        }

        string route = (req.QueryString["route"] ?? "").Trim('/');
        if (string.IsNullOrEmpty(route))
        {
            string rawPath = req.RawUrl ?? "";
            int qIdx = rawPath.IndexOf('?');
            if (qIdx >= 0) rawPath = rawPath.Substring(0, qIdx);
            int apiIdx = rawPath.IndexOf("/api/", StringComparison.OrdinalIgnoreCase);
            if (apiIdx >= 0)
                route = rawPath.Substring(apiIdx + 5).Trim('/');
        }

        JavaScriptSerializer serializer = new JavaScriptSerializer();
        serializer.MaxJsonLength = 20 * 1024 * 1024;

        Dictionary<string, object> body = new Dictionary<string, object>();
        if (method == "POST" || method == "PUT" || method == "PATCH")
        {
            string contentType = (req.ContentType ?? "").ToLowerInvariant();
            if (!contentType.Contains("multipart/form-data"))
            {
                try
                {
                    req.InputStream.Position = 0;
                    using (StreamReader sr = new StreamReader(req.InputStream, Encoding.UTF8))
                    {
                        string rawBody = sr.ReadToEnd();
                        if (!string.IsNullOrWhiteSpace(rawBody))
                        {
                            var parsed = serializer.DeserializeObject(rawBody) as Dictionary<string, object>;
                            if (parsed != null) body = parsed;
                        }
                    }
                }
                catch { }
            }
        }

        Dictionary<string, object> data = ReadData(dataFile, appDataFile, serializer);
        if (data == null)
        {
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", false },
                { "message", "Veri tabanı okunamadı." }
            }, 500);
            return;
        }

        // -------------------------------------------------------------
        // GENEL API ROTALARI (Public)
        // -------------------------------------------------------------

        // GET /api/cv
        if (route.Equals("cv", StringComparison.OrdinalIgnoreCase) && method == "GET")
        {
            var publicData = new Dictionary<string, object> {
                { "profile", GetValue(data, "profile", new Dictionary<string, object>()) },
                { "about", GetValue(data, "about", new Dictionary<string, object>()) },
                { "experiences", GetList(data, "experiences") },
                { "educations", GetList(data, "educations") },
                { "skills", GetList(data, "skills") },
                { "projects", GetList(data, "projects") },
                { "_sync", new Dictionary<string, object> {
                    { "_updatedAt", GetValue(data, "_updatedAt", 0) },
                    { "security", GetDict(data, "security") }
                } }
            };
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "data", publicData }
            }, 200);
            return;
        }

        // GET /api/media/{filename} (App_Data/uploads veya public/uploads icindeki gorselleri sunar)
        if (route.StartsWith("media/", StringComparison.OrdinalIgnoreCase) && method == "GET")
        {
            string rawName = Path.GetFileName(route.Substring("media/".Length).Trim('/'));
            if (!string.IsNullOrEmpty(rawName))
            {
                string appUploadsDir = Path.Combine(appDataDir, "uploads");
                string candidate1 = Path.Combine(appUploadsDir, rawName);
                string candidate2 = Path.Combine(uploadsDir, rawName);
                string foundPath = File.Exists(candidate1) ? candidate1 : (File.Exists(candidate2) ? candidate2 : null);

                if (foundPath != null)
                {
                    string ext = (Path.GetExtension(foundPath) ?? "").ToLowerInvariant();
                    string mime = "image/jpeg";
                    if (ext == ".png") mime = "image/png";
                    else if (ext == ".gif") mime = "image/gif";
                    else if (ext == ".webp") mime = "image/webp";
                    else if (ext == ".svg") mime = "image/svg+xml";
                    else if (ext == ".ico") mime = "image/x-icon";

                    res.ContentType = mime;
                    res.AddHeader("Cache-Control", "public, max-age=31536000");
                    res.WriteFile(foundPath);
                    return;
                }
            }
            res.StatusCode = 404;
            return;
        }

        // POST /api/contact
        if (route.Equals("contact", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            string name = GetString(body, "name").Trim();
            string email = GetString(body, "email").Trim();
            string subject = GetString(body, "subject").Trim();
            if (string.IsNullOrEmpty(subject)) subject = "Konu belirtilmedi";
            string message = GetString(body, "message").Trim();

            if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(message))
            {
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", false },
                    { "message", "İsim, e-posta ve mesaj alanları zorunludur." }
                }, 400);
                return;
            }

            ArrayList messages = GetList(data, "messages");
            var newMsg = new Dictionary<string, object> {
                { "id", "msg-" + NowMs() },
                { "name", name },
                { "email", email },
                { "subject", subject },
                { "message", message },
                { "createdAt", DateTime.UtcNow.ToString("o") },
                { "read", false }
            };
            messages.Insert(0, newMsg);
            data["messages"] = messages;
            SaveData(dataFile, serializer, data);

            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Mesajınız başarıyla iletildi! En kısa sürede geri dönüş yapılacaktır." }
            }, 200);
            return;
        }

        // POST /api/auth/login
        if (route.Equals("auth/login", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            string username = GetString(body, "username").Trim();
            string password = GetString(body, "password");

            var sec = GetDict(data, "security");
            string adminUser = GetString(sec, "adminUsername", "admin");
            string adminHash = GetString(sec, "adminPasswordHash", "");

            bool isUserValid = (username == adminUser);
            bool isPassValid = VerifyPassword(password, adminHash);

            if (isUserValid && isPassValid)
            {
                string token = GetExpectedToken(data);
                HttpCookie cookie = new HttpCookie("auth_token", token);
                cookie.Path = "/";
                cookie.Expires = DateTime.UtcNow.AddDays(7);
                cookie.HttpOnly = true;
                res.Cookies.Add(cookie);

                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Giriş başarılı!" },
                    { "token", token },
                    { "user", new Dictionary<string, object> { { "username", adminUser } } }
                }, 200);
            }
            else
            {
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", false },
                    { "message", "Hatalı kullanıcı adı veya şifre!" }
                }, 401);
            }
            return;
        }

        // POST /api/auth/logout
        if (route.Equals("auth/logout", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            HttpCookie cookie = new HttpCookie("auth_token", "");
            cookie.Path = "/";
            cookie.Expires = DateTime.UtcNow.AddDays(-1);
            res.Cookies.Add(cookie);

            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Başarıyla çıkış yapıldı." }
            }, 200);
            return;
        }

        // GET /api/auth/check
        if (route.Equals("auth/check", StringComparison.OrdinalIgnoreCase) && method == "GET")
        {
            bool isAuth = IsAuthenticated(req, data);
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "authenticated", isAuth }
            }, 200);
            return;
        }

        // -------------------------------------------------------------
        // YÖNETİM PANELİ KORUMALI ROTALAR
        // -------------------------------------------------------------
        if (!IsAuthenticated(req, data))
        {
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", false },
                { "message", "Yetkisiz erişim. Lütfen giriş yapın." }
            }, 401);
            return;
        }

        // GET /api/admin/data or /api/admin/dashboard
        if ((route.Equals("admin/data", StringComparison.OrdinalIgnoreCase) || route.Equals("admin/dashboard", StringComparison.OrdinalIgnoreCase)) && method == "GET")
        {
            var sec = GetDict(data, "security");
            var safeData = new Dictionary<string, object> {
                { "profile", GetValue(data, "profile", new Dictionary<string, object>()) },
                { "about", GetValue(data, "about", new Dictionary<string, object>()) },
                { "experiences", GetList(data, "experiences") },
                { "educations", GetList(data, "educations") },
                { "skills", GetList(data, "skills") },
                { "projects", GetList(data, "projects") },
                { "messages", GetList(data, "messages") },
                { "username", GetString(sec, "adminUsername", "admin") }
            };
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "data", safeData }
            }, 200);
            return;
        }

        // PUT /api/admin/profile
        if (route.Equals("admin/profile", StringComparison.OrdinalIgnoreCase) && method == "PUT")
        {
            var profile = GetDict(data, "profile");
            foreach (var kv in body) profile[kv.Key] = kv.Value;
            data["profile"] = profile;
            SaveData(dataFile, serializer, data);
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Profil bilgileri güncellendi." },
                { "profile", profile }
            }, 200);
            return;
        }

        // PUT /api/admin/about
        if (route.Equals("admin/about", StringComparison.OrdinalIgnoreCase) && method == "PUT")
        {
            var about = GetDict(data, "about");
            foreach (var kv in body) about[kv.Key] = kv.Value;
            data["about"] = about;
            SaveData(dataFile, serializer, data);
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Hakkımda bilgileri güncellendi." },
                { "about", about }
            }, 200);
            return;
        }

        // DENEYİMLER (CRUD)
        if (route.Equals("admin/experiences", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            bool current = GetBool(body, "current");
            var item = new Dictionary<string, object> {
                { "id", "exp-" + NowMs() },
                { "title", GetString(body, "title") },
                { "company", GetString(body, "company") },
                { "location", GetString(body, "location") },
                { "startDate", GetString(body, "startDate") },
                { "endDate", current ? "Günümüz" : GetString(body, "endDate") },
                { "current", current },
                { "description", GetString(body, "description") },
                { "achievements", GetStringArray(body, "achievements", '\n') },
                { "technologies", GetStringArray(body, "technologies", ',') }
            };
            ArrayList list = GetList(data, "experiences");
            list.Insert(0, item);
            data["experiences"] = list;
            SaveData(dataFile, serializer, data);
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Deneyim başarıyla eklendi." },
                { "item", item }
            }, 200);
            return;
        }

        if (route.StartsWith("admin/experiences/", StringComparison.OrdinalIgnoreCase))
        {
            string id = route.Substring("admin/experiences/".Length).Trim('/');
            ArrayList list = GetList(data, "experiences");
            int idx = FindIndexById(list, id);

            if (method == "PUT")
            {
                if (idx < 0) { WriteNotFound(res, serializer, "Deneyim bulunamadı."); return; }
                var existing = AsDict(list[idx]);
                bool current = GetBool(body, "current");
                existing["title"] = GetString(body, "title");
                existing["company"] = GetString(body, "company");
                existing["location"] = GetString(body, "location");
                existing["startDate"] = GetString(body, "startDate");
                existing["endDate"] = current ? "Günümüz" : GetString(body, "endDate");
                existing["current"] = current;
                existing["description"] = GetString(body, "description");
                existing["achievements"] = GetStringArray(body, "achievements", '\n');
                existing["technologies"] = GetStringArray(body, "technologies", ',');
                list[idx] = existing;
                data["experiences"] = list;
                SaveData(dataFile, serializer, data);
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Deneyim güncellendi." },
                    { "item", existing }
                }, 200);
                return;
            }
            if (method == "DELETE")
            {
                if (idx >= 0) { list.RemoveAt(idx); data["experiences"] = list; SaveData(dataFile, serializer, data); }
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Deneyim silindi." }
                }, 200);
                return;
            }
        }

        // EĞİTİMLER (CRUD)
        if (route.Equals("admin/educations", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            var item = new Dictionary<string, object> {
                { "id", "edu-" + NowMs() },
                { "degree", GetString(body, "degree") },
                { "school", GetString(body, "school") },
                { "startDate", GetString(body, "startDate") },
                { "endDate", GetString(body, "endDate") },
                { "description", GetString(body, "description") }
            };
            ArrayList list = GetList(data, "educations");
            list.Insert(0, item);
            data["educations"] = list;
            SaveData(dataFile, serializer, data);
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Eğitim bilgisi eklendi." },
                { "item", item }
            }, 200);
            return;
        }

        if (route.StartsWith("admin/educations/", StringComparison.OrdinalIgnoreCase))
        {
            string id = route.Substring("admin/educations/".Length).Trim('/');
            ArrayList list = GetList(data, "educations");
            int idx = FindIndexById(list, id);

            if (method == "PUT")
            {
                if (idx < 0) { WriteNotFound(res, serializer, "Eğitim bulunamadı."); return; }
                var existing = AsDict(list[idx]);
                foreach (var kv in body) existing[kv.Key] = kv.Value;
                list[idx] = existing;
                data["educations"] = list;
                SaveData(dataFile, serializer, data);
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Eğitim güncellendi." },
                    { "item", existing }
                }, 200);
                return;
            }
            if (method == "DELETE")
            {
                if (idx >= 0) { list.RemoveAt(idx); data["educations"] = list; SaveData(dataFile, serializer, data); }
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Eğitim silindi." }
                }, 200);
                return;
            }
        }

        // YETENEKLER (CRUD)
        if (route.Equals("admin/skills", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            var item = new Dictionary<string, object> {
                { "id", "sk-" + NowMs() },
                { "category", GetString(body, "category", "Diğer") },
                { "name", GetString(body, "name") },
                { "level", GetInt(body, "level", 80) },
                { "icon", GetString(body, "icon", "code") }
            };
            ArrayList list = GetList(data, "skills");
            list.Add(item);
            data["skills"] = list;
            SaveData(dataFile, serializer, data);
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Yetenek eklendi." },
                { "item", item }
            }, 200);
            return;
        }

        if (route.StartsWith("admin/skills/", StringComparison.OrdinalIgnoreCase))
        {
            string id = route.Substring("admin/skills/".Length).Trim('/');
            ArrayList list = GetList(data, "skills");
            int idx = FindIndexById(list, id);

            if (method == "PUT")
            {
                if (idx < 0) { WriteNotFound(res, serializer, "Yetenek bulunamadı."); return; }
                var existing = AsDict(list[idx]);
                existing["category"] = GetString(body, "category", "Diğer");
                existing["name"] = GetString(body, "name");
                existing["level"] = GetInt(body, "level", 80);
                existing["icon"] = GetString(body, "icon", "code");
                list[idx] = existing;
                data["skills"] = list;
                SaveData(dataFile, serializer, data);
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Yetenek güncellendi." },
                    { "item", existing }
                }, 200);
                return;
            }
            if (method == "DELETE")
            {
                if (idx >= 0) { list.RemoveAt(idx); data["skills"] = list; SaveData(dataFile, serializer, data); }
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Yetenek silindi." }
                }, 200);
                return;
            }
        }

        // PROJELER (CRUD)
        if (route.Equals("admin/projects", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            string img = GetString(body, "image");
            if (string.IsNullOrEmpty(img)) img = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80";

            var item = new Dictionary<string, object> {
                { "id", "proj-" + NowMs() },
                { "title", GetString(body, "title") },
                { "category", GetString(body, "category", "Web") },
                { "summary", GetString(body, "summary") },
                { "description", GetString(body, "description") },
                { "image", img },
                { "tags", GetStringArray(body, "tags", ',') },
                { "demoUrl", GetString(body, "demoUrl") },
                { "githubUrl", GetString(body, "githubUrl") },
                { "featured", GetBool(body, "featured") },
                { "highlights", GetStringArray(body, "highlights", '\n') }
            };
            ArrayList list = GetList(data, "projects");
            list.Insert(0, item);
            data["projects"] = list;
            SaveData(dataFile, serializer, data);
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Proje başarıyla eklendi." },
                { "item", item }
            }, 200);
            return;
        }

        if (route.StartsWith("admin/projects/", StringComparison.OrdinalIgnoreCase))
        {
            string id = route.Substring("admin/projects/".Length).Trim('/');
            ArrayList list = GetList(data, "projects");
            int idx = FindIndexById(list, id);

            if (method == "PUT")
            {
                if (idx < 0) { WriteNotFound(res, serializer, "Proje bulunamadı."); return; }
                var existing = AsDict(list[idx]);
                existing["title"] = GetString(body, "title");
                existing["category"] = GetString(body, "category");
                existing["summary"] = GetString(body, "summary");
                existing["description"] = GetString(body, "description");
                existing["image"] = GetString(body, "image");
                existing["tags"] = GetStringArray(body, "tags", ',');
                existing["demoUrl"] = GetString(body, "demoUrl");
                existing["githubUrl"] = GetString(body, "githubUrl");
                existing["featured"] = GetBool(body, "featured");
                existing["highlights"] = GetStringArray(body, "highlights", '\n');
                list[idx] = existing;
                data["projects"] = list;
                SaveData(dataFile, serializer, data);
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Proje güncellendi." },
                    { "item", existing }
                }, 200);
                return;
            }
            if (method == "DELETE")
            {
                if (idx >= 0) { list.RemoveAt(idx); data["projects"] = list; SaveData(dataFile, serializer, data); }
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Proje silindi." }
                }, 200);
                return;
            }
        }

        // MESAJLAR
        if (route.Equals("admin/messages", StringComparison.OrdinalIgnoreCase) && method == "GET")
        {
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "messages", GetList(data, "messages") }
            }, 200);
            return;
        }

        if (route.StartsWith("admin/messages/", StringComparison.OrdinalIgnoreCase) && route.EndsWith("/read", StringComparison.OrdinalIgnoreCase) && method == "PATCH")
        {
            string id = route.Substring("admin/messages/".Length);
            id = id.Substring(0, id.Length - "/read".Length).Trim('/');
            ArrayList list = GetList(data, "messages");
            int idx = FindIndexById(list, id);
            if (idx >= 0)
            {
                var msg = AsDict(list[idx]);
                msg["read"] = body.ContainsKey("read") ? GetBool(body, "read") : true;
                list[idx] = msg;
                data["messages"] = list;
                SaveData(dataFile, serializer, data);
            }
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Mesaj durumu güncellendi." }
            }, 200);
            return;
        }

        if (route.StartsWith("admin/messages/", StringComparison.OrdinalIgnoreCase) && method == "DELETE")
        {
            string id = route.Substring("admin/messages/".Length).Trim('/');
            ArrayList list = GetList(data, "messages");
            int idx = FindIndexById(list, id);
            if (idx >= 0)
            {
                list.RemoveAt(idx);
                data["messages"] = list;
                SaveData(dataFile, serializer, data);
            }
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Mesaj silindi." }
            }, 200);
            return;
        }

        // RESİM YÜKLEME
        if (route.Equals("admin/upload", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            string appUploadsDir = Path.Combine(appDataDir, "uploads");

            // 1. JSON Base64 Yükleme Desteği
            string base64Input = GetString(body, "base64").Trim();
            if (!string.IsNullOrEmpty(base64Input) && base64Input.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                int commaIdx = base64Input.IndexOf(',');
                if (commaIdx > 0)
                {
                    try
                    {
                        string meta = base64Input.Substring(0, commaIdx).ToLowerInvariant();
                        string rawB64 = base64Input.Substring(commaIdx + 1);
                        byte[] fileBytes = Convert.FromBase64String(rawB64);

                        string ext = ".jpg";
                        if (meta.Contains("image/png")) ext = ".png";
                        else if (meta.Contains("image/gif")) ext = ".gif";
                        else if (meta.Contains("image/webp")) ext = ".webp";
                        else if (meta.Contains("image/svg")) ext = ".svg";

                        string filename = "upload-" + NowMs() + "-" + new Random().Next(1000, 9999) + ext;

                        // Önce public/uploads klasörüne kaydetmeyi dene
                        try
                        {
                            if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
                            File.WriteAllBytes(Path.Combine(uploadsDir, filename), fileBytes);
                            WriteJson(res, serializer, new Dictionary<string, object> {
                                { "success", true },
                                { "message", "Dosya başarıyla yüklendi." },
                                { "url", "/uploads/" + filename }
                            }, 200);
                            return;
                        }
                        catch { }

                        // IIS public/uploads yazma izni yoksa App_Data/uploads klasörüne kaydet
                        try
                        {
                            if (!Directory.Exists(appUploadsDir)) Directory.CreateDirectory(appUploadsDir);
                            File.WriteAllBytes(Path.Combine(appUploadsDir, filename), fileBytes);
                            WriteJson(res, serializer, new Dictionary<string, object> {
                                { "success", true },
                                { "message", "Dosya başarıyla yüklendi." },
                                { "url", "/api/media/" + filename }
                            }, 200);
                            return;
                        }
                        catch { }
                    }
                    catch { }
                }

                // Disk yazma tamamen kapalıysa doğrudan Base64 Data URI döndür (Asla hata vermez)
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Görsel başarıyla hazırlandı." },
                    { "url", base64Input }
                }, 200);
                return;
            }

            // 2. Multipart Form-Data Yükleme Desteği
            if (req.Files.Count == 0 || req.Files["file"] == null || req.Files["file"].ContentLength == 0)
            {
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", false },
                    { "message", "Lütfen yüklenecek bir dosya seçin." }
                }, 400);
                return;
            }

            HttpPostedFile file = req.Files["file"];
            string fileExt = (Path.GetExtension(file.FileName) ?? "").ToLowerInvariant();
            string[] allowed = new string[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".avif", ".jfif", ".ico" };
            if (Array.IndexOf(allowed, fileExt) < 0)
            {
                fileExt = ".jpg";
            }

            string outName = "upload-" + NowMs() + "-" + new Random().Next(1000, 9999) + fileExt;

            // Önce public/uploads klasörüne kaydetmeyi dene
            try
            {
                if (!Directory.Exists(uploadsDir)) Directory.CreateDirectory(uploadsDir);
                string targetPath = Path.Combine(uploadsDir, outName);
                file.SaveAs(targetPath);
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Dosya başarıyla yüklendi." },
                    { "url", "/uploads/" + outName }
                }, 200);
                return;
            }
            catch { }

            // IIS public/uploads yazma izni yoksa App_Data/uploads klasörüne kaydet
            try
            {
                if (!Directory.Exists(appUploadsDir)) Directory.CreateDirectory(appUploadsDir);
                string appTargetPath = Path.Combine(appUploadsDir, outName);
                file.SaveAs(appTargetPath);
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", true },
                    { "message", "Dosya başarıyla yüklendi." },
                    { "url", "/api/media/" + outName }
                }, 200);
                return;
            }
            catch { }

            // Her iki klasöre de yazma izni yoksa dosyayı bellekte Base64 Data URI'ye çevirip döndür
            try
            {
                file.InputStream.Position = 0;
                using (MemoryStream ms = new MemoryStream())
                {
                    file.InputStream.CopyTo(ms);
                    string b64 = Convert.ToBase64String(ms.ToArray());
                    string mime = !string.IsNullOrEmpty(file.ContentType) ? file.ContentType : "image/jpeg";
                    WriteJson(res, serializer, new Dictionary<string, object> {
                        { "success", true },
                        { "message", "Görsel başarıyla işlendi." },
                        { "url", "data:" + mime + ";base64," + b64 }
                    }, 200);
                    return;
                }
            }
            catch (Exception ex)
            {
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", false },
                    { "message", "Görsel işlenemedi: " + ex.Message }
                }, 500);
                return;
            }
        }

        // ŞİFRE DEĞİŞTİRME
        if (route.Equals("admin/change-password", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            string curr = GetString(body, "currentPassword");
            string newPass = GetString(body, "newPassword");
            string newUser = GetString(body, "newUsername").Trim();

            if (string.IsNullOrEmpty(curr) || string.IsNullOrEmpty(newPass))
            {
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", false },
                    { "message", "Mevcut ve yeni şifre gereklidir." }
                }, 400);
                return;
            }

            if (newPass.Length < 6)
            {
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", false },
                    { "message", "Yeni şifre en az 6 karakter olmalıdır." }
                }, 400);
                return;
            }

            var sec = GetDict(data, "security");
            string adminHash = GetString(sec, "adminPasswordHash", "");
            if (!VerifyPassword(curr, adminHash))
            {
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", false },
                    { "message", "Mevcut şifreniz hatalı." }
                }, 400);
                return;
            }

            sec["adminPasswordHash"] = HashPasswordSha256(newPass);
            if (!string.IsNullOrEmpty(newUser))
                sec["adminUsername"] = newUser;
            data["security"] = sec;
            SaveData(dataFile, serializer, data);

            string token = GetExpectedToken(data);
            HttpCookie cookie = new HttpCookie("auth_token", token);
            cookie.Path = "/";
            cookie.Expires = DateTime.UtcNow.AddDays(7);
            cookie.HttpOnly = true;
            res.Cookies.Add(cookie);

            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Şifreniz başarıyla güncellendi!" },
                { "token", token }
            }, 200);
            return;
        }

        // YEDEK DIŞA / İÇE AKTARMA
        if (route.Equals("admin/export", StringComparison.OrdinalIgnoreCase) && method == "GET")
        {
            res.AddHeader("Content-Disposition", "attachment; filename=cv-portfolio-backup.json");
            res.ContentType = "application/json; charset=utf-8";
            res.Write(serializer.Serialize(data));
            return;
        }

        if (route.Equals("admin/import", StringComparison.OrdinalIgnoreCase) && method == "POST")
        {
            if (!body.ContainsKey("profile") || !body.ContainsKey("security"))
            {
                WriteJson(res, serializer, new Dictionary<string, object> {
                    { "success", false },
                    { "message", "Geçersiz veri yedekleme formatı." }
                }, 400);
                return;
            }
            SaveData(dataFile, serializer, body);
            WriteJson(res, serializer, new Dictionary<string, object> {
                { "success", true },
                { "message", "Veriler başarıyla içe aktarıldı ve geri yüklendi!" }
            }, 200);
            return;
        }

        WriteNotFound(res, serializer, "Geçersiz API rotası: " + route);
    }

    // -------------------------------------------------------------
    // YARDIMCI METOTLAR
    // -------------------------------------------------------------
    private static long NowMs()
    {
        return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
    }

    private static List<string> GetStoragePaths(string file, string appDataFile)
    {
        List<string> paths = new List<string>();
        try
        {
            string baseDir = Path.GetDirectoryName(Path.GetDirectoryName(file));
            if (!string.IsNullOrEmpty(baseDir))
            {
                string vhostDir = Path.GetDirectoryName(baseDir.TrimEnd('\\', '/'));
                if (!string.IsNullOrEmpty(vhostDir))
                {
                    paths.Add(Path.Combine(vhostDir, "tmp", "hasankaba_cv_store_v2.json"));
                }
            }
        }
        catch { }

        try { paths.Add(Path.Combine(Path.GetTempPath(), "hasankaba_cv_store_v2.json")); } catch { }
        try { paths.Add(Path.Combine(HttpRuntime.CodegenDir, "hasankaba_cv_store_v2.json")); } catch { }
        if (!string.IsNullOrEmpty(appDataFile)) paths.Add(appDataFile);
        if (!string.IsNullOrEmpty(file)) paths.Add(file);
        return paths;
    }

    private static long GetUpdatedTimestamp(Dictionary<string, object> d, string path)
    {
        if (d != null && d.ContainsKey("_updatedAt") && d["_updatedAt"] != null)
        {
            long ts;
            if (long.TryParse(Convert.ToString(d["_updatedAt"]), out ts) && ts > 0)
                return ts + 1000000000000L;
        }
        try
        {
            return (long)(File.GetLastWriteTimeUtc(path) - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
        }
        catch
        {
            return 0;
        }
    }

    private static Dictionary<string, object> ReadData(string file, string appDataFile, JavaScriptSerializer serializer)
    {
        lock (FileLock)
        {
            if (MemoryCache != null)
                return MemoryCache;

            List<string> candidates = GetStoragePaths(file, appDataFile);
            Dictionary<string, object> bestData = null;
            long bestTs = -1;

            foreach (string candidate in candidates)
            {
                try
                {
                    if (File.Exists(candidate))
                    {
                        string raw = File.ReadAllText(candidate, Encoding.UTF8);
                        var parsed = serializer.DeserializeObject(raw) as Dictionary<string, object>;
                        if (parsed != null && parsed.ContainsKey("profile"))
                        {
                            long ts = GetUpdatedTimestamp(parsed, candidate);
                            if (bestData == null || ts > bestTs)
                            {
                                bestData = parsed;
                                bestTs = ts;
                            }
                        }
                    }
                }
                catch { }
            }

            if (bestData != null)
            {
                MemoryCache = bestData;
                return MemoryCache;
            }
            return null;
        }
    }

    private static bool SaveData(string file, JavaScriptSerializer serializer, Dictionary<string, object> data)
    {
        lock (FileLock)
        {
            data["_updatedAt"] = NowMs();
            MemoryCache = data;
            string json = serializer.Serialize(data);
            bool saved = false;

            string baseDir = Path.GetDirectoryName(Path.GetDirectoryName(file));
            string appDataFile = Path.Combine(baseDir, "App_Data", "cv-data.json");
            List<string> candidates = GetStoragePaths(file, appDataFile);

            foreach (string target in candidates)
            {
                try
                {
                    string dir = Path.GetDirectoryName(target);
                    if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    {
                        Directory.CreateDirectory(dir);
                    }
                    File.WriteAllText(target, json, new UTF8Encoding(false));
                    saved = true;
                }
                catch { }
            }

            return saved;
        }
    }

    private static void WriteJson(HttpResponse res, JavaScriptSerializer serializer, object obj, int statusCode)
    {
        res.StatusCode = statusCode;
        res.TrySkipIisCustomErrors = true;
        res.Write(serializer.Serialize(obj));
    }

    private static void WriteNotFound(HttpResponse res, JavaScriptSerializer serializer, string msg)
    {
        WriteJson(res, serializer, new Dictionary<string, object> {
            { "success", false },
            { "message", msg }
        }, 404);
    }

    private static string GetExpectedToken(Dictionary<string, object> data)
    {
        var sec = GetDict(data, "security");
        string user = GetString(sec, "adminUsername", "admin");
        string hash = GetString(sec, "adminPasswordHash", "default");
        using (HMACSHA256 hmac = new HMACSHA256(Encoding.UTF8.GetBytes(SecretKey)))
        {
            byte[] bytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(user + "|" + hash));
            return BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
        }
    }

    private static bool IsAuthenticated(HttpRequest req, Dictionary<string, object> data)
    {
        string expected = GetExpectedToken(data);
        HttpCookie cookie = req.Cookies["auth_token"];
        if (cookie != null && !string.IsNullOrEmpty(cookie.Value) && string.Equals(cookie.Value, expected, StringComparison.Ordinal))
            return true;

        string authHeader = req.Headers["Authorization"] ?? "";
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            string token = authHeader.Substring(7).Trim();
            if (string.Equals(token, expected, StringComparison.Ordinal))
                return true;
        }
        return false;
    }

    private static bool VerifyPassword(string password, string storedHash)
    {
        if (string.IsNullOrEmpty(password)) return false;
        if (storedHash != null && storedHash.StartsWith("sha256:", StringComparison.Ordinal))
        {
            string[] parts = storedHash.Split(':');
            if (parts.Length == 3)
            {
                string salt = parts[1];
                string expectedHex = parts[2];
                using (SHA256 sha = SHA256.Create())
                {
                    byte[] hashBytes = sha.ComputeHash(Encoding.UTF8.GetBytes(salt + ":" + password));
                    string actualHex = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                    return string.Equals(actualHex, expectedHex, StringComparison.OrdinalIgnoreCase);
                }
            }
        }
        if ((storedHash == DefaultBcryptHash || string.IsNullOrEmpty(storedHash)) && password == "admin123")
            return true;
        return false;
    }

    private static string HashPasswordSha256(string password)
    {
        string salt = Guid.NewGuid().ToString("N").Substring(0, 16);
        using (SHA256 sha = SHA256.Create())
        {
            byte[] hashBytes = sha.ComputeHash(Encoding.UTF8.GetBytes(salt + ":" + password));
            string hex = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
            return "sha256:" + salt + ":" + hex;
        }
    }

    private static object GetValue(Dictionary<string, object> dict, string key, object fallback)
    {
        if (dict != null && dict.ContainsKey(key) && dict[key] != null) return dict[key];
        return fallback;
    }

    private static Dictionary<string, object> GetDict(Dictionary<string, object> dict, string key)
    {
        if (dict != null && dict.ContainsKey(key))
        {
            var sub = dict[key] as Dictionary<string, object>;
            if (sub != null) return sub;
        }
        return new Dictionary<string, object>();
    }

    private static Dictionary<string, object> AsDict(object obj)
    {
        var d = obj as Dictionary<string, object>;
        return d ?? new Dictionary<string, object>();
    }

    private static ArrayList GetList(Dictionary<string, object> dict, string key)
    {
        if (dict != null && dict.ContainsKey(key) && dict[key] != null)
        {
            if (dict[key] is ArrayList) return (ArrayList)dict[key];
            if (dict[key] is object[]) return new ArrayList((object[])dict[key]);
        }
        return new ArrayList();
    }

    private static string GetString(Dictionary<string, object> dict, string key, string fallback = "")
    {
        if (dict != null && dict.ContainsKey(key) && dict[key] != null)
            return Convert.ToString(dict[key]);
        return fallback;
    }

    private static bool GetBool(Dictionary<string, object> dict, string key)
    {
        if (dict != null && dict.ContainsKey(key) && dict[key] != null)
        {
            if (dict[key] is bool) return (bool)dict[key];
            bool b;
            if (bool.TryParse(Convert.ToString(dict[key]), out b)) return b;
        }
        return false;
    }

    private static int GetInt(Dictionary<string, object> dict, string key, int fallback)
    {
        if (dict != null && dict.ContainsKey(key) && dict[key] != null)
        {
            int val;
            if (int.TryParse(Convert.ToString(dict[key]), out val)) return val;
        }
        return fallback;
    }

    private static ArrayList GetStringArray(Dictionary<string, object> dict, string key, char splitChar)
    {
        ArrayList result = new ArrayList();
        if (dict == null || !dict.ContainsKey(key) || dict[key] == null) return result;

        object raw = dict[key];
        if (raw is ArrayList)
        {
            foreach (object item in (ArrayList)raw)
            {
                string s = Convert.ToString(item).Trim();
                if (!string.IsNullOrEmpty(s)) result.Add(s);
            }
            return result;
        }
        if (raw is object[])
        {
            foreach (object item in (object[])raw)
            {
                string s = Convert.ToString(item).Trim();
                if (!string.IsNullOrEmpty(s)) result.Add(s);
            }
            return result;
        }

        string str = Convert.ToString(raw);
        foreach (string part in str.Split(new char[] { splitChar }, StringSplitOptions.RemoveEmptyEntries))
        {
            string trimmed = part.Trim();
            if (!string.IsNullOrEmpty(trimmed)) result.Add(trimmed);
        }
        return result;
    }

    private static int FindIndexById(ArrayList list, string id)
    {
        for (int i = 0; i < list.Count; i++)
        {
            var d = list[i] as Dictionary<string, object>;
            if (d != null && GetString(d, "id") == id) return i;
        }
        return -1;
    }
}
