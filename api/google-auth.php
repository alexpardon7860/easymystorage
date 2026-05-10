<?php
/**
 * google-auth.php - Google OAuth Authentication API
 *
 * POST /api/google-auth.php
 * Body (JSON): { google_id, name, email, avatar }
 *
 * Flow:
 *  1. Receive Google profile data from frontend (after Google One Tap / popup)
 *  2. If user with this google_id or email exists → log them in
 *  3. Else → create new user (role defaults to "user")
 *  4. Start session, return user data
 *
 * NOTE: In production, verify the Google ID token server-side using
 *       Google's tokeninfo endpoint or the PHP google/apiclient library.
 *       This file shows the core flow; add token verification for hardened security.
 */

session_start();
require_once 'db.php';

// ── Only accept POST ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed.']);
    exit();
}

// ── Parse JSON body ──────────────────────────────────────────────
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON payload.']);
    exit();
}

$google_id = trim($input['google_id'] ?? '');
$name      = trim($input['name']      ?? '');
$email     = trim($input['email']     ?? '');
// Google picture is intentionally ignored — we auto-generate a DiceBear avatar instead

// ── Auto-generate DiceBear avatar for Google users ───────────────
$styles     = ['bottts', 'avataaars', 'adventurer', 'micah', 'croodles', 'identicon'];
$randStyle  = $styles[array_rand($styles)];
$seed       = urlencode($name . substr(md5($email), 0, 6));
$avatar     = "https://api.dicebear.com/7.x/{$randStyle}/svg?seed={$seed}&backgroundColor=112240";

// ── Validate received data ────────────────────────────────────────
if (empty($google_id) || empty($email) || empty($name)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Incomplete Google profile data received.']);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid email received from Google.']);
    exit();
}

// ── Check if user already exists (by google_id or email) ─────────
$stmt = $pdo->prepare("SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1");
$stmt->execute([$google_id, $email]);
$user = $stmt->fetch();

if ($user) {
    // ── Existing user: Update google_id if missing ────────────────
    if (empty($user['google_id'])) {
        $pdo->prepare("UPDATE users SET google_id = ?, auth_provider = 'google', updated_at = NOW() WHERE id = ?")
            ->execute([$google_id, $user['id']]);
    }
    $isNew = false;
} else {
    // ── New user: Create account (role always "user" for Google) ──
    $stmt = $pdo->prepare("
        INSERT INTO users (name, email, password, role, auth_provider, google_id, created_at, updated_at)
        VALUES (?, ?, NULL, 'user', 'google', ?, NOW(), NOW())
    ");
    $stmt->execute([$name, $email, $google_id]);
    $newId = $pdo->lastInsertId();

    // Re-fetch the new user record
    $user = $pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    $user->execute([$newId]);
    $user = $user->fetch();
    $isNew = true;
}

// ── Start Session ────────────────────────────────────────────────
session_regenerate_id(true);

$_SESSION['user_id']       = $user['id'];
$_SESSION['user_name']     = $user['name'];
$_SESSION['user_email']    = $user['email'];
$_SESSION['user_role']     = $user['role'];
$_SESSION['auth_provider'] = 'google';
$_SESSION['logged_in']     = true;

// ── Return Response ───────────────────────────────────────────────
http_response_code(200);
echo json_encode([
    'success'  => true,
    'is_new'   => $isNew,
    'message'  => $isNew
        ? 'Google account registered successfully! Welcome aboard.'
        : 'Google login successful! Redirecting...',
    'token'    => session_id(),
    'user'     => [
        'id'            => (int) $user['id'],
        'name'          => $user['name'],
        'email'         => $user['email'],
        'role'          => $user['role'],
        'auth_provider' => 'google',
        'avatar'        => $avatar
    ]
]);
