<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');

// Guard: Must be logged in
if (!isset($_SESSION['logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit();
}

// Guard: File must exist and have no upload errors
if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No file uploaded or upload error.']);
    exit();
}

$file = $_FILES['avatar'];
$maxSize = 2 * 1024 * 1024; // 2MB limit

if ($file['size'] > $maxSize) {
    echo json_encode(['success' => false, 'message' => 'File is too large. Max 2MB.']);
    exit();
}

// Validate file type
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
$mimeType = mime_content_type($file['tmp_name']);

if (!in_array($mimeType, $allowedTypes)) {
    echo json_encode(['success' => false, 'message' => 'Invalid file type. Only JPG, PNG, and WebP are allowed.']);
    exit();
}

// Ensure the uploads directory exists
$uploadDir = '../uploads/avatars/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename using user ID and timestamp
$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = 'user_' . $_SESSION['user_id'] . '_' . time() . '.' . $ext;
$targetPath = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    $publicPath = 'uploads/avatars/' . $filename;
    
    // Update Database
    $stmt = $pdo->prepare("UPDATE users SET avatar = ? WHERE id = ?");
    $stmt->execute([$publicPath, $_SESSION['user_id']]);
    
    echo json_encode([
        'success' => true, 
        'message' => 'Avatar updated successfully!',
        'avatar' => $publicPath
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Failed to save file on the server.']);
}
