document.addEventListener('DOMContentLoaded', function() {
    const url = "https://corsproxy.io/?https://www.nhc.noaa.gov/index-at.xml";

    // Fetch the XML data
    fetch(url)
        .then(response => response.text())
        .then(data => {
            // Parse the XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");

            // Extract information from the XML
            const forecaster = xmlDoc.getElementsByTagName("title")[0].textContent;
            const advisoryNumber = xmlDoc.getElementsByTagName("wmo_txt")[0].textContent;
            const advisoryText = xmlDoc.getElementsByTagName("description")[0].textContent;

            // Create HTML elements to display the information
            const contentDiv = document.getElementById('content');

            const forecasterElement = document.createElement('div');
            forecasterElement.textContent = "Forecaster: " + forecaster;

            const advisoryNumberElement = document.createElement('div');
            advisoryNumberElement.textContent = "Advisory Number: " + advisoryNumber;

            const advisoryTextElement = document.createElement('div');
            advisoryTextElement.textContent = advisoryText;

            // Append the elements to the content div
            contentDiv.appendChild(forecasterElement);
            contentDiv.appendChild(advisoryNumberElement);
            contentDiv.appendChild(advisoryTextElement);
        })
        .catch(error => console.error('Error:', error));
});

document.addEventListener('DOMContentLoaded', function() {
    const url = "https://corsproxy.io/?https://www.nhc.noaa.gov/index-at.xml";

    // Fetch the XML data
    fetch(url)
        .then(response => response.text())
        .then(data => {
            console.log(data);  // Log the received XML data for inspection

            // Parse the XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data, "text/xml");

            console.log(xmlDoc);  // Log the parsed XML document for inspection

            // Extract information from the XML
            const forecaster = xmlDoc.querySelector("description");
            const advisoryNumber = xmlDoc.querySelector("wmo_txt");
            const advisoryText = xmlDoc.querySelector("summary");

            console.log(forecaster, advisoryNumber, advisoryText);  // Log the selected elements for inspection
        })
        .catch(error => console.error('Error:', error));
});
