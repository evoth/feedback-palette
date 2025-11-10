// CSS hrefs for different themes
const themeLightHref = "/css/theme-light.css";
const themeDarkHref = "/css/theme-dark.css";

// Default theme
const defaultTheme = "light";

// Theme transition duration
const themeTransitionDuration = 600;

// Toggles the theme, using the cookie value to find current theme
function toggleTheme() {
    let themeName = getCookie("theme");
    if (themeName === "light") {
        setTheme("dark");
    } else {
        setTheme("light");
    }

    // Prevents browser from trying to redirect
    return false;
}

// Toggles theme when the button is pressed
$(document).on("click", "#theme-button", function () {
    toggleTheme();
});

// Sets the theme and theme cookie to the given theme
function setTheme(themeName, doTransition = true) {
    // Fades the entire page out, switches the css, and fades back in
    if (doTransition) {
        $("html").fadeOut(themeTransitionDuration / 2)
    }
    $("html").promise().done(function () {
        if (themeName === "light") {
            $("#theme-css").attr("href", themeLightHref);
        } else {
            $("#theme-css").attr("href", themeDarkHref);
        }
        setCookie("theme", themeName);
        if (doTransition) {
            $("html").fadeIn(themeTransitionDuration / 2);
        }
    });

    // Prevents browser from trying to redirect
    return false;
}

// Sets the theme based on the theme cookie, creating cookie if necessary
function setThemeFromCookie(doTransition = false) {
    let themeName = getCookie("theme");
    if (themeName === "") {
        themeName = defaultTheme;
        setCookie("theme", themeName);
    }
    setTheme(themeName, doTransition);
}

// Sets the theme once the document has loaded
document.addEventListener("DOMContentLoaded", function () {
    setThemeFromCookie();
});