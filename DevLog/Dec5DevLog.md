# Devlog Entry - [December 5, 2025]

## Selected Requirements

Identify which of the many options for F3 requirements that your team has decided to satisfy. For each one, offer a sentence or two of detail about why your team selected this requirement. Perhaps it is because it was already satisfied by your F2 design, that it seemed like it would be easy, or that it represents a skill you want to develop or practice.

### Continuous Inventory

We chose this because it was already completed in our F2 design

### Visual Themes

We decided to chose this because our game space was a bit jarring to look at in dark mode devices during testing

### Touchscreen

We chose to do touchscreen because playing the game on mobile seemed like a good way to take the project

### Unlimited Undo

With the unpredicatabiliy of your physics puzzle, being able to reset the ball is very nice to deal with frustration of missing the goals.

## How We Satisfied the Software Requirements

For each of your chosen F3 requirements, give a paragraph of explanation for how your project's implementation satisfies the requirements.

### -Continuous Inventory-

This was a carryover from our F2 requierments. We have 3 keys throughout each scene in our game. You need three keys total to unlock the final door and win. This can be scaled up to have multiple keys of the same color, for example 5 keys with only 3 needed.

### -Visual Themes-

We have integrated three visual themes into our game: Light, Dark, and Accesibility. These themes change the color of the UI of the game as well as the lighting/skybox within the game. It is linked the the browser's prefered visual style. For example, if you have your browser in the dark theme, the game's dark theme is activated and changes the color of the scene. There is also ways to cycle though the themes to chose the style you want to play the game in. This is activated by both keyboard and touchscreen button.

### -Touchscreen-

We have both touchscreen and computer control schemes to this game. When using a computer, the game uses keyboard and mouse, but on mobile, touchscreen options are availible. Movement can be controled by a joystick on the left of the screen. Changing scenes is linked to a button on top of the joystick. Interacting with E and restarting puzzles with R are availible on the right. Changing visual styles is a button on the bottom right.

### -Unlimited Undo-

The major play action referenced in the requirements page is moving our ball. The ball can be kicked, but it is difficult to control at some points. To alleviate this we added a button that resets the location of the ball. There is both a touchscreen visual button and a button on the keyboard that activates the undo.

#### Testing Lead Neila

Added an unlimted redo function that resets the puzzle in the current scene, as of adding it only the first temple scene has a puzzle. But the fuction does allow for easy addtions.

## Reflection

For F3 we have changed so much of what we've had to start with. Our first builds where just sandboxes for us to mess around with the 3D mobles and physics. Then was we wanted to add some of the requirements for F3 we had to take a step back and re-structure the game world. Starting by adding diffrent scenes so that the world is not overloading with trying to load in 3 diffrent models, then came the UI as most of our win and lose cons where console logs, finally theres the last puzzle scene that can only be solved by solving the other scences first.

After completing all of this our team could finally turn to the F3 requirements, and as we where satisfied with the game play; the requirements where a bit less complect to add on.
