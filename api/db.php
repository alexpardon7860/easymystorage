<?php
/**
 * db.php - Database Connection
 * Establishes a secure PDO connection to MySQL.
 * All API files include this to get $pdo.
 */

// ── Configuration ──────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'myproject');
define('DB_USER', 'root');       // Change for production
define('DB_PASS', '');           // Change for production
define('DB_CHARSET', 'utf8mb4');

// ── CORS Headers (allow frontend JS to call APIs) ──────────────
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');          // Restrict to your domain in production
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ── PDO Connection ──────────────────────────────────────────────
function getDBConnection(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,   // Real prepared statements
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Never expose DB details in production
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed. Please try again later.'
            ]);
            exit();
        }
    }

    return $pdo;
}

// Create the global $pdo instance used across all API files
$pdo = getDBConnection();
