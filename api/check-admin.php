<?php
/**
 * check-admin.php - Check if an admin already exists
 * GET /api/check-admin.php
 * Returns: { adminExists: true/false }
 */
require_once 'db.php';
header('Content-Type: application/json');

$stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'admin'");
$stmt->execute();
$count = (int) $stmt->fetchColumn();

echo json_encode(['adminExists' => $count > 0]);
