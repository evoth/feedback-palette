# Feedback Palette
Get a color palette for a point in an image, courtesy of feedback loops and compression artifacts!

## Website
See it in action at https://palette.ethanvoth.com!

## Inspiration
One day, I was messing around in OBS, and I ended up making a feedback loop where the image was getting magnified each frame. To my surprise, instead of devolving into chaos or zooming in on a single color, a stable pattern emerged from the image. I suspect that this is a byproduct of a simple bilinear or bicubic interpolation algorithm.

## How it works
- Making a palette from an image
   1. The image is loaded and made draggable (using [Guillotine](https://github.com/matiasgali/guillotine)) so that you can position the center where you want.
   2. Once you've positioned the image, it's cropped and drawn onto an HTML canvas.
   3. Then, the program gets the current content of the canvas (the image) and enlarges it by 1%.
   4. Finally, it re-draws this larger version of the image onto the canvas.
   5. Steps 3-4 are repeated 60 times per second for 8.5 seconds (enough time for the image to stabilize). It's this iterative process of magnifying and re-encoding the image that produces the radial artifacts, though I'm not sure why or how.
- Getting colors from the palette image
   1. The program samples the color of a pixel for every 5 degrees along a circle around the image.
   2. For each pixel, it finds the nearest color to the pixel's color that has a name (using [Name that Color](https://chir.ag/projects/ntc/)).
   3. If any previous pixel's color had the same name, it adds the new color to the running list of RGB colors with that name. Otherwise, it stores the new name along with a new list for RGB colors with that name.
   4. Then, after all the pixels are done, it chooses a representative color for each name by averaging all the colors of the pixels that had been assigned to that name previously. A color is excluded if it only appeared once.
   5. Finally, it converts the colors to multiple formats (using [color-convert](https://github.com/Qix-/color-convert)) and, for each color, the program adds a new HTML element with all of the color's information to the page.

## Todo
- Favicon
- Custom 404 page
- Split Javascript into multiple files?
- const
- Colors of checkers svg should be dynamic in case I change the theme
- Make a script to update the HTML text from the README
- Link styling