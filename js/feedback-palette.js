// Image that the user will select
var image;
// Image canvas jQuery object
var imageCanvas = $('#image-canvas');
// Parent jQuery object (to get its size)
var imageCanvasParent = $('#image-canvas-parent');
// Canvas context
var imageCxt = imageCanvas[0].getContext("2d");
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

// Hides make palette button until we have an image
$(document).ready(function () {
    $('#go-button').hide();
});

// Clear Guillotine from image and cancel zoom
function clearCanvas() {
    // Remove guillotine if it was there
    imageCanvas.guillotine('remove');
    // If we're currently zooming in, stop
    zoomCancel = true;
    // Reset canvas scale
    imageCanvas.css('transform', '');
}

// Gets image from user, displays it, and initiates cropping via Guillotine
let imgInput = document.getElementById('image-input');
imgInput.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
        // Reset effects on canvas
        clearCanvas();
        imageCanvas.hide();

        // Gets the (first) image the user selected
        let imageFile = e.target.files[0];

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
                imageCanvas.guillotine('center');
                imageCanvas.show();
                $('#go-button').show();
            }
        }
    }
});

// Crops the image and starts iteratively zooming in
$('#go-button').click(function () {
    // Gets crop data from Guillotine and resets things
    let cropData = imageCanvas.guillotine('getData');
    clearCanvas()
    imageCanvas.hide();
    $('#go-button').hide();

    // Resize canvas so that it will crop properly, but scale it so that it will display properly
    // (This seemingly unnecessary complexity makes sure that results will be the same regardless of viewport size)
    imageCanvas[0].width = cropWidth;
    imageCanvas[0].height = cropWidth;
    imageCanvas.css({
        'transform-origin': 'top left',
        'transform': 'scale(' + (imageCanvasParent.width() / imageCanvas[0].width) + ')',
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
    createImageBitmap(imageCanvas[0], cropWidth * insetFactor, cropHeight * insetFactor, cropWidth / zoomFactor, cropWidth / zoomFactor, {
        resizeWidth: cropWidth,
        resizeHeight: cropHeight,
    }).then(function (zoomBitmap) {
        imageCxt.drawImage(zoomBitmap, 0, 0);
        requestAnimationFrame(zoomAndDraw);
    });
}