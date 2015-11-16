var g_xPixels = 300;
var g_yPixels = 300;
var g_renderScale = 5;

var g_scale = 1;

// ----------------------------------------------------------------------------

// Get a handle for the canvases in the document.

// The image canvas acts as an off-screen buffer for the
// images drawn by the turtle. The turtle itself is drawn
// in the visible turtle canvas, which is composited with
// the image canvas. This allows us to redraw the
// turtle (triangle) without messing up the previously
// drawn graphics.
var imageCanvas = $('#imagecanvas')[0];
var imageContext = imageCanvas.getContext('2d');
var turtleCanvas = $('#turtlecanvas')[0];
var turtleContext = turtleCanvas.getContext('2d');

// initialise the state of the turtle
var turtle = undefined;

function initialise() {
   turtle = { pos: {         // position in turtle coordinates
                 x: 0,
                 y: 0
              },
              angle: 0,      // angle in degrees in turtle space
              penDown: true, // is the turtle pen down (or up)?
              width: 1,      // width of the line drawn by the turtle
              visible: true, // is the turtle visible?
              redraw: true,  // do we redraw the image when the turtle moves?
              wrap: true,    // do we wrap the turtle on the boundaries of the canvas?
              // colour of the line drawn by the turtle
              colour: {r: 0, g: 0, b: 0, a: 1},
            };
   // set the image context and turtle context state to the default values
   imageContext.lineWidth = turtle.width;
   imageContext.strokeStyle = "black";
   imageContext.globalAlpha = 1;
   imageContext.textAlign = "center";
   imageContext.textBaseline = "middle";
   // the turtle takes precedence when compositing
   turtleContext.globalCompositeOperation = 'destination-over';
}

// Draw the turtle and the current image if redraw is true.
// For complicated drawings it is much faster to turn redraw off.
function drawIf() {
   if (turtle.redraw) draw();
}

// Use canvas centered coordinates facing upwards.
function centerCoords (context) {
   var width = context.canvas.width;
   var height = context.canvas.height;
   context.translate(width/2, height/2);
   context.transform(1, 0, 0, -1, 0, 0);
}

// Draw the turtle and the current image.
function draw() {
   clearContext(turtleContext);
   if (turtle.visible) {
      var x = turtle.pos.x;
      var y = turtle.pos.y;
      var w = 10;
      var h = 15;
      turtleContext.save();
      // Use canvas centered coordinates facing upwards.
      centerCoords(turtleContext);
      // Move the origin to the turtle center.
      turtleContext.translate(x, y);
      // Rotate about the center of the turtle.
      turtleContext.rotate(-turtle.angle);
      // Move the turtle back to its position.
      turtleContext.translate(-x, -y);
      // draw the turtle icon (a green triangle).
      turtleContext.beginPath();
      turtleContext.moveTo(x - w/2, y);
      turtleContext.lineTo(x + w/2, y);
      turtleContext.lineTo(x, y + h);
      turtleContext.closePath();
      turtleContext.fillStyle = "green";
      turtleContext.fill();
      turtleContext.restore();
   }
   // Make a composite of the turtle canvas and the image canvas.
   turtleContext.drawImage(imageCanvas, 0, 0, g_xPixels, g_yPixels, 0, 0, g_xPixels, g_yPixels);
}

// Clear the display, don't move the turtle.
function clear() {
   clearContext(imageContext);
   drawIf();
}

function clearContext(context) {
   context.save();
   context.setTransform(1,0,0,1,0,0);
   context.clearRect(0,0,context.canvas.width,context.canvas.height);
   context.restore();
}

// Reset the whole system. Clear the display and move turtle back to
// origin, facing the Y axis.
function reset() {
   initialise();
   clear();
   draw();
   width(1);  // explicitly call width() so that g_scale is considered
}

// Trace the forward motion of the turtle, allowing for possible
// wrap-around at the boundaries of the canvas.

// XXX is there a way to do the wrapping faster using mod?
function forward(distance) {
   distance *= g_scale;

   imageContext.save();
   centerCoords(imageContext);
   imageContext.beginPath();
   // Get the boundaries of the canvas.
   var maxX = imageContext.canvas.width / 2;
   var minX = -imageContext.canvas.width / 2;
   var maxY = imageContext.canvas.height / 2;
   var minY = -imageContext.canvas.height / 2;
   var x = turtle.pos.x;
   var y = turtle.pos.y;
   // Trace out the forward steps.
   while (distance > 0) {
      // Move the to current location of the turtle.
      imageContext.moveTo(x, y);
      // Calculate the new location of the turtle after doing the forward movement.
      var cosAngle = Math.cos(turtle.angle);
      var sinAngle = Math.sin(turtle.angle)
      var newX = x + sinAngle  * distance;
      var newY = y + cosAngle * distance;
      // Wrap on the X boundary.
      function xWrap(cutBound, otherBound) {
         var distanceToEdge = Math.abs((cutBound - x) / sinAngle);
         var edgeY = cosAngle * distanceToEdge + y;
         imageContext.lineTo(cutBound, edgeY);
         distance -= distanceToEdge;
         x = otherBound;
         y = edgeY;
      }
      // Wrap on the Y boundary.
      function yWrap(cutBound, otherBound) {
         var distanceToEdge = Math.abs((cutBound - y) / cosAngle);
         var edgeX = sinAngle * distanceToEdge + x;
         imageContext.lineTo(edgeX, cutBound);
         distance -= distanceToEdge;
         x = edgeX;
         y = otherBound;
      }
      // Don't wrap the turtle on any boundary.
      function noWrap()
      {
         imageContext.lineTo(newX, newY);
         turtle.pos.x = newX;
         turtle.pos.y = newY;
         distance = 0;
      }
      // If wrap is on, trace a part segment of the path and wrap on boundary if necessary.
      if (turtle.wrap) {
         if (insideCanvas(newX,newY,minX,maxX,minY,maxY)) {
            noWrap();
         }
         else if (point = intersect(x,y,newX,newY,maxX,maxY,maxX,minY))
            xWrap(maxX, minX);
         else if (point = intersect(x,y,newX,newY,minX,maxY,minX,minY))
            xWrap(minX, maxX);
         else if (point = intersect(x,y,newX,newY,minX,maxY,maxX,maxY))
            yWrap(maxY, minY);
         else if (point = intersect(x,y,newX,newY,minX,minY,maxX,minY))
            yWrap(minY, maxY);
/*
      if (turtle.wrap) {
         if (newX > maxX)
            xWrap(maxX, minX);
         else if (newX < minX)
            xWrap(minX, maxX);
         else if (newY > maxY)
             yWrap(maxY, minY);
         else if (newY < minY)
            yWrap(minY, maxY);
*/
         else
            // No wrapping to to, new turtle position is within the canvas.
            noWrap();
      }
      // Wrap is not on.
      else {
         noWrap();
      }
   }
   // only draw if the pen is currently down.
   if (turtle.penDown) {
      imageContext.stroke();
   }
   imageContext.restore();
   drawIf();
}

function insideCanvas(x,y,minX,maxX,minY,maxY) {
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function intersect(x1,y1,x2,y2,x3,y3,x4,y4) {
   var d = ((y4 - y3) * (x2 - x1)) - ((x4 - x3) * (y2 - y1));
   var ua = (((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3))) / d;
   var ub = (((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3))) / d;

   if (d == 0) {
       // lines are parallel
       return undefined;
   }
   else if (ua < 0.01 || ua > 0.99 || ub < 0 || ub > 1) {
       return undefined;
   }
   else {
      return {x: x1 + ua * (x2 - x1), y: y1 + ua * (y2 - y1) }
   }
}

// Turn edge wrapping on/off.
function wrap(bool) {
   turtle.wrap = bool;
}

// Hide the turtle.
function hideTurtle() {
   turtle.visible = false;
   drawIf();
}

// Show the turtle
function showTurtle() {
   turtle.visible = true;
   drawIf();
}

// Turn on/off redrawing when the turtle moves.
function redrawOnMove(bool) {
   turtle.redraw = bool;
}

// Lift up the pen (don't draw).
function penup() { turtle.penDown = false; }
// Put the pen down (do draw).
function pendown() { turtle.penDown = true; }

// Turn right by an angle in degrees.
function right(angle) {
   turtle.angle += degToRad(angle);
   drawIf();
}

// Turn left by an angle in degrees.
function left(angle) {
   turtle.angle -= degToRad(angle);
   drawIf();
}

// Move the turtle to a particular coordinate (don't draw on the way there).

// XXX We should wrap the turtle here

function goto(x,y) {
   x *= g_scale;
   y *= g_scale;

   if (turtle.wrap) {
      turtle.pos.x = ((x + 150) % g_xPixels) - 150;
      turtle.pos.y = ((y + 150) % g_yPixels) - 150;
   }
   else {
      turtle.pos.x = x;
      turtle.pos.y = y;
   }
   drawIf();
}

// Set the angle of the turtle in degrees.
function angle(angle) {
   turtle.angle = degToRad(angle);
}

// Convert degrees to radians.
function degToRad(deg) {
   return deg / 180 * Math.PI;
}

// Convert radians to degrees.
function radToDeg(deg) {
   return deg * 180 / Math.PI;
}

// Set the width of the line.
function width(w) {
   w *= g_scale;

   turtle.width = w;
   imageContext.lineWidth = w;
}

// Write some text at the turtle position.
// Need to counteract the fact that we flip the Y axis on the image context
// to draw in turtle coordinates.
function write(msg) {
   imageContext.save();
   centerCoords(imageContext);
   imageContext.translate(turtle.pos.x, turtle.pos.y);
   imageContext.transform(1, 0, 0, -1, 0, 0);
   imageContext.translate(-turtle.pos.x, -turtle.pos.y);
   imageContext.fillText(msg, turtle.pos.x, turtle.pos.y);
   imageContext.restore();
   drawIf();
}

// Set the colour of the line using RGB values in the range [0,255], and
// an alpha value in the range [0,1].
function colour (r,g,b,a) {
   imageContext.strokeStyle = "rgba(" + r + "," + g + "," + b + "," + a + ")";
   turtle.colour.r = r;
   turtle.colour.g = g;
   turtle.colour.b = b;
   turtle.colour.a = a;
}

// Generate a random integer between low and hi.
function random(low, hi) {
   return Math.floor(Math.random() * (hi - low + 1) + low);
}

// Repeat an action N times.
function repeat(n, action) {
   for (var count = 1; count <= n; count++)
      action();
}

// Animate an action by calling it every MS milliseconds.
function animate(action, ms) {
   return setInterval(action, ms);
}

// Set the font used in text written in the image context.
function setFont(font) {
   imageContext.font = font;
}

// ----------------------------------------------------------------------------

color = colour;  // alias for american spelling

function setXPixels(p) {
  if ( p === undefined )
    p = $('#input-width')[0].value;
  g_xPixels = p;
  resizeCanvas();
}
function setYPixels(p) {
  if ( p === undefined )
    p = $('#input-height')[0].value;
  g_yPixels = p;
  resizeCanvas();
}
function setRenderScale(s) {
  if ( s === undefined )
    s = $('#input-render-scale')[0].value;
  g_renderScale = s;
}

function resizeCanvas(xp, yp) {
  if ( xp !== undefined ) setXPixels(xp);
  if ( yp !== undefined ) setYPixels(xp);

  imageCanvas.width = g_xPixels;
  imageCanvas.height = g_yPixels;
  turtleCanvas.width = g_xPixels;
  turtleCanvas.height = g_yPixels;

  reset();
}

function executeCommands() {
  var editorText = editor.getValue();
  eval(editorText);
}

function downloadImage() {
  a = document.createElement('a');
  a.download = 'turtle-graphics.png';
  a.href = $('#imagecanvas')[0].toDataURL('image/png').replace("image/png", "image/octet-stream");
  a.click();
}

function downloadRender() {
  g_scale = g_renderScale;

  var saved_g_xPixels = g_xPixels;
  var saved_g_yPixels = g_yPixels;
  var saved_imageCanvas = imageCanvas;
  var saved_imageContext = imageContext;

  g_xPixels *= g_scale;
  g_yPixels *= g_scale;

  imageCanvas = document.createElement('canvas');
  imageContext = imageCanvas.getContext('2d');

  imageCanvas.width = g_xPixels;
  imageCanvas.height = g_yPixels;

  reset();
  executeCommands();

  a = document.createElement('a');
  a.download = 'turtle-graphics.png';
  a.href = imageCanvas.toDataURL('image/png').replace("image/png", "image/octet-stream");
  a.click();

  g_xPixels = saved_g_xPixels;
  g_yPixels = saved_g_yPixels;
  imageCanvas = saved_imageCanvas;
  imageContext = saved_imageContext;

  g_scale = 1;
  reset();
  executeCommands();
}

// Make the language reference a read-only Ace editor
var language_reference = ace.edit("language-reference");
language_reference.setTheme("ace/theme/solarized_light");
language_reference.getSession().setMode("ace/mode/javascript");
language_reference.setOptions({
  readOnly: true,
  highlightActiveLine: false,
  highlightGutterLine: false,
  maxLines: language_reference.session.getLength(),
});
// set the cursor not to be visible
language_reference.renderer.$cursorLayer.element.style.opacity=0

// Enable Ace editing for commands
var editor = ace.edit("editor");
editor.setTheme("ace/theme/solarized_light");
editor.getSession().setMode("ace/mode/javascript");
editor.setOptions({
     maxLines: language_reference.session.getLength()
});

// add keyboard bindings
editor.commands.addCommand({
  name: 'executeCommands',
  bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
  exec: executeCommands,
  readOnly: true,
});
editor.commands.addCommand({
  name: 'resetCanvas',
  bindKey: { win: 'Ctrl-Esc', mac: 'Cmd-Esc' },
  exec: reset,
  readOnly: true,
});

// when the page is first loaded
// - fill in the default values for the text fields
$('#input-width')[0].value = g_xPixels;
$('#input-height')[0].value = g_yPixels;
$('#input-render-scale')[0].value = g_renderScale;
// - set the canvas size
resizeCanvas(g_xPixels,g_yPixels);
// - give focus to the command editor when the page is first loaded
editor.focus();

