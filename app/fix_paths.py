import os
import re

dist_dir = os.path.join(os.path.dirname(__file__), "dist")

print("Fixing relative paths in dist folder:", dist_dir)

for root, dirs, files in os.walk(dist_dir):
    for f in files:
        if f.endswith(".html"):
            file_path = os.path.join(root, f)
            try:
                with open(file_path, "r", encoding="utf-8") as file:
                    content = file.read()
                
                content = content.replace('src="/_expo/', 'src="./_expo/')
                content = content.replace('href="/_expo/', 'href="./_expo/')
                content = content.replace('href="/favicon.ico"', 'href="./favicon.ico"')
                content = content.replace('src="/assets/', 'src="./assets/')
                content = content.replace('href="/assets/', 'href="./assets/')

                # Find Ionicons and font files in assets
                font_css = """
    <style>
      @font-face {
        font-family: 'Ionicons';
        src: url('./assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf') format('truetype');
      }
      @font-face {
        font-family: 'MaterialIcons';
        src: url('./assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.4e85bc9ebe07e0340c9c4fc2f6c38908.ttf') format('truetype');
      }
      @font-face {
        font-family: 'MaterialCommunityIcons';
        src: url('./assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.6e435534bd35da5fef04168860a9b8fa.ttf') format('truetype');
      }
      @font-face {
        font-family: 'FontAwesome';
        src: url('./assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/FontAwesome.b06871f281fee6b241d60582ae9369b9.ttf') format('truetype');
      }
    </style>
                """
                if "</head>" in content and "font-family: 'Ionicons'" not in content:
                    content = content.replace("</head>", font_css + "\n</head>")

                with open(file_path, "w", encoding="utf-8") as file:
                    file.write(content)
                print(f"Fixed {f} with font-face styles")
            except Exception as e:
                print(f"Error processing {f}: {e}")

print("All asset paths fixed successfully!")
