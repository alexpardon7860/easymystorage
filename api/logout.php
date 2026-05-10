<?php
/**
 * logout.php - Logout API
 *
 * POST /api/logout.php
 *
 * Destroys the server-side session.
 * Frontend should also clear localStorage on receipt.
 */

session_start();

// ── Destroy session cleanly ───────────────────────────────────────
$_SESSION = [];

// Remove the session cookie from browser
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

session_destroy();

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'You have been logged out successfully.'
]);
