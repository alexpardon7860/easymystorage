<?php
/**
 * update-avatar-url.php - Save a generated Avatar URL
 */
session_start();
require_once 'db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$url = $input['url'] ?? null;

if (!$url) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No URL provided.']);
    exit();
}

try {
    $stmt = $pdo->prepare("UPDATE users SET avatar = ? WHERE id = ?");
    $stmt->execute([$url, $_SESSION['user_id']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Avatar generated successfully!',
        'avatar' => $url
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error while saving avatar.']);
}
