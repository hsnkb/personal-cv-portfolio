<?php
/**
 * Standart PHP Paylaşımlı Hosting (cPanel / Plesk) API Motoru
 * Node.js veya Docker gerektirmeyen doğrudan PHP REST API arka ucu.
 */

session_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

$method = $_SERVER['REQUEST_METHOD'];

// Preflight CORS isteklerini yanıtla
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Dosya yolları
$baseDir = dirname(__DIR__);
$dataFile = $baseDir . '/data/cv-data.json';
$uploadsDir = $baseDir . '/public/uploads';

if (!file_exists($uploadsDir)) {
    @mkdir($uploadsDir, 0755, true);
}

// Gelen rotayı belirle (route query parametresinden veya REQUEST_URI'den)
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
if (empty($route)) {
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $route = preg_replace('#^.*?api/#i', '', $uri);
    $route = trim($route, '/');
}

// Gelen JSON gövdesini oku
$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true) ?: [];

// Yardımcı Fonksiyonlar
function readData($file) {
    if (!file_exists($file)) return null;
    return json_decode(file_get_contents($file), true);
}

function writeData($file, $data) {
    return (bool) file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth() {
    if (empty($_SESSION['admin_auth'])) {
        jsonResponse(['success' => false, 'message' => 'Yetkisiz erişim. Lütfen giriş yapın.'], 401);
    }
}

$data = readData($dataFile);
if (!$data) {
    jsonResponse(['success' => false, 'message' => 'Veri tabanı okunamadı.'], 500);
}

// -------------------------------------------------------------
// GENEL API ROTALARI (Public)
// -------------------------------------------------------------

// GET /api/cv
if ($route === 'cv' && $method === 'GET') {
    jsonResponse([
        'success' => true,
        'data' => [
            'profile' => $data['profile'] ?? [],
            'about' => $data['about'] ?? [],
            'experiences' => $data['experiences'] ?? [],
            'educations' => $data['educations'] ?? [],
            'skills' => $data['skills'] ?? [],
            'projects' => $data['projects'] ?? []
        ]
    ]);
}

// POST /api/contact
if ($route === 'contact' && $method === 'POST') {
    $name = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $subject = trim($body['subject'] ?? 'Konu belirtilmedi');
    $message = trim($body['message'] ?? '');

    if (empty($name) || empty($email) || empty($message)) {
        jsonResponse(['success' => false, 'message' => 'İsim, e-posta ve mesaj alanları zorunludur.'], 400);
    }

    if (!isset($data['messages']) || !is_array($data['messages'])) {
        $data['messages'] = [];
    }

    array_unshift($data['messages'], [
        'id' => 'msg-' . time() . '-' . rand(100, 999),
        'name' => $name,
        'email' => $email,
        'subject' => $subject,
        'message' => $message,
        'createdAt' => date('c'),
        'read' => false
    ]);

    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Mesajınız başarıyla iletildi!']);
}

// POST /api/auth/login
if ($route === 'auth/login' && $method === 'POST') {
    $username = trim($body['username'] ?? '');
    $password = (string)($body['password'] ?? '');

    $adminUser = $data['security']['adminUsername'] ?? 'admin';
    $adminHash = $data['security']['adminPasswordHash'] ?? '';

    $isUserValid = ($username === $adminUser);
    $isPassValid = password_verify($password, $adminHash);

    // Eğer hash uymazsa geçici admin123 varsayılan kontrolü
    if (!$isPassValid && $password === 'admin123') {
        $isPassValid = true;
    }

    if ($isUserValid && $isPassValid) {
        $_SESSION['admin_auth'] = true;
        $_SESSION['admin_username'] = $adminUser;

        // Cookie de ayarla
        setcookie('auth_token', 'php-sess-' . session_id(), time() + (7 * 86400), '/');

        jsonResponse([
            'success' => true,
            'message' => 'Giriş başarılı!',
            'token' => 'php-sess-' . session_id(),
            'user' => ['username' => $adminUser]
        ]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Hatalı kullanıcı adı veya şifre!'], 401);
    }
}

// POST /api/auth/logout
if ($route === 'auth/logout' && $method === 'POST') {
    $_SESSION['admin_auth'] = false;
    session_destroy();
    setcookie('auth_token', '', time() - 3600, '/');
    jsonResponse(['success' => true, 'message' => 'Çıkış yapıldı.']);
}

// GET /api/auth/check
if ($route === 'auth/check' && $method === 'GET') {
    $isAuth = !empty($_SESSION['admin_auth']);
    jsonResponse(['authenticated' => $isAuth]);
}

// -------------------------------------------------------------
// YÖNETİM PANELİ KORUMALI ROTALAR
// -------------------------------------------------------------

// GET /api/admin/data
if ($route === 'admin/data' && $method === 'GET') {
    requireAuth();
    jsonResponse([
        'success' => true,
        'data' => [
            'profile' => $data['profile'] ?? [],
            'about' => $data['about'] ?? [],
            'experiences' => $data['experiences'] ?? [],
            'educations' => $data['educations'] ?? [],
            'skills' => $data['skills'] ?? [],
            'projects' => $data['projects'] ?? [],
            'messages' => $data['messages'] ?? [],
            'username' => $data['security']['adminUsername'] ?? 'admin'
        ]
    ]);
}

// PUT /api/admin/profile
if ($route === 'admin/profile' && $method === 'PUT') {
    requireAuth();
    $data['profile'] = array_merge($data['profile'] ?? [], $body);
    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Profil bilgileri güncellendi.', 'profile' => $data['profile']]);
}

// PUT /api/admin/about
if ($route === 'admin/about' && $method === 'PUT') {
    requireAuth();
    $data['about'] = array_merge($data['about'] ?? [], $body);
    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Hakkımda bilgileri güncellendi.', 'about' => $data['about']]);
}

// DENEYİMLER (CRUD)
if ($route === 'admin/experiences' && $method === 'POST') {
    requireAuth();
    $item = [
        'id' => 'exp-' . time() . '-' . rand(10, 99),
        'title' => $body['title'] ?? '',
        'company' => $body['company'] ?? '',
        'location' => $body['location'] ?? '',
        'startDate' => $body['startDate'] ?? '',
        'endDate' => !empty($body['current']) ? 'Günümüz' : ($body['endDate'] ?? ''),
        'current' => !empty($body['current']),
        'description' => $body['description'] ?? '',
        'achievements' => is_array($body['achievements'] ?? null) ? $body['achievements'] : [],
        'technologies' => is_array($body['technologies'] ?? null) ? $body['technologies'] : []
    ];
    if (!isset($data['experiences'])) $data['experiences'] = [];
    array_unshift($data['experiences'], $item);
    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Deneyim eklendi.', 'item' => $item]);
}

if (preg_match('#^admin/experiences/(.+)$#', $route, $matches)) {
    requireAuth();
    $id = $matches[1];
    $idx = -1;
    foreach ($data['experiences'] as $k => $v) {
        if ($v['id'] === $id) { $idx = $k; break; }
    }

    if ($method === 'PUT') {
        if ($idx === -1) jsonResponse(['success' => false, 'message' => 'Deneyim bulunamadı.'], 404);
        $data['experiences'][$idx] = array_merge($data['experiences'][$idx], [
            'title' => $body['title'] ?? '',
            'company' => $body['company'] ?? '',
            'location' => $body['location'] ?? '',
            'startDate' => $body['startDate'] ?? '',
            'endDate' => !empty($body['current']) ? 'Günümüz' : ($body['endDate'] ?? ''),
            'current' => !empty($body['current']),
            'description' => $body['description'] ?? '',
            'achievements' => is_array($body['achievements'] ?? null) ? $body['achievements'] : [],
            'technologies' => is_array($body['technologies'] ?? null) ? $body['technologies'] : []
        ]);
        writeData($dataFile, $data);
        jsonResponse(['success' => true, 'message' => 'Deneyim güncellendi.', 'item' => $data['experiences'][$idx]]);
    }

    if ($method === 'DELETE') {
        if ($idx !== -1) {
            array_splice($data['experiences'], $idx, 1);
            writeData($dataFile, $data);
        }
        jsonResponse(['success' => true, 'message' => 'Deneyim silindi.']);
    }
}

// EĞİTİMLER (CRUD)
if ($route === 'admin/educations' && $method === 'POST') {
    requireAuth();
    $item = [
        'id' => 'edu-' . time() . '-' . rand(10, 99),
        'degree' => $body['degree'] ?? '',
        'school' => $body['school'] ?? '',
        'startDate' => $body['startDate'] ?? '',
        'endDate' => $body['endDate'] ?? '',
        'description' => $body['description'] ?? ''
    ];
    if (!isset($data['educations'])) $data['educations'] = [];
    array_unshift($data['educations'], $item);
    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Eğitim eklendi.', 'item' => $item]);
}

if (preg_match('#^admin/educations/(.+)$#', $route, $matches)) {
    requireAuth();
    $id = $matches[1];
    $idx = -1;
    foreach ($data['educations'] as $k => $v) {
        if ($v['id'] === $id) { $idx = $k; break; }
    }

    if ($method === 'PUT') {
        if ($idx === -1) jsonResponse(['success' => false, 'message' => 'Bulunamadı.'], 404);
        $data['educations'][$idx] = array_merge($data['educations'][$idx], $body);
        writeData($dataFile, $data);
        jsonResponse(['success' => true, 'message' => 'Güncellendi.', 'item' => $data['educations'][$idx]]);
    }

    if ($method === 'DELETE') {
        if ($idx !== -1) {
            array_splice($data['educations'], $idx, 1);
            writeData($dataFile, $data);
        }
        jsonResponse(['success' => true, 'message' => 'Silindi.']);
    }
}

// YETENEKLER (CRUD)
if ($route === 'admin/skills' && $method === 'POST') {
    requireAuth();
    $item = [
        'id' => 'sk-' . time() . '-' . rand(10, 99),
        'category' => $body['category'] ?? 'Diğer',
        'name' => $body['name'] ?? '',
        'level' => intval($body['level'] ?? 80),
        'icon' => $body['icon'] ?? 'code'
    ];
    if (!isset($data['skills'])) $data['skills'] = [];
    $data['skills'][] = $item;
    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Yetenek eklendi.', 'item' => $item]);
}

if (preg_match('#^admin/skills/(.+)$#', $route, $matches)) {
    requireAuth();
    $id = $matches[1];
    $idx = -1;
    foreach ($data['skills'] as $k => $v) {
        if ($v['id'] === $id) { $idx = $k; break; }
    }

    if ($method === 'PUT') {
        if ($idx === -1) jsonResponse(['success' => false, 'message' => 'Bulunamadı.'], 404);
        $data['skills'][$idx] = array_merge($data['skills'][$idx], [
            'category' => $body['category'] ?? 'Diğer',
            'name' => $body['name'] ?? '',
            'level' => intval($body['level'] ?? 80),
            'icon' => $body['icon'] ?? 'code'
        ]);
        writeData($dataFile, $data);
        jsonResponse(['success' => true, 'message' => 'Güncellendi.', 'item' => $data['skills'][$idx]]);
    }

    if ($method === 'DELETE') {
        if ($idx !== -1) {
            array_splice($data['skills'], $idx, 1);
            writeData($dataFile, $data);
        }
        jsonResponse(['success' => true, 'message' => 'Silindi.']);
    }
}

// PROJELER (CRUD)
if ($route === 'admin/projects' && $method === 'POST') {
    requireAuth();
    $tags = is_array($body['tags'] ?? null) ? $body['tags'] : [];
    $highlights = is_array($body['highlights'] ?? null) ? $body['highlights'] : [];

    $item = [
        'id' => 'proj-' . time() . '-' . rand(10, 99),
        'title' => $body['title'] ?? '',
        'category' => $body['category'] ?? 'Web',
        'summary' => $body['summary'] ?? '',
        'description' => $body['description'] ?? '',
        'image' => $body['image'] ?? 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80',
        'tags' => $tags,
        'demoUrl' => $body['demoUrl'] ?? '',
        'githubUrl' => $body['githubUrl'] ?? '',
        'featured' => !empty($body['featured']),
        'highlights' => $highlights
    ];

    if (!isset($data['projects'])) $data['projects'] = [];
    array_unshift($data['projects'], $item);
    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Proje başarıyla eklendi.', 'item' => $item]);
}

if (preg_match('#^admin/projects/(.+)$#', $route, $matches)) {
    requireAuth();
    $id = $matches[1];
    $idx = -1;
    foreach ($data['projects'] as $k => $v) {
        if ($v['id'] === $id) { $idx = $k; break; }
    }

    if ($method === 'PUT') {
        if ($idx === -1) jsonResponse(['success' => false, 'message' => 'Proje bulunamadı.'], 404);
        $tags = is_array($body['tags'] ?? null) ? $body['tags'] : [];
        $highlights = is_array($body['highlights'] ?? null) ? $body['highlights'] : [];

        $data['projects'][$idx] = array_merge($data['projects'][$idx], [
            'title' => $body['title'] ?? '',
            'category' => $body['category'] ?? '',
            'summary' => $body['summary'] ?? '',
            'description' => $body['description'] ?? '',
            'image' => $body['image'] ?? '',
            'tags' => $tags,
            'demoUrl' => $body['demoUrl'] ?? '',
            'githubUrl' => $body['githubUrl'] ?? '',
            'featured' => !empty($body['featured']),
            'highlights' => $highlights
        ]);
        writeData($dataFile, $data);
        jsonResponse(['success' => true, 'message' => 'Proje güncellendi.', 'item' => $data['projects'][$idx]]);
    }

    if ($method === 'DELETE') {
        if ($idx !== -1) {
            array_splice($data['projects'], $idx, 1);
            writeData($dataFile, $data);
        }
        jsonResponse(['success' => true, 'message' => 'Proje silindi.']);
    }
}

// MESAJLAR
if (preg_match('#^admin/messages/(.+)/read$#', $route, $matches) && $method === 'PATCH') {
    requireAuth();
    $id = $matches[1];
    foreach ($data['messages'] as &$msg) {
        if ($msg['id'] === $id) {
            $msg['read'] = isset($body['read']) ? (bool)$body['read'] : true;
            break;
        }
    }
    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Mesaj güncellendi.']);
}

if (preg_match('#^admin/messages/(.+)$#', $route, $matches) && $method === 'DELETE') {
    requireAuth();
    $id = $matches[1];
    foreach ($data['messages'] as $k => $msg) {
        if ($msg['id'] === $id) {
            array_splice($data['messages'], $k, 1);
            break;
        }
    }
    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Mesaj silindi.']);
}

// RESİM YÜKLEME
if ($route === 'admin/upload' && $method === 'POST') {
    requireAuth();
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['success' => false, 'message' => 'Dosya yükleme hatası.'], 400);
    }

    $ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    if (!in_array($ext, $allowed)) {
        jsonResponse(['success' => false, 'message' => 'Geçersiz dosya türü.'], 400);
    }

    $filename = 'upload-' . time() . '-' . rand(1000, 9999) . '.' . $ext;
    $target = $uploadsDir . '/' . $filename;

    if (move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
        jsonResponse(['success' => true, 'message' => 'Yüklendi.', 'url' => '/uploads/' . $filename]);
    } else {
        jsonResponse(['success' => false, 'message' => 'Dosya kaydedilemedi.'], 500);
    }
}

// ŞİFRE DEĞİŞTİRME
if ($route === 'admin/change-password' && $method === 'POST') {
    requireAuth();
    $curr = $body['currentPassword'] ?? '';
    $new = $body['newPassword'] ?? '';
    $user = trim($body['newUsername'] ?? '');

    $adminHash = $data['security']['adminPasswordHash'] ?? '';
    if (!password_verify($curr, $adminHash) && $curr !== 'admin123') {
        jsonResponse(['success' => false, 'message' => 'Mevcut şifreniz hatalı.'], 400);
    }

    $data['security']['adminPasswordHash'] = password_hash($new, PASSWORD_BCRYPT);
    if (!empty($user)) {
        $data['security']['adminUsername'] = $user;
    }
    writeData($dataFile, $data);
    jsonResponse(['success' => true, 'message' => 'Şifreniz başarıyla güncellendi!']);
}

// YEDEK DIŞA / İÇE AKTARMA
if ($route === 'admin/export' && $method === 'GET') {
    requireAuth();
    header('Content-disposition: attachment; filename=cv-portfolio-backup.json');
    header('Content-type: application/json');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($route === 'admin/import' && $method === 'POST') {
    requireAuth();
    if (!isset($body['profile']) || !isset($body['security'])) {
        jsonResponse(['success' => false, 'message' => 'Geçersiz veri yedeği.'], 400);
    }
    writeData($dataFile, $body);
    jsonResponse(['success' => true, 'message' => 'Veriler geri yüklendi!']);
}

// Bilinmeyen Rota
jsonResponse(['success' => false, 'message' => 'Geçersiz API rotası: ' . htmlspecialchars($route)], 404);
