import re

# Read the file
with open('d:/sheldon/SubWaySuffers/src/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add camera vertical follow for jumps
old_camera = "            // Camera follow (slightly behind)\r\n            this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.position.x, 0.05);"

new_camera = """            // Camera follow (slightly behind)
            this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.position.x, 0.05);
            // Camera vertical follow for jumps
            this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 7 + (this.player.position.y > 0 ? this.player.position.y * 0.5 : 0), 0.1);"""

content = content.replace(old_camera, new_camera)

# Write back
with open('d:/sheldon/SubWaySuffers/src/main.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Camera vertical follow added successfully!")
