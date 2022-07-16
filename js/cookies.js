// Determines the correct domain name (dependent on whether on local server or not)
var domainName = window.location.hostname;
let domainParts = domainName.split(".");
if (domainParts[domainParts.length - 1] === "com") {
    domainName = domainParts.slice(-2).join(".");
}

// Sets a cookie with the given name and value (expires in one year)
// This cookie is valid for the root domain and all subdomains
function setCookie(name, value) {
    const yearFromNow = new Date();
    yearFromNow.setFullYear(yearFromNow.getFullYear() + 1);
    let expires = "expires=" + yearFromNow.toUTCString();
    document.cookie = `${name}=${value}; ${expires}; path=/; domain=${domainName};`;
}

// Gets the value for the cookie with the given name, returning "" if not found
function getCookie(name) {
    let nameEq = name + "=";
    let cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) == " ") {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(nameEq) == 0) {
            return cookie.substring(nameEq.length, cookie.length);
        }
    }
    return "";
}