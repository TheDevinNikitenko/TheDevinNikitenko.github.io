document.addEventListener("DOMContentLoaded", function() {
    const rssFeedUrl = "https://www.nhc.noaa.gov/nhc_at4.xml"; // RSS feed URL
    const feedContainer = document.getElementById("rss-feed");

    // Function to fetch RSS feed data
    async function fetchRSSFeed() {
        try {
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssFeedUrl)}`);
            const data = await response.json();
            const parser = new DOMParser();
            const rssDoc = parser.parseFromString(data.contents, "text/xml");

            // Log the entire XML document for debugging
            //console.log(rssDoc);
            
            displayRSSFeed(rssDoc);
        } catch (error) {
            console.error("Error fetching RSS feed:", error);
        }
    }

    // Function to extract and display RSS feed items
    function displayRSSFeed(rssDoc) {
        // Get the first <nhc:Cyclone> element
        const cyclone = rssDoc.getElementsByTagName("nhc:Cyclone")[0]; // Use getElementsByTagName for namespace

        if (cyclone) {
            // Extracting relevant data
            const center = cyclone.getElementsByTagName("nhc:center")[0]?.textContent || "N/A";
            const type = cyclone.getElementsByTagName("nhc:type")[0]?.textContent || "N/A";
            const name = cyclone.getElementsByTagName("nhc:name")[0]?.textContent || "N/A";
            const wallet = cyclone.getElementsByTagName("nhc:wallet")[0]?.textContent || "N/A";
            const atcf = cyclone.getElementsByTagName("nhc:atcf")[0]?.textContent || "N/A";
            const datetime = cyclone.getElementsByTagName("nhc:datetime")[0]?.textContent || "N/A";
            const movement = cyclone.getElementsByTagName("nhc:movement")[0]?.textContent || "N/A";
            const pressure = cyclone.getElementsByTagName("nhc:pressure")[0]?.textContent || "N/A";
            const wind = cyclone.getElementsByTagName("nhc:wind")[0]?.textContent.replace(" mph", "") || "N/A"; // Remove " mph"
            const headline = cyclone.getElementsByTagName("nhc:headline")[0]?.textContent || "N/A";

            var typeAbbr;

            if (type == "POTENTIAL TROPICAL CYCLONE") {
              typeAbbr = "PTC"
            } else if (type == "TROPICAL DEPRESSION") {
              typeAbbr = "TD"
            } else if (type == "TROPICAL STORM") {
              typeAbbr = "TS"
            } else if (type == "HURRICANE") {
                if (!isNaN(cycloneData.wind) && cycloneData.wind >= 74 && cycloneData.wind <= 95) {
                  typeAbbr = '1';
                } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 96 && cycloneData.wind <= 110) {
                  typeAbbr = '2';
                } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 111 && cycloneData.wind <= 129) {
                  typeAbbr = '3';
                } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 130 && cycloneData.wind <= 156) {
                  typeAbbr = '4';
                } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 157 && cycloneData.wind <= 300) {
                  typeAbbr = '5';
                };
            };

            // Store the data in variables
            const cycloneData = {
                center,
                type,
                name,
                wallet,
                atcf,
                datetime,
                movement,
                pressure,
                wind,
                headline
            };

            // Display the data in the console or on the webpage
            //console.log(cycloneData);

            document.getElementById("hcTitleCat").innerHTML = typeAbbr;
            document.getElementById("StormCatLevel").innerHTML = typeAbbr;
            document.getElementById("hurricaneNameLine1").innerHTML = type;
            document.getElementById("hurricaneNameLine2").innerHTML = name;
            document.getElementById("LatestAdvis").innerHTML = cycloneData.datetime; 
            document.getElementById("MaxSustainedWind").innerHTML = cycloneData.wind; 
            document.getElementById("MinimumPressure").innerHTML = cycloneData.pressure; 
            document.getElementById("StormMovement").innerHTML = cycloneData.movement; 

            /* HURRICANE SEARCH AND CATEGORIZER
            var hurricaneCat;
              if (!isNaN(cycloneData.wind) && cycloneData.wind >= 0 && cycloneData.wind <= 33) {
                hurricaneCat = "TD";
              } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 34 && cycloneData.wind <= 73) {
                hurricaneCat = "TS";
              } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 74 && cycloneData.wind <= 95) {
                hurricaneCat = '1';
              } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 96 && cycloneData.wind <= 110) {
                hurricaneCat = '2';
              } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 111 && cycloneData.wind <= 129) {
                hurricaneCat = '3';
              } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 130 && cycloneData.wind <= 156) {
                hurricaneCat = '4';
              } else if (!isNaN(cycloneData.wind) && cycloneData.wind >= 157 && cycloneData.wind <= 300) {
                hurricaneCat = '5';
              };
              */
              
        } else {
            console.log("No cyclone data found.");
        }
    }

    // Fetch the RSS feed
    fetchRSSFeed();
    setInterval(fetchRSSFeed, 600 * 1000);
});
