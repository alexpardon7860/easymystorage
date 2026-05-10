<?php
/**
 * users.php - Fetch All Users API
 *
 * GET /api/users.php              → all users
 * GET /api/users.php?role=admin   → only admins
 * GET /api/users.php?provider=google → only Google users
 * GET /api/users.php?search=john  → search by name/email
 *
 * Returns:
 *  { success, count, users: [...] }
 *
 * Note: passwords are NEVER returned.
 */

session_start();
require_once 'db.php';

// ── Only accept GET ──────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed.']);
    exit();
}

// ── Auth Guard (must be logged in) ──────────────────────────────
// Uncomment in production for stricter access control
// if (empty($_SESSION['logged_in'])) {
//     http_response_code(401);
//     echo json_encode(['success' => false, 'message' => 'Unauthorized. Please log in.']);
//     exit();
// }

// ── Build Dynamic Query ───────────────────────────────────────────
$conditions = [];
$params     = [];

// Filter by role
$role = $_GET['role'] ?? '';
if (!empty($role) && in_array($role, ['admin', 'user'])) {
    $conditions[] = "role = ?";
    $params[]     = $role;
}

// Filter by auth provider
$provider = $_GET['provider'] ?? '';
if (!empty($provider) && in_array($provider, ['google', 'manual'])) {
    $conditions[] = "auth_provider = ?";
    $params[]     = $provider;
}

// Search by name or email (case-insensitive LIKE)
$search = trim($_GET['search'] ?? '');
if (!empty($search)) {
    $conditions[] = "(name LIKE ? OR email LIKE ?)";
    $like         = '%' . $search . '%';
    $params[]     = $like;
    $params[]     = $like;
}

// Build WHERE clause
$whereClause = '';
if (!empty($conditions)) {
    $whereClause = 'WHERE ' . implode(' AND ', $conditions);
}

$sql  = "SELECT id, name, email, role, auth_provider, avatar, google_id, created_at, updated_at
         FROM users {$whereClause}
         ORDER BY created_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$users = $stmt->fetchAll();

// ── Sanitize output ────────────────────────────────────────────
foreach ($users as &$user) {
    $user['id'] = (int) $user['id'];
    // Don't expose google_id or password in listing
    unset($user['google_id']);
}
unset($user);

http_response_code(200);
echo json_encode([
    'success' => true,
    'count'   => count($users),
    'users'   => $users
]);
