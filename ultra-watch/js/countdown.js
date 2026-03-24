//config
var countdownDate = new Date("Mar 27, 2026 16:00:00").getTime();
const countdownText = "COUNTDOWN TO ULTRA MIAMI 2026";
const expiredText = "";
//end of config

const countdownDiv = document.getElementById("countdownTime");
const countdownD = document.getElementById("countdown-D");
const countdownH = document.getElementById("countdown-H");
const countdownM = document.getElementById("countdown-M");
const countdownS = document.getElementById("countdown-S");

document.getElementById("countdown-title").innerHTML = countdownText;

var x = setInterval(function() {
    var now = new Date().getTime();

    var distance = countdownDate - now;

    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    countdownD.innerHTML = days;
    countdownH.innerHTML = hours;
    countdownM.innerHTML = minutes;
    countdownS.innerHTML = seconds;

    if (distance < 0 ){
        clearInterval(x);
        countdownDiv.innerHTML = expiredText;
    }
}, 1000);

