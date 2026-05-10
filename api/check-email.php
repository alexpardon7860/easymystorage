<?php
/**
 * check-email.php - Real-time email availability check
 * GET /api/check-email.php?email=test@test.com
 * Returns: { available: true/false }
 */
require_once 'db.php';

header('Content-Type: application/json');

$email = trim($_GET['email'] ?? '');

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['available' => true]); // don't flag invalid format here
    exit();
}

$stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = ?");
$stmt->execute([$email]);
$exists = (int) $stmt->fetchColumn() > 0;

echo json_encode(['available' => !$exists]);
