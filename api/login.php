<?php
/**
 * login.php - User Login API
 *
 * POST /api/login.php
 * Body (JSON): { email, password }
 *
 * Returns:
 *  { success, message, user: { id, name, email, role, auth_provider } }
 *
 * Session is started; user data stored in $_SESSION.
 * A simple token (session ID) is returned for frontend storage.
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

$email    = trim($input['email']    ?? '');
$password = $input['password']      ?? '';

// ── Backend Validation ───────────────────────────────────────────
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please provide a valid email address.']);
    exit();
}

if (empty($password)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Password is required.']);
    exit();
}

// ── Fetch User by Email ──────────────────────────────────────────
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND auth_provider = 'manual' LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

// Generic error to prevent user enumeration
if (!$user) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    exit();
}

// ── Verify Password ──────────────────────────────────────────────
if (!password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    exit();
}

// ── Create Session ───────────────────────────────────────────────
session_regenerate_id(true); // Prevent session fixation

$_SESSION['user_id']       = $user['id'];
$_SESSION['user_name']     = $user['name'];
$_SESSION['user_email']    = $user['email'];
$_SESSION['user_role']     = $user['role'];
$_SESSION['auth_provider'] = $user['auth_provider'];
$_SESSION['logged_in']     = true;

// ── Return Success ───────────────────────────────────────────────
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Login successful! Redirecting to dashboard...',
    'token'   => session_id(),   // Frontend uses this to validate sessions
    'user'    => [
        'id'            => (int) $user['id'],
        'name'          => $user['name'],
        'email'         => $user['email'],
        'role'          => $user['role'],
        'auth_provider' => $user['auth_provider'],
        'avatar'        => $user['avatar'] ?? null
    ]
]);
