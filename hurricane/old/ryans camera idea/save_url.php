<?php
// Database connection setup
$servername = "localhost";
$username = "root";
$password = "pr9;q]4yG'~F2b(]";
$dbname = "cams";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Get data from POST request
$cameraNumber = $_POST["camera"];
$url = $_POST["url"];

// Prepare and execute SQL query to update the URL
$stmt = $conn->prepare("UPDATE camera_urls SET url = ? WHERE camera_number = ?");
$stmt->bind_param("si", $url, $cameraNumber);
$stmt->execute();

$stmt->close();
$conn->close();
?>