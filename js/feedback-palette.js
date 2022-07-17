
import convert from './color-convert-index.js';
import DeltaE from './delta-e-index.js';

// Drop zone for image
var imgDrop = $("#image-drop-overlay");
// Image canvas jQuery object
var imageCanvas = $("#image-canvas");
// Canvas context
var imageCxt = imageCanvas[0].getContext("2d");
// Image that the user will select
var image, imageFile;
// Whether to cancel zoom
var zoomCancel = true;
// Zoom start time and previous frame time
var zoomStart, zoomPrevious;

// The dimensions to which the image gets cropped (to standardize results)
const cropWidth = 2048;
const cropHeight = 2048;
// The amount by which the image is magnified each iteration
const zoomFactor = 1.01;
// Minimum frametime for zoom animation
const zoomFrametime = 16;
// Duration (in milliseconds) for which we zoom
const zoomDuration = 8500;

// Instructions
const instructionsCropImage = "Drag the image to position the crosshairs on the point that you want a palette for, " +
    "then press the \"Make palette\" button above.";
const instructionsMakingPalette = "Making palette...";
const instructionsDone = "Scroll down to see the colors that were pulled from this image, or choose an option above " +
    "to make another palette.";

// Fontawesome icon classes for copy and checkmark, respectively
const faCopy = "fa-solid fa-copy", faCheck = "fa-solid fa-check";
const valueCopied = "Copied!";

// Hides make palette and reset buttons and colors section until we have an image
$(document).ready(function () {
    $("#go-button").hide();
    $("#reset-button").hide();
    $("#download-button").hide();
    $("#colors").hide();
});

// Clear Guillotine from image and cancel zoom
function clearCanvas() {
    // Remove guillotine if it was there
    imageCanvas.guillotine("remove");
    // If we"re currently zooming in, stop
    zoomCancel = true;
    // Reset canvas scale
    imageCanvas.css({
        "width": "",
        "aspect-ratio": "",
    });
}

// Gets an SVG element by id, and returns a data URL representing it.
// It also sets the fill attribute of each child element to its computed CSS value.
function svgToUrl(id) {
    $("#" + id).children().each(function () {
        $(this).attr("fill", $(this).css("fill"));
    });
    let svgString = new XMLSerializer().serializeToString(document.getElementById(id));
    let svgBase64 = window.btoa(svgString);
    return "data:image/svg+xml;base64," + svgBase64;
}

// Gets image from user, displays it, and initiates cropping via Guillotine
function loadImage(file) {
    // Reset effects on canvas
    clearCanvas();
    imageCanvas.hide();

    // Hide and empty colors section
    $("#colors").hide();
    $("#color-cards>div").remove();
    $("#download-button").hide();

    // Populates instructions for image cropping
    $("#instructions").text(instructionsCropImage);

    // Sets filename text in custom file input
    $("#image-name").text(file.name);

    // Gets the (first) image the user selected
    imageFile = file;

    // Reads and load the file
    let reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onloadend = function (e) {

        // Creates image object and loads it from the file
        image = new Image();
        image.src = e.target.result;
        image.onload = function (ev) {

            // Resizes canvas to fit image
            imageCanvas[0].width = image.width;
            imageCanvas[0].height = image.height;

            // Draws the image on the canvas
            imageCxt.drawImage(image, 0, 0);

            // Figure out scale of image to crop in the style of object-fit cover
            let initScale;
            if (image.width / cropWidth < image.height / cropHeight) {
                initScale = cropWidth / image.width;
            } else {
                initScale = cropHeight / image.height;
            }

            // Makes it croppable using Guillotine
            imageCanvas.guillotine({
                width: cropWidth,
                height: cropHeight,
                init: { scale: initScale },
            });
            imageCanvas.guillotine("center");

            // Hide instructions, make checkered background, show crosshairs, show buttons
            imageCanvas.show();
            $("#image-instructions").hide();
            $("#image-canvas-parent").css("background", `url(${svgToUrl("checkers")}) 0 0 / 12.5% 12.5%`);
            $("#image-crosshairs").show();
            $("#go-button").show();
            $("#reset-button").show();
        }
    }
}

// Returns true if the object has a file and its type prefix equals "image"
function hasImage(data) {
    return data.files && data.files[0] && data.files[0].type.split("/")[0] === "image";
}

// Downloads the canvas as a png with the given name
function downloadImage(downloadName) {
    let tempLink = $(document.createElement('a'));
    tempLink.attr({
        "download": downloadName,
        "href": imageCanvas[0].toDataURL(),
    });
    tempLink[0].click();
}

// Loads image when a file is chosen via the file input
$(document).on("change", "#image-input", function (e) {
    if (hasImage(e.target)) {
        loadImage(e.target.files[0]);
    }
});

// Reloads the image
$("#reset-button").click(function () {
    loadImage(imageFile);
});

// Crops the image and starts iteratively zooming in
$("#go-button").click(function () {
    // Gets crop data from Guillotine and resets things
    let cropData = imageCanvas.guillotine("getData");
    clearCanvas()
    imageCanvas.hide();
    $("#image-crosshairs").hide();
    $("#go-button").hide();

    // Loading text
    $("#instructions").text(instructionsMakingPalette);

    // Resize canvas so that it will crop properly, but scale it so that it will display properly
    // (This seemingly unnecessary complexity makes sure that results will be the same regardless of viewport size)
    imageCanvas[0].width = cropWidth;
    imageCanvas[0].height = cropWidth;
    imageCanvas.css({
        "width": "100%",
        "aspect-ratio": "1",
    });

    // Draws the image on the canvas with the crop returned from Guillotine
    imageCxt.drawImage(image, cropData.x / cropData.scale, cropData.y / cropData.scale, cropWidth / cropData.scale,
        cropHeight / cropData.scale, 0, 0, cropWidth, cropHeight);
    imageCanvas.show();

    // Iteratively zooms in on image, re-encoding it each time; the resulting artifact is what makes the palette
    zoomCancel = false;
    zoomStart = performance.now();
    zoomPrevious = zoomStart;
    requestAnimationFrame(zoomAndDraw);
});

// Downloads the palette image
$("#download-button").click(function () {
    downloadImage("palette.png");
});

// Zoom into image by repeatedly magnifying and re-encoding it at about 60fps, stopping after a predetermined duration
function zoomAndDraw(timestamp) {
    // Checks to see if we should cancel or if our time is up
    if (zoomCancel || timestamp - zoomStart > zoomDuration) {
        if (!zoomCancel) {
            $("#instructions").text(instructionsDone);
            getAndShowColors();
        }
        zoomCancel = false;
        return;
    }

    // Return if less than 16 ms have passed (restricts framerate to about 60 fps)
    if (timestamp - zoomPrevious < zoomFrametime) {
        requestAnimationFrame(zoomAndDraw);
        return;
    }
    zoomPrevious = timestamp;

    // Gets image data from canvas, magnifies it, and creates a bitmap which it then draws
    let insetFactor = (1 - 1 / zoomFactor) * 0.5;
    createImageBitmap(imageCanvas[0], cropWidth * insetFactor, cropHeight * insetFactor, cropWidth / zoomFactor, cropHeight / zoomFactor, {
        resizeWidth: cropWidth - 1, // Subtracting 1 fixed a sneaky bug that was plaguing me, but I don't know why
        resizeHeight: cropHeight - 1,
    }).then(function (zoomBitmap) {
        imageCxt.drawImage(zoomBitmap, 0, 0);
        requestAnimationFrame(zoomAndDraw);
    });
}

// Gets an array of (R, G, B, A) for a pixel in an ImageData
function getPixel(imageData, x, y) {
    let index = (y * imageData.width + x) * 4;
    return imageData.data.slice(index, index + 4);
}

// Degrees to radians
function degToRad(deg) {
    return deg * (Math.PI / 180);
}

// Calculates the dE00 between two HEX values by first converting each color to a LAB color object, then using DeltaE
// (I may use this in the future, but as for right now I'm using it to evaluate the accuracy of my current method)
function deltaEHex(hex1, hex2) {
    let lab1Values = convert.hex.lab(hex1);
    let lab2Values = convert.hex.lab(hex2);
    let lab1 = { L: lab1Values[0], A: lab1Values[2], B: lab1Values[2] };
    let lab2 = { L: lab2Values[0], A: lab2Values[2], B: lab2Values[2] };
    return DeltaE.getDeltaE00(lab1, lab2);
}

// Extracts a palette of colors from the palette image and adds them as elements to the HTML
function getAndShowColors() {
    let imageData = imageCxt.getImageData(0, 0, cropWidth, cropHeight);
    let x, y;
    let colorData, colors = {};
    let hex, rgb, hsv, hsl;

    // Tests the color of a pixel for every 5 degrees along a circle half as wide as the canvas
    for (let deg = 0; deg < 360; deg += 5) {
        x = Math.round(cropWidth * (Math.cos(degToRad(deg)) * 0.25 + 0.5));
        y = Math.round(cropHeight * (Math.sin(degToRad(deg)) * 0.25 + 0.5));
        rgb = getPixel(imageData, x, y);
        // Only processes non-transparent colors
        if (rgb[3] == 255) {
            // Skips this color if its name is already contained in colors
            // colorData (format from ntc): [<rgb of nearest color>, <name of nearest color>, <color is exact match>]
            colorData = ntc.name(convert.rgb.hex(rgb));
            if (colorData[1] in colors) {
                colors[colorData[1]].push(rgb);
                continue;
            }

            // Creates array to store all rgb values that share this name
            colors[colorData[1]] = [rgb];
        }
    }

    // For each color name detected in image (from most to least frequent), finds the average rgb color of the name
    // represented in image. Then, adds a color card representing that color to the document Also, the color is only
    // shown if it appeared at least twice in the image.
    for (const [colorName, rgbValues] of Object.entries(colors).sort((a, b) => b[1].length - a[1].length)) {
        if (rgbValues.length < 2) {
            continue;
        }

        // Average rgb values for name
        let r = 0, g = 0, b = 0;
        for (const rgbValue of rgbValues) {
            r += rgbValue[0];
            g += rgbValue[1];
            b += rgbValue[2];
        }
        rgb = [Math.round(r / rgbValues.length), Math.round(g / rgbValues.length), Math.round(b / rgbValues.length)];

        // Converts color to the remaining formats
        hex = "#" + convert.rgb.hex(rgb);
        hsv = convert.rgb.hsv(rgb);
        hsl = convert.rgb.hsl(rgb);

        // Instantiate the table with the existing HTML tbody
        // and the row with the template
        var template = $("#color-card-template")[0].content.cloneNode(true);
        $(".color-card", template).css("background-color", hex);
        $(".color-card-name", template).text(colorName);
        $(".color-card-hex", template).text(hex.toLowerCase());
        $(".color-card-rgb", template).text(rgb.join(", "));
        $(".color-card-hsv", template).text(`${hsv[0]}, ${hsv[1]}%, ${hsv[2]}%`);
        $(".color-card-hsl", template).text(`${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%`);
        $("#color-cards").append(template);
    }

    // Shows colors section
    $("#colors").show();
    $("#download-button").show();
}

// Copies a value from a color card to the clipboard
$(document).on("click", ".color-card-copy", function () {
    let button = $(this);
    let copyText = button.closest("tr").find(">td").first().text();
    navigator.clipboard.writeText(copyText).then(function () {
        // Changes icon to checkmark, then back to copy after 2 seconds (also changes link title)
        let icon = button.find(">i").first();
        let originalTitle = button.attr("title");
        icon.attr("class", faCheck);
        button.attr("title", valueCopied);
        setTimeout(function () {
            icon.attr("class", faCopy);
            button.attr("title", originalTitle);
        }, 2000);
    });
});

// Shows drop overlay if the dragging object is a file (allows pointer event so that it can detect drag)
function showImageDrop(e = null) {
    if (e) {
        let dt = e.originalEvent.dataTransfer;
        if (dt.types && (dt.types.indexOf ? dt.types.indexOf("Files") != -1 : dt.types.contains("Files"))) {
            imgDrop.css({
                "pointer-events": "all",
                "opacity": "1",
            });
        }
    }
}

// Hides drop overlay (disables pointer events so that it doesn't interfere with page)
function hideImageDrop(e = null) {
    imgDrop.css({
        "pointer-events": "none",
        "opacity": "0",
    });
}

// Prevents the default behavior and shows copy effect if not already doing so
function allowDrag(e) {
    e.originalEvent.dataTransfer.dropEffect = "copy";
    e.preventDefault();
}

// Triggered when user first drags a file into the window
$(window).on("dragenter", showImageDrop);

// Triggered during the drag
$(document).on("dragenter", "#image-drop-overlay", allowDrag);
$(document).on("dragover", "#image-drop-overlay", allowDrag);

// Triggered when user is no longer dragging a file over the drop zone
$(document).on("dragleave", "#image-drop-overlay", hideImageDrop);

// When a file is dropped, checks if it is an image; if so, loads the image
$(document).on("drop", "#image-drop-overlay", function (e) {
    e.preventDefault();
    hideImageDrop();

    if (hasImage(e.originalEvent.dataTransfer)) {
        loadImage(e.originalEvent.dataTransfer.files[0]);
    } else {
        alert("Please use an image file.")
    }
});