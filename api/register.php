<?php
/**
 * register.php - User Registration API
 *
 * POST /api/register.php
 * Body (JSON): { name, email, password, confirm_password, role }
 *
 * Business Rules:
 *  - All fields required
 *  - Valid email format
 *  - Password >= 6 chars, must match confirm_password
 *  - Role: "admin" | "user"
 *  - Only ONE admin allowed system-wide
 *  - No duplicate emails
 *  - Passwords hashed with PASSWORD_BCRYPT
 */

require_once 'db.php';

// ── Only accept POST ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed. Use POST.']);
    exit();
}

// ── Parse JSON body ──────────────────────────────────────────────
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON payload.']);
    exit();
}

// ── Extract & Sanitize ───────────────────────────────────────────
$name             = trim($input['name']             ?? '');
$email            = trim($input['email']            ?? '');
$password         = $input['password']              ?? '';
$confirm_password = $input['confirm_password']      ?? '';
$role             = strtolower(trim($input['role']  ?? 'user'));

// ── Backend Validation ───────────────────────────────────────────
$errors = [];

if (empty($name)) {
    $errors[] = 'Full name is required.';
} elseif (strlen($name) < 2) {
    $errors[] = 'Full name must be at least 2 characters.';
}

if (empty($email)) {
    $errors[] = 'Email address is required.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Please enter a valid email address.';
}

if (empty($password)) {
    $errors[] = 'Password is required.';
} elseif (strlen($password) < 6) {
    $errors[] = 'Password must be at least 6 characters long.';
}

if ($password !== $confirm_password) {
    $errors[] = 'Passwords do not match.';
}

if (!in_array($role, ['admin', 'user'])) {
    $errors[] = 'Role must be either "admin" or "user".';
}

if (!empty($errors)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
    exit();
}

// ── Business Logic: Admin Constraint ─────────────────────────────
if ($role === 'admin') {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    $stmt->execute();
    $adminCount = (int) $stmt->fetchColumn();

    if ($adminCount >= 1) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'message' => 'Admin already exists. Only one admin is allowed in the system.'
        ]);
        exit();
    }
}

// ── Check Duplicate Email ─────────────────────────────────────────
$stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
$stmt->execute([$email]);
$emailExists = (int) $stmt->fetchColumn();

if ($emailExists > 0) {
    http_response_code(409);
    echo json_encode([
        'success' => false,
        'message' => 'An account with this email address already exists.'
    ]);
    exit();
}

// ── Hash Password & Auto-Generate Avatar ──────────────────────────
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

// Generate random Dicebear avatar
$styles = ['bottts', 'avataaars', 'adventurer', 'micah', 'croodles', 'identicon'];
$randomStyle = $styles[array_rand($styles)];
$seed = urlencode($name . rand(1000, 9999));
$avatarUrl = "https://api.dicebear.com/7.x/{$randomStyle}/svg?seed={$seed}&backgroundColor=112240";

$stmt = $pdo->prepare("
    INSERT INTO users (name, email, password, role, auth_provider, avatar, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'manual', ?, NOW(), NOW())
");

try {
    $stmt->execute([$name, $email, $hashedPassword, $role, $avatarUrl]);
    $userId = $pdo->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Account created successfully! You can now log in.',
        'user'    => [
            'id'    => (int) $userId,
            'name'  => $name,
            'email' => $email,
            'role'  => $role
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Registration failed. Please try again.'
    ]);
}
