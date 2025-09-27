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

// Get camera number from GET request
$cameraNumber = $_GET["camera"];

// Prepare and execute SQL query
$stmt = $conn->prepare("SELECT url FROM camera_urls WHERE camera_number = ?");
$stmt->bind_param("i", $cameraNumber);
$stmt->execute();
$stmt->bind_result($url);

// Fetch and return the URL
if ($stmt->fetch()) {
    echo $url;
}

$stmt->close();
$conn->close();


xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
        console.log(xhr.responseText); // Log the response
        if (xhr.status === 200) {
            var cameraUrl = xhr.responseText;
            var iframe = document.getElementById("cameraFrame" + i);
            if (cameraUrl) {
                iframe.src = cameraUrl;
            }
        }
    }
};

?>