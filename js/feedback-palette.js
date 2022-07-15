
// Drop zone for image
var imgDrop = $("#image-drop-overlay");
// Image canvas jQuery object
var imageCanvas = $("#image-canvas");
// Canvas context
var imageCxt = imageCanvas[0].getContext("2d");
// Image that the user will select
var image;
var imageFile;
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
const instructionsDone = "Take a look below to see the colors that were pulled from this image, or choose an option " +
    "above to try again.";

// Hides make palette and reset buttons until we have an image
$(document).ready(function () {
    $("#go-button").hide();
    $("#reset-button").hide();
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

// Gets image from user, displays it, and initiates cropping via Guillotine
function loadImage(file) {
    // Reset effects on canvas
    clearCanvas();
    imageCanvas.hide();

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
            $("#image-canvas-parent").css("background", "url('/img/checkers.svg') 0 0 / 12.5% 12.5%");
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

// Zoom into image by repeatedly magnifying and re-encoding it at about 60fps, stopping after a predetermined duration
function zoomAndDraw(timestamp) {
    // Checks to see if we should cancel or if our time is up
    if (zoomCancel || timestamp - zoomStart > zoomDuration) {
        if (!zoomCancel) {
            $("#instructions").text(instructionsDone);
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
        resizeWidth: cropWidth - 1, // Subtracting 1 fixed a sneaky bug that was plaguing me, but I don"t know why
        resizeHeight: cropHeight - 1,
    }).then(function (zoomBitmap) {
        imageCxt.drawImage(zoomBitmap, 0, 0);
        requestAnimationFrame(zoomAndDraw);
    });
}

// Shows drop overlay (allows pointer event so that it can detect drag)
function showImageDrop(e = null) {
    imgDrop.css({
        "pointer-events": "all",
        "opacity": "1",
    });
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