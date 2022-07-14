# Feedback Palette
Get a palette of colors for a point in an image by using a feedback loop of repeated magnifying and encoding.

## Todo
- Implement automatic detection for when a palette is finished using something like https://github.com/mapbox/pixelmatch
- Automatically pick a palette of colors from the result image
   - Pick pixels in a circle, and use a color / angle threshold to add new colors
   - Maybe have a visual indicator for where it got the color, and vice versa (hovering over sector in palette image will highlight the color in palette)
- Improve webpage design
- General interface improvements
   - Reset button
   - Clear image button
   - Show and hide buttons at correct times
   - Drag and drop support
- Find a better, more responsive way to scale the canvas (right now it just sets the scale one time)
- Custom 404 page