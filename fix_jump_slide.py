import re

# Read the file
with open('d:/sheldon/SubWaySuffers/src/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the location to insert the jump/slide physics
# We want to insert after line 288 (after the obstacles loop) and before the lane switching

jump_slide_code = """
        // Jump Physics
        if (this.isJumping) {
            this.player.position.y += this.jumpVelocity;
            this.jumpVelocity += this.gravity;
            if (this.player.position.y <= 0) {
                this.player.position.y = 0;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }

        // Slide Physics
        if (this.isSliding) {
            this.slideTimer -= delta;
            // Procedural slide: squash the player
            this.player.scale.y = 0.0075;
            this.player.position.y = 0;
            if (this.slideTimer <= 0) {
                this.isSliding = false;
                this.player.scale.y = 0.015;
            }
        } else if (!this.isJumping) {
            this.player.scale.y = 0.015;
        }
"""

# Replace the player position locking section
old_pattern = r'(\s+// Smooth lane switching\s+if \(this\.player\) \{\s+this\.player\.position\.x = THREE\.MathUtils\.lerp\(this\.player\.position\.x, this\.targetX, 0\.15\);\s+// Lock player to origin \(X is handled by lane switching\)\s+this\.player\.position\.y = 0;\s+this\.player\.position\.z = 0;)'

new_pattern = jump_slide_code + r"""
        // Smooth lane switching
        if (this.player) {
            this.player.position.x = THREE.MathUtils.lerp(this.player.position.x, this.targetX, 0.15);

            // Lock player Z position (Y is handled by jump/slide)
            this.player.position.z = 0;"""

content = re.sub(old_pattern, new_pattern, content, flags=re.DOTALL)

# Write back
with open('d:/sheldon/SubWaySuffers/src/main.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Jump and slide physics added successfully!")
