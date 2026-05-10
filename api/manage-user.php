<?php
/**
 * manage-user.php - Admin action API
 *
 * POST /api/manage-user.php
 * Body: { action: 'delete' | 'transfer_admin', target_id: 123 }
 */

session_start();
require_once 'db.php';

header('Content-Type: application/json');

// 1. Guard: Must be logged in as admin
if (!isset($_SESSION['logged_in']) || $_SESSION['user_role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized. Only admins can perform this action.']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';
$target_id = $input['target_id'] ?? null;

if (!$target_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request data.']);
    exit();
}

// 2. Guard: Cannot perform action on yourself
if ($target_id == $_SESSION['user_id']) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'You cannot manage your own permissions this way.']);
    exit();
}

// ── Action: Delete User ─────────────────────────────────────────
if ($action === 'delete') {
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    if ($stmt->execute([$target_id])) {
        echo json_encode(['success' => true, 'message' => 'User account permanently deleted.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete user.']);
    }
    exit();
}

// ── Action: Transfer Admin Rights ───────────────────────────────
if ($action === 'transfer_admin') {
    try {
        $pdo->beginTransaction();
        
        // Demote current admin
        $stmt1 = $pdo->prepare("UPDATE users SET role = 'user' WHERE id = ?");
        $stmt1->execute([$_SESSION['user_id']]);
        
        // Promote target user
        $stmt2 = $pdo->prepare("UPDATE users SET role = 'admin' WHERE id = ?");
        $stmt2->execute([$target_id]);
        
        $pdo->commit();
        
        // Update current session since the user is no longer an admin
        $_SESSION['user_role'] = 'user';
        
        echo json_encode(['success' => true, 'message' => 'Admin rights transferred successfully. You are now a Standard User.']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Database error during transfer.']);
    }
    exit();
}

// Unknown action
http_response_code(400);
echo json_encode(['success' => false, 'message' => 'Unknown action.']);
exit();
