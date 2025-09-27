//Side Menu Alert List
const closeButton = document.getElementById('closeButton');
closeButton.addEventListener('click', closeSideMenu);

const menuButton = document.getElementById('menuButton');
menuButton.addEventListener('click', toggleSideMenu);

function toggleSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    sideMenu.style.right = sideMenu.style.right === '0px' ? '-300px' : '0px';
}

function closeSideMenu() {
    const sideMenu = document.getElementById('sideMenu');
    sideMenu.style.right = '-300px';
}